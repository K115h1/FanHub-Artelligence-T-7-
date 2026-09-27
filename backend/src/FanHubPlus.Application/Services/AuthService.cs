// AuthService — register, login, profile, password change and reset.
//
// Validation lives here rather than in the controller, because the SRS puts
// business rules in the Application layer. It is plain method-level checking;
// a full validation framework would be overkill for a handful of fields.
using FanHubPlus.Application.DTOs;
using FanHubPlus.Domain;
using FanHubPlus.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;

namespace FanHubPlus.Application.Services;

// Thrown for anything the caller did wrong, so controllers can turn it into a
// 400 without inspecting exception types one by one.
public class ValidationException(string message) : Exception(message);

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default);
    Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default);
    Task<UserDto> GetProfileAsync(uint userId, CancellationToken ct = default);
    Task<UserDto> UpdateProfileAsync(uint userId, UpdateProfileRequest request, CancellationToken ct = default);
    Task ChangePasswordAsync(uint userId, ChangePasswordRequest request, CancellationToken ct = default);

    /// Returns the emailed token. In production this goes out by email; here it
    /// is returned so the flow can be demonstrated without a mail server.
    Task<string> RequestPasswordResetAsync(string email, CancellationToken ct = default);
    Task ResetPasswordAsync(ResetPasswordRequest request, CancellationToken ct = default);
}

public class AuthService : IAuthService
{
    // The role every new account gets. Admin is only ever assigned by an
    // existing admin, never by a sign-up.
    private const string DefaultRole = "registered";

    private readonly IUserRepository _users;
    private readonly IPasswordHasher<User> _hasher;
    private readonly ITokenService _tokens;
    private readonly ILogger<AuthService> _log;

    public AuthService(
        IUserRepository users,
        IPasswordHasher<User> hasher,
        ITokenService tokens,
        ILogger<AuthService> log)
    {
        _users = users;
        _hasher = hasher;
        _tokens = tokens;
        _log = log;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            throw new ValidationException("Name is required.");

        if (!IsEmail(request.Email))
            throw new ValidationException("That email address does not look right.");

        if (request.Password.Length < 6)
            throw new ValidationException("Passwords need at least 6 characters.");

        if (await _users.EmailExistsAsync(request.Email, ct))
            throw new ValidationException("An account with that email already exists.");

        var user = new User
        {
            Name = request.Name.Trim(),
            Email = request.Email.Trim(),
            IsVerified = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        // Only ever a hash is stored, never the password itself.
        user.PasswordHash = _hasher.HashPassword(user, request.Password);

        await _users.AddAsync(user, DefaultRole, ct);
        await _users.AddActivityAsync(new ActivityLog
        {
            UserId = user.UserId,
            Action = "register",
            CreatedAt = DateTime.UtcNow,
        }, ct);

        _log.LogInformation("Registered {Email}", user.Email);

        var token = _tokens.CreateToken(user, [DefaultRole]);
        return new AuthResponse(token.Value, token.ExpiresAt, ToDto(user, DefaultRole));
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        if (!IsEmail(request.Email) || string.IsNullOrEmpty(request.Password))
            throw new ValidationException("Email and password are required.");

        var user = await _users.GetWithRolesByEmailAsync(request.Email, ct);

        // Same message either way, so the response does not reveal which
        // emails have accounts.
        if (user is null || string.IsNullOrEmpty(user.PasswordHash))
            throw new ValidationException("Those details did not match an account.");

        var check = _hasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (check == PasswordVerificationResult.Failed)
            throw new ValidationException("Those details did not match an account.");

        var role = PrimaryRole(user);
        var token = _tokens.CreateToken(user, [role]);

        return new AuthResponse(token.Value, token.ExpiresAt, ToDto(user, role));
    }

    public async Task<UserDto> GetProfileAsync(uint userId, CancellationToken ct = default)
    {
        var user = await _users.GetWithRolesAsync(userId, ct)
            ?? throw new ValidationException("That account no longer exists.");

        return ToDto(user, PrimaryRole(user));
    }

    public async Task<UserDto> UpdateProfileAsync(uint userId, UpdateProfileRequest request, CancellationToken ct = default)
    {
        var user = await _users.GetWithRolesAsync(userId, ct)
            ?? throw new ValidationException("That account no longer exists.");

        if (request.Name is not null)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                throw new ValidationException("Name cannot be blank.");
            user.Name = request.Name.Trim();
        }

        if (request.Bio is not null)
        {
            if (request.Bio.Length > 500)
                throw new ValidationException("Bio is limited to 500 characters.");
            user.Bio = request.Bio.Trim();
        }

        // Email is deliberately not editable here: changing it needs a
        // verification step, which is a separate flow.
        user.UpdatedAt = DateTime.UtcNow;
        await _users.UpdateAsync(user, ct);

        return ToDto(user, PrimaryRole(user));
    }

    public async Task ChangePasswordAsync(uint userId, ChangePasswordRequest request, CancellationToken ct = default)
    {
        var user = await _users.GetByIdAsync(userId, ct)
            ?? throw new ValidationException("That account no longer exists.");

        if (string.IsNullOrEmpty(user.PasswordHash))
            throw new ValidationException("This account has no password set.");

        if (_hasher.VerifyHashedPassword(user, user.PasswordHash, request.CurrentPassword) == PasswordVerificationResult.Failed)
            throw new ValidationException("Your current password is not correct.");

        if (request.NewPassword.Length < 6)
            throw new ValidationException("Passwords need at least 6 characters.");

        user.PasswordHash = _hasher.HashPassword(user, request.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await _users.UpdateAsync(user, ct);
    }

    public async Task<string> RequestPasswordResetAsync(string email, CancellationToken ct = default)
    {
        var user = await _users.GetByEmailAsync(email, ct);

        // Always succeed, whether or not the account exists, so the endpoint
        // cannot be used to discover which emails are registered.
        if (user is null)
            return string.Empty;

        var token = Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32));
        var hash = HashToken(token);

        await _users.AddResetTokenAsync(new PasswordResetToken
        {
            UserId = user.UserId,
            TokenHash = hash,
            ExpiresAt = DateTime.UtcNow.AddHours(1),
            CreatedAt = DateTime.UtcNow,
        }, ct);

        return token;
    }

    public async Task ResetPasswordAsync(ResetPasswordRequest request, CancellationToken ct = default)
    {
        if (request.NewPassword.Length < 6)
            throw new ValidationException("Passwords need at least 6 characters.");

        var row = await _users.GetResetTokenByHashAsync(HashToken(request.Token), ct);

        if (row is null || row.UsedAt is not null || row.ExpiresAt < DateTime.UtcNow)
            throw new ValidationException("That reset link is no longer valid.");

        var user = await _users.GetByIdAsync(row.UserId, ct);
        if (user is null)
            throw new ValidationException("That account no longer exists.");

        user.PasswordHash = _hasher.HashPassword(user, request.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await _users.UpdateAsync(user, ct);

        row.UsedAt = DateTime.UtcNow;
        await _users.AddActivityAsync(new ActivityLog
        {
            UserId = user.UserId,
            Action = "password_reset",
            CreatedAt = DateTime.UtcNow,
        }, ct);
    }

    private static string HashToken(string token)
    {
        var bytes = System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private static bool IsEmail(string value) =>
        !string.IsNullOrWhiteSpace(value)
        && System.Text.RegularExpressions.Regex.IsMatch(value.Trim(), @"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$");

    // An account can hold several roles; the highest one is what it is treated
    // as. Admin wins over registered.
    private static string PrimaryRole(User user)
    {
        var names = user.UserRoles.Select(ur => ur.Role.Name).ToList();
        if (names.Contains("admin")) return "admin";
        return names.FirstOrDefault() ?? "registered";
    }

    private static UserDto ToDto(User user, string role) => new(
        user.UserId,
        user.Name,
        user.Email,
        user.AvatarPath,
        user.Bio,
        user.IsVerified,
        role,
        user.CreatedAt);
}

// AuthService — register, login, profile, password change and reset.
//
// Validation lives here rather than in the controller, because the SRS puts
// business rules in the Application layer. It is plain method-level checking;
// a full validation framework would be overkill for a handful of fields.
using FanHubPlus.Application.DTOs;
using FanHubPlus.Domain;
using FanHubPlus.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
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

    // ---- Category lists (favourites and interests, kept separate) ----

    Task<ProfileCategoriesDto> GetCategoriesAsync(uint userId, CancellationToken ct = default);
    Task<ProfileCategoriesDto> SetFavoritesAsync(uint userId, SetCategoriesRequest request, CancellationToken ct = default);
    Task<ProfileCategoriesDto> SetInterestsAsync(uint userId, SetCategoriesRequest request, CancellationToken ct = default);

    Task<AvatarDto> SetAvatarAsync(uint userId, string? avatarPath, CancellationToken ct = default);

    // ---- Email verification ----

    /// Returns the emailed token, for the same reason as the password reset.
    Task<string> RequestEmailVerificationAsync(string email, CancellationToken ct = default);
    Task ConfirmEmailAsync(ConfirmVerificationRequest request, CancellationToken ct = default);

    // ---- Recent activity ----

    /// The member's most recent actions, newest first. `take` is clamped to a
    /// sane range by the implementation rather than trusted from the query.
    Task<IReadOnlyList<ActivityDto>> GetActivityAsync(uint userId, int take = 10, CancellationToken ct = default);
}

public class AuthService : IAuthService
{
    // The role every new account gets. Admin is only ever assigned by an
    // existing admin, never by a sign-up.
    private const string DefaultRole = "registered";

    private readonly IUserRepository _users;
    private readonly IContentRepository _categories;
    private readonly IPasswordHasher<User> _hasher;
    private readonly ITokenService _tokens;
    private readonly ILogger<AuthService> _log;

    // Where the emailed links point. The service builds the link rather than
    // the controller because both the reset and the verification flow need one,
    // and two places composing the same URL is how they drift apart.
    private readonly string _frontendBaseUrl;

    public AuthService(
        IUserRepository users,
        IContentRepository categories,
        IPasswordHasher<User> hasher,
        ITokenService tokens,
        ILogger<AuthService> log,
        IConfiguration configuration)
    {
        _users = users;
        _categories = categories;
        _hasher = hasher;
        _tokens = tokens;
        _log = log;
        _frontendBaseUrl = configuration["Frontend:BaseUrl"] ?? "http://localhost:5173";
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

        var link = $"{_frontendBaseUrl.TrimEnd('/')}/reset-password?token={Uri.EscapeDataString(token)}";
        _log.LogInformation(
            "Password reset link for {UserId}: {Link} (no mail server configured — a deployment " +
            "would send this and return 202 with no body).",
            user.UserId, link);

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

    // ---------- Category lists ----------

    public async Task<ProfileCategoriesDto> GetCategoriesAsync(uint userId, CancellationToken ct = default)
    {
        // Sequential on purpose. These are two queries against the same scoped
        // DbContext, and DbContext is NOT thread-safe: running them through
        // Task.WhenAll throws "A second operation was started on this context
        // instance before a previous operation completed" as soon as they
        // actually overlap. Two small indexed reads cost less than that.
        var favIds = await _users.GetFavoriteCategoryIdsAsync(userId, ct);
        var interestIds = await _users.GetInterestCategoryIdsAsync(userId, ct);

        return await BuildCategoriesDtoAsync(favIds, interestIds, ct);
    }

    public async Task<ProfileCategoriesDto> SetFavoritesAsync(uint userId, SetCategoriesRequest request, CancellationToken ct = default)
    {
        var favIds = await ValidateCategoryIdsAsync(request.CategoryIds, ct);
        await _users.SetFavoriteCategoriesAsync(userId, favIds, ct);

        // Interests are untouched by a favourites edit, so they are read back
        // rather than assumed.
        var interestIds = await _users.GetInterestCategoryIdsAsync(userId, ct);
        return await BuildCategoriesDtoAsync(favIds, interestIds, ct);
    }

    public async Task<ProfileCategoriesDto> SetInterestsAsync(uint userId, SetCategoriesRequest request, CancellationToken ct = default)
    {
        var interestIds = await ValidateCategoryIdsAsync(request.CategoryIds, ct);
        await _users.SetInterestCategoriesAsync(userId, interestIds, ct);

        var favIds = await _users.GetFavoriteCategoryIdsAsync(userId, ct);
        return await BuildCategoriesDtoAsync(favIds, interestIds, ct);
    }

    /// <summary>
    /// Rejects ids that are not real categories, with a wording that says which.
    /// Left to the database this would surface as a raw FK violation (a 500) on
    /// the first bad id in the list, which tells a member nothing about what
    /// they got wrong.
    /// </summary>
    private async Task<List<byte>> ValidateCategoryIdsAsync(IReadOnlyList<byte> ids, CancellationToken ct)
    {
        var distinct = ids.Distinct().ToList();
        if (distinct.Count == 0) return distinct;

        // One query for the whole category list, then a set lookup. A loop of
        // GetCategoryByIdAsync would be an N+1, and the caller already fetches
        // every category in BuildCategoriesDtoAsync.
        var known = (await _categories.GetCategoriesAsync(ct)).Select(c => c.CategoryId).ToHashSet();
        var unknown = distinct.Where(id => !known.Contains(id)).ToList();

        if (unknown.Count > 0)
            throw new ValidationException($"Unknown categor{(unknown.Count == 1 ? "y" : "ies")}: {string.Join(", ", unknown)}.");

        return distinct;
    }

    private async Task<ProfileCategoriesDto> BuildCategoriesDtoAsync(
        List<byte> favIds, List<byte> interestIds, CancellationToken ct)
    {
        // One query for every category, then filtered in memory: the set is
        // small and fixed, so this avoids an N+1 across two lists.
        var all = await _categories.GetCategoriesAsync(ct);
        var byId = all.ToDictionary(c => c.CategoryId);

        CategoryChipDto Chip(byte id) =>
            byId.TryGetValue(id, out var c)
                ? new CategoryChipDto(c.CategoryId, c.Slug, c.Name)
                // A row can outlive its category if a category is ever removed.
                // Report the id rather than dropping the entry, so the member can
                // see and clear it instead of watching it vanish.
                : new CategoryChipDto(id, string.Empty, $"Category {id}");

        return new ProfileCategoriesDto(favIds.Select(Chip).ToList(), interestIds.Select(Chip).ToList());
    }

    public async Task<AvatarDto> SetAvatarAsync(uint userId, string? avatarPath, CancellationToken ct = default)
    {
        await _users.SetAvatarPathAsync(userId, avatarPath, ct);
        return new AvatarDto(avatarPath);
    }

    // ---------- Recent activity ----------

    public async Task<IReadOnlyList<ActivityDto>> GetActivityAsync(
        uint userId, int take = 10, CancellationToken ct = default)
    {
        // Clamped rather than trusted: this value reaches the Take() below, and
        // an unbounded ?take= is a cheap way to pull the whole table.
        var limit = Math.Clamp(take, 1, 50);
        var rows = await _users.GetRecentActivityAsync(userId, limit, ct);

        return rows
            .Select(a => new ActivityDto(a.LogId, a.Action, a.TargetId, a.CreatedAt))
            .ToList();
    }

    // ---------- Email verification ----------

    public async Task<string> RequestEmailVerificationAsync(string email, CancellationToken ct = default)
    {
        var user = await _users.GetByEmailAsync(email, ct);

        // Same rule as the password reset: succeed whether or not the account
        // exists, so this cannot be used to enumerate registered addresses.
        if (user is null || user.IsVerified)
            return string.Empty;

        var token = Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32));

        await _users.AddEmailVerificationTokenAsync(new EmailVerificationToken
        {
            UserId = user.UserId,
            TokenHash = HashToken(token),
            ExpiresAt = DateTime.UtcNow.AddDays(1),
            CreatedAt = DateTime.UtcNow,
        }, ct);

        var link = $"{_frontendBaseUrl.TrimEnd('/')}/verify-email?token={Uri.EscapeDataString(token)}";
        _log.LogInformation(
            "Email verification link for {UserId}: {Link} (no mail server configured — " +
            "a deployment would send this and return 202 with no body).",
            user.UserId, link);

        return token;
    }

    public async Task ConfirmEmailAsync(ConfirmVerificationRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Token))
            throw new ValidationException("That verification link is not valid.");

        var row = await _users.GetEmailVerificationTokenAsync(HashToken(request.Token), ct);

        if (row is null || row.UsedAt is not null || row.ExpiresAt < DateTime.UtcNow)
            throw new ValidationException("That verification link is no longer valid.");

        row.UsedAt = DateTime.UtcNow;
        await _users.SetVerifiedAsync(row.UserId, ct);

        await _users.AddActivityAsync(new ActivityLog
        {
            UserId = row.UserId,
            Action = "email_verified",
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

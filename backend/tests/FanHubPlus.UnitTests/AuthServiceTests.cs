// Unit tests for AuthService's validation rules, using hand-written fakes
// rather than a mocking framework — the repository interface is small enough
// that a fake is shorter than the setup a mock would need.
using FanHubPlus.Application.DTOs;
using FanHubPlus.Application.Services;
using FanHubPlus.Domain;
using FanHubPlus.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace FanHubPlus.UnitTests;

public class AuthServiceTests
{
    private static AuthService Build(IUserRepository users, ITokenService? tokens = null)
    {
        var hasher = new PasswordHasher<User>();
        var tokenService = tokens ?? new FixedTokenService();

        return new AuthService(users, hasher, tokenService, NullLogger<AuthService>.Instance);
    }

    [Fact]
    public async Task Register_rejects_a_blank_name()
    {
        var service = Build(new FakeUserRepository());

        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            service.RegisterAsync(new RegisterRequest("   ", "a@b.com", "hunter2")));

        Assert.Contains("Name", ex.Message);
    }

    [Theory]
    [InlineData("not-an-email")]
    [InlineData("missing@tld")]
    [InlineData("@fanhubplus.test")]
    [InlineData("")]
    public async Task Register_rejects_malformed_emails(string email)
    {
        var service = Build(new FakeUserRepository());

        await Assert.ThrowsAsync<ValidationException>(() =>
            service.RegisterAsync(new RegisterRequest("Ada", email, "hunter2")));
    }

    [Fact]
    public async Task Register_rejects_short_passwords()
    {
        var service = Build(new FakeUserRepository());

        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            service.RegisterAsync(new RegisterRequest("Ada", "ada@fanhubplus.test", "12345")));

        Assert.Contains("6 characters", ex.Message);
    }

    [Fact]
    public async Task Register_rejects_a_duplicate_email()
    {
        var users = new FakeUserRepository { EmailTaken = true };
        var service = Build(users);

        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            service.RegisterAsync(new RegisterRequest("Ada", "ada@fanhubplus.test", "hunter2")));

        Assert.Contains("already exists", ex.Message);
    }

    [Fact]
    public async Task Register_stores_a_hash_and_never_the_plaintext()
    {
        var users = new FakeUserRepository();
        var service = Build(users);

        await service.RegisterAsync(new RegisterRequest("Ada", "ada@fanhubplus.test", "hunter2"));

        var saved = Assert.Single(users.Added);
        Assert.NotNull(saved.PasswordHash);
        Assert.NotEqual("hunter2", saved.PasswordHash);

        // The stored value has to be a real hash, not just something different
        // from the password — so verify it round-trips.
        var verified = new PasswordHasher<User>().VerifyHashedPassword(saved, saved.PasswordHash!, "hunter2");
        Assert.Equal(PasswordVerificationResult.Success, verified);

        // A different password must not verify against it.
        var wrong = new PasswordHasher<User>().VerifyHashedPassword(saved, saved.PasswordHash!, "wrong");
        Assert.Equal(PasswordVerificationResult.Failed, wrong);
    }

    [Fact]
    public async Task Login_gives_the_same_message_for_unknown_email_and_wrong_password()
    {
        var users = new FakeUserRepository();
        var service = Build(users);

        var unknown = await Assert.ThrowsAsync<ValidationException>(() =>
            service.LoginAsync(new LoginRequest("nobody@fanhubplus.test", "hunter2")));

        // Now a real account with the wrong password.
        var real = new User { Email = "ada@fanhubplus.test" };
        real.PasswordHash = new PasswordHasher<User>().HashPassword(real, "correct-horse");
        users.Existing = real;

        var wrong = await Assert.ThrowsAsync<ValidationException>(() =>
            service.LoginAsync(new LoginRequest("ada@fanhubplus.test", "wrong-horse")));

        // Identical wording, so the endpoint cannot be used to find which
        // emails have accounts.
        Assert.Equal(unknown.Message, wrong.Message);
    }

    [Fact]
    public async Task Login_succeeds_with_the_right_password_and_returns_a_token()
    {
        var hasher = new PasswordHasher<User>();
        var user = new User { Email = "ada@fanhubplus.test" };
        user.PasswordHash = hasher.HashPassword(user, "correct-horse");

        var users = new FakeUserRepository { Existing = user };
        var service = Build(users);

        var result = await service.LoginAsync(new LoginRequest("ada@fanhubplus.test", "correct-horse"));

        Assert.Equal("test-token", result.Token);
        Assert.Equal("ada@fanhubplus.test", result.User.Email);
    }

    [Fact]
    public async Task UpdateProfile_rejects_a_bio_over_the_column_limit()
    {
        var users = new FakeUserRepository
        {
            Existing = new User { UserId = 7, Name = "Ada", Bio = string.Empty },
        };
        var service = Build(users);

        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            service.UpdateProfileAsync(7, new UpdateProfileRequest(null, new string('x', 501))));

        Assert.Contains("500", ex.Message);
    }

    [Fact]
    public async Task PrimaryRole_prefers_admin_when_a_user_holds_both()
    {
        var user = new User { UserId = 1 };
        user.UserRoles.Add(new UserRole { Role = new Role { Name = "registered" } });
        user.UserRoles.Add(new UserRole { Role = new Role { Name = "admin" } });

        var users = new FakeUserRepository { Existing = user };
        var service = Build(users);

        var dto = await service.GetProfileAsync(1);

        Assert.Equal("admin", dto.Role);
    }
}

// ---------- fakes ----------

internal class FixedTokenService : ITokenService
{
    public IssuedToken CreateToken(User user, IEnumerable<string> roles) =>
        new("test-token", DateTime.UtcNow.AddHours(8));
}

internal class FakeUserRepository : IUserRepository
{
    public User? Existing { get; set; }
    public bool EmailTaken { get; set; }
    public List<User> Added { get; } = [];
    public List<ActivityLog> Logs { get; } = [];

    public Task<bool> EmailExistsAsync(string email, CancellationToken ct = default) =>
        Task.FromResult(EmailTaken || string.Equals(Existing?.Email, email, StringComparison.OrdinalIgnoreCase));

    public Task AddAsync(User user, string roleName, CancellationToken ct = default)
    {
        user.UserId = (uint)(Added.Count + 1);
        Added.Add(user);
        return Task.CompletedTask;
    }

    public Task UpdateAsync(User user, CancellationToken ct = default) => Task.CompletedTask;

    public Task AddActivityAsync(ActivityLog log, CancellationToken ct = default)
    {
        Logs.Add(log);
        return Task.CompletedTask;
    }

    public Task<User?> GetByIdAsync(uint userId, CancellationToken ct = default) =>
        Task.FromResult(Existing?.UserId == userId ? Existing : null);

    public Task<User?> GetByEmailAsync(string email, CancellationToken ct = default) =>
        Task.FromResult(Existing);

    public Task<User?> GetWithRolesAsync(uint userId, CancellationToken ct = default) =>
        Task.FromResult(Existing);

    public Task<User?> GetWithRolesByEmailAsync(string email, CancellationToken ct = default) =>
        Task.FromResult(Existing);

    // The rest of the interface is not exercised by these tests.
    public Task<List<User>> GetAllAsync(CancellationToken ct = default) =>
        Task.FromResult(Existing is null ? new List<User>() : new List<User> { Existing });

    public Task SetRoleAsync(uint userId, string roleName, CancellationToken ct = default) => Task.CompletedTask;

    public Task<Bookmark?> GetBookmarkAsync(uint userId, uint contentId, CancellationToken ct = default) =>
        Task.FromResult<Bookmark?>(null);

    public Task<List<Bookmark>> GetBookmarksAsync(uint userId, CancellationToken ct = default) =>
        Task.FromResult(new List<Bookmark>());

    public Task AddBookmarkAsync(Bookmark bookmark, CancellationToken ct = default) => Task.CompletedTask;

    public Task RemoveBookmarkAsync(uint userId, uint contentId, CancellationToken ct = default) => Task.CompletedTask;

    public Task<MediaRating?> GetRatingAsync(uint userId, uint contentId, CancellationToken ct = default) =>
        Task.FromResult<MediaRating?>(null);

    public Task<List<MediaRating>> GetRatingsAsync(uint userId, CancellationToken ct = default) =>
        Task.FromResult(new List<MediaRating>());

    public Task SetRatingAsync(uint userId, uint contentId, byte stars, CancellationToken ct = default) =>
        Task.CompletedTask;

    public Task<bool> RemoveRatingAsync(uint userId, uint contentId, CancellationToken ct = default) =>
        Task.FromResult(false);

    public Task<PasswordResetToken?> GetResetTokenByHashAsync(string tokenHash, CancellationToken ct = default) =>
        Task.FromResult<PasswordResetToken?>(null);

    public Task AddResetTokenAsync(PasswordResetToken token, CancellationToken ct = default) => Task.CompletedTask;
}

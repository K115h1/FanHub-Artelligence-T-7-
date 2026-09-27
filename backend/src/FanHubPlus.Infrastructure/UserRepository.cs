// EF Core implementation of IUserRepository.
using FanHubPlus.Domain;
using Microsoft.EntityFrameworkCore;

namespace FanHubPlus.Infrastructure;

public class UserRepository : IUserRepository
{
    private readonly AppDbContext _db;

    public UserRepository(AppDbContext db)
    {
        _db = db;
    }

    public Task<User?> GetByIdAsync(uint userId, CancellationToken ct = default) =>
        _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.UserId == userId, ct);

    // Email is the login identifier, so the comparison is case-insensitive.
    // utf8mb4_unicode_ci already makes it so in MySQL; this keeps behaviour
    // identical if the database is ever another provider.
    public Task<User?> GetByEmailAsync(string email, CancellationToken ct = default) =>
        _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Email.ToLower() == email.Trim().ToLower(), ct);

    public Task<User?> GetWithRolesAsync(uint userId, CancellationToken ct = default) =>
        _db.Users
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.UserId == userId, ct);

    public Task<User?> GetWithRolesByEmailAsync(string email, CancellationToken ct = default) =>
        _db.Users
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email.ToLower() == email.Trim().ToLower(), ct);

    public Task<bool> EmailExistsAsync(string email, CancellationToken ct = default) =>
        _db.Users.AnyAsync(u => u.Email.ToLower() == email.Trim().ToLower(), ct);

    public async Task AddAsync(User user, string roleName, CancellationToken ct = default)
    {
        var role = await _db.Roles.FirstOrDefaultAsync(r => r.Name == roleName, ct);
        if (role is null)
        {
            role = new Role { Name = roleName };
            _db.Roles.Add(role);
        }

        user.UserRoles.Add(new UserRole { Role = role, User = user });
        _db.Users.Add(user);
        await _db.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(User user, CancellationToken ct = default)
    {
        _db.Users.Update(user);
        await _db.SaveChangesAsync(ct);
    }

    public Task<List<User>> GetAllAsync(CancellationToken ct = default) =>
        _db.Users
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .AsNoTracking()
            .OrderBy(u => u.Name)
            .ToListAsync(ct);

    public async Task SetRoleAsync(uint userId, string roleName, CancellationToken ct = default)
    {
        var user = await _db.Users
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.UserId == userId, ct);
        if (user is null) return;

        var role = await _db.Roles.FirstOrDefaultAsync(r => r.Name == roleName, ct);
        if (role is null) return;

        if (user.UserRoles.Any(ur => ur.RoleId == role.RoleId)) return;

        user.UserRoles.Add(new UserRole { Role = role, User = user });
        await _db.SaveChangesAsync(ct);
    }

    public Task<Bookmark?> GetBookmarkAsync(uint userId, uint contentId, CancellationToken ct = default) =>
        _db.Bookmarks.AsNoTracking()
            .FirstOrDefaultAsync(b => b.UserId == userId && b.ContentId == contentId, ct);

    public Task<List<Bookmark>> GetBookmarksAsync(uint userId, CancellationToken ct = default) =>
        _db.Bookmarks
            .Include(b => b.Content).ThenInclude(c => c.ContentGenres).ThenInclude(cg => cg.Genre)
            .AsNoTracking()
            .Where(b => b.UserId == userId)
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync(ct);

    public async Task AddBookmarkAsync(Bookmark bookmark, CancellationToken ct = default)
    {
        _db.Bookmarks.Add(bookmark);
        await _db.SaveChangesAsync(ct);
    }

    public async Task RemoveBookmarkAsync(uint userId, uint contentId, CancellationToken ct = default)
    {
        var bookmark = await _db.Bookmarks
            .FirstOrDefaultAsync(b => b.UserId == userId && b.ContentId == contentId, ct);
        if (bookmark is null) return;

        _db.Bookmarks.Remove(bookmark);
        await _db.SaveChangesAsync(ct);
    }

    public Task<MediaRating?> GetRatingAsync(uint userId, uint contentId, CancellationToken ct = default) =>
        _db.MediaRatings.AsNoTracking()
            .FirstOrDefaultAsync(r => r.UserId == userId && r.ContentId == contentId, ct);

    public Task<List<MediaRating>> GetRatingsAsync(uint userId, CancellationToken ct = default) =>
        _db.MediaRatings.AsNoTracking()
            .Where(r => r.UserId == userId)
            .OrderByDescending(r => r.UpdatedAt)
            .ToListAsync(ct);

    public async Task SetRatingAsync(uint userId, uint contentId, byte stars, CancellationToken ct = default)
    {
        var existing = await _db.MediaRatings
            .FirstOrDefaultAsync(r => r.UserId == userId && r.ContentId == contentId, ct);

        if (existing is null)
        {
            _db.MediaRatings.Add(new MediaRating
            {
                UserId = userId,
                ContentId = contentId,
                Stars = stars,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            });
        }
        else
        {
            // Re-rating updates the row, which the unique index on
            // (user_id, content_id) is there to guarantee.
            existing.Stars = stars;
            existing.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync(ct);
    }

    public async Task<bool> RemoveRatingAsync(uint userId, uint contentId, CancellationToken ct = default)
    {
        var row = await _db.MediaRatings
            .FirstOrDefaultAsync(r => r.UserId == userId && r.ContentId == contentId, ct);
        if (row is null) return false;

        _db.MediaRatings.Remove(row);
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public Task<PasswordResetToken?> GetResetTokenByHashAsync(string tokenHash, CancellationToken ct = default) =>
        _db.PasswordResetTokens.AsNoTracking()
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash, ct);

    public async Task AddResetTokenAsync(PasswordResetToken token, CancellationToken ct = default)
    {
        _db.PasswordResetTokens.Add(token);
        await _db.SaveChangesAsync(ct);
    }

    public async Task AddActivityAsync(ActivityLog log, CancellationToken ct = default)
    {
        _db.ActivityLogs.Add(log);
        await _db.SaveChangesAsync(ct);
    }
}

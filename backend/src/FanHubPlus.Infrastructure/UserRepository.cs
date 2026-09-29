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

    // Tracked, not AsNoTracking. ResetPasswordAsync stamps UsedAt on this row,
    // and against an untracked entity that assignment is silently discarded, 
    // which left reset links replayable until the token expired on their own.
    public Task<PasswordResetToken?> GetResetTokenByHashAsync(string tokenHash, CancellationToken ct = default) =>
        _db.PasswordResetTokens
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash, ct);

    public async Task AddResetTokenAsync(PasswordResetToken token, CancellationToken ct = default)
    {
        _db.PasswordResetTokens.Add(token);
        await _db.SaveChangesAsync(ct);
    }

    // ---------- Category lists ----------

    public async Task<List<byte>> GetFavoriteCategoryIdsAsync(uint userId, CancellationToken ct = default) =>
        await _db.UserFavoriteCategories.AsNoTracking()
            .Where(f => f.UserId == userId)
            .Select(f => f.CategoryId)
            .OrderBy(id => id)
            .ToListAsync(ct);

    public async Task<List<byte>> GetInterestCategoryIdsAsync(uint userId, CancellationToken ct = default) =>
        await _db.UserInterestCategories.AsNoTracking()
            .Where(i => i.UserId == userId)
            .Select(i => i.CategoryId)
            .OrderBy(id => id)
            .ToListAsync(ct);

    // Replace wholesale rather than diffing. The payload is a handful of ids, so
    // the extra statements are cheaper than the logic needed to work out which
    // rows to add and which to delete, and it cannot drift out of sync with
    // what the client asked for.
    public async Task SetFavoriteCategoriesAsync(uint userId, IEnumerable<byte> categoryIds, CancellationToken ct = default)
    {
        var keep = categoryIds.Distinct().ToList();

        var existing = await _db.UserFavoriteCategories
            .Where(f => f.UserId == userId)
            .ToListAsync(ct);

        _db.UserFavoriteCategories.RemoveRange(existing.Where(f => !keep.Contains(f.CategoryId)));
        var have = existing.Select(f => f.CategoryId).ToHashSet();
        _db.UserFavoriteCategories.AddRange(
            keep.Where(id => !have.Contains(id)).Select(id => new UserFavoriteCategory { UserId = userId, CategoryId = id }));

        await _db.SaveChangesAsync(ct);
    }

    public async Task SetInterestCategoriesAsync(uint userId, IEnumerable<byte> categoryIds, CancellationToken ct = default)
    {
        var keep = categoryIds.Distinct().ToList();

        var existing = await _db.UserInterestCategories
            .Where(i => i.UserId == userId)
            .ToListAsync(ct);

        _db.UserInterestCategories.RemoveRange(existing.Where(i => !keep.Contains(i.CategoryId)));
        var have = existing.Select(i => i.CategoryId).ToHashSet();
        _db.UserInterestCategories.AddRange(
            keep.Where(id => !have.Contains(id)).Select(id => new UserInterestCategory { UserId = userId, CategoryId = id }));

        await _db.SaveChangesAsync(ct);
    }

    // Targeted UPDATE rather than loading the user: the only field changing is
    // the avatar, and loading a tracked entity would invite a stale overwrite
    // of a concurrent profile edit.
    public async Task SetAvatarPathAsync(uint userId, string? avatarPath, CancellationToken ct = default)
    {
        await _db.Users
            .Where(u => u.UserId == userId)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.AvatarPath, avatarPath), ct);
    }

    // ---------- Email verification ----------

    public async Task AddEmailVerificationTokenAsync(EmailVerificationToken token, CancellationToken ct = default)
    {
        _db.EmailVerificationTokens.Add(token);
        await _db.SaveChangesAsync(ct);
    }

    // Tracked, not AsNoTracking: confirming a link stamps UsedAt and saves.
    public Task<EmailVerificationToken?> GetEmailVerificationTokenAsync(string tokenHash, CancellationToken ct = default) =>
        _db.EmailVerificationTokens
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash, ct);

    public async Task SetVerifiedAsync(uint userId, CancellationToken ct = default) =>
        await _db.Users
            .Where(u => u.UserId == userId)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.IsVerified, true), ct);

    public async Task<List<ActivityLog>> GetRecentActivityAsync(uint userId, int take, CancellationToken ct = default) =>
        await _db.ActivityLogs.AsNoTracking()
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.CreatedAt)
            .ThenByDescending(a => a.LogId)
            // LogId as the tie-break: several actions can share a CreatedAt to the
            // second, and without a deterministic second key the same row can
            // appear on one page load and not the next.
            .Take(take)
            .ToListAsync(ct);

    public async Task AddActivityAsync(ActivityLog log, CancellationToken ct = default)
    {
        _db.ActivityLogs.Add(log);
        await _db.SaveChangesAsync(ct);
    }
}

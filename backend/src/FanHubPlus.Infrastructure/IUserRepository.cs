// User repository, accounts, roles, bookmarks and ratings.
using FanHubPlus.Domain;
using Microsoft.EntityFrameworkCore;

namespace FanHubPlus.Infrastructure;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(uint userId, CancellationToken ct = default);
    Task<User?> GetByEmailAsync(string email, CancellationToken ct = default);

    /// Includes the Role navigation so role checks do not need a second query.
    Task<User?> GetWithRolesAsync(uint userId, CancellationToken ct = default);
    Task<User?> GetWithRolesByEmailAsync(string email, CancellationToken ct = default);

    Task<bool> EmailExistsAsync(string email, CancellationToken ct = default);
    Task AddAsync(User user, string roleName, CancellationToken ct = default);
    Task UpdateAsync(User user, CancellationToken ct = default);
    Task<List<User>> GetAllAsync(CancellationToken ct = default);
    Task SetRoleAsync(uint userId, string roleName, CancellationToken ct = default);

    Task<Bookmark?> GetBookmarkAsync(uint userId, uint contentId, CancellationToken ct = default);
    Task<List<Bookmark>> GetBookmarksAsync(uint userId, CancellationToken ct = default);
    Task AddBookmarkAsync(Bookmark bookmark, CancellationToken ct = default);
    Task RemoveBookmarkAsync(uint userId, uint contentId, CancellationToken ct = default);

    Task<MediaRating?> GetRatingAsync(uint userId, uint contentId, CancellationToken ct = default);
    Task<List<MediaRating>> GetRatingsAsync(uint userId, CancellationToken ct = default);
    Task SetRatingAsync(uint userId, uint contentId, byte stars, CancellationToken ct = default);
    Task<bool> RemoveRatingAsync(uint userId, uint contentId, CancellationToken ct = default);

    /// <summary>Returns a TRACKED token, because confirming stamps UsedAt on it.</summary>
    Task<PasswordResetToken?> GetResetTokenByHashAsync(string tokenHash, CancellationToken ct = default);
    Task AddResetTokenAsync(PasswordResetToken token, CancellationToken ct = default);

    // ---- Category lists (favourites and interests are separate) ----

    /// Category ids the member has favourited, ascending.
    Task<List<byte>> GetFavoriteCategoryIdsAsync(uint userId, CancellationToken ct = default);
    /// Category ids the member follows as an interest, ascending.
    Task<List<byte>> GetInterestCategoryIdsAsync(uint userId, CancellationToken ct = default);

    /// Replaces the whole set. Takes the ids to KEEP, so a category the caller
    /// dropped is removed rather than silently retained.
    Task SetFavoriteCategoriesAsync(uint userId, IEnumerable<byte> categoryIds, CancellationToken ct = default);
    Task SetInterestCategoriesAsync(uint userId, IEnumerable<byte> categoryIds, CancellationToken ct = default);

    Task SetAvatarPathAsync(uint userId, string? avatarPath, CancellationToken ct = default);

    // ---- Email verification ----

    Task AddEmailVerificationTokenAsync(EmailVerificationToken token, CancellationToken ct = default);
    /// Tracked, so the caller can stamp UsedAt and save without a second lookup.
    Task<EmailVerificationToken?> GetEmailVerificationTokenAsync(string tokenHash, CancellationToken ct = default);
    Task SetVerifiedAsync(uint userId, CancellationToken ct = default);

    /// The member's most recent actions, newest first. `take` is clamped by the
    /// caller; this returns raw rows in order.
    Task<List<ActivityLog>> GetRecentActivityAsync(uint userId, int take, CancellationToken ct = default);

    Task AddActivityAsync(ActivityLog log, CancellationToken ct = default);
}

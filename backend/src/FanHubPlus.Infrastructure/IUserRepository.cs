// User repository — accounts, roles, bookmarks and ratings.
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

    Task<PasswordResetToken?> GetResetTokenByHashAsync(string tokenHash, CancellationToken ct = default);
    Task AddResetTokenAsync(PasswordResetToken token, CancellationToken ct = default);

    Task AddActivityAsync(ActivityLog log, CancellationToken ct = default);
}

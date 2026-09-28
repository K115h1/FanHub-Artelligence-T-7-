// AdminService — the figures behind /admin/stats, and role management.
//
// Only counts that can be computed from real rows are returned. Nothing here
// invents a number, so a metric with no data reads as zero rather than as a
// chart of invented figures.
using FanHubPlus.Application.DTOs;
using FanHubPlus.Domain;
using FanHubPlus.Infrastructure;

namespace FanHubPlus.Application.Services;

public interface IAdminService
{
    Task<AdminStatsDto> GetStatsAsync(CancellationToken ct = default);
    Task<List<AdminStatsCategoryDto>> GetCategoryStatsAsync(CancellationToken ct = default);
    Task<List<AdminGenreStatDto>> GetGenreStatsAsync(int take = 20, CancellationToken ct = default);
    Task<List<UserDto>> GetUsersAsync(CancellationToken ct = default);
    Task SetUserRoleAsync(uint userId, string role, uint adminUserId, CancellationToken ct = default);
}

public class AdminService : IAdminService
{
    private readonly IContentRepository _content;
    private readonly IUserRepository _users;
    private readonly ICommunityRepository _community;

    public AdminService(
        IContentRepository content,
        IUserRepository users,
        ICommunityRepository community)
    {
        _content = content;
        _users = users;
        _community = community;
    }

    public async Task<AdminStatsDto> GetStatsAsync(CancellationToken ct = default)
    {
        var counts = await _content.GetCountsAsync(null, ct);
        var genres = await _content.CountDistinctGenreNamesAsync(ct);
        var categories = await _content.GetCategoriesAsync(ct);
        var users = await _users.GetAllAsync(ct);
        var feedback = await _community.GetFeedbackAsync(null, 1, 1, ct);
        // Named, because the repository gained an optional userId filter between
        // pageSize and ct — passing ct positionally no longer binds.
        var submissions = await _community.GetSubmissionsAsync(null, 1, 1, userId: null, kind: null, ct);

        return new AdminStatsDto(
            counts.Total,
            categories.Count,
            genres,
            counts.WithPoster,
            counts.WithSynopsis,
            counts.WithYear,
            users.Count,
            (int)feedback.TotalCount,
            (int)submissions.TotalCount);
    }

    /// <summary>Most-used genres across the whole catalogue, for the stats page.</summary>
    public async Task<List<AdminGenreStatDto>> GetGenreStatsAsync(
        int take = 20, CancellationToken ct = default)
    {
        var usage = await _content.GetGenreUsageAsync(take, ct);
        return usage.Select(u => new AdminGenreStatDto(u.Name, u.Count)).ToList();
    }

    public async Task<List<AdminStatsCategoryDto>> GetCategoryStatsAsync(CancellationToken ct = default)
    {
        var categories = await _content.GetCategoriesAsync(ct);
        var result = new List<AdminStatsCategoryDto>();

        foreach (var category in categories)
        {
            // Counts come from the database, not from a page of rows, so a
            // fandom with more than 100 titles is not undercounted.
            var counts = await _content.GetCountsAsync(category.CategoryId, ct);

            result.Add(new AdminStatsCategoryDto(
                category.Slug,
                category.Name,
                counts.Total,
                counts.WithPoster,
                counts.WithSynopsis));
        }

        return result;
    }

    public async Task<List<UserDto>> GetUsersAsync(CancellationToken ct = default)
    {
        var users = await _users.GetAllAsync(ct);

        return users.Select(u =>
        {
            var roles = u.UserRoles.Select(ur => ur.Role.Name).ToList();
            var role = roles.Contains("admin") ? "admin" : roles.FirstOrDefault() ?? "registered";

            return new UserDto(
                u.UserId, u.Name, u.Email, u.AvatarPath, u.Bio,
                u.IsVerified, role, u.CreatedAt);
        }).ToList();
    }

    public async Task SetUserRoleAsync(
        uint userId, string role, uint adminUserId, CancellationToken ct = default)
    {
        // Only two roles exist in the roles table. Anything else is a typo or
        // an attempt to invent a new privilege.
        if (role is not ("admin" or "registered"))
            throw new ValidationException("Role must be admin or registered.");

        if (userId == adminUserId && role != "admin")
            throw new ValidationException("You cannot remove your own administrator access.");

        await _users.SetRoleAsync(userId, role, ct);
        await _users.AddActivityAsync(new ActivityLog
        {
            UserId = adminUserId,
            Action = "user_role_change",
            TargetId = userId,
            CreatedAt = DateTime.UtcNow,
        }, ct);
    }
}

// ContentService — maps catalogue entities to DTOs and drives browsing.
using System.Globalization;
using System.Text;
using FanHubPlus.Application.DTOs;
using FanHubPlus.Domain;
using FanHubPlus.Infrastructure;

namespace FanHubPlus.Application.Services;

public interface IContentService
{
    Task<PagedResponse<ContentSummaryDto>> BrowseAsync(ContentQuery query, uint? currentUserId, CancellationToken ct = default);

    /// `categorySlug` disambiguates titles that share a slug across fandoms —
    /// "akira" exists in both Anime and Comics.
    Task<ContentDetailDto?> GetDetailAsync(string slug, string? categorySlug, uint? currentUserId, CancellationToken ct = default);
    Task<ContentDetailDto?> GetByIdAsync(uint contentId, uint? currentUserId, CancellationToken ct = default);
    Task<List<CategoryDto>> GetCategoriesAsync(CancellationToken ct = default);
    Task<List<GenreDto>> GetGenresAsync(byte? categoryId, CancellationToken ct = default);
    Task<ContentDetailDto> CreateAsync(CreateContentRequest request, uint adminUserId, CancellationToken ct = default);
    Task<ContentDetailDto> UpdateAsync(uint contentId, UpdateContentRequest request, uint adminUserId, CancellationToken ct = default);
    Task<bool> DeleteAsync(uint contentId, uint adminUserId, CancellationToken ct = default);

    Task<RatingDtoResult> SetRatingAsync(uint userId, uint contentId, int stars, CancellationToken ct = default);
    Task<bool> RemoveRatingAsync(uint userId, uint contentId, CancellationToken ct = default);
    Task<BookmarkResult> ToggleBookmarkAsync(uint userId, uint contentId, string? note, CancellationToken ct = default);
    Task<List<ContentSummaryDto>> GetBookmarksAsync(uint userId, CancellationToken ct = default);
}

public record RatingDtoResult(uint ContentId, int Stars);

public record BookmarkResult(uint ContentId, bool Saved);

public class ContentService : IContentService
{
    private readonly IContentRepository _content;
    private readonly IUserRepository _users;

    public ContentService(IContentRepository content, IUserRepository users)
    {
        _content = content;
        _users = users;
    }

    public async Task<PagedResponse<ContentSummaryDto>> BrowseAsync(
        ContentQuery query, uint? currentUserId, CancellationToken ct = default)
    {
        var page = await _content.BrowseAsync(query, ct);
        return new PagedResponse<ContentSummaryDto>(
            page.Items.Select(ToSummary).ToList(),
            page.TotalCount,
            page.Page,
            page.PageSize,
            page.PageCount);
    }

    public async Task<ContentDetailDto?> GetDetailAsync(
        string slug, string? categorySlug, uint? currentUserId, CancellationToken ct = default)
    {
        byte? categoryId = null;
        if (!string.IsNullOrWhiteSpace(categorySlug))
        {
            var category = await _content.GetCategoryBySlugAsync(categorySlug, ct);
            if (category is null) return null;
            categoryId = category.CategoryId;
        }

        var content = await _content.GetBySlugAsync(slug, categoryId, ct);
        return content is null ? null : await ToDetailAsync(content, currentUserId, ct);
    }

    public async Task<ContentDetailDto?> GetByIdAsync(
        uint contentId, uint? currentUserId, CancellationToken ct = default)
    {
        var content = await _content.GetByIdAsync(contentId, ct);
        return content is null ? null : await ToDetailAsync(content, currentUserId, ct);
    }

    public async Task<List<CategoryDto>> GetCategoriesAsync(CancellationToken ct = default)
    {
        var categories = await _content.GetCategoriesAsync(ct);
        var counts = await CountByCategoryAsync(ct);

        return categories
            .Select(c => new CategoryDto(
                c.CategoryId, c.Slug, c.Name, c.Description, c.AccentHex,
                counts.GetValueOrDefault(c.CategoryId)))
            .ToList();
    }

    public async Task<List<GenreDto>> GetGenresAsync(byte? categoryId, CancellationToken ct = default)
    {
        var genres = await _content.GetGenresAsync(categoryId, ct);
        return genres.Select(g => new GenreDto(g.GenreId, g.Name, g.Slug)).ToList();
    }

    public async Task<ContentDetailDto> CreateAsync(
        CreateContentRequest request, uint adminUserId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            throw new ValidationException("Title is required.");

        var content = new Content
        {
            CategoryId = request.CategoryId,
            Title = request.Title.Trim(),
            Slug = string.IsNullOrWhiteSpace(request.Slug) ? Slugify(request.Title) : request.Slug.Trim(),
            ContentType = ParseContentType(request.ContentType),
            Status = ParseContentStatus(request.Status),
            ShortSynopsis = request.ShortSynopsis,
            Synopsis = request.Synopsis,
            ReleaseYear = request.ReleaseYear,
            PosterPath = request.PosterPath,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        await _content.CreateAsync(content, ct);
        await LogAsync(adminUserId, "content_create", content.ContentId, ct);

        return await ToDetailAsync(content, adminUserId, ct);
    }

    public async Task<ContentDetailDto> UpdateAsync(
        uint contentId, UpdateContentRequest request, uint adminUserId, CancellationToken ct = default)
    {
        var content = await _content.GetByIdAsync(contentId, ct)
            ?? throw new ValidationException("That title no longer exists.");

        if (request.Title is not null)
        {
            if (string.IsNullOrWhiteSpace(request.Title))
                throw new ValidationException("Title cannot be blank.");
            content.Title = request.Title.Trim();
        }

        if (request.ShortSynopsis is not null) content.ShortSynopsis = request.ShortSynopsis;
        if (request.Synopsis is not null) content.Synopsis = request.Synopsis;
        if (request.ReleaseYear is not null) content.ReleaseYear = request.ReleaseYear;
        if (request.PosterPath is not null) content.PosterPath = request.PosterPath;
        if (request.Status is not null) content.Status = ParseContentStatus(request.Status);

        content.UpdatedAt = DateTime.UtcNow;
        await _content.UpdateAsync(content, ct);
        await LogAsync(adminUserId, "content_update", contentId, ct);

        return await ToDetailAsync(content, adminUserId, ct);
    }

    public async Task<bool> DeleteAsync(uint contentId, uint adminUserId, CancellationToken ct = default)
    {
        var deleted = await _content.DeleteAsync(contentId, ct);
        if (deleted)
            await LogAsync(adminUserId, "content_delete", contentId, ct);
        return deleted;
    }

    public async Task<RatingDtoResult> SetRatingAsync(
        uint userId, uint contentId, int stars, CancellationToken ct = default)
    {
        if (stars is < 1 or > 5)
            throw new ValidationException("Ratings run from 1 to 5.");

        var exists = await _content.GetByIdAsync(contentId, ct);
        if (exists is null)
            throw new ValidationException("That title no longer exists.");

        await _users.SetRatingAsync(userId, contentId, (byte)stars, ct);
        return new RatingDtoResult(contentId, stars);
    }

    public Task<bool> RemoveRatingAsync(uint userId, uint contentId, CancellationToken ct = default) =>
        _users.RemoveRatingAsync(userId, contentId, ct);

    public async Task<BookmarkResult> ToggleBookmarkAsync(
        uint userId, uint contentId, string? note, CancellationToken ct = default)
    {
        var existing = await _users.GetBookmarkAsync(userId, contentId, ct);

        if (existing is not null)
        {
            await _users.RemoveBookmarkAsync(userId, contentId, ct);
            return new BookmarkResult(contentId, false);
        }

        await _users.AddBookmarkAsync(new Bookmark
        {
            UserId = userId,
            ContentId = contentId,
            Note = note,
            CreatedAt = DateTime.UtcNow,
        }, ct);

        return new BookmarkResult(contentId, true);
    }

    public async Task<List<ContentSummaryDto>> GetBookmarksAsync(uint userId, CancellationToken ct = default)
    {
        var bookmarks = await _users.GetBookmarksAsync(userId, ct);
        return bookmarks.Select(b => ToSummary(b.Content)).ToList();
    }

    // ---------- helpers ----------

    private async Task<ContentDetailDto> ToDetailAsync(
        Content content, uint? currentUserId, CancellationToken ct)
    {
        double? userRating = null;
        if (currentUserId.HasValue)
        {
            var rating = await _users.GetRatingAsync(currentUserId.Value, content.ContentId, ct);
            if (rating is not null) userRating = rating.Stars;
        }

        return new ContentDetailDto(
            content.ContentId,
            content.Title,
            content.Slug,
            content.ContentType.ToString(),
            content.Status.ToString(),
            content.Category?.Slug ?? string.Empty,
            content.Category?.Name ?? string.Empty,
            content.Synopsis,
            content.ShortSynopsis,
            content.ReleaseDate,
            content.ReleaseYear,
            content.RuntimeMinutes,
            content.EpisodeCount,
            content.Language,
            content.Country,
            content.Creator,
            content.CastList,
            content.PosterPath,
            content.BackdropPath,
            content.CommunityRating,
            content.CommunityRatingCount,
            content.PopularityScore,
            content.ViewCount,
            content.ExternalId,
            content.ExternalSource,
            content.ContentGenres.Select(cg => cg.Genre.Name).ToList(),
            userRating);
    }

    private static ContentSummaryDto ToSummary(Content c) => new(
        c.ContentId,
        c.Title,
        c.Slug,
        c.ContentType.ToString(),
        c.Status.ToString(),
        c.Category?.Slug ?? string.Empty,
        c.ShortSynopsis,
        c.PosterPath,
        c.ReleaseYear,
        c.CommunityRating,
        c.ViewCount,
        c.ContentGenres.Select(cg => cg.Genre.Name).ToList());

    // One cheap count query per category. The catalogue is small enough that
    // this beats a hand-written GROUP BY, and it reuses the existing filter.
    private async Task<Dictionary<byte, int>> CountByCategoryAsync(CancellationToken ct)
    {
        var counts = new Dictionary<byte, int>();

        foreach (var category in await _content.GetCategoriesAsync(ct))
        {
            var page = await _content.BrowseAsync(
                new ContentQuery { CategoryId = category.CategoryId, PageSize = 1 }, ct);
            counts[category.CategoryId] = page.TotalCount;
        }

        return counts;
    }

    private Task LogAsync(uint userId, string action, uint targetId, CancellationToken ct) =>
        _users.AddActivityAsync(new ActivityLog
        {
            UserId = userId,
            Action = action,
            TargetId = targetId,
            CreatedAt = DateTime.UtcNow,
        }, ct);

    // Slugs are the URL identifier, so they must be URL-safe. Public because the
    // unit tests cover it directly, and admin tooling may want the same rule.
    public static string Slugify(string text)
    {
        var normalized = text.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder();

        foreach (var ch in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(ch) == UnicodeCategory.NonSpacingMark)
                continue; // drop the accent: "Les Misérables" -> "les-miserables"

            if (char.IsLetterOrDigit(ch)) sb.Append(char.ToLowerInvariant(ch));
            else if (sb.Length > 0 && sb[^1] != '-') sb.Append('-');
        }

        return sb.ToString().Trim('-');
    }

    private static ContentType ParseContentType(string value) =>
        Enum.TryParse<ContentType>(value, ignoreCase: true, out var parsed) ? parsed : ContentType.Movie;

    private static ContentStatus ParseContentStatus(string? value) =>
        string.IsNullOrWhiteSpace(value) || !Enum.TryParse<ContentStatus>(value, ignoreCase: true, out var parsed)
            ? ContentStatus.Released
            : parsed;
}

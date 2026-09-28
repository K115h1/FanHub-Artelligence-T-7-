// Content repository — reads and writes the catalogue.
//
// Returns entities, not DTOs. Mapping to DTOs is the Application layer's job,
// so database entities never reach a controller.
using FanHubPlus.Domain;
using Microsoft.EntityFrameworkCore;

namespace FanHubPlus.Infrastructure;

// Filter and paging for a catalogue search. One object rather than a long
// parameter list on the method.
public class ContentQuery
{
    public string? Search { get; set; }
    public byte? CategoryId { get; set; }
    public string? CategorySlug { get; set; }
    public ushort? GenreId { get; set; }
    public ContentType? Type { get; set; }
    public ContentStatus? Status { get; set; }

    /// Inclusive release-year bounds, for the Explorer's era filter. Either
    /// alone is a half-open range.
    ///
    /// A null ReleaseYear is excluded whenever a bound is set. A title with no
    /// year cannot be inside any range, and letting the comparison decide would
    /// mean the result depends on how the database happens to sort NULLs.
    public int? YearFrom { get; set; }
    public int? YearTo { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 24;
    public string SortBy { get; set; } = "popular";
}

public class PagedResult<T>
{
    public List<T> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int PageCount => PageSize <= 0 ? 0 : (int)Math.Ceiling(TotalCount / (double)PageSize);
}

public interface IContentRepository
{
    Task<PagedResult<Content>> BrowseAsync(ContentQuery query, CancellationToken ct = default);
    Task<Content?> GetByIdAsync(uint contentId, CancellationToken ct = default);
    Task<Content?> GetBySlugAsync(string slug, byte? categoryId = null, CancellationToken ct = default);
    Task<Content> CreateAsync(Content content, CancellationToken ct = default);
    Task UpdateAsync(Content content, CancellationToken ct = default);
    Task<bool> DeleteAsync(uint contentId, CancellationToken ct = default);
    /// Bumps view_count by one. Returns the number of rows affected, which is 0
    /// when the id does not exist — the caller needs that to answer 404, and
    /// learning it here is far cheaper than building a whole detail DTO to
    /// check for null.
    Task<int> IncrementViewCountAsync(uint contentId, CancellationToken ct = default);

    Task<List<Category>> GetCategoriesAsync(CancellationToken ct = default);
    Task<Category?> GetCategoryBySlugAsync(string slug, CancellationToken ct = default);
    Task<Category?> GetCategoryByIdAsync(byte categoryId, CancellationToken ct = default);
    Task<List<Genre>> GetGenresAsync(byte? categoryId = null, CancellationToken ct = default);
    Task SetGenresAsync(uint contentId, byte categoryId, IEnumerable<string> genreNames, CancellationToken ct = default);
    Task<List<Content>> GetByIdsAsync(IEnumerable<uint> ids, CancellationToken ct = default);

    /// Catalogue totals for the admin dashboard, computed in the database rather
    /// than by paging every row into memory. Pass a categoryId to scope it.
    Task<CatalogCounts> GetCountsAsync(byte? categoryId = null, CancellationToken ct = default);
    Task<int> CountDistinctGenreNamesAsync(CancellationToken ct = default);
    Task<List<(string Name, int Count)>> GetGenreUsageAsync(int take = 20, CancellationToken ct = default);
}

public record CatalogCounts(int Total, int WithPoster, int WithSynopsis, int WithYear);

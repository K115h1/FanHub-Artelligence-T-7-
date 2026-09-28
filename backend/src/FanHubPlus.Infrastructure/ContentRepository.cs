// EF Core implementation of IContentRepository.
using FanHubPlus.Domain;
using Microsoft.EntityFrameworkCore;

namespace FanHubPlus.Infrastructure;

public class ContentRepository : IContentRepository
{
    private readonly AppDbContext _db;

    public ContentRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task<PagedResult<Content>> BrowseAsync(ContentQuery query, CancellationToken ct = default)
    {
        // Declared as IQueryable so the filters below can reassign it: `var`
        // would infer IIncludableQueryable from the Include and reject the
        // later Where/OrderBy results.
        //
        // Category is included because ContentSummaryDto reads c.Category.Slug
        // for the card badge. Without it EF leaves the navigation null and every
        // card renders an empty category label.
        IQueryable<Content> q = _db.Contents
            .AsNoTracking()
            .Include(c => c.Category)
            .Include(c => c.ContentGenres).ThenInclude(cg => cg.Genre);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim();
            // EF translates this to a parameterised LIKE, never string-concatenated SQL.
            q = q.Where(c => c.Title.Contains(term) || (c.Synopsis != null && c.Synopsis.Contains(term)));
        }

        if (query.CategoryId.HasValue)
            q = q.Where(c => c.CategoryId == query.CategoryId.Value);

        if (!string.IsNullOrWhiteSpace(query.CategorySlug))
        {
            var slug = query.CategorySlug;
            q = q.Where(c => c.Category.Slug == slug);
        }

        if (query.GenreId.HasValue)
            q = q.Where(c => c.ContentGenres.Any(cg => cg.GenreId == query.GenreId.Value));

        if (query.Type.HasValue)
            q = q.Where(c => c.ContentType == query.Type.Value);

        if (query.Status.HasValue)
            q = q.Where(c => c.Status == query.Status.Value);

        if (query.YearFrom.HasValue)
            q = q.Where(c => c.ReleaseYear != null && c.ReleaseYear >= query.YearFrom.Value);

        if (query.YearTo.HasValue)
            q = q.Where(c => c.ReleaseYear != null && c.ReleaseYear <= query.YearTo.Value);

        var total = await q.CountAsync(ct);

        q = query.SortBy switch
        {
            "title" => q.OrderBy(c => c.Title),
            "year" => q.OrderByDescending(c => c.ReleaseYear).ThenBy(c => c.Title),
            "rating" => q.OrderByDescending(c => c.CommunityRating).ThenBy(c => c.Title),
            "newest" => q.OrderByDescending(c => c.CreatedAt),
            _ => q.OrderByDescending(c => c.PopularityScore).ThenBy(c => c.Title),
        };

        var page = query.Page < 1 ? 1 : query.Page;
        var size = query.PageSize is < 1 or > 100 ? 24 : query.PageSize;

        var items = await q.Skip((page - 1) * size).Take(size).ToListAsync(ct);

        return new PagedResult<Content>
        {
            Items = items,
            TotalCount = total,
            Page = page,
            PageSize = size,
        };
    }

    public Task<Content?> GetByIdAsync(uint contentId, CancellationToken ct = default) =>
        _db.Contents
            .Include(c => c.ContentGenres).ThenInclude(cg => cg.Genre)
            .Include(c => c.Category)
            .FirstOrDefaultAsync(c => c.ContentId == contentId, ct);

    public Task<Content?> GetBySlugAsync(string slug, byte? categoryId = null, CancellationToken ct = default)
    {
        var q = _db.Contents
            .Include(c => c.ContentGenres).ThenInclude(cg => cg.Genre)
            .Include(c => c.Category)
            .AsQueryable();

        // Slug is unique per category, not globally, so "akira" legitimately
        // matches in both Anime and Comics.
        q = q.Where(c => c.Slug == slug);
        if (categoryId.HasValue)
            q = q.Where(c => c.CategoryId == categoryId.Value);

        return q.FirstOrDefaultAsync(ct);
    }

    public async Task<Content> CreateAsync(Content content, CancellationToken ct = default)
    {
        _db.Contents.Add(content);
        await _db.SaveChangesAsync(ct);
        return content;
    }

    public async Task UpdateAsync(Content content, CancellationToken ct = default)
    {
        _db.Contents.Update(content);
        await _db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Replace a title's genres with the named set, creating any that do not
    /// exist yet.
    /// </summary>
    /// <remarks>
    /// A replace rather than an append, because the admin editor shows genres as
    /// a complete list and saving it back means "these and only these". Names
    /// arrive as strings from the form, so each one is resolved to (or created
    /// as) a row in `genres` — the join table can only carry ids.
    ///
    /// Genre is shared across the catalogue rather than owned by a content row,
    /// so a new name here also becomes selectable on every other title in the
    /// same category. That is the same behaviour as the seed importer.
    /// </remarks>
    public async Task SetGenresAsync(
        uint contentId, byte categoryId, IEnumerable<string> genreNames, CancellationToken ct = default)
    {
        var wanted = genreNames
            .Where(n => !string.IsNullOrWhiteSpace(n))
            .Select(n => n.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var content = await _db.Contents
            .Include(c => c.ContentGenres)
            .FirstOrDefaultAsync(c => c.ContentId == contentId, ct);
        if (content is null) return;

        // Orphan the existing links rather than deleting them: the genres
        // themselves are shared and must survive the edit.
        _db.ContentGenres.RemoveRange(content.ContentGenres);
        content.ContentGenres.Clear();

        if (wanted.Count > 0)
        {
            var existing = await _db.Genres
                .Where(g => g.CategoryId == categoryId && wanted.Contains(g.Name))
                .ToListAsync(ct);

            var known = existing.Select(g => g.Name).ToHashSet(StringComparer.OrdinalIgnoreCase);
            foreach (var name in wanted.Where(n => !known.Contains(n)))
                content.ContentGenres.Add(new ContentGenre { Genre = new Genre { Name = name, CategoryId = categoryId } });
            foreach (var name in wanted.Where(known.Contains))
                content.ContentGenres.Add(new ContentGenre { Genre = existing.First(g => g.Name.Equals(name, StringComparison.OrdinalIgnoreCase)) });

            await _db.SaveChangesAsync(ct);
        }

        await _db.SaveChangesAsync(ct);
    }

    public async Task<bool> DeleteAsync(uint contentId, CancellationToken ct = default)
    {
        var content = await _db.Contents.FindAsync([contentId], ct);
        if (content is null) return false;
        _db.Contents.Remove(content);
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task IncrementViewCountAsync(uint contentId, CancellationToken ct = default)
    {
        // Single UPDATE rather than read-modify-write, so two concurrent views
        // cannot overwrite each other.
        await _db.Contents
            .Where(c => c.ContentId == contentId)
            .ExecuteUpdateAsync(s => s.SetProperty(c => c.ViewCount, c => c.ViewCount + 1), ct);
    }

    public Task<List<Category>> GetCategoriesAsync(CancellationToken ct = default) =>
        _db.Categories.AsNoTracking().OrderBy(c => c.Name).ToListAsync(ct);

    public Task<Category?> GetCategoryBySlugAsync(string slug, CancellationToken ct = default) =>
        _db.Categories.AsNoTracking().FirstOrDefaultAsync(c => c.Slug == slug, ct);

    public Task<Category?> GetCategoryByIdAsync(byte categoryId, CancellationToken ct = default) =>
        _db.Categories.AsNoTracking().FirstOrDefaultAsync(c => c.CategoryId == categoryId, ct);

    public Task<List<Genre>> GetGenresAsync(byte? categoryId = null, CancellationToken ct = default)
    {
        var q = _db.Genres.AsNoTracking().AsQueryable();
        if (categoryId.HasValue)
            q = q.Where(g => g.CategoryId == categoryId.Value);
        return q.OrderBy(g => g.Name).ToListAsync(ct);
    }

    public async Task<List<Content>> GetByIdsAsync(IEnumerable<uint> ids, CancellationToken ct = default)
    {
        var list = ids.Distinct().ToList();
        if (list.Count == 0) return [];

        return await _db.Contents
            .AsNoTracking()
            .Include(c => c.Category)
            .Include(c => c.ContentGenres).ThenInclude(cg => cg.Genre)
            .Where(c => list.Contains(c.ContentId))
            .ToListAsync(ct);
    }

    public async Task<CatalogCounts> GetCountsAsync(byte? categoryId = null, CancellationToken ct = default)
    {
        // Four aggregates in one round trip, rather than four counts or a page
        // of rows walked in memory. Scoping by category gives the per-fandom
        // dashboard its numbers without loading the rows.
        IQueryable<Content> q = _db.Contents.AsNoTracking();
        if (categoryId.HasValue)
            q = q.Where(c => c.CategoryId == categoryId.Value);

        var total = await q.CountAsync(ct);
        var withPoster = await q.CountAsync(c => c.PosterPath != null, ct);
        var withSynopsis = await q.CountAsync(c => c.Synopsis != null, ct);
        var withYear = await q.CountAsync(c => c.ReleaseYear != null, ct);

        return new CatalogCounts(total, withPoster, withSynopsis, withYear);
    }

    // Genres are unique per (category, name), so the same name can appear more
    // than once. The dashboard shows distinct names, which is what the genre
    // filter on the frontend offers.
    public async Task<int> CountDistinctGenreNamesAsync(CancellationToken ct = default) =>
        await _db.Genres.AsNoTracking().Select(g => g.Name).Distinct().CountAsync(ct);

    /// <summary>
    /// How many titles carry each genre, most used first.
    /// </summary>
    /// <remarks>
    /// A GROUP BY over the join table rather than a walk of the catalogue. The
    /// frontend used to derive this by counting a bundled array holding every
    /// row, which was only possible because it had the whole catalogue; with
    /// paging done in SQL it could only ever have counted the 25 rows on screen
    /// while presenting the result as a catalogue-wide figure.
    /// </remarks>
    public async Task<List<(string Name, int Count)>> GetGenreUsageAsync(
        int take = 20, CancellationToken ct = default)
    {
        var query =
            from cg in _db.ContentGenres.AsNoTracking()
            join g in _db.Genres.AsNoTracking() on cg.GenreId equals g.GenreId
            group cg by g.Name into grouped
            select new { Name = grouped.Key, Count = grouped.Count() };

        var rows = await query
            .OrderByDescending(x => x.Count)
            .ThenBy(x => x.Name)
            .Take(take is < 1 or > 100 ? 20 : take)
            .ToListAsync(ct);

        return rows.Select(x => (x.Name, x.Count)).ToList();
    }
}

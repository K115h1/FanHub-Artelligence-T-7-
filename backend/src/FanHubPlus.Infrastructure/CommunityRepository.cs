// EF Core implementation of ICommunityRepository.
using FanHubPlus.Domain;
using Microsoft.EntityFrameworkCore;

namespace FanHubPlus.Infrastructure;

public class CommunityRepository : ICommunityRepository
{
    private readonly AppDbContext _db;

    public CommunityRepository(AppDbContext db)
    {
        _db = db;
    }

    public Task<List<FanEvent>> GetEventsAsync(byte? categoryId = null, CancellationToken ct = default)
    {
        var q = _db.FanEvents.AsNoTracking().Include(e => e.Category).AsQueryable();
        if (categoryId.HasValue)
            q = q.Where(e => e.CategoryId == categoryId.Value);

        // Events with no date are treated as furthest away rather than dropped.
        return q.OrderBy(e => e.StartsAt == null ? DateTime.MaxValue : e.StartsAt).ToListAsync(ct);
    }

    public Task<FanEvent?> GetEventByIdAsync(uint eventId, CancellationToken ct = default) =>
        _db.FanEvents.AsNoTracking().Include(e => e.Category).FirstOrDefaultAsync(e => e.EventId == eventId, ct);

    public async Task<PagedResult<Feedback>> GetFeedbackAsync(
        FeedbackStatus? status, int page, int pageSize, uint? userId = null,
        CancellationToken ct = default)
    {
        var q = _db.Feedback.AsNoTracking().Include(f => f.User).AsQueryable();
        if (status.HasValue)
            q = q.Where(f => f.Status == status.Value);

        // Filtered in SQL, for the same reason submissions are: the "mine"
        // endpoint has to scope to the token's own user, and paging over
        // everyone's feedback first would leak rows once there are more than a
        // page. Anonymous feedback has a null user_id and so never matches.
        if (userId.HasValue)
            q = q.Where(f => f.UserId == userId.Value);

        var total = await q.CountAsync(ct);
        var p = page < 1 ? 1 : page;
        var size = pageSize is < 1 or > 100 ? 25 : pageSize;

        var items = await q
            .OrderByDescending(f => f.CreatedAt)
            .Skip((p - 1) * size).Take(size)
            .ToListAsync(ct);

        return new PagedResult<Feedback> { Items = items, TotalCount = total, Page = p, PageSize = size };
    }

    public Task<Feedback?> GetFeedbackByIdAsync(uint feedbackId, CancellationToken ct = default) =>
        _db.Feedback.AsNoTracking().Include(f => f.User).FirstOrDefaultAsync(f => f.FeedbackId == feedbackId, ct);

    public async Task<Feedback> AddFeedbackAsync(Feedback feedback, CancellationToken ct = default)
    {
        _db.Feedback.Add(feedback);
        await _db.SaveChangesAsync(ct);
        return feedback;
    }

    public async Task SetFeedbackStatusAsync(uint feedbackId, FeedbackStatus status, CancellationToken ct = default)
    {
        var row = await _db.Feedback.FirstOrDefaultAsync(f => f.FeedbackId == feedbackId, ct);
        if (row is null) return;

        row.Status = status;
        row.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    public async Task DeleteFeedbackAsync(uint feedbackId, CancellationToken ct = default)
    {
        var row = await _db.Feedback.FirstOrDefaultAsync(f => f.FeedbackId == feedbackId, ct);
        if (row is null) return;

        _db.Feedback.Remove(row);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<PagedResult<FanSubmission>> GetSubmissionsAsync(
        SubmissionStatus? status, int page, int pageSize, uint? userId = null,
        SubmissionKind? kind = null, CancellationToken ct = default)
    {
        var q = _db.FanSubmissions.AsNoTracking()
            .Include(s => s.User).Include(s => s.Category).AsQueryable();
        if (status.HasValue)
            q = q.Where(s => s.Status == status.Value);

        // Filters in SQL, not after the fact. The controller's "mine" endpoint
        // used to page over everyone's submissions and then discard all but the
        // caller's, so past page 1 it returned other people's rows and dropped
        // the caller's own - and it matched on display name, so anyone sharing a
        // name saw them too.
        if (userId.HasValue)
            q = q.Where(s => s.UserId == userId.Value);

        // Which kind of fan content, for the queue's filter.
        if (kind.HasValue)
            q = q.Where(s => s.Kind == kind.Value);

        var total = await q.CountAsync(ct);
        var p = page < 1 ? 1 : page;
        var size = pageSize is < 1 or > 100 ? 25 : pageSize;

        // Pending first, newest within each group: clearing the queue is the
        // job, and interleaving decided items with waiting ones buries them.
        var items = await q
            .OrderBy(s => s.Status == SubmissionStatus.Pending ? 0 : 1)
            .ThenByDescending(s => s.CreatedAt)
            .Skip((p - 1) * size).Take(size)
            .ToListAsync(ct);

        return new PagedResult<FanSubmission> { Items = items, TotalCount = total, Page = p, PageSize = size };
    }

    public Task<FanSubmission?> GetSubmissionByIdAsync(uint submissionId, CancellationToken ct = default) =>
        _db.FanSubmissions.AsNoTracking()
            .Include(s => s.User).Include(s => s.Category)
            .FirstOrDefaultAsync(s => s.SubmissionId == submissionId, ct);

    public async Task<FanSubmission> AddSubmissionAsync(FanSubmission submission, CancellationToken ct = default)
    {
        _db.FanSubmissions.Add(submission);
        await _db.SaveChangesAsync(ct);
        return submission;
    }

    public async Task SetSubmissionStatusAsync(
        uint submissionId, SubmissionStatus status, uint adminUserId, string? note, CancellationToken ct = default)
    {
        var row = await _db.FanSubmissions.FirstOrDefaultAsync(s => s.SubmissionId == submissionId, ct);
        if (row is null) return;

        row.Status = status;
        row.ModeratorNote = note;
        row.DecidedBy = adminUserId;
        row.DecidedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    public async Task<Dictionary<string, int>> GetSubmissionCountsAsync(CancellationToken ct = default)
    {
        // One grouped query rather than three counts, so the filter chips cost
        // a single round trip. Keys go out in the stored lowercase form, because
        // a Dictionary<SubmissionStatus, _> would serialise as {"Pending": 4} and
        // the client's filter list is spelled in lowercase.
        var grouped = await _db.FanSubmissions.AsNoTracking()
            .GroupBy(s => s.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        return grouped.ToDictionary(
            x => EnumConverter.ToWireString(x.Status),
            x => x.Count);
    }

    public Task<List<MerchandiseItem>> GetMerchandiseAsync(byte? categoryId = null, CancellationToken ct = default)
    {
        var q = _db.MerchandiseItems.AsNoTracking().Include(m => m.Category).AsQueryable();
        if (categoryId.HasValue)
            q = q.Where(m => m.CategoryId == categoryId.Value);

        return q.OrderByDescending(m => m.IsUpcoming).ThenBy(m => m.Name).ToListAsync(ct);
    }

    public async Task<PagedResult<MerchandiseItem>> BrowseMerchandiseAsync(
        MerchandiseQuery query, CancellationToken ct = default)
    {
        IQueryable<MerchandiseItem> q = _db.MerchandiseItems
            .AsNoTracking()
            .Include(m => m.Category);

        if (query.CategoryId.HasValue)
            q = q.Where(m => m.CategoryId == query.CategoryId.Value);

        if (query.IsUpcoming.HasValue)
            q = q.Where(m => m.IsUpcoming == query.IsUpcoming.Value);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim();
            q = q.Where(m =>
                m.Name.Contains(term) ||
                m.Description!.Contains(term) ||
                m.Tag!.Contains(term));
        }

        var total = await q.CountAsync(ct);

        q = query.SortBy switch
        {
            "newest" => q.OrderByDescending(m => m.CreatedAt).ThenBy(m => m.Name),
            "views" => q.OrderByDescending(m => m.ViewCount).ThenBy(m => m.Name),
            _ => q.OrderByDescending(m => m.IsUpcoming).ThenBy(m => m.Name),
        };

        var page = query.Page < 1 ? 1 : query.Page;
        var size = query.PageSize is < 1 or > 100 ? 24 : query.PageSize;

        return new PagedResult<MerchandiseItem>
        {
            Items = await q.Skip((page - 1) * size).Take(size).ToListAsync(ct),
            TotalCount = total,
            Page = page,
            PageSize = size,
        };
    }

    public Task<MerchandiseItem?> GetMerchandiseByIdAsync(uint itemId, CancellationToken ct = default) =>
        _db.MerchandiseItems
            .AsNoTracking()
            .Include(m => m.Category)
            .FirstOrDefaultAsync(m => m.ItemId == itemId, ct);

    public async Task<MerchandiseItem> AddMerchandiseAsync(MerchandiseItem item, CancellationToken ct = default)
    {
        _db.MerchandiseItems.Add(item);
        await _db.SaveChangesAsync(ct);
        return item;
    }

    public async Task UpdateMerchandiseAsync(MerchandiseItem item, CancellationToken ct = default)
    {
        _db.MerchandiseItems.Update(item);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<bool> DeleteMerchandiseAsync(uint itemId, CancellationToken ct = default)
    {
        var item = await _db.MerchandiseItems.FirstOrDefaultAsync(m => m.ItemId == itemId, ct);
        if (item is null) return false;
        _db.MerchandiseItems.Remove(item);
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public Task<bool> MerchandiseSlugExistsAsync(
        string slug, uint? excludeItemId = null, CancellationToken ct = default) =>
        _db.MerchandiseItems
            .AsNoTracking()
            .AnyAsync(m => m.Slug == slug && (!excludeItemId.HasValue || m.ItemId != excludeItemId.Value), ct);

    public Task<List<UpcomingRelease>> GetUpcomingReleasesAsync(CancellationToken ct = default) =>
        _db.UpcomingReleases.AsNoTracking()
            .Include(r => r.Category)
            .OrderBy(r => r.ReleaseDate == null ? DateOnly.MaxValue : r.ReleaseDate)
            .ToListAsync(ct);

    public Task<List<CharacterProfile>> GetCharactersAsync(byte? categoryId = null, CancellationToken ct = default)
    {
        var q = _db.CharacterProfiles.AsNoTracking().Include(c => c.Category).AsQueryable();
        if (categoryId.HasValue)
            q = q.Where(c => c.CategoryId == categoryId.Value);

        return q.OrderBy(c => c.Name).ToListAsync(ct);
    }

    public Task<CharacterProfile?> GetCharacterBySlugAsync(string slug, CancellationToken ct = default) =>
        _db.CharacterProfiles.AsNoTracking()
            .Include(c => c.Category)
            .Include(c => c.Content)
            .FirstOrDefaultAsync(c => c.Slug == slug, ct);
}

// Community repository, events, feedback, submissions, merchandise.
using FanHubPlus.Domain;
using Microsoft.EntityFrameworkCore;

namespace FanHubPlus.Infrastructure;

public interface ICommunityRepository
{
    Task<List<FanEvent>> GetEventsAsync(byte? categoryId = null, CancellationToken ct = default);
    Task<FanEvent?> GetEventByIdAsync(uint eventId, CancellationToken ct = default);

    /// <summary>
    /// One page of the feedback queue. Pass <paramref name="userId"/> for the
    /// signed-in fan's own entries; the admin queue leaves it null for everyone's.
    /// </summary>
    Task<PagedResult<Feedback>> GetFeedbackAsync(FeedbackStatus? status, int page, int pageSize, uint? userId = null, CancellationToken ct = default);
    Task<Feedback?> GetFeedbackByIdAsync(uint feedbackId, CancellationToken ct = default);
    Task<Feedback> AddFeedbackAsync(Feedback feedback, CancellationToken ct = default);
    Task SetFeedbackStatusAsync(uint feedbackId, FeedbackStatus status, CancellationToken ct = default);
    Task DeleteFeedbackAsync(uint feedbackId, CancellationToken ct = default);

    Task<PagedResult<FanSubmission>> GetSubmissionsAsync(SubmissionStatus? status, int page, int pageSize, uint? userId = null, SubmissionKind? kind = null, CancellationToken ct = default);
    Task<FanSubmission?> GetSubmissionByIdAsync(uint submissionId, CancellationToken ct = default);
    Task<FanSubmission> AddSubmissionAsync(FanSubmission submission, CancellationToken ct = default);

    /// Records the decision along with who made it and when.
    Task SetSubmissionStatusAsync(uint submissionId, SubmissionStatus status, uint adminUserId, string? note, CancellationToken ct = default);

    /// How many submissions sit in each status, for the queue's filter chips.
    Task<Dictionary<string, int>> GetSubmissionCountsAsync(CancellationToken ct = default);

    Task<Dictionary<byte, List<string>>> GetCoverPoolsAsync(int perCategory, CancellationToken ct = default);

    Task<List<MerchandiseItem>> GetMerchandiseAsync(byte? categoryId = null, CancellationToken ct = default);
    Task<PagedResult<MerchandiseItem>> BrowseMerchandiseAsync(MerchandiseQuery query, CancellationToken ct = default);
    Task<MerchandiseItem?> GetMerchandiseByIdAsync(uint itemId, CancellationToken ct = default);
    Task<MerchandiseItem> AddMerchandiseAsync(MerchandiseItem item, CancellationToken ct = default);
    Task UpdateMerchandiseAsync(MerchandiseItem item, CancellationToken ct = default);
    Task<bool> DeleteMerchandiseAsync(uint itemId, CancellationToken ct = default);
    Task<bool> MerchandiseSlugExistsAsync(string slug, uint? excludeItemId = null, CancellationToken ct = default);

    Task<List<UpcomingRelease>> GetUpcomingReleasesAsync(CancellationToken ct = default);
    Task<List<CharacterProfile>> GetCharactersAsync(byte? categoryId = null, CancellationToken ct = default);
    Task<CharacterProfile?> GetCharacterBySlugAsync(string slug, CancellationToken ct = default);
}

public class MerchandiseQuery
{
    public byte? CategoryId { get; set; }
    public string? Search { get; set; }
    public bool? IsUpcoming { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 24;
    public string SortBy { get; set; } = "name";
}

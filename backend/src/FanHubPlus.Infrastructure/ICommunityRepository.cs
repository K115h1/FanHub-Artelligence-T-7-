// Community repository — events, feedback, submissions, merchandise.
using FanHubPlus.Domain;
using Microsoft.EntityFrameworkCore;

namespace FanHubPlus.Infrastructure;

public interface ICommunityRepository
{
    Task<List<FanEvent>> GetEventsAsync(byte? categoryId = null, CancellationToken ct = default);
    Task<FanEvent?> GetEventByIdAsync(uint eventId, CancellationToken ct = default);

    Task<PagedResult<Feedback>> GetFeedbackAsync(FeedbackStatus? status, int page, int pageSize, CancellationToken ct = default);
    Task<Feedback?> GetFeedbackByIdAsync(uint feedbackId, CancellationToken ct = default);
    Task<Feedback> AddFeedbackAsync(Feedback feedback, CancellationToken ct = default);
    Task SetFeedbackStatusAsync(uint feedbackId, FeedbackStatus status, CancellationToken ct = default);
    Task DeleteFeedbackAsync(uint feedbackId, CancellationToken ct = default);

    Task<PagedResult<FanSubmission>> GetSubmissionsAsync(SubmissionStatus? status, int page, int pageSize, CancellationToken ct = default);
    Task<FanSubmission?> GetSubmissionByIdAsync(uint submissionId, CancellationToken ct = default);
    Task<FanSubmission> AddSubmissionAsync(FanSubmission submission, CancellationToken ct = default);
    Task SetSubmissionStatusAsync(uint submissionId, SubmissionStatus status, CancellationToken ct = default);

    Task<List<MerchandiseItem>> GetMerchandiseAsync(byte? categoryId = null, CancellationToken ct = default);
    Task<List<UpcomingRelease>> GetUpcomingReleasesAsync(CancellationToken ct = default);
    Task<List<CharacterProfile>> GetCharactersAsync(byte? categoryId = null, CancellationToken ct = default);
    Task<CharacterProfile?> GetCharacterBySlugAsync(string slug, CancellationToken ct = default);
}

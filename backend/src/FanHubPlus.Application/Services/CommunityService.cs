// CommunityService — events, feedback, submissions, merchandise, characters.
using FanHubPlus.Application.DTOs;
using FanHubPlus.Domain;
using FanHubPlus.Infrastructure;

namespace FanHubPlus.Application.Services;

public interface ICommunityService
{
    Task<List<EventDto>> GetEventsAsync(byte? categoryId, CancellationToken ct = default);
    Task<EventDto?> GetEventAsync(uint eventId, CancellationToken ct = default);

    Task<PagedResponse<FeedbackDto>> GetFeedbackAsync(FeedbackStatus? status, int page, int pageSize, CancellationToken ct = default);
    Task<FeedbackDto> SubmitFeedbackAsync(CreateFeedbackRequest request, uint? userId, CancellationToken ct = default);
    Task SetFeedbackStatusAsync(uint feedbackId, FeedbackStatus status, uint adminUserId, CancellationToken ct = default);
    Task DeleteFeedbackAsync(uint feedbackId, uint adminUserId, CancellationToken ct = default);

    Task<PagedResponse<SubmissionDto>> GetSubmissionsAsync(SubmissionStatus? status, int page, int pageSize, CancellationToken ct = default);
    Task<SubmissionDto> CreateSubmissionAsync(CreateSubmissionRequest request, uint userId, CancellationToken ct = default);
    Task SetSubmissionStatusAsync(uint submissionId, SubmissionStatus status, uint adminUserId, CancellationToken ct = default);

    Task<List<MerchandiseDto>> GetMerchandiseAsync(byte? categoryId, CancellationToken ct = default);
    Task<List<CharacterDto>> GetCharactersAsync(byte? categoryId, CancellationToken ct = default);
    Task<List<UpcomingReleaseDto>> GetUpcomingReleasesAsync(CancellationToken ct = default);
}

public class CommunityService : ICommunityService
{
    private readonly ICommunityRepository _community;
    private readonly IContentRepository _content;
    private readonly IUserRepository _users;

    public CommunityService(
        ICommunityRepository community,
        IContentRepository content,
        IUserRepository users)
    {
        _community = community;
        _content = content;
        _users = users;
    }

    public async Task<List<EventDto>> GetEventsAsync(byte? categoryId, CancellationToken ct = default)
    {
        var events = await _community.GetEventsAsync(categoryId, ct);
        return events.Select(e => new EventDto(
            e.EventId, e.Title, e.Slug, e.Summary, e.Location, e.City, e.IsOnline,
            e.StartsAt, e.EndsAt, e.TicketUrl, e.PriceNote,
            e.Category?.Slug ?? string.Empty)).ToList();
    }

    public async Task<EventDto?> GetEventAsync(uint eventId, CancellationToken ct = default)
    {
        var e = await _community.GetEventByIdAsync(eventId, ct);
        if (e is null) return null;

        return new EventDto(
            e.EventId, e.Title, e.Slug, e.Summary, e.Location, e.City, e.IsOnline,
            e.StartsAt, e.EndsAt, e.TicketUrl, e.PriceNote,
            e.Category?.Slug ?? string.Empty);
    }

    public async Task<PagedResponse<FeedbackDto>> GetFeedbackAsync(
        FeedbackStatus? status, int page, int pageSize, CancellationToken ct = default)
    {
        var result = await _community.GetFeedbackAsync(status, page, pageSize, ct);
        return new PagedResponse<FeedbackDto>(
            result.Items.Select(f => new FeedbackDto(
                f.FeedbackId, f.Type.ToString(), f.Message, f.Email, f.Rating,
                f.Status.ToString(), f.User?.Name, f.CreatedAt)).ToList(),
            result.TotalCount, result.Page, result.PageSize, result.PageCount);
    }

    public async Task<FeedbackDto> SubmitFeedbackAsync(
        CreateFeedbackRequest request, uint? userId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Message))
            throw new ValidationException("Please describe the issue.");

        if (request.Message.Trim().Length > 4000)
            throw new ValidationException("That message is too long.");

        if (request.Rating is < 1 or > 5)
            throw new ValidationException("A rating runs from 1 to 5.");

        // An unrecognised type would fail at the database, so reject it here
        // with a message the caller can act on.
        if (!Enum.TryParse<FeedbackType>(request.Type, ignoreCase: true, out var type))
            throw new ValidationException("Pick a feedback type: bug, suggestion, query or content.");

        var row = await _community.AddFeedbackAsync(new Feedback
        {
            UserId = userId,
            Type = type,
            Message = request.Message.Trim(),
            Email = request.Email,
            Rating = request.Rating.HasValue ? (byte)request.Rating.Value : null,
            Status = FeedbackStatus.Open,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        }, ct);

        return new FeedbackDto(
            row.FeedbackId, row.Type.ToString(), row.Message, row.Email, row.Rating,
            row.Status.ToString(), null, row.CreatedAt);
    }

    public async Task SetFeedbackStatusAsync(
        uint feedbackId, FeedbackStatus status, uint adminUserId, CancellationToken ct = default)
    {
        await _community.SetFeedbackStatusAsync(feedbackId, status, ct);
        await LogAsync(adminUserId, "feedback_status", feedbackId, ct);
    }

    public async Task DeleteFeedbackAsync(uint feedbackId, uint adminUserId, CancellationToken ct = default)
    {
        await _community.DeleteFeedbackAsync(feedbackId, ct);
        await LogAsync(adminUserId, "feedback_delete", feedbackId, ct);
    }

    public async Task<PagedResponse<SubmissionDto>> GetSubmissionsAsync(
        SubmissionStatus? status, int page, int pageSize, CancellationToken ct = default)
    {
        var result = await _community.GetSubmissionsAsync(status, page, pageSize, ct);
        return new PagedResponse<SubmissionDto>(
            result.Items.Select(s => new SubmissionDto(
                s.SubmissionId, s.Title, s.Body, s.Status.ToString(),
                s.Category?.Slug ?? string.Empty, s.User?.Name ?? "Unknown", s.CreatedAt)).ToList(),
            result.TotalCount, result.Page, result.PageSize, result.PageCount);
    }

    public async Task<SubmissionDto> CreateSubmissionAsync(
        CreateSubmissionRequest request, uint userId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            throw new ValidationException("Give your submission a title.");

        if (string.IsNullOrWhiteSpace(request.Body))
            throw new ValidationException("Your submission is empty.");

        // The category has to exist, otherwise the foreign key fails at save
        // time with a constraint error the caller cannot act on.
        var category = await _content.GetCategoryByIdAsync(request.CategoryId, ct)
            ?? throw new ValidationException("Pick a category for your submission.");

        var row = await _community.AddSubmissionAsync(new FanSubmission
        {
            UserId = userId,
            CategoryId = category.CategoryId,
            Title = request.Title.Trim(),
            Body = request.Body.Trim(),
            Status = SubmissionStatus.Pending,
            CreatedAt = DateTime.UtcNow,
        }, ct);

        return new SubmissionDto(
            row.SubmissionId, row.Title, row.Body, row.Status.ToString(),
            string.Empty, string.Empty, row.CreatedAt);
    }

    public async Task SetSubmissionStatusAsync(
        uint submissionId, SubmissionStatus status, uint adminUserId, CancellationToken ct = default)
    {
        await _community.SetSubmissionStatusAsync(submissionId, status, ct);
        await LogAsync(adminUserId, "submission_status", submissionId, ct);
    }

    public async Task<List<MerchandiseDto>> GetMerchandiseAsync(byte? categoryId, CancellationToken ct = default)
    {
        var items = await _community.GetMerchandiseAsync(categoryId, ct);
        return items.Select(m => new MerchandiseDto(
            m.ItemId, m.Name, m.Slug, m.Description, m.ImagePath, m.Tag, m.PriceNote,
            m.IsUpcoming, m.Category?.Slug ?? string.Empty)).ToList();
    }

    public async Task<List<CharacterDto>> GetCharactersAsync(byte? categoryId, CancellationToken ct = default)
    {
        var items = await _community.GetCharactersAsync(categoryId, ct);
        return items.Select(c => new CharacterDto(
            c.CharacterId, c.Name, c.Slug, c.Bio, c.ImagePath,
            c.Category?.Slug ?? string.Empty)).ToList();
    }

    public async Task<List<UpcomingReleaseDto>> GetUpcomingReleasesAsync(CancellationToken ct = default)
    {
        var items = await _community.GetUpcomingReleasesAsync(ct);
        return items.Select(r => new UpcomingReleaseDto(
            r.ReleaseId, r.Title, r.ReleaseDate, r.Url,
            r.Category?.Slug ?? string.Empty)).ToList();
    }

    private Task LogAsync(uint userId, string action, uint targetId, CancellationToken ct) =>
        _users.AddActivityAsync(new ActivityLog
        {
            UserId = userId,
            Action = action,
            TargetId = targetId,
            CreatedAt = DateTime.UtcNow,
        }, ct);
}

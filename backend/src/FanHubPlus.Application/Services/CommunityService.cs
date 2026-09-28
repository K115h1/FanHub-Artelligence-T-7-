// CommunityService — events, feedback, submissions, merchandise, characters.
using FanHubPlus.Application.DTOs;
using FanHubPlus.Domain;
using FanHubPlus.Infrastructure;

namespace FanHubPlus.Application.Services;

public interface ICommunityService
{
    Task<List<EventDto>> GetEventsAsync(byte? categoryId, CancellationToken ct = default);
    Task<EventDto?> GetEventAsync(uint eventId, CancellationToken ct = default);

    Task<PagedResponse<FeedbackDto>> GetFeedbackAsync(FeedbackStatus? status, int page, int pageSize, uint? userId = null, CancellationToken ct = default);
    Task<FeedbackDto> SubmitFeedbackAsync(CreateFeedbackRequest request, uint? userId, CancellationToken ct = default);
    Task SetFeedbackStatusAsync(uint feedbackId, FeedbackStatus status, uint adminUserId, CancellationToken ct = default);
    Task DeleteFeedbackAsync(uint feedbackId, uint adminUserId, CancellationToken ct = default);

    Task<PagedResponse<SubmissionDto>> GetSubmissionsAsync(SubmissionStatus? status, int page, int pageSize, uint? userId = null, SubmissionKind? kind = null, CancellationToken ct = default);
    Task<SubmissionDto> CreateSubmissionAsync(CreateSubmissionRequest request, uint userId, CancellationToken ct = default);
    Task SetSubmissionStatusAsync(uint submissionId, SubmissionStatus status, uint adminUserId, string? note = null, CancellationToken ct = default);
    Task<Dictionary<string, int>> GetSubmissionCountsAsync(CancellationToken ct = default);

    Task<List<MerchandiseDto>> GetMerchandiseAsync(byte? categoryId, CancellationToken ct = default);
    Task<PagedResponse<MerchandiseDto>> BrowseMerchandiseAsync(MerchandiseQuery query, CancellationToken ct = default);
    Task<MerchandiseDto?> GetMerchandiseByIdAsync(uint itemId, CancellationToken ct = default);
    Task<MerchandiseDto> CreateMerchandiseAsync(CreateMerchandiseRequest request, CancellationToken ct = default);
    Task<MerchandiseDto?> UpdateMerchandiseAsync(uint itemId, UpdateMerchandiseRequest request, CancellationToken ct = default);
    Task<bool> DeleteMerchandiseAsync(uint itemId, CancellationToken ct = default);
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
        FeedbackStatus? status, int page, int pageSize, uint? userId = null,
        CancellationToken ct = default)
    {
        var result = await _community.GetFeedbackAsync(status, page, pageSize, userId, ct);
        return new PagedResponse<FeedbackDto>(
            result.Items.Select(f => new FeedbackDto(
                f.FeedbackId, EnumConverter.ToWireString(f.Type), f.Message, f.Email, f.Rating,
                EnumConverter.ToWireString(f.Status), f.User?.Name, f.CreatedAt)).ToList(),
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
        // with a message the caller can act on. Parsed with EnumConverter rather
        // than Enum.TryParse, so this path and the wire format cannot drift.
        if (!EnumConverter.TryParse<FeedbackType>(request.Type, out var type))
            throw new ValidationException("Pick a feedback type: bug, suggestion, query or content.");

        // The email is a column with a length limit, and an over-long one
        // surfaces as a truncation error the caller cannot act on.
        var email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim();
        if (email is { Length: > 255 })
            throw new ValidationException("That email address is too long.");

        var row = await _community.AddFeedbackAsync(new Feedback
        {
            UserId = userId,
            Type = type,
            Message = request.Message.Trim(),
            Email = email,
            Rating = request.Rating.HasValue ? (byte)request.Rating.Value : null,
            Status = FeedbackStatus.Open,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        }, ct);

        // Both enums go out through EnumConverter, as the list endpoint does.
        // They used to be serialised with ToString(), which returned "Bug" and
        // "Open" — so the row the submitter was handed disagreed with the row
        // the same user saw a moment later in the queue, and any client
        // comparing against the lowercase values the admin panel uses read
        // nothing at all. The author is filled in from data already in hand so
        // the response is complete rather than nulling the field.
        var author = userId.HasValue ? await _users.GetByIdAsync(userId.Value, ct) : null;

        return new FeedbackDto(
            row.FeedbackId, EnumConverter.ToWireString(row.Type), row.Message, row.Email, row.Rating,
            EnumConverter.ToWireString(row.Status), author?.Name, row.CreatedAt);
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
        SubmissionStatus? status, int page, int pageSize, uint? userId = null,
        SubmissionKind? kind = null, CancellationToken ct = default)
    {
        var result = await _community.GetSubmissionsAsync(status, page, pageSize, userId, kind, ct);
        return new PagedResponse<SubmissionDto>(
            result.Items.Select(ToSubmissionDto).ToList(),
            result.TotalCount, result.Page, result.PageSize, result.PageCount);
    }

    public async Task<SubmissionDto> CreateSubmissionAsync(
        CreateSubmissionRequest request, uint userId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            throw new ValidationException("Give your submission a title.");

        if (string.IsNullOrWhiteSpace(request.Body))
            throw new ValidationException("Your submission is empty.");

        // The kind decides what the moderation queue does with it, so an
        // unrecognised value is rejected here rather than defaulting silently.
        // Parsed with EnumConverter because the wire form is snake_case and
        // Enum.TryParse cannot bridge "character_profile" to CharacterProfile.
        if (!EnumConverter.TryParse<SubmissionKind>(request.Kind, out var kind))
            throw new ValidationException(
                "Pick what you are submitting: an article, a character profile, or an event highlight.");

        // The category has to exist, otherwise the foreign key fails at save
        // time with a constraint error the caller cannot act on.
        var category = await _content.GetCategoryByIdAsync(request.CategoryId, ct)
            ?? throw new ValidationException("Pick a category for your submission.");

        var row = await _community.AddSubmissionAsync(new FanSubmission
        {
            UserId = userId,
            CategoryId = category.CategoryId,
            Kind = kind,
            Title = request.Title.Trim(),
            Body = request.Body.Trim(),
            Status = SubmissionStatus.Pending,
            CreatedAt = DateTime.UtcNow,
        }, ct);

        // Fill in the category and author from data we already hold, rather than
        // the empty strings this used to return. The client renders the row it
        // gets back straight into the member's list, so an empty slug showed as
        // a blank chip until a refetch.
        var author = await _users.GetByIdAsync(userId, ct);

        return new SubmissionDto(
            row.SubmissionId, row.Title, row.Body, EnumConverter.ToWireString(row.Status),
            EnumConverter.ToWireString(row.Kind),
            category.Slug, author?.Name ?? "Unknown",
            row.ModeratorNote, row.DecidedAt, row.CreatedAt);
    }

    public async Task SetSubmissionStatusAsync(
        uint submissionId, SubmissionStatus status, uint adminUserId, string? note = null,
        CancellationToken ct = default)
    {
        await _community.SetSubmissionStatusAsync(submissionId, status, adminUserId, note, ct);
        await LogAsync(adminUserId, "submission_status", submissionId, ct);
    }

    public Task<Dictionary<string, int>> GetSubmissionCountsAsync(CancellationToken ct = default) =>
        _community.GetSubmissionCountsAsync(ct);

    /// One place that maps a submission to the wire shape, so the create path
    /// and the list path cannot disagree about which fields are filled in.
    private static SubmissionDto ToSubmissionDto(FanSubmission s) => new(
        s.SubmissionId, s.Title, s.Body, EnumConverter.ToWireString(s.Status),
        EnumConverter.ToWireString(s.Kind),
        s.Category?.Slug ?? string.Empty, s.User?.Name ?? "Unknown",
        s.ModeratorNote, s.DecidedAt, s.CreatedAt);

    private static MerchandiseDto ToMerchandiseDto(MerchandiseItem m) => new(
        m.ItemId, m.Name, m.Slug, m.Description, m.ImagePath, m.Tag, m.PriceNote,
        m.IsUpcoming, m.Category?.Slug ?? string.Empty, m.ViewCount, m.CreatedAt);

    public async Task<List<MerchandiseDto>> GetMerchandiseAsync(byte? categoryId, CancellationToken ct = default)
    {
        var items = await _community.GetMerchandiseAsync(categoryId, ct);
        return items.Select(ToMerchandiseDto).ToList();
    }

    public async Task<PagedResponse<MerchandiseDto>> BrowseMerchandiseAsync(
        MerchandiseQuery query, CancellationToken ct = default)
    {
        var result = await _community.BrowseMerchandiseAsync(query, ct);
        return new PagedResponse<MerchandiseDto>(
            result.Items.Select(ToMerchandiseDto).ToList(),
            result.TotalCount, result.Page, result.PageSize, result.PageCount);
    }

    public async Task<MerchandiseDto?> GetMerchandiseByIdAsync(uint itemId, CancellationToken ct = default)
    {
        var item = await _community.GetMerchandiseByIdAsync(itemId, ct);
        return item is null ? null : ToMerchandiseDto(item);
    }

    public async Task<MerchandiseDto> CreateMerchandiseAsync(
        CreateMerchandiseRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            throw new ValidationException("Give the product a name.");

        var category = await _content.GetCategoryByIdAsync(request.CategoryId, ct)
            ?? throw new ValidationException("Pick a fandom for this product.");

        var name = request.Name.Trim();
        var slug = Slugify(name);

        if (await _community.MerchandiseSlugExistsAsync(slug, null, ct))
            throw new ValidationException($"\"{name}\" is already in the catalogue.");

        var row = await _community.AddMerchandiseAsync(new MerchandiseItem
        {
            CategoryId = category.CategoryId,
            Name = name,
            Slug = slug,
            Description = request.Description?.Trim(),
            ImagePath = request.ImagePath?.Trim(),
            Tag = request.Tag?.Trim(),
            PriceNote = request.PriceNote?.Trim(),
            IsUpcoming = request.IsUpcoming ?? true,
            CreatedAt = DateTime.UtcNow,
        }, ct);

        return ToMerchandiseDto(row);
    }

    public async Task<MerchandiseDto?> UpdateMerchandiseAsync(
        uint itemId, UpdateMerchandiseRequest request, CancellationToken ct = default)
    {
        var item = await _community.GetMerchandiseByIdAsync(itemId, ct);
        if (item is null) return null;

        if (!string.IsNullOrWhiteSpace(request.Name))
        {
            var name = request.Name.Trim();
            var slug = Slugify(name);
            if (await _community.MerchandiseSlugExistsAsync(slug, itemId, ct))
                throw new ValidationException($"\"{name}\" is already in the catalogue.");
            item.Name = name;
            item.Slug = slug;
        }

        if (request.Description is not null) item.Description = request.Description.Trim();
        if (request.ImagePath is not null) item.ImagePath = request.ImagePath.Trim();
        if (request.Tag is not null) item.Tag = request.Tag.Trim();
        if (request.PriceNote is not null) item.PriceNote = request.PriceNote.Trim();
        if (request.IsUpcoming.HasValue) item.IsUpcoming = request.IsUpcoming.Value;

        await _community.UpdateMerchandiseAsync(item, ct);
        return ToMerchandiseDto(item);
    }

    public Task<bool> DeleteMerchandiseAsync(uint itemId, CancellationToken ct = default) =>
        _community.DeleteMerchandiseAsync(itemId, ct);

    private static string Slugify(string name) => ContentService.Slugify(name);

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

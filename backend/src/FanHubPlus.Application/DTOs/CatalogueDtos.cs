// DTOs for the catalogue, events, feedback, submissions and admin.
using FanHubPlus.Domain;

namespace FanHubPlus.Application.DTOs;

public record GenreDto(ushort Id, string Name, string Slug);

public record CategoryDto(
    byte Id,
    string Slug,
    string Name,
    string? Description,
    string? AccentHex,
    int ContentCount);

// Card view. Deliberately short — a listing page does not need the synopsis.
public record ContentSummaryDto(
    uint Id,
    string Title,
    string Slug,
    string ContentType,
    string Status,
    string CategorySlug,
    string? ShortSynopsis,
    string? PosterPath,
    ushort? ReleaseYear,
    decimal? CommunityRating,
    uint ViewCount,
    List<string> Genres);

// Full detail view.
public record ContentDetailDto(
    uint Id,
    string Title,
    string Slug,
    string ContentType,
    string Status,
    string CategorySlug,
    string CategoryName,
    string? Synopsis,
    string? ShortSynopsis,
    DateOnly? ReleaseDate,
    ushort? ReleaseYear,
    ushort? RuntimeMinutes,
    ushort? EpisodeCount,
    string? Language,
    string? Country,
    string? Creator,
    string? CastList,
    string? PosterPath,
    string? BackdropPath,
    decimal? CommunityRating,
    uint? CommunityRatingCount,
    uint PopularityScore,
    uint ViewCount,
    string? ExternalId,
    string? ExternalSource,
    List<string> Genres,
    double? UserRating);

public record PagedResponse<T>(
    List<T> Items,
    int TotalCount,
    int Page,
    int PageSize,
    int PageCount);

public record CreateContentRequest(
    string Title,
    string Slug,
    byte CategoryId,
    string ContentType,
    string? Status,
    string? ShortSynopsis,
    string? Synopsis,
    ushort? ReleaseYear,
    string? PosterPath);

public record UpdateContentRequest(
    string? Title,
    string? ShortSynopsis,
    string? Synopsis,
    ushort? ReleaseYear,
    string? PosterPath,
    string? Status);

public record EventDto(
    uint Id,
    string Title,
    string Slug,
    string? Summary,
    string? Location,
    string? City,
    bool IsOnline,
    DateTime? StartsAt,
    DateTime? EndsAt,
    string? TicketUrl,
    string? PriceNote,
    string CategorySlug);

public record CreateFeedbackRequest(
    string Type,
    string Message,
    string? Email,
    int? Rating);

public record FeedbackDto(
    uint Id,
    string Type,
    string Message,
    string? Email,
    int? Rating,
    string Status,
    string? UserName,
    DateTime CreatedAt);

public record UpdateFeedbackStatusRequest(string Status);

public record CreateSubmissionRequest(
    byte CategoryId,
    string Title,
    string Body);

public record SubmissionDto(
    uint Id,
    string Title,
    string Body,
    string Status,
    string CategorySlug,
    string UserName,
    DateTime CreatedAt);

public record UpdateSubmissionStatusRequest(string Status);

public record RatingRequest(int Stars);

public record BookmarkNoteRequest(string? Note);

public record MerchandiseDto(
    uint Id,
    string Name,
    string Slug,
    string? Description,
    string? ImagePath,
    string? Tag,
    string? PriceNote,
    bool IsUpcoming,
    string CategorySlug);

public record CharacterDto(
    uint Id,
    string Name,
    string Slug,
    string? Bio,
    string? ImagePath,
    string CategorySlug);

public record UpcomingReleaseDto(
    uint Id,
    string Title,
    DateOnly? ReleaseDate,
    string? Url,
    string CategorySlug);

// Admin dashboard figures. Only counts that can be computed from real rows.
public record AdminStatsDto(
    int TotalContents,
    int TotalCategories,
    int TotalGenres,
    int ContentsWithPoster,
    int ContentsWithSynopsis,
    int TotalUsers,
    int OpenFeedback,
    int PendingSubmissions);

public record AdminStatsCategoryDto(
    string Slug,
    string Name,
    int Total,
    int WithPoster,
    int WithSynopsis);

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
    // Genre ids alongside the names. The explorer filters by genre_id, so a
    // "more like this" link cannot be built from names alone: it would have to
    // round-trip a name through a lookup to arrive at the id the API wants.
    List<ushort> GenreIds,
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
    string? PosterPath,
    // Genre names rather than ids: the admin editor has a list of strings, and
    // names are stable across a re-import where surrogate ids are not. Null
    // leaves the title with no genres.
    List<string>? Genres = null);

public record UpdateContentRequest(
    string? Title,
    string? ShortSynopsis,
    string? Synopsis,
    ushort? ReleaseYear,
    string? PosterPath,
    string? Status,
    // Null means "leave the genres alone", which is what a partial edit of
    // some other field needs. An empty list means "remove them all", and is
    // deliberately distinguishable from null.
    List<string>? Genres = null);

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
    /// <summary>SubmissionKind as a string: article, character_profile, event_highlight.</summary>
    string Kind,
    string Title,
    string Body);

public record SubmissionDto(
    uint Id,
    string Title,
    string Body,
    string Status,
    string Kind,
    string CategorySlug,
    string UserName,
    string? ModeratorNote,
    DateTime? DecidedAt,
    DateTime CreatedAt);

public record UpdateSubmissionStatusRequest(
    string Status,
    /// <summary>Optional note shown back to the fan alongside the decision.</summary>
    string? Note = null);

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
    string CategorySlug,
    uint ViewCount,
    DateTime CreatedAt);

public record CreateMerchandiseRequest(
    byte CategoryId,
    string Name,
    string? Description,
    string? ImagePath,
    string? Tag,
    string? PriceNote,
    bool? IsUpcoming);

public record UpdateMerchandiseRequest(
    string? Name,
    string? Description,
    string? ImagePath,
    string? Tag,
    string? PriceNote,
    bool? IsUpcoming);

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
    // Added so the stats page can report year coverage instead of the client
    // counting a page of rows it does not have.
    int ContentsWithYear,
    int TotalUsers,
    int OpenFeedback,
    int PendingSubmissions);

/// <summary>How many titles carry a given genre. For the "most used genres" table.</summary>
public record AdminGenreStatDto(string Name, int Count);

public record AdminStatsCategoryDto(
    string Slug,
    string Name,
    int Total,
    int WithPoster,
    int WithSynopsis);

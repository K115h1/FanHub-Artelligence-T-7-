// Enums that mirror the MySQL ENUM columns in database/01_schema.sql.
// Stored as strings so the database and the API agree on the same words.
namespace FanHubPlus.Domain;

public enum ContentType
{
    Movie,
    Series,
    Game,
    Comic,
    MusicArtist,
    Manga,
}

public enum ContentStatus
{
    Released,
    Upcoming,
    Ongoing,
    Ended,
    Cancelled,
}

public enum FeedbackType
{
    Bug,
    Suggestion,
    Query,
    Content,
}

public enum FeedbackStatus
{
    Open,
    Reviewed,
    Resolved,
    Dismissed,
}

public enum SubmissionStatus
{
    Pending,
    Approved,
    Rejected,
}

/// <summary>
/// What a fan submitted. The SRS names three kinds of user-created content:
/// rich-text articles, card-based character profiles, and timeline-style event
/// highlights. Stored as 'article' | 'character_profile' | 'event_highlight'.
/// </summary>
public enum SubmissionKind
{
    Article,
    CharacterProfile,
    EventHighlight,
}

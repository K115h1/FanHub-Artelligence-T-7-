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

// Engagement tables: ratings, bookmarks, events, submissions, activity log.
namespace FanHubPlus.Domain;

// The app's own star ratings, one row per user per title. Re-rating updates
// the row rather than adding a second one (enforced by a unique index).
public class MediaRating
{
    public uint RatingId { get; set; }
    public uint UserId { get; set; }
    public uint ContentId { get; set; }

    // 1-5, checked by a CHECK constraint in the schema.
    public byte Stars { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public User User { get; set; } = null!;
    public Content Content { get; set; } = null!;
}

public class Bookmark
{
    public uint BookmarkId { get; set; }
    public uint UserId { get; set; }
    public uint ContentId { get; set; }
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; }

    public User User { get; set; } = null!;
    public Content Content { get; set; } = null!;
}

public class FanEvent
{
    public uint EventId { get; set; }
    public byte CategoryId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Summary { get; set; }
    public string? Location { get; set; }
    public string? City { get; set; }
    public bool IsOnline { get; set; }

    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }

    public DateTime? StartsAt { get; set; }
    public DateTime? EndsAt { get; set; }

    public string? TicketUrl { get; set; }
    public string? PriceNote { get; set; }
    public DateTime CreatedAt { get; set; }

    public Category Category { get; set; } = null!;
}

// Fan-written content waiting on an administrator's decision.
public class FanSubmission
{
    public uint SubmissionId { get; set; }
    public uint UserId { get; set; }
    public byte CategoryId { get; set; }

    /// <summary>Which kind of fan content this is. See <see cref="SubmissionKind"/>.</summary>
    public SubmissionKind Kind { get; set; } = SubmissionKind.Article;

    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public SubmissionStatus Status { get; set; } = SubmissionStatus.Pending;

    // The decision record. An approval is a judgement a fan may want to query,
    // so who decided, when, and why are all kept rather than just the verdict.
    public string? ModeratorNote { get; set; }
    public DateTime? DecidedAt { get; set; }

    // Null for system decisions, and for a submission deleted with its moderator.
    public uint? DecidedBy { get; set; }

    public DateTime CreatedAt { get; set; }

    public User User { get; set; } = null!;
    public Category Category { get; set; } = null!;
}

// Audit trail for admin actions and other notable events.
public class ActivityLog
{
    public uint LogId { get; set; }

    // Null for system actions that are not attributable to a user.
    public uint? UserId { get; set; }

    public string Action { get; set; } = string.Empty;
    public uint? TargetId { get; set; }
    public DateTime CreatedAt { get; set; }

    public User? User { get; set; }
}

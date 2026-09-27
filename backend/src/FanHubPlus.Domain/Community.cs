// Community tables: feedback, merchandise, upcoming releases, chatbot log.
namespace FanHubPlus.Domain;

public class Feedback
{
    public uint FeedbackId { get; set; }

    // Null for anonymous submissions; the form is public by design.
    public uint? UserId { get; set; }

    public FeedbackType Type { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? Email { get; set; }

    // Optional 1-5 satisfaction score.
    public byte? Rating { get; set; }

    public FeedbackStatus Status { get; set; } = FeedbackStatus.Open;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public User? User { get; set; }
}

// Display only. No cart or checkout, per the SRS.
public class MerchandiseItem
{
    public uint ItemId { get; set; }
    public byte CategoryId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ImagePath { get; set; }

    // Limited Edition | Pre-Order | Collectible
    public string? Tag { get; set; }

    public string? PriceNote { get; set; }
    public bool IsUpcoming { get; set; } = true;
    public uint ViewCount { get; set; }
    public DateTime CreatedAt { get; set; }

    public Category Category { get; set; } = null!;
}

public class UpcomingRelease
{
    public uint ReleaseId { get; set; }
    public byte CategoryId { get; set; }
    public string Title { get; set; } = string.Empty;

    // Null when the release is announced but has no catalogue entry yet.
    public uint? ContentId { get; set; }

    public DateOnly? ReleaseDate { get; set; }
    public string? Url { get; set; }

    public Category Category { get; set; } = null!;
    public Content? Content { get; set; }
}

// Schema only — the chatbot is a deferred feature.
public class ChatbotQuery
{
    public uint QueryId { get; set; }
    public uint? UserId { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? Response { get; set; }
    public DateTime CreatedAt { get; set; }

    public User? User { get; set; }
}

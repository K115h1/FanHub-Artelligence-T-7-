// Catalogue tables: categories, genres, contents, content_genres,
// character_profiles, user_favorite_categories.
namespace FanHubPlus.Domain;

public class Category
{
    public byte CategoryId { get; set; }

    // Matches the React route: /category/anime
    public string Slug { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    // Hex value for the per-category accent, e.g. #7c3aed.
    public string? AccentHex { get; set; }

    public List<Genre> Genres { get; set; } = [];
    public List<Content> Contents { get; set; } = [];
}

// Genres are unique per (category, name): "Action" is deliberately a separate
// row under Gaming and under Movies, because the two mean different things.
public class Genre
{
    public ushort GenreId { get; set; }
    public byte CategoryId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;

    public Category Category { get; set; } = null!;
    public List<ContentGenre> ContentGenres { get; set; } = [];
}

public class Content
{
    public uint ContentId { get; set; }
    public byte CategoryId { get; set; }

    public string Title { get; set; } = string.Empty;

    // URL-safe identifier, unique within the category.
    public string Slug { get; set; } = string.Empty;

    public ContentType ContentType { get; set; } = ContentType.Movie;
    public ContentStatus Status { get; set; } = ContentStatus.Released;

    // Detail columns are nullable: the import loads titles and genres first,
    // and enrichment fills the rest later.
    public string? Synopsis { get; set; }
    public string? ShortSynopsis { get; set; }

    public DateOnly? ReleaseDate { get; set; }
    public ushort? ReleaseYear { get; set; }
    public ushort? RuntimeMinutes { get; set; }

    // Episode / chapter / track count for series, manga and albums.
    public ushort? EpisodeCount { get; set; }

    public string? Language { get; set; }
    public string? Country { get; set; }

    // Director, studio, author, artist, whatever "creator" means per fandom.
    public string? Creator { get; set; }

    // JSON array of names, e.g. ["Ada Lovelace","Grace Hopper"].
    public string? CastList { get; set; }

    // Relative paths served from the API's wwwroot, not full URLs, so moving
    // to object storage later is a config change rather than a data migration.
    public string? PosterPath { get; set; }
    public string? BackdropPath { get; set; }

    // External community score 0-10, e.g. TMDB vote_average. Separate from the
    // per-user stars in MediaRating, which the app collects itself.
    public decimal? CommunityRating { get; set; }
    public uint? CommunityRatingCount { get; set; }

    public uint PopularityScore { get; set; }
    public uint ViewCount { get; set; }

    // Provenance, so the row's external identity can be refreshed or audited.
    public string? ExternalId { get; set; }
    public string? ExternalSource { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Category Category { get; set; } = null!;
    public List<ContentGenre> ContentGenres { get; set; } = [];
    public List<CharacterProfile> Characters { get; set; } = [];
}

// Join table. A title can sit in several genre buckets, which is what stops
// "God of War" becoming three separate games.
public class ContentGenre
{
    public uint ContentId { get; set; }
    public ushort GenreId { get; set; }

    public Content Content { get; set; } = null!;
    public Genre Genre { get; set; } = null!;
}

public class CharacterProfile
{
    public uint CharacterId { get; set; }
    public byte CategoryId { get; set; }

    // Null for a character that is not tied to one title.
    public uint? ContentId { get; set; }

    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Bio { get; set; }
    public string? ImagePath { get; set; }
    public DateTime CreatedAt { get; set; }

    public Category Category { get; set; } = null!;
    public Content? Content { get; set; }
}

public class UserFavoriteCategory
{
    public uint UserId { get; set; }
    public byte CategoryId { get; set; }

    public User User { get; set; } = null!;
    public Category Category { get; set; } = null!;
}

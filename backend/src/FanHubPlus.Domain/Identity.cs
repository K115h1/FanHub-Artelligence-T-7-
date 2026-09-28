// Identity tables: roles, users, user_roles, password_reset_tokens.
// Column names and types match the DDL in database/01_schema.sql.
namespace FanHubPlus.Domain;

public class Role
{
    public byte RoleId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    public List<UserRole> UserRoles { get; set; } = [];
}

public class User
{
    public uint UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;

    // Argon2/bcrypt hash. Null only for rows seeded before auth was wired up.
    public string? PasswordHash { get; set; }

    // Relative path under the API's wwwroot, e.g. /images/avatars/ada.png.
    public string? AvatarPath { get; set; }
    public string? Bio { get; set; }
    public bool IsVerified { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public List<UserRole> UserRoles { get; set; } = [];
    public List<UserFavoriteCategory> FavoriteCategories { get; set; } = [];
    public List<UserInterestCategory> InterestCategories { get; set; } = [];
    public List<Bookmark> Bookmarks { get; set; } = [];
    public List<MediaRating> Ratings { get; set; } = [];
}

// Join row between users and roles. Composite key, no surrogate id.
public class UserRole
{
    public uint UserId { get; set; }
    public byte RoleId { get; set; }

    public User User { get; set; } = null!;
    public Role Role { get; set; } = null!;
}

// Join row for the SECOND category list: what a member follows, as distinct
// from what they have favourited. Separate type (not a flag on
// UserFavoriteCategory) so the two signals cannot overwrite each other.
public class UserInterestCategory
{
    public uint UserId { get; set; }
    public byte CategoryId { get; set; }

    public User User { get; set; } = null!;
    public Category Category { get; set; } = null!;
}

public class PasswordResetToken
{
    public uint TokenId { get; set; }
    public uint UserId { get; set; }

    // SHA-256 of the emailed token. The plaintext is never stored.
    public string TokenHash { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public DateTime? UsedAt { get; set; }
    public DateTime CreatedAt { get; set; }

    public User User { get; set; } = null!;
}

// Email verification, kept as its own type so a verification link can never be
// presented to the reset-password endpoint, or the reverse.
public class EmailVerificationToken
{
    public uint TokenId { get; set; }
    public uint UserId { get; set; }

    public string TokenHash { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public DateTime? UsedAt { get; set; }
    public DateTime CreatedAt { get; set; }

    public User User { get; set; } = null!;
}

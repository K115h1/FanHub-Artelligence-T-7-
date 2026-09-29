// AppDbContext, the EF Core model for the tables in database/01_schema.sql.
//
// Migrations are deliberately NOT used here. The schema is version-controlled
// as plain SQL (01_schema.sql plus the 04_*_seed.sql files), so EF is only the
// read/write layer over a database that already exists. Generating a migration
// would try to recreate tables that are already there. See README.md.
using FanHubPlus.Domain;
using Microsoft.EntityFrameworkCore;

namespace FanHubPlus.Infrastructure;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Role> Roles => Set<Role>();
    public DbSet<User> Users => Set<User>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();

    public DbSet<Category> Categories => Set<Category>();
    public DbSet<UserFavoriteCategory> UserFavoriteCategories => Set<UserFavoriteCategory>();
    public DbSet<UserInterestCategory> UserInterestCategories => Set<UserInterestCategory>();
    public DbSet<EmailVerificationToken> EmailVerificationTokens => Set<EmailVerificationToken>();
    public DbSet<Genre> Genres => Set<Genre>();
    public DbSet<Content> Contents => Set<Content>();
    public DbSet<ContentGenre> ContentGenres => Set<ContentGenre>();
    public DbSet<CharacterProfile> CharacterProfiles => Set<CharacterProfile>();

    public DbSet<MediaRating> MediaRatings => Set<MediaRating>();
    public DbSet<Bookmark> Bookmarks => Set<Bookmark>();
    public DbSet<FanEvent> FanEvents => Set<FanEvent>();
    public DbSet<FanSubmission> FanSubmissions => Set<FanSubmission>();
    public DbSet<ActivityLog> ActivityLogs => Set<ActivityLog>();

    public DbSet<Feedback> Feedback => Set<Feedback>();
    public DbSet<MerchandiseItem> MerchandiseItems => Set<MerchandiseItem>();
    public DbSet<UpcomingRelease> UpcomingReleases => Set<UpcomingRelease>();
    public DbSet<ChatbotQuery> ChatbotQueries => Set<ChatbotQuery>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Enums are stored as the snake_case words the ENUM columns already
        // contain ('music_artist', not 'MusicArtist'). Each enum property below
        // opts in via EnumConverter.SnakeCaseT().

        modelBuilder.Entity<Role>(entity =>
        {
            entity.ToTable("roles");
            entity.HasKey(r => r.RoleId);
            entity.Property(r => r.RoleId).HasColumnName("role_id").ValueGeneratedOnAdd();
            entity.Property(r => r.Name).HasColumnName("name").HasMaxLength(32).IsRequired();
            entity.Property(r => r.Description).HasColumnName("description").HasMaxLength(255);
            entity.HasIndex(r => r.Name).IsUnique().HasDatabaseName("uq_roles_name");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(u => u.UserId);
            entity.Property(u => u.UserId).HasColumnName("user_id").ValueGeneratedOnAdd();
            entity.Property(u => u.Name).HasColumnName("name").HasMaxLength(80).IsRequired();
            entity.Property(u => u.Email).HasColumnName("email").HasMaxLength(255).IsRequired();
            entity.Property(u => u.PasswordHash).HasColumnName("password_hash").HasMaxLength(255);
            entity.Property(u => u.AvatarPath).HasColumnName("avatar_path").HasMaxLength(255);
            entity.Property(u => u.Bio).HasColumnName("bio").HasMaxLength(500);
            entity.Property(u => u.IsVerified).HasColumnName("is_verified");
            entity.Property(u => u.CreatedAt).HasColumnName("created_at");
            entity.Property(u => u.UpdatedAt).HasColumnName("updated_at");
            entity.HasIndex(u => u.Email).IsUnique().HasDatabaseName("uq_users_email");
        });

        modelBuilder.Entity<UserRole>(entity =>
        {
            entity.ToTable("user_roles");
            // Composite key, no surrogate column.
            entity.HasKey(ur => new { ur.UserId, ur.RoleId });
            entity.Property(ur => ur.UserId).HasColumnName("user_id");
            entity.Property(ur => ur.RoleId).HasColumnName("role_id");
            entity.HasOne(ur => ur.User).WithMany(u => u.UserRoles)
                .HasForeignKey(ur => ur.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(ur => ur.Role).WithMany(r => r.UserRoles)
                .HasForeignKey(ur => ur.RoleId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<PasswordResetToken>(entity =>
        {
            entity.ToTable("password_reset_tokens");
            entity.HasKey(t => t.TokenId);
            entity.Property(t => t.TokenId).HasColumnName("token_id").ValueGeneratedOnAdd();
            entity.Property(t => t.UserId).HasColumnName("user_id");
            entity.Property(t => t.TokenHash).HasColumnName("token_hash").HasMaxLength(64).IsFixedLength().IsRequired();
            entity.Property(t => t.ExpiresAt).HasColumnName("expires_at").IsRequired();
            entity.Property(t => t.UsedAt).HasColumnName("used_at");
            entity.Property(t => t.CreatedAt).HasColumnName("created_at");
            entity.HasIndex(t => t.TokenHash).IsUnique().HasDatabaseName("uq_reset_token_hash");
            entity.HasOne(t => t.User).WithMany().HasForeignKey(t => t.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Category>(entity =>
        {
            entity.ToTable("categories");
            entity.HasKey(c => c.CategoryId);
            entity.Property(c => c.CategoryId).HasColumnName("category_id").ValueGeneratedOnAdd();
            entity.Property(c => c.Slug).HasColumnName("slug").HasMaxLength(32).IsRequired();
            entity.Property(c => c.Name).HasColumnName("name").HasMaxLength(64).IsRequired();
            entity.Property(c => c.Description).HasColumnName("description").HasMaxLength(255);
            entity.Property(c => c.AccentHex).HasColumnName("accent_hex").HasMaxLength(7).IsFixedLength();
            entity.HasIndex(c => c.Slug).IsUnique().HasDatabaseName("uq_categories_slug");
        });

        modelBuilder.Entity<UserFavoriteCategory>(entity =>
        {
            entity.ToTable("user_favorite_categories");
            entity.HasKey(f => new { f.UserId, f.CategoryId });
            entity.Property(f => f.UserId).HasColumnName("user_id");
            entity.Property(f => f.CategoryId).HasColumnName("category_id");
            entity.HasOne(f => f.User).WithMany(u => u.FavoriteCategories)
                .HasForeignKey(f => f.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(f => f.Category).WithMany()
                .HasForeignKey(f => f.CategoryId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<UserInterestCategory>(entity =>
        {
            entity.ToTable("user_interest_categories");
            entity.HasKey(i => new { i.UserId, i.CategoryId });
            entity.Property(i => i.UserId).HasColumnName("user_id");
            entity.Property(i => i.CategoryId).HasColumnName("category_id");
            entity.HasOne(i => i.User).WithMany(u => u.InterestCategories)
                .HasForeignKey(i => i.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(i => i.Category).WithMany()
                .HasForeignKey(i => i.CategoryId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<EmailVerificationToken>(entity =>
        {
            entity.ToTable("email_verification_tokens");
            entity.HasKey(t => t.TokenId);
            entity.Property(t => t.TokenId).HasColumnName("token_id").ValueGeneratedOnAdd();
            entity.Property(t => t.UserId).HasColumnName("user_id");
            entity.Property(t => t.TokenHash).HasColumnName("token_hash").HasMaxLength(64)
                .IsFixedLength().IsRequired();
            entity.Property(t => t.ExpiresAt).HasColumnName("expires_at");
            entity.Property(t => t.UsedAt).HasColumnName("used_at");
            entity.Property(t => t.CreatedAt).HasColumnName("created_at");
            entity.HasIndex(t => t.TokenHash).IsUnique().HasDatabaseName("uq_email_verify_hash");
            entity.HasOne(t => t.User).WithMany()
                .HasForeignKey(t => t.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Genre>(entity =>
        {
            entity.ToTable("genres");
            entity.HasKey(g => g.GenreId);
            entity.Property(g => g.GenreId).HasColumnName("genre_id").ValueGeneratedOnAdd();
            entity.Property(g => g.CategoryId).HasColumnName("category_id");
            entity.Property(g => g.Name).HasColumnName("name").HasMaxLength(64).IsRequired();
            entity.Property(g => g.Slug).HasColumnName("slug").HasMaxLength(64).IsRequired();
            // Unique per category, not globally: "Action" is a separate row
            // under Gaming and under Movies.
            entity.HasIndex(g => new { g.CategoryId, g.Name }).IsUnique().HasDatabaseName("uq_genres_category_name");
            entity.HasOne(g => g.Category).WithMany(c => c.Genres)
                .HasForeignKey(g => g.CategoryId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Content>(entity =>
        {
            entity.ToTable("contents");
            entity.HasKey(c => c.ContentId);
            entity.Property(c => c.ContentId).HasColumnName("content_id").ValueGeneratedOnAdd();
            entity.Property(c => c.CategoryId).HasColumnName("category_id");
            entity.Property(c => c.Title).HasColumnName("title").HasMaxLength(255).IsRequired();
            entity.Property(c => c.Slug).HasColumnName("slug").HasMaxLength(255).IsRequired();
            entity.Property(c => c.ContentType).HasColumnName("content_type").HasConversion(EnumConverter.SnakeCase<ContentType>()).HasMaxLength(20);
            entity.Property(c => c.Status).HasColumnName("status").HasConversion(EnumConverter.SnakeCase<ContentStatus>()).HasMaxLength(16);
            entity.Property(c => c.Synopsis).HasColumnName("synopsis").HasColumnType("TEXT");
            entity.Property(c => c.ShortSynopsis).HasColumnName("short_synopsis").HasMaxLength(300);
            entity.Property(c => c.ReleaseDate).HasColumnName("release_date");
            entity.Property(c => c.ReleaseYear).HasColumnName("release_year");
            entity.Property(c => c.RuntimeMinutes).HasColumnName("runtime_minutes");
            entity.Property(c => c.EpisodeCount).HasColumnName("episode_count");
            entity.Property(c => c.Language).HasColumnName("language").HasMaxLength(16);
            entity.Property(c => c.Country).HasColumnName("country").HasMaxLength(64);
            entity.Property(c => c.Creator).HasColumnName("creator").HasMaxLength(255);
            entity.Property(c => c.CastList).HasColumnName("cast_list").HasColumnType("JSON");
            entity.Property(c => c.PosterPath).HasColumnName("poster_path").HasMaxLength(255);
            entity.Property(c => c.BackdropPath).HasColumnName("backdrop_path").HasMaxLength(255);
            entity.Property(c => c.CommunityRating).HasColumnName("community_rating").HasPrecision(3, 1);
            entity.Property(c => c.CommunityRatingCount).HasColumnName("community_rating_count");
            entity.Property(c => c.PopularityScore).HasColumnName("popularity_score");
            entity.Property(c => c.ViewCount).HasColumnName("view_count");
            entity.Property(c => c.ExternalId).HasColumnName("external_id").HasMaxLength(32);
            entity.Property(c => c.ExternalSource).HasColumnName("external_source").HasMaxLength(16);
            entity.Property(c => c.CreatedAt).HasColumnName("created_at");
            entity.Property(c => c.UpdatedAt).HasColumnName("updated_at");
            // Scoped to the category, NOT globally: "Akira" exists in both Anime
            // and Comics, and "Icarus" in both Gaming and Movies.
            entity.HasIndex(c => new { c.CategoryId, c.Slug }).IsUnique().HasDatabaseName("uq_contents_category_slug");
            entity.HasIndex(c => c.Slug).HasDatabaseName("ix_contents_slug");
            entity.HasIndex(c => c.CategoryId).HasDatabaseName("ix_contents_category");
            entity.HasIndex(c => c.ContentType).HasDatabaseName("ix_contents_type");
            entity.HasIndex(c => c.PopularityScore).HasDatabaseName("ix_contents_popularity");
            entity.HasOne(c => c.Category).WithMany(cat => cat.Contents)
                .HasForeignKey(c => c.CategoryId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ContentGenre>(entity =>
        {
            entity.ToTable("content_genres");
            entity.HasKey(cg => new { cg.ContentId, cg.GenreId });
            entity.Property(cg => cg.ContentId).HasColumnName("content_id");
            entity.Property(cg => cg.GenreId).HasColumnName("genre_id");
            entity.HasOne(cg => cg.Content).WithMany(c => c.ContentGenres)
                .HasForeignKey(cg => cg.ContentId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(cg => cg.Genre).WithMany(g => g.ContentGenres)
                .HasForeignKey(cg => cg.GenreId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<CharacterProfile>(entity =>
        {
            entity.ToTable("character_profiles");
            entity.HasKey(c => c.CharacterId);
            entity.Property(c => c.CharacterId).HasColumnName("character_id").ValueGeneratedOnAdd();
            entity.Property(c => c.CategoryId).HasColumnName("category_id");
            entity.Property(c => c.ContentId).HasColumnName("content_id");
            entity.Property(c => c.Name).HasColumnName("name").HasMaxLength(160).IsRequired();
            entity.Property(c => c.Slug).HasColumnName("slug").HasMaxLength(160).IsRequired();
            entity.Property(c => c.Bio).HasColumnName("bio").HasColumnType("TEXT");
            entity.Property(c => c.ImagePath).HasColumnName("image_path").HasMaxLength(255);
            entity.Property(c => c.CreatedAt).HasColumnName("created_at");
            entity.HasIndex(c => c.Slug).IsUnique().HasDatabaseName("uq_characters_slug");
            entity.HasOne(c => c.Category).WithMany().HasForeignKey(c => c.CategoryId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(c => c.Content).WithMany(cn => cn.Characters)
                .HasForeignKey(c => c.ContentId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<MediaRating>(entity =>
        {
            entity.ToTable("media_ratings");
            entity.HasKey(r => r.RatingId);
            entity.Property(r => r.RatingId).HasColumnName("rating_id").ValueGeneratedOnAdd();
            entity.Property(r => r.UserId).HasColumnName("user_id");
            entity.Property(r => r.ContentId).HasColumnName("content_id");
            entity.Property(r => r.Stars).HasColumnName("stars");
            entity.Property(r => r.CreatedAt).HasColumnName("created_at");
            entity.Property(r => r.UpdatedAt).HasColumnName("updated_at");
            // One rating per user per item; re-rating updates the row.
            entity.HasIndex(r => new { r.UserId, r.ContentId }).IsUnique().HasDatabaseName("uq_media_ratings_user_content");
            entity.HasOne(r => r.User).WithMany(u => u.Ratings)
                .HasForeignKey(r => r.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(r => r.Content).WithMany()
                .HasForeignKey(r => r.ContentId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Bookmark>(entity =>
        {
            entity.ToTable("bookmarks");
            entity.HasKey(b => b.BookmarkId);
            entity.Property(b => b.BookmarkId).HasColumnName("bookmark_id").ValueGeneratedOnAdd();
            entity.Property(b => b.UserId).HasColumnName("user_id");
            entity.Property(b => b.ContentId).HasColumnName("content_id");
            entity.Property(b => b.Note).HasColumnName("note").HasMaxLength(500);
            entity.Property(b => b.CreatedAt).HasColumnName("created_at");
            // Saving the same item twice is a no-op, matching the UI's toggle.
            entity.HasIndex(b => new { b.UserId, b.ContentId }).IsUnique().HasDatabaseName("uq_bookmarks_user_content");
            entity.HasOne(b => b.User).WithMany(u => u.Bookmarks)
                .HasForeignKey(b => b.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(b => b.Content).WithMany()
                .HasForeignKey(b => b.ContentId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<FanEvent>(entity =>
        {
            entity.ToTable("fan_events");
            entity.HasKey(e => e.EventId);
            entity.Property(e => e.EventId).HasColumnName("event_id").ValueGeneratedOnAdd();
            entity.Property(e => e.CategoryId).HasColumnName("category_id");
            entity.Property(e => e.Title).HasColumnName("title").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Slug).HasColumnName("slug").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Summary).HasColumnName("summary").HasColumnType("TEXT");
            entity.Property(e => e.Location).HasColumnName("location").HasMaxLength(160);
            entity.Property(e => e.City).HasColumnName("city").HasMaxLength(96);
            entity.Property(e => e.IsOnline).HasColumnName("is_online");
            entity.Property(e => e.Latitude).HasColumnName("latitude").HasPrecision(10, 7);
            entity.Property(e => e.Longitude).HasColumnName("longitude").HasPrecision(10, 7);
            entity.Property(e => e.StartsAt).HasColumnName("starts_at");
            entity.Property(e => e.EndsAt).HasColumnName("ends_at");
            entity.Property(e => e.TicketUrl).HasColumnName("ticket_url").HasMaxLength(500);
            entity.Property(e => e.PriceNote).HasColumnName("price_note").HasMaxLength(64);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.HasIndex(e => e.Slug).IsUnique().HasDatabaseName("uq_fan_events_slug");
            entity.HasOne(e => e.Category).WithMany().HasForeignKey(e => e.CategoryId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Feedback>(entity =>
        {
            entity.ToTable("feedback");
            entity.HasKey(f => f.FeedbackId);
            entity.Property(f => f.FeedbackId).HasColumnName("feedback_id").ValueGeneratedOnAdd();
            entity.Property(f => f.UserId).HasColumnName("user_id");
            entity.Property(f => f.Type).HasColumnName("type").HasConversion(EnumConverter.SnakeCase<FeedbackType>()).HasMaxLength(16);
            entity.Property(f => f.Message).HasColumnName("message").HasColumnType("TEXT").IsRequired();
            entity.Property(f => f.Email).HasColumnName("email").HasMaxLength(255);
            entity.Property(f => f.Rating).HasColumnName("rating");
            entity.Property(f => f.Status).HasColumnName("status").HasConversion(EnumConverter.SnakeCase<FeedbackStatus>()).HasMaxLength(16);
            entity.Property(f => f.CreatedAt).HasColumnName("created_at");
            entity.Property(f => f.UpdatedAt).HasColumnName("updated_at");
            entity.HasIndex(f => f.Status).HasDatabaseName("ix_feedback_status");
            entity.HasOne(f => f.User).WithMany()
                .HasForeignKey(f => f.UserId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<FanSubmission>(entity =>
        {
            entity.ToTable("fan_submissions");
            entity.HasKey(s => s.SubmissionId);
            entity.Property(s => s.SubmissionId).HasColumnName("submission_id").ValueGeneratedOnAdd();
            entity.Property(s => s.UserId).HasColumnName("user_id");
            entity.Property(s => s.CategoryId).HasColumnName("category_id");
            entity.Property(s => s.Kind).HasColumnName("kind").HasConversion(EnumConverter.SnakeCase<SubmissionKind>()).HasMaxLength(20);
            entity.Property(s => s.Title).HasColumnName("title").HasMaxLength(255).IsRequired();
            entity.Property(s => s.Body).HasColumnName("body").HasColumnType("TEXT").IsRequired();
            entity.Property(s => s.Status).HasColumnName("status").HasConversion(EnumConverter.SnakeCase<SubmissionStatus>()).HasMaxLength(16);
            entity.Property(s => s.ModeratorNote).HasColumnName("moderator_note").HasColumnType("TEXT");
            entity.Property(s => s.DecidedAt).HasColumnName("decided_at");
            entity.Property(s => s.DecidedBy).HasColumnName("decided_by");
            entity.Property(s => s.CreatedAt).HasColumnName("created_at");
            entity.HasIndex(s => s.Status).HasDatabaseName("ix_submissions_status");
            // The queue's default view is "pending, newest first, of kind X".
            entity.HasIndex(s => new { s.Kind, s.Status, s.CreatedAt }).HasDatabaseName("ix_submissions_kind");
            entity.HasOne(s => s.User).WithMany()
                .HasForeignKey(s => s.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(s => s.Category).WithMany()
                .HasForeignKey(s => s.CategoryId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(s => s.DecidedBy).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<MerchandiseItem>(entity =>
        {
            entity.ToTable("merchandise_items");
            entity.HasKey(m => m.ItemId);
            entity.Property(m => m.ItemId).HasColumnName("item_id").ValueGeneratedOnAdd();
            entity.Property(m => m.CategoryId).HasColumnName("category_id");
            entity.Property(m => m.Name).HasColumnName("name").HasMaxLength(255).IsRequired();
            entity.Property(m => m.Slug).HasColumnName("slug").HasMaxLength(255).IsRequired();
            entity.Property(m => m.Description).HasColumnName("description").HasColumnType("TEXT");
            entity.Property(m => m.ImagePath).HasColumnName("image_path").HasMaxLength(255);
            entity.Property(m => m.Tag).HasColumnName("tag").HasMaxLength(64);
            entity.Property(m => m.PriceNote).HasColumnName("price_note").HasMaxLength(64);
            entity.Property(m => m.IsUpcoming).HasColumnName("is_upcoming");
            entity.Property(m => m.ViewCount).HasColumnName("view_count");
            entity.Property(m => m.CreatedAt).HasColumnName("created_at");
            entity.HasIndex(m => m.Slug).IsUnique().HasDatabaseName("uq_merchandise_slug");
            entity.HasOne(m => m.Category).WithMany().HasForeignKey(m => m.CategoryId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<UpcomingRelease>(entity =>
        {
            entity.ToTable("upcoming_releases");
            entity.HasKey(r => r.ReleaseId);
            entity.Property(r => r.ReleaseId).HasColumnName("release_id").ValueGeneratedOnAdd();
            entity.Property(r => r.CategoryId).HasColumnName("category_id");
            entity.Property(r => r.Title).HasColumnName("title").HasMaxLength(255).IsRequired();
            entity.Property(r => r.ContentId).HasColumnName("content_id");
            entity.Property(r => r.ReleaseDate).HasColumnName("release_date");
            entity.Property(r => r.Url).HasColumnName("url").HasMaxLength(500);
            entity.HasOne(r => r.Category).WithMany().HasForeignKey(r => r.CategoryId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(r => r.Content).WithMany()
                .HasForeignKey(r => r.ContentId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<ChatbotQuery>(entity =>
        {
            entity.ToTable("chatbot_queries");
            entity.HasKey(q => q.QueryId);
            entity.Property(q => q.QueryId).HasColumnName("query_id").ValueGeneratedOnAdd();
            entity.Property(q => q.UserId).HasColumnName("user_id");
            entity.Property(q => q.Message).HasColumnName("message").HasColumnType("TEXT").IsRequired();
            entity.Property(q => q.Response).HasColumnName("response").HasColumnType("TEXT");
            entity.Property(q => q.CreatedAt).HasColumnName("created_at");
            entity.HasOne(q => q.User).WithMany().HasForeignKey(q => q.UserId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<ActivityLog>(entity =>
        {
            entity.ToTable("activity_logs");
            entity.HasKey(l => l.LogId);
            entity.Property(l => l.LogId).HasColumnName("log_id").ValueGeneratedOnAdd();
            entity.Property(l => l.UserId).HasColumnName("user_id");
            entity.Property(l => l.Action).HasColumnName("action").HasMaxLength(64).IsRequired();
            entity.Property(l => l.TargetId).HasColumnName("target_id");
            entity.Property(l => l.CreatedAt).HasColumnName("created_at");
            entity.HasOne(l => l.User).WithMany()
                .HasForeignKey(l => l.UserId).OnDelete(DeleteBehavior.SetNull);
        });
    }
}

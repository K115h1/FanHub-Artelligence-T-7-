-- ============================================================
-- Fan Hub Plus. Database Schema (MySQL 8.0+)
-- ============================================================
-- Conventions (per project README):
--   * Every PK is <entity>_id
--   * FKs are named <referenced_table>_id, with an explicit ON DELETE rule
--   * Timestamps default to CURRENT_TIMESTAMP
--   * All access is parameterized, never string-concatenated SQL
--
-- Charset: utf8mb4 everywhere. The legacy `utf8` cannot store 4-byte
-- characters, which would silently corrupt accented titles
-- (e.g. "Les Misérables") and any emoji.
--
-- Layering note: this file is the contract. The C# entities in
-- FanHubPlus.Domain map 1:1 to these tables.
-- ============================================================

-- ---------- Roles & users ----------

CREATE TABLE IF NOT EXISTS roles (
    role_id      TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name         VARCHAR(32)      NOT NULL,
    description  VARCHAR(255)     NULL,
    PRIMARY KEY (role_id),
    UNIQUE KEY uq_roles_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
    user_id        INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    name           VARCHAR(80)   NOT NULL,
    email          VARCHAR(255)  NOT NULL,
    -- Argon2/bcrypt hash. Never a plaintext password, never a raw hash
    -- that a rainbow table could attack directly.
    password_hash  VARCHAR(255)  NULL,
    -- Relative path served from the API's wwwroot, e.g.
    -- /images/avatars/ada.png. Null means the initials avatar is used.
    avatar_path    VARCHAR(255)  NULL,
    bio            VARCHAR(500)  NULL,
    is_verified    TINYINT(1)    NOT NULL DEFAULT 0,
    created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    UNIQUE KEY uq_users_email (email),
    KEY ix_users_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_roles (
    user_id  INT UNSIGNED   NOT NULL,
    role_id  TINYINT UNSIGNED NOT NULL,
    PRIMARY KEY (user_id, role_id),
    KEY ix_user_roles_role (role_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles (role_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Categories (the 8 SRS fandoms) ----------

CREATE TABLE IF NOT EXISTS categories (
    category_id  TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
    -- Matches the slugs the React routes use (/category/anime).
    slug         VARCHAR(32)     NOT NULL,
    name         VARCHAR(64)     NOT NULL,
    description  VARCHAR(255)    NULL,
    -- Hex value for the per-category accent used in the UI.
    accent_hex   CHAR(7)         NULL,
    PRIMARY KEY (category_id),
    UNIQUE KEY uq_categories_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_favorite_categories (
    user_id      INT UNSIGNED      NOT NULL,
    category_id  TINYINT UNSIGNED  NOT NULL,
    PRIMARY KEY (user_id, category_id),
    KEY ix_ufc_category (category_id),
    CONSTRAINT fk_ufc_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
    CONSTRAINT fk_ufc_category FOREIGN KEY (category_id) REFERENCES categories (category_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Categories a member is INTERESTED in ----------
-- Deliberately a SECOND table rather than a flag on user_favorite_categories.
-- Favourites are what someone deliberately pinned; interests are a broader
-- signal used to shape recommendations, and a member can follow six fandoms
-- without having favourited any of them. Keeping them apart means un-favouriting
-- something does not silently change what gets recommended.
CREATE TABLE IF NOT EXISTS user_interest_categories (
    user_id      INT UNSIGNED      NOT NULL,
    category_id  TINYINT UNSIGNED  NOT NULL,
    PRIMARY KEY (user_id, category_id),
    KEY ix_uic_category (category_id),
    CONSTRAINT fk_uic_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
    CONSTRAINT fk_uic_category FOREIGN KEY (category_id) REFERENCES categories (category_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Email verification ----------
-- Same shape as password_reset_tokens on purpose: a random token is generated,
-- only its SHA-256 is stored, and UsedAt marks it spent so a link cannot be
-- replayed. Kept separate from password_reset_tokens because the two flows have
-- different lifetimes and must not be able to consume each other's tokens.
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    token_id   INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id    INT UNSIGNED NOT NULL,
    token_hash CHAR(64)     NOT NULL,
    expires_at DATETIME     NOT NULL,
    used_at    DATETIME     NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (token_id),
    UNIQUE KEY uq_email_verify_hash (token_hash),
    KEY ix_email_verify_user (user_id),
    CONSTRAINT fk_email_verify_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Genre names REPEAT across fandoms, "Action" means different things to a
-- games and a films catalogue, so a genre is unique per (category, name)
-- rather than globally. That is why "Action" appears once under Gaming and
-- again under Movies.

CREATE TABLE IF NOT EXISTS genres (
    genre_id     SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
    category_id  TINYINT UNSIGNED  NOT NULL,
    name         VARCHAR(64)       NOT NULL,
    -- URL-safe form of name, unique within the category.
    slug         VARCHAR(64)       NOT NULL,
    PRIMARY KEY (genre_id),
    UNIQUE KEY uq_genres_category_name (category_id, name),
    KEY ix_genres_slug (slug),
    CONSTRAINT fk_genres_category FOREIGN KEY (category_id) REFERENCES categories (category_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Contents ----------
-- One table for every fandom, discriminated by category_id + content_type.
-- Separate per-fandom tables would mean five near-identical schemas and
-- five sets of queries for what is structurally the same row.
--
-- Detail columns (synopsis, dates, ratings, cast) are NULLABLE on purpose:
-- the import currently loads titles and genres, and the site degrades
-- gracefully when these are absent. They are populated later by the
-- enrichment step rather than invented.

CREATE TABLE IF NOT EXISTS contents (
    content_id  INT UNSIGNED NOT NULL AUTO_INCREMENT,
    category_id TINYINT UNSIGNED NOT NULL,

    title  VARCHAR(255) NOT NULL,
    -- URL-safe identifier, unique site-wide: "one-piece-the-final-saga".
    slug   VARCHAR(255) NOT NULL,

    -- movie | series | game | comic | music_artist | manga
    content_type ENUM('movie','series','game','comic','music_artist','manga') NOT NULL DEFAULT 'movie',
    -- released | upcoming | ongoing | ended | cancelled
    status       ENUM('released','upcoming','ongoing','ended','cancelled')      NOT NULL DEFAULT 'released',

    -- Long-form description shown on the detail page.
    synopsis        TEXT          NULL,
    -- One-line blurb used on cards.
    short_synopsis  VARCHAR(300)  NULL,

    release_date  DATE         NULL,
    release_year  SMALLINT UNSIGNED NULL,
    runtime_minutes SMALLINT UNSIGNED NULL,
    -- Episode / chapter / track count for series, manga and albums.
    episode_count  SMALLINT UNSIGNED NULL,

    language     VARCHAR(16) NULL,
    country      VARCHAR(64) NULL,
    -- Director, studio, author, artist, whatever "creator" means per fandom.
    creator      VARCHAR(255) NULL,
    -- JSON array of names, e.g. ["Ada Lovelace","Grace Hopper"].
    cast_list    JSON         NULL,

    -- Paths are RELATIVE and served from the API's wwwroot. Storing a
    -- relative path rather than a URL means moving to S3/Azure later is a
    -- config change, not a data migration.
    poster_path    VARCHAR(255) NULL,
    backdrop_path  VARCHAR(255) NULL,

    -- External community score, 0. 10, e.g. TMDB vote_average. Distinct from
    -- per-user ratings in media_ratings, which the app collects itself.
    community_rating       DECIMAL(3,1) NULL,
    community_rating_count INT UNSIGNED   NULL,

    popularity_score INT UNSIGNED NOT NULL DEFAULT 0,
    view_count       INT UNSIGNED NOT NULL DEFAULT 0,

    -- Provenance: where this row's external identity came from, so it can be
    -- refreshed or audited later. tmdbId in the source JSON lands here.
    external_id     VARCHAR(32)  NULL,
    external_source VARCHAR(16)  NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (content_id),
    -- Scoped to the category, NOT globally: "Akira" legitimately exists in both
    -- Anime and Comics, and "Icarus" in both Gaming and Movies. A global unique
    -- on slug would make those titles collide.
    UNIQUE KEY uq_contents_category_slug (category_id, slug),
    KEY ix_contents_slug (slug),
    KEY ix_contents_category (category_id),
    KEY ix_contents_type (content_type),
    KEY ix_contents_year (release_year),
    KEY ix_contents_rating (community_rating),
    KEY ix_contents_popularity (popularity_score),
    KEY ix_contents_external (external_source, external_id),
    -- Full-text search across the title and synopsis.
    FULLTEXT KEY ft_contents_search (title, synopsis),
    CONSTRAINT fk_contents_category FOREIGN KEY (category_id) REFERENCES categories (category_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Many-to-many: a title can sit in several genre buckets. This is what
-- stops "God of War" becoming three separate games.
CREATE TABLE IF NOT EXISTS content_genres (
    content_id INT UNSIGNED      NOT NULL,
    genre_id   SMALLINT UNSIGNED NOT NULL,
    PRIMARY KEY (content_id, genre_id),
    KEY ix_content_genres_genre (genre_id),
    CONSTRAINT fk_content_genres_content FOREIGN KEY (content_id) REFERENCES contents (content_id) ON DELETE CASCADE,
    CONSTRAINT fk_content_genres_genre   FOREIGN KEY (genre_id)   REFERENCES genres (genre_id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Characters ----------

CREATE TABLE IF NOT EXISTS character_profiles (
    character_id INT UNSIGNED     NOT NULL AUTO_INCREMENT,
    category_id  TINYINT UNSIGNED NOT NULL,
    content_id   INT UNSIGNED     NULL,
    name         VARCHAR(160)     NOT NULL,
    slug         VARCHAR(160)     NOT NULL,
    bio          TEXT             NULL,
    image_path   VARCHAR(255)     NULL,
    created_at   DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (character_id),
    UNIQUE KEY uq_characters_slug (slug),
    KEY ix_characters_category (category_id),
    KEY ix_characters_content (content_id),
    CONSTRAINT fk_characters_category FOREIGN KEY (category_id) REFERENCES categories (category_id) ON DELETE CASCADE,
    CONSTRAINT fk_characters_content  FOREIGN KEY (content_id)  REFERENCES contents (content_id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Per-user ratings ----------
-- The app's own star ratings. Separate from contents.community_rating,
-- which is an external score we only display.

CREATE TABLE IF NOT EXISTS media_ratings (
    rating_id   INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id     INT UNSIGNED NOT NULL,
    content_id  INT UNSIGNED NOT NULL,
    stars       TINYINT UNSIGNED NOT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (rating_id),
    -- One rating per user per item; re-rating updates the row.
    UNIQUE KEY uq_media_ratings_user_content (user_id, content_id),
    KEY ix_media_ratings_content (content_id),
    CONSTRAINT chk_media_ratings_stars CHECK (stars BETWEEN 1 AND 5),
    CONSTRAINT fk_media_ratings_user    FOREIGN KEY (user_id)    REFERENCES users (user_id)    ON DELETE CASCADE,
    CONSTRAINT fk_media_ratings_content FOREIGN KEY (content_id) REFERENCES contents (content_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Bookmarks ----------

CREATE TABLE IF NOT EXISTS bookmarks (
    bookmark_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id     INT UNSIGNED NOT NULL,
    content_id  INT UNSIGNED NOT NULL,
    note        VARCHAR(500) NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (bookmark_id),
    -- Saving the same item twice is a no-op, matching the UI's toggle.
    UNIQUE KEY uq_bookmarks_user_content (user_id, content_id),
    KEY ix_bookmarks_content (content_id),
    KEY ix_bookmarks_user_created (user_id, created_at),
    CONSTRAINT fk_bookmarks_user    FOREIGN KEY (user_id)    REFERENCES users (user_id)    ON DELETE CASCADE,
    CONSTRAINT fk_bookmarks_content FOREIGN KEY (content_id) REFERENCES contents (content_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Events ----------

CREATE TABLE IF NOT EXISTS fan_events (
    event_id    INT UNSIGNED NOT NULL AUTO_INCREMENT,
    category_id TINYINT UNSIGNED NOT NULL,
    title       VARCHAR(255) NOT NULL,
    slug        VARCHAR(255) NOT NULL,
    summary     TEXT         NULL,
    location    VARCHAR(160) NULL,
    city        VARCHAR(96)  NULL,
    is_online   TINYINT(1)   NOT NULL DEFAULT 0,
    latitude    DECIMAL(10,7) NULL,
    longitude   DECIMAL(10,7) NULL,
    starts_at   DATETIME     NULL,
    ends_at     DATETIME     NULL,
    ticket_url  VARCHAR(500) NULL,
    price_note  VARCHAR(64)  NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id),
    UNIQUE KEY uq_fan_events_slug (slug),
    KEY ix_fan_events_category (category_id),
    KEY ix_fan_events_starts (starts_at),
    KEY ix_fan_events_city (city),
    CONSTRAINT fk_fan_events_category FOREIGN KEY (category_id) REFERENCES categories (category_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Feedback ----------

CREATE TABLE IF NOT EXISTS feedback (
    feedback_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    -- NULL for anonymous submissions; the form is public by design.
    user_id    INT UNSIGNED NULL,
    type       ENUM('bug','suggestion','query','content') NOT NULL,
    message    TEXT NOT NULL,
    email      VARCHAR(255) NULL,
    rating     TINYINT UNSIGNED NULL,
    -- open | reviewed | resolved | dismissed
    status     ENUM('open','reviewed','resolved','dismissed') NOT NULL DEFAULT 'open',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (feedback_id),
    KEY ix_feedback_user (user_id),
    KEY ix_feedback_status (status),
    KEY ix_feedback_created (created_at),
    CONSTRAINT fk_feedback_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Fan submissions (moderation queue) ----------

CREATE TABLE IF NOT EXISTS fan_submissions (
    submission_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id       INT UNSIGNED NOT NULL,
    category_id   TINYINT UNSIGNED NOT NULL,
    -- What the fan is submitting. The SRS names three kinds of user-created
    -- content: rich-text articles, card-based character profiles, and
    -- timeline-style event highlights. Without this column every submission is
    -- an anonymous wall of text and the moderation queue cannot route them.
    kind          ENUM('article','character_profile','event_highlight') NOT NULL DEFAULT 'article',
    title         VARCHAR(255) NOT NULL,
    body          TEXT NOT NULL,
    -- pending | approved | rejected
    status        ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    -- The admin's note, shown to the fan alongside the decision.
    moderator_note TEXT        NULL,
    decided_at    DATETIME     NULL,
    decided_by    INT UNSIGNED NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (submission_id),
    KEY ix_submissions_user (user_id),
    KEY ix_submissions_status (status),
    -- The queue's default view is "pending, newest first, of kind X".
    KEY ix_submissions_kind (kind, status, created_at),
    CONSTRAINT fk_submissions_user     FOREIGN KEY (user_id)     REFERENCES users (user_id)      ON DELETE CASCADE,
    CONSTRAINT fk_submissions_category FOREIGN KEY (category_id) REFERENCES categories (category_id) ON DELETE CASCADE,
    CONSTRAINT fk_submissions_decider  FOREIGN KEY (decided_by) REFERENCES users (user_id)      ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Merchandise (display only, no payments per SRS) ----------

CREATE TABLE IF NOT EXISTS merchandise_items (
    item_id     INT UNSIGNED     NOT NULL AUTO_INCREMENT,
    category_id TINYINT UNSIGNED NOT NULL,
    name        VARCHAR(255)     NOT NULL,
    slug        VARCHAR(255)     NOT NULL,
    description TEXT             NULL,
    image_path  VARCHAR(255)     NULL,
    -- Limited Edition | Pre-Order | Collectible
    tag         VARCHAR(64)      NULL,
    price_note  VARCHAR(64)      NULL,
    is_upcoming TINYINT(1)       NOT NULL DEFAULT 1,
    view_count  INT UNSIGNED     NOT NULL DEFAULT 0,
    created_at  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (item_id),
    UNIQUE KEY uq_merchandise_slug (slug),
    KEY ix_merchandise_category (category_id),
    CONSTRAINT fk_merchandise_category FOREIGN KEY (category_id) REFERENCES categories (category_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS upcoming_releases (
    release_id   INT UNSIGNED     NOT NULL AUTO_INCREMENT,
    category_id  TINYINT UNSIGNED NOT NULL,
    title        VARCHAR(255)     NOT NULL,
    content_id   INT UNSIGNED     NULL,
    release_date DATE             NULL,
    url          VARCHAR(500)     NULL,
    PRIMARY KEY (release_id),
    KEY ix_releases_category (category_id),
    KEY ix_releases_date (release_date),
    CONSTRAINT fk_releases_category FOREIGN KEY (category_id) REFERENCES categories (category_id) ON DELETE CASCADE,
    CONSTRAINT fk_releases_content  FOREIGN KEY (content_id)  REFERENCES contents (content_id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Chatbot (deferred feature, schema only) ----------

CREATE TABLE IF NOT EXISTS chatbot_queries (
    query_id   INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id    INT UNSIGNED NULL,
    message    TEXT         NOT NULL,
    response   TEXT         NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (query_id),
    KEY ix_chatbot_user (user_id),
    CONSTRAINT fk_chatbot_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Activity log ----------

CREATE TABLE IF NOT EXISTS activity_logs (
    log_id     INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id    INT UNSIGNED NULL,
    action     VARCHAR(64)  NOT NULL,
    target_id  INT UNSIGNED NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (log_id),
    KEY ix_activity_user (user_id, created_at),
    KEY ix_activity_action (action),
    CONSTRAINT fk_activity_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Auth support ----------

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token_id   INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id    INT UNSIGNED NOT NULL,
    token_hash CHAR(64)     NOT NULL,
    expires_at DATETIME     NOT NULL,
    used_at    DATETIME     NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (token_id),
    UNIQUE KEY uq_reset_token_hash (token_hash),
    KEY ix_reset_user (user_id),
    CONSTRAINT fk_reset_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

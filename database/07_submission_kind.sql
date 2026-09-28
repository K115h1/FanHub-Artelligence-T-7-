-- ============================================================
-- Migration: fan submissions gain a kind, and a moderation record.
-- ============================================================
-- WHY
--   The SRS asks for user fan-content submissions requiring admin approval, and
--   names three kinds: rich-text articles, card-based character profiles, and
--   timeline-style event highlights. The table could only store a title and a
--   body, so every submission arrived as an undifferentiated wall of text and
--   the queue could not be filtered or routed by kind.
--
--   Also adds a decision record: moderator_note, decided_at and decided_by. An
--   approval is a judgement a fan may want to query, and without these the only
--   thing recorded is the verdict itself.
--
-- SAFE TO RE-RUN: the ADD COLUMN statements are guarded by a column check, so
-- running this twice is a no-op rather than a duplicate-column error.
--
-- Charset: utf8mb4, matching the schema.

-- ---------- kind ----------
-- Defaulted to 'article' so any row that predates this column keeps a valid
-- value instead of failing the NOT NULL constraint.
SET @has_kind := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'fan_submissions'
    AND COLUMN_NAME  = 'kind'
);

SET @add_kind := IF(
  @has_kind = 0,
  'ALTER TABLE fan_submissions
     ADD COLUMN kind ENUM(''article'',''character_profile'',''event_highlight'')
       NOT NULL DEFAULT ''article'' AFTER category_id',
  'DO 0'
);

PREPARE stmt FROM @add_kind;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ---------- moderation record ----------
SET @has_note := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'fan_submissions'
    AND COLUMN_NAME  = 'moderator_note'
);

SET @add_note := IF(
  @has_note = 0,
  'ALTER TABLE fan_submissions
     ADD COLUMN moderator_note TEXT NULL AFTER status,
     ADD COLUMN decided_at DATETIME NULL AFTER moderator_note,
     ADD COLUMN decided_by INT UNSIGNED NULL AFTER decided_at,
     ADD KEY ix_submissions_kind (kind, status, created_at),
     ADD CONSTRAINT fk_submissions_decider
       FOREIGN KEY (decided_by) REFERENCES users (user_id) ON DELETE SET NULL',
  'DO 0'
);

PREPARE stmt FROM @add_note;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Backfill anything that arrived before the column existed, so no submission is
-- left with a kind nobody chose deliberately.
UPDATE fan_submissions SET kind = 'article' WHERE kind IS NULL;

SELECT CONCAT('fan_submissions now has kind: ', COUNT(*), ' row(s)')
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME   = 'fan_submissions'
  AND COLUMN_NAME  = 'kind';

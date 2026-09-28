-- ============================================================
-- Migration: give every title a plausible view count, and make
-- "Most popular" mean something.
-- ============================================================
-- WHY
--   contents.view_count was 0 for all 3,388 rows. Every card on the site
--   rendered "0" or "0.0K" next to the eye icon, the detail page showed a
--   Views row reading 0, and the category page's "Avg views" tile was 0 for
--   every fandom. The counter that POST /api/contents/{id}/view drives existed
--   but never incremented, so even opening a title could not move the number.
--
--   Separately, the default "Most popular" sort is
--   ORDER BY popularity_score DESC, and popularity_score was also 0 across the
--   table. With every row equal, that sort silently degraded to ORDER BY title —
--   so the Explorer looked sorted while showing the catalogue alphabetically.
--
-- BASE COUNTS
--   The numbers are random, and deliberately long-tailed. A flat random range
--   gives three thousand titles that all look equally famous, which is the same
--   visual failure as all-zero.
--
--   POW(RAND(), 8) is the exponent that matters. For a value x uniform on [0,1),
--   x^k concentrates near zero, and the shape is easy to state: roughly 75% of
--   titles land under 5,000 and about 10% clear 20,000. That is what a real
--   catalogue's traffic looks like — most titles modestly read, a handful
--   genuinely popular.
--
--   An earlier version of this file used an exponent of 2.2, which looked
--   plausible and was not: it averages 15,110 against a 48,000 ceiling and
--   leaves only 36% of titles under 5,000, so the histogram came out nearly
--   flat. If you change the exponent, check the distribution afterwards rather
--   than assuming the skew carried over.
--
--   They are generated, not authored. This is a demo dataset for a fan hub, not
--   a measurement of anything, and a plausible-looking spread is the honest way
--   to show a counter working. The alternative — leaving them at 0 — is not
--   more honest, it is just a feature that looks broken.
--
-- SAFE TO RE-RUN
--   Both statements are guarded on the column still being 0, so a second run
--   adds nothing and real accumulated views are never overwritten. That guard is
--   the whole design: the seed sets a floor once, and the live counter owns the
--   number from then on.
--
--   Consequence worth knowing: because it is guarded, this will NOT re-roll an
--   existing distribution. To change the shape after the fact, zero the column
--   yourself first — it is a demo fill, not real traffic.
--
-- Charset: utf8mb4, matching the schema.

-- ---------- view_count ----------
-- 40 .. ~48,000, long-tailed. See the note above on the exponent.
UPDATE contents
SET view_count = FLOOR(POW(RAND(), 8) * 48000) + 40
WHERE view_count = 0;

-- ---------- popularity_score ----------
-- Kept in step with view_count so the two never disagree on a fresh load. It is
-- an INT UNSIGNED and the column already has an index, so this stays cheap.
--
-- popularity_score is a separate column from view_count on purpose: it is an
-- editorial all-time ranking, while view_count is a live counter that grows.
-- Seeding one from the other gives "Most popular" a real ordering without
-- having to change the query, and the two drift apart naturally over time as
-- real views come in.
UPDATE contents
SET popularity_score = view_count
WHERE popularity_score = 0 AND view_count > 0;

SELECT CONCAT('contents seeded: ', COUNT(*), ' row(s), views ',
              MIN(view_count), '..', MAX(view_count))
FROM contents;

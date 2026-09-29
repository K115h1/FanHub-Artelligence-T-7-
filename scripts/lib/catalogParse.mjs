// catalogParse.mjs — the single source of truth for turning a raw fandom list
// into titles, years and genre hints.
//
// This logic used to be copy-pasted into buildCatalog.mjs and importCatalog.mjs,
// with comments in both warning that the copies must stay identical "otherwise
// this catalogue and the database disagree on which titles exist". That was a
// real hazard: five edits in two files, and nothing but a comment protecting it.
// Both scripts now import from here, so there is one copy to keep correct.
//
// Anything in this file affects the SQL that lands in MySQL, so the rules are
// deliberately conservative: when a qualifier is ambiguous, the title is kept
// intact rather than guessed at. A wrong genre silently mis-files a title; a
// verbose title is merely ugly and is reported for review.

/**
 * Per-fandom configuration.
 *
 * idBase keeps each fandom's ids in its own 1000-wide block, so the seed files
 * can be loaded into one database without id collisions, and reruns overwrite
 * the same rows instead of appending duplicates.
 */
export const FANDOMS = {
  movies:   { categorySlug: "movies",  categoryName: "Movies",  contentType: "movie",        idBase: 0 },
  anime:    { categorySlug: "anime",   categoryName: "Anime",   contentType: "series",       idBase: 1000 },
  games:    { categorySlug: "gaming",  categoryName: "Gaming",  contentType: "game",         idBase: 2000 },
  comics:   { categorySlug: "comics",  categoryName: "Comics",  contentType: "comic",        idBase: 3000 },
  kpop:     { categorySlug: "k-pop",   categoryName: "K-Pop",   contentType: "music_artist", idBase: 4000 },
  tvshows:  { categorySlug: "tv-shows", categoryName: "TV Shows", contentType: "series",       idBase: 5000 },
};

/**
 * The slug each fandom's rows carry in `src/data/catalog.json`.
 *
 * NOT the same as categorySlug. catalog.json predates the categories table and
 * uses a camelCase-ish key ("tvshows", "games", "kpop") where the database uses
 * the URL slug ("tv-shows", "gaming", "k-pop"). The two only coincide for movies,
 * anime and comics.
 *
 * This matters whenever a row in catalog.json has to be matched against a row in
 * the database. A synopsis UPDATE scoped by `g.slug = <categorySlug>` never
 * matches a catalog.json value, so every K-Pop and TV Shows synopsis silently
 * no-ops. buildCatalog.mjs copies the value into catalog.json; applySynopses.mjs
 * reads it from here to convert back.
 */
export const FANDOM_KEYS = {
  movies: "movies",
  anime: "anime",
  games: "gaming",
  comics: "comics",
  kpop: "k-pop",
  tvshows: "tv-shows",
};

/** Catalog.json's categorySlug for a fandom, i.e. the inverse of FANDOM_KEYS. */
export function catalogCategorySlug(fandomKey) {
  return fandomKey;
}

/** The database category slug for a fandom. */
export function dbCategorySlug(fandomKey) {
  return FANDOM_KEYS[fandomKey];
}

/**
 * Editing notes someone left in the source lists.
 *   "dup"        -> the title is a duplicate, keep one copy
 *   "dup remove" -> the author marked this entry for deletion
 *   "x"          -> marked as not-a-title
 * Anything else in parentheses is NOT assumed to be a genre.
 */
const EDIT_NOTES = new Set(["dup", "dup remove", "x", "delete", "remove"]);

/**
 * Qualifiers that are DISAMBIGUATORS, not genres.
 *
 * The tvshows list carries "(TV)" on shows whose title collides with a film of
 * the same name — Willow, The Exorcist, The Purge all exist as movies in the
 * poster set. That marker separates two real, distinct works; it is not a
 * genre, so it is stripped and the title stands on its own. The fandom prefix
 * already keeps the two apart, and leaving "Willow (TV)" in the title would
 * produce a slug the poster file can never match.
 */
const DISAMBIGUATORS = new Set(["tv", "film", "movie", "series", "game", "anime"]);

/**
 * Qualifiers that name a genre but share no tokens with the fandom's real
 * buckets, so matchRealBucket scores them 0 and they would otherwise be kept
 * verbatim as titles like "Icarus (Doc-TV)".
 *
 * Each entry is mapped by hand to the bucket the source list itself filed the
 * row under. Hand-mapping six strings is cheaper and safer than loosening the
 * 0.99 token threshold, which would start mis-filing genres across every
 * fandom.
 */
const QUALIFIER_ALIASES = {
  tvshows: {
    bbc: "Documentary",
    mockumentary: "Documentary",
    "doc-tv": "Documentary",
    "live-action-adj": "Sitcom",
    "legal-adj": "Legal Drama",
    "medical-adj": "Medical Drama",
    "crime-adj": "Crime / Procedural",
  },
};

/**
 * Every trailing token that a parenthesised qualifier can leave behind in a
 * slug, in slugified form.
 *
 * Exported because the delivered image filenames were built from the RAW list
 * titles, not the parsed ones: "13 Reasons Why (Mystery)" produced
 * "13_reasons_why_mystery.jpg", while the catalogue slug for that same title is
 * "13-reasons-why". Matching the two therefore needs the same vocabulary the
 * parser already knows, or every cross-listed title loses its poster.
 */
export const QUALIFIER_TOKENS = new Set(
  [
    ...DISAMBIGUATORS,
    ...Object.keys(QUALIFIER_ALIASES.tvshows ?? {}),
    // Genres that appear as qualifiers across the hand-written lists.
    "mystery",
    "thriller",
    "legal",
    "medical",
    "teen",
    "horror",
    "comedy",
    "drama",
    "romance",
    "fantasy",
    "action",
    "adventure",
    "documentary",
    "crime",
    "sitcom",
    "reality",
    // "-adj" hedges that matchRealBucket already folds by prefix, so they are
    // not in the alias table but still need stripping from a delivered filename.
    "sci-fi-adj",
    "horror-adj",
    "romance-adj",
  ].map((t) => slugifyToken(t)),
);

/** slugify, but exported below it is defined — kept local to avoid a cycle. */
function slugifyToken(text) {
  return String(text)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function slugify(text) {
  return String(text)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 250);
}

/**
 * Finds the real bucket a qualifier-derived genre should fold into.
 * Returns null when there is no confident match.
 */
export function matchRealBucket(candidate, realNames) {
  const c = candidate.toLowerCase().trim();
  // Always return the REAL bucket's spelling, never the candidate's. Returning
  // the candidate produced both "Trot" and "trot" as separate genres, which
  // collide under the case-insensitive utf8mb4_unicode_ci collation.
  const exact = realNames.find((n) => n.toLowerCase().trim() === c);
  if (exact) return exact;

  // One name contains the other: "Family" -> "Family / Children".
  const partial = realNames.find((n) => {
    const r = n.toLowerCase().trim();
    return r.startsWith(c) || c.startsWith(r);
  });
  if (partial) return partial;

  // Token containment, longest overlap first, so "slice of life" doesn't
  // accidentally match "life".
  const cTokens = new Set(c.split(/[^a-z0-9]+/).filter(Boolean));
  let best = null;
  let bestScore = 0;
  for (const name of realNames) {
    const rTokens = new Set(name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
    if (rTokens.size === 0) continue;
    let shared = 0;
    for (const t of cTokens) if (rTokens.has(t)) shared++;
    const score = shared / Math.max(cTokens.size, rTokens.size);
    if (shared > 0 && score > bestScore) {
      bestScore = score;
      best = name;
    }
  }
  // Below this, the two names are barely related — better to keep separate.
  return bestScore >= 0.99 ? best : null;
}

/**
 * Splits a raw list title conservatively.
 *
 * The source lists are messy: the same trailing "(...)" means a year in one
 * entry, a genre in another, an editing note in a third, a disambiguator in a
 * fourth, and a legitimate part of a name in a few (f(x), (G)I-DLE). Guessing
 * wrong is costly — a naive rule turned "f(x)" into "f" and invented genres
 * called "dup remove" — so each case is handled explicitly and anything
 * unrecognised is left alone.
 *
 *   "God of War (2018)"      -> { title: "God of War", year: "2018" }
 *   "Knives Out (Mystery)"   -> genreHint "Mystery" when it matches a bucket
 *   "Bibi Zhou(dup remove)"  -> dropped entirely
 *   "Willow (TV)"            -> { title: "Willow" }, marker discarded
 *   "f(x)"                   -> title kept verbatim
 *   "Park Jin-young (J.Y. Park)" -> title kept verbatim (alias, not a genre)
 *
 * `fandomKey` only selects the alias table; it does not change any rule.
 */
export function parseTitle(raw, realGenreNames, fandomKey) {
  const text = raw.trim();
  const match = text.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (!match) return { title: text, year: null, genreHint: null, dropped: false, verbatim: false };

  const [, base, insideRaw] = match;
  const inside = insideRaw.trim();
  const lower = inside.toLowerCase();

  // (1) An editing note. "dup remove" means the author wanted this gone.
  if (EDIT_NOTES.has(lower)) {
    return {
      title: base.trim(),
      year: null,
      genreHint: null,
      dropped: lower === "dup remove",
      verbatim: false,
    };
  }

  // (2) A year — a disambiguator, and the title keeps its identity.
  if (/^\d{4}$/.test(inside)) {
    return { title: base.trim(), year: inside, genreHint: null, dropped: false, verbatim: false };
  }

  // (3) A disambiguator, not a genre. Drop the marker, add no genre.
  if (DISAMBIGUATORS.has(lower)) {
    return { title: base.trim(), year: null, genreHint: null, dropped: false, verbatim: false };
  }

  // (4) A hand-mapped genre alias for this fandom.
  const alias = QUALIFIER_ALIASES[fandomKey]?.[lower];
  if (alias && realGenreNames.includes(alias)) {
    return { title: base.trim(), year: null, genreHint: alias, dropped: false, verbatim: false };
  }

  // (5) Only treat it as a genre if it actually matches one of this fandom's
  //     buckets. "From the New World" and "AKMU" fail this test.
  const target = matchRealBucket(inside, realGenreNames ?? []);
  if (target) {
    return { title: base.trim(), year: null, genreHint: target, dropped: false, verbatim: false };
  }

  // (6) An alias, subtitle, or a note we don't recognise. Leave the title
  //     intact rather than guess, and flag it so a human can review.
  return { title: text, year: null, genreHint: null, dropped: false, verbatim: true };
}

// Admin domain types.
//
// The catalogue row mirrors a `contents` row in database/01_schema.sql. It is
// kept separate from the public `Content` type in types/models.ts because the
// admin view needs database-only fields (raw slug, content_type, null year)
// that the public UI has no use for.

/** One fandom grouping, matching the six seed files and the `categories` table. */
export type FandomKey = 'movies' | 'anime' | 'games' | 'comics' | 'kpop' | 'tvshows'

/** A row in the admin content table. */
export interface CatalogRow {
  /** content_id in MySQL — the per-fandom 1000-wide block from importCatalog. */
  id: number
  title: string
  slug: string
  fandom: FandomKey
  /** `categories.slug` — note `games` maps to "gaming" and `kpop` to "k-pop". */
  categorySlug: string
  contentType: string
  releaseYear: number | null
  genres: string[]
  posterPath: string | null
  synopsis: string | null
  status: ContentStatus
}

/**
 * Mirrors `contents.status` in the database:
 *   ENUM('released','upcoming','ongoing','ended','cancelled')
 *
 * This used to be 'released' | 'announced' | 'discontinued', which matched no
 * column anywhere. It went unnoticed because the whole bundled catalogue was
 * one value ('released'), so the filter had nothing to exclude. Against the
 * real column, filtering by status would have matched nothing at all.
 */
export type ContentStatus = 'released' | 'upcoming' | 'ongoing' | 'ended' | 'cancelled'

/** The fields an admin is allowed to change on an existing row. */
export type CatalogEdit = Pick<
  CatalogRow,
  'title' | 'releaseYear' | 'genres' | 'synopsis' | 'status' | 'posterPath'
>

/** A per-row patch layered over the read-only catalogue. */
export interface ContentOverrides {
  /** Row id -> edited fields. */
  edits: Record<number, Partial<CatalogEdit>>
  /** Row ids removed from the catalogue. */
  deleted: number[]
  /** Rows created inside the admin panel. */
  added: CatalogRow[]
}

/** One row of the dashboard's category popularity table. */
export interface CategoryStat {
  categorySlug: string
  name: string
  total: number
  withPoster: number
  withSynopsis: number
}

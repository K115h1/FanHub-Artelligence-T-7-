// ContentFilters — the Explorer's filter rail: category, genre, type and era.
//
// Rewritten rather than wiring up the old FilterPanel. That one hardcoded its
// options — CONTENT_TYPES was ["Article","Video","Audio","Image"], none of which
// are real content types (the API uses movie/series/game/comic/music_artist),
// and POPULARITY was a set of labels with no endpoint behind them. It also styled
// itself with raw purple-950/purple-50 values instead of the app's tokens, so it
// would not have matched the page it sat on.
//
// Every option here comes from the API, so adding a category or genre on the
// server needs no frontend change. The whole panel is URL-driven: each control
// writes one search param, which is what makes a filtered view shareable and
// survives a reload or a back button.
import { useEffect, useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import type { CategoryDto, Genre } from '../../types/models'
import { getGenres } from '../../services/content.service'

/** The real content types, matching the API's ContentType enum. */
const CONTENT_TYPES = [
  { value: 'movie', label: 'Film' },
  { value: 'series', label: 'Series' },
  { value: 'game', label: 'Game' },
  { value: 'comic', label: 'Comic' },
  { value: 'manga', label: 'Manga' },
  { value: 'music_artist', label: 'Artist' },
]

/**
 * Eras, rather than a free year input.
 *
 * A from/to pair needs validation, an "invalid range" empty state and an
 * awkward affordance for picking 1994. Decades are what people actually browse
 * by, and each maps to exactly one pair of query params.
 */
const ERAS = [
  { value: '', label: 'Any year', from: null, to: null },
  { value: '2020s', label: '2020s', from: 2020, to: null },
  { value: '2010s', label: '2010s', from: 2010, to: 2019 },
  { value: '2000s', label: '2000s', from: 2000, to: 2009 },
  { value: '1990s', label: '1990s', from: 1990, to: 1999 },
  { value: '1980s', label: '1980s', from: 1980, to: 1989 },
  { value: 'before-1980', label: 'Before 1980', from: null, to: 1979 },
]

const selectClass =
  'rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink transition focus:border-accent disabled:opacity-50'
const labelClass = 'mb-1 block text-xs font-medium text-ink-muted'

export default function ContentFilters({
  categories,
  category,
  genre,
  type,
  era,
  onChange,
  onClear,
  resultCount,
}: {
  categories: CategoryDto[]
  category: string
  genre: string
  type: string
  era: string
  onChange: (patch: Record<string, string | null>) => void
  onClear: () => void
  resultCount: number | null
}) {
  // Genres are scoped per category — "Action" under Movies is a different row
  // from "Action" under Gaming — so they are refetched when the category changes
  // rather than fetched once for the whole catalogue.
  const [genres, setGenres] = useState<Genre[]>([])

  useEffect(() => {
    let cancelled = false
    const categoryId = categories.find((c) => c.slug === category)?.id
    getGenres(categoryId)
      .then((list) => {
        if (!cancelled) setGenres(list)
      })
      .catch(() => {
        if (!cancelled) setGenres([])
      })
    return () => {
      cancelled = true
    }
  }, [category, categories])

  const activeCount = [category, genre, type, era].filter(Boolean).length

  return (
    <section
      aria-label="Filters"
      className="surface-card p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <SlidersHorizontal size={15} aria-hidden="true" />
          Filters
          {activeCount > 0 && (
            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
              {activeCount}
            </span>
          )}
        </h2>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted transition hover:text-accent"
          >
            <X size={13} aria-hidden="true" />
            Clear all
          </button>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className={labelClass} htmlFor="filter-category">
            Category
          </label>
          <select
            id="filter-category"
            value={category}
            onChange={(event) =>
              onChange({
                category: event.target.value || null,
                // Genre ids are category-scoped, so keeping the old one after a
                // category change would send an id that means something else.
                genre: null,
              })
            }
            className={`${selectClass} w-full`}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="filter-genre">
            Genre
          </label>
          <select
            id="filter-genre"
            value={genre}
            // A genre is meaningless without a category: "Action" is a different
            // row per fandom, so the id alone cannot identify one.
            disabled={!category}
            onChange={(event) => onChange({ genre: event.target.value || null })}
            className={`${selectClass} w-full`}
          >
            <option value="">{category ? 'All genres' : 'Pick a category first'}</option>
            {genres.map((g) => (
              <option key={g.id} value={String(g.id)}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="filter-type">
            Type
          </label>
          <select
            id="filter-type"
            value={type}
            onChange={(event) => onChange({ type: event.target.value || null })}
            className={`${selectClass} w-full`}
          >
            <option value="">All types</option>
            {CONTENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="filter-era">
            Era
          </label>
          <select
            id="filter-era"
            value={era}
            onChange={(event) => onChange({ era: event.target.value || null })}
            className={`${selectClass} w-full`}
          >
            {ERAS.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {resultCount !== null && (
        <p className="mt-3 text-xs text-ink-subtle" role="status" aria-live="polite">
          {resultCount.toLocaleString()} {resultCount === 1 ? 'title' : 'titles'} match
          {activeCount > 0 ? ' these filters' : ' everything'}.
        </p>
      )}
    </section>
  )
}

/** Maps the era token to the pair of query params the API expects. */
export function eraToParams(era: string): { yearFrom: string | null; yearTo: string | null } {
  const found = ERAS.find((e) => e.value === era)
  if (!found) return { yearFrom: null, yearTo: null }
  return {
    yearFrom: found.from === null ? null : String(found.from),
    yearTo: found.to === null ? null : String(found.to),
  }
}

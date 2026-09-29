// SearchOverlay, the header's search field, expanded to fill the screen.
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CornerDownLeft, Search, X } from 'lucide-react'
import { useModalLayer } from '../../hooks/useModalLayer'
import { useDebounce } from '../../hooks/useDebounce'
import { getContents } from '../../services/content.service'
import { useCoverPools } from '../../hooks/useCoverPools'
import { pickCoverFallback } from '../../lib/coverFallback'
import { CategoryDot } from './CategoryArt'
import type { ContentSummary } from '../../types/models'

const MAX_RESULTS = 6

export default function SearchOverlay({
  onClose,
  initialQuery = '',
}: {
  onClose: () => void
  initialQuery?: string
}) {
  const navigate = useNavigate()
  const [query, setQuery] = useState(initialQuery)

  // Results remember which search they belong to, so we can work out if we are
  // still loading by comparing that to the current search. Saves storing a flag.
  const [result, setResult] = useState<{ term: string; items: ContentSummary[] } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounced = useDebounce(query, 250)

  // This has to sit outside #root, because useModalLayer sets that inert.
  useModalLayer(true)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  useEffect(() => {
    const term = debounced.trim()
    if (term.length < 2) return

    // Stops an older slow reply landing on top of a newer one.
    let cancelled = false
    void getContents({ search: term, pageSize: MAX_RESULTS, sort: 'popular' })
      .then((page) => {
        if (!cancelled) setResult({ term, items: page.items })
      })
      .catch(() => {
        // A failed lookup is not worth interrupting the search for.
        if (!cancelled) setResult({ term, items: [] })
      })

    return () => { cancelled = true }
  }, [debounced])

  function goToExplore() {
    const term = query.trim()
    onClose()
    navigate(term ? `/explore?q=${encodeURIComponent(term)}` : '/explore')
  }

  function openResult(item: ContentSummary) {
    onClose()
    // Need the category too. Slugs are only unique per fandom, and "akira" is
    // four separate titles, so without it all four would open the same one.
    navigate(`/content/${item.slug}?category=${encodeURIComponent(item.categorySlug)}`)
  }

  const trimmed = query.trim()
  const hasQuery = trimmed.length >= 2

  const settled = result !== null && result.term === debounced.trim()
  const results = settled ? result.items : []
  const searching = hasQuery && !settled

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search the site"
        // Stops clicks inside the panel from closing it.
        onClick={(event) => event.stopPropagation()}
        className="animate-overlay-drop-in mx-auto w-full max-w-2xl px-3 pt-3 sm:px-4 sm:pt-6"
      >
        <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-2xl">
          <div className="flex items-center gap-2 border-b border-line px-3">
            <Search size={18} className="shrink-0 text-ink-subtle" aria-hidden="true" />

            {/* type="search" for the mobile Search key; its own cancel button is
                suppressed so the one below is the only clear affordance. */}
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  goToExplore()
                }
              }}
              placeholder="Search anime, games, K-Pop, cosplay…"
              aria-label="Search"
              className="w-full min-w-0 bg-transparent py-4 text-base text-ink outline-none placeholder:text-ink-subtle [&::-webkit-search-cancel-button]:appearance-none"
            />

            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('')
                  inputRef.current?.focus()
                }}
                aria-label="Clear search"
                className="shrink-0 rounded-full p-1 text-ink-subtle transition hover:bg-accent-soft hover:text-ink"
              >
                <X size={16} aria-hidden="true" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close search"
              className="shrink-0 rounded-full p-1 text-ink-subtle transition hover:bg-accent-soft hover:text-ink"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {!hasQuery ? (
              <p className="px-4 py-6 text-center text-sm text-ink-subtle">
                Type at least two characters to search.
              </p>
            ) : searching && results.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-ink-subtle">Searching…</p>
            ) : results.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-ink-subtle">
                Nothing matches “{trimmed}”.
              </p>
            ) : (
              <ul className="p-1.5">
                {results.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => openResult(item)}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-accent-soft"
                    >
                      <Thumb item={item} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink">
                          {item.title}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-subtle">
                          <CategoryDot slug={item.categorySlug} />
                          {item.categorySlug}
                          {item.releaseYear ? ` · ${item.releaseYear}` : ''}
                        </span>
                      </span>
                      <ArrowRight
                        size={14}
                        className="shrink-0 text-ink-subtle"
                        aria-hidden="true"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {hasQuery && (
            <div className="border-t border-line">
              <button
                type="button"
                onClick={goToExplore}
                className="flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold text-accent transition hover:bg-accent-soft"
              >
                See all results for “{trimmed}”
                <CornerDownLeft size={14} className="ml-auto" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

/** CSS background, so a failed path shows the layer beneath, not a broken glyph. */
function Thumb({ item }: { item: ContentSummary }) {
  const pools = useCoverPools()
  const artwork = item.posterPath ?? pickCoverFallback(item.categorySlug, item.id, pools)

  return (
    <span
      aria-hidden="true"
      className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-sunken"
    >
      {artwork ? (
        <span
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${artwork})` }}
        />
      ) : (
        <span className="absolute inset-0 accent-wash" />
      )}
    </span>
  )
}

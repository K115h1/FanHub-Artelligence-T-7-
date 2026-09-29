// Pagination, numbered page controls for a long list.
//
// Lives in common/ rather than the admin folder because the category pages need
// the same control: a fandom can hold 575 titles, which does not fit on one
// screen no matter how busy the page is made to look.
//
// The design is deliberately plain. 513 titles over 24 pages means 21 numbered
// buttons, so long runs collapse to first / … / neighbours / … / last rather
// than trying to shrink the type.
import { ChevronLeft, ChevronRight } from 'lucide-react'

const ELLIPSIS = '…'

/** Which page numbers to show, with "…" marking a gap. */
function pageWindow(page: number, pageCount: number, span = 1): (number | string)[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1)

  const pages = new Set<number>([1, pageCount])
  for (let offset = -span; offset <= span; offset++) {
    const candidate = page + offset
    if (candidate > 1 && candidate < pageCount) pages.add(candidate)
  }

  const sorted = [...pages].sort((a, b) => a - b)
  const out: (number | string)[] = []

  let previous = 0
  for (const value of sorted) {
    if (previous && value - previous > 1) out.push(ELLIPSIS)
    out.push(value)
    previous = value
  }

  return out
}

export default function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  onChange,
  className = '',
}: {
  page: number
  pageCount: number
  total: number
  pageSize: number
  onChange: (page: number) => void
  className?: string
}) {
  if (total === 0) return null

  const first = (page - 1) * pageSize + 1
  const last = Math.min(total, page * pageSize)

  return (
    <nav
      aria-label="Pagination"
      className={`flex flex-col items-center justify-between gap-3 ${className}`}
    >
      <p className="text-xs tabular-nums text-ink-muted">
        Showing <span className="font-semibold text-ink">{first.toLocaleString()}</span>–
        <span className="font-semibold text-ink">{last.toLocaleString()}</span> of{' '}
        <span className="font-semibold text-ink">{total.toLocaleString()}</span>
      </p>

      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-ink-muted transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink-muted"
        >
          <ChevronLeft size={14} aria-hidden="true" />
          Previous
        </button>

        {pageWindow(page, pageCount).map((entry, index) => {
          // The array mixes numbers with the gap marker, so narrow before use.
          if (typeof entry === 'string') {
            return (
              <span
                key={`gap-${index}`}
                className="px-1 text-xs text-ink-subtle"
                aria-hidden="true"
              >
                {ELLIPSIS}
              </span>
            )
          }

          return (
            <button
              key={entry}
              type="button"
              onClick={() => onChange(entry)}
              // Marks the current page for screen readers as well as styling.
              aria-current={entry === page ? 'page' : undefined}
              aria-label={`Page ${entry}`}
              className={`min-w-8 rounded-lg border px-2 py-1.5 text-xs font-semibold tabular-nums transition ${
                entry === page
                  ? 'border-accent bg-accent text-accent-ink'
                  : 'border-line text-ink-muted hover:border-accent hover:text-accent'
              }`}
            >
              {entry}
            </button>
          )
        })}

        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page >= pageCount}
          className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-ink-muted transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink-muted"
        >
          Next
          <ChevronRight size={14} aria-hidden="true" />
        </button>
      </div>
    </nav>
  )
}

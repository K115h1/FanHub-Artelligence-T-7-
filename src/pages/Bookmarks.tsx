// Bookmarks — everything the member has saved.
//
// Filterable by category and sortable, with per-item removal and a guarded
// "clear all". Sits behind RequireAuth, so guests get the login popup.
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark as BookmarkIcon, Trash2, ArrowRight, Layers, Clock, FileText, PlayCircle } from 'lucide-react'
import PageHero from '../components/common/PageHero'
import SectionHeader from '../components/common/SectionHeader'
import { EmptyState } from '../components/common/EmptyState'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { CategoryDot } from '../components/common/CategoryArt'
import { useBookmarks } from '../context/BookmarksContext'
import type { ResolvedBookmark } from '../lib/bookmarks'
import { toSlug } from '../lib/mockData'

type SortKey = 'newest' | 'oldest' | 'az'

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Newest first' },
  { key: 'oldest', label: 'Oldest first' },
  { key: 'az', label: 'A – Z' },
]

/** "20 Sep" / "20 Sep 2026" — omits the year for anything recent. */
function formatSaved(iso: string): string {
  const d = new Date(iso)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

function BookmarkRow({
  bookmark,
  onRemove,
}: {
  bookmark: ResolvedBookmark
  onRemove: (id: string) => void
}) {
  const isArticle = bookmark.kind === 'article'

  return (
    <li className="surface-card group flex items-start gap-4 p-4">
      {/* Type badge — distinguishes an article from a title/movie row. */}
      <span
        className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
          isArticle ? 'bg-accent-soft text-accent' : 'accent-wash text-white'
        }`}
      >
        {isArticle ? (
          <FileText size={17} aria-hidden="true" />
        ) : (
          <PlayCircle size={17} aria-hidden="true" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <Link to={bookmark.href} className="font-semibold text-ink transition hover:text-accent">
          {bookmark.title}
        </Link>
        <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{bookmark.blurb}</p>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-subtle">
          <span className="inline-flex items-center gap-1.5 font-medium text-accent">
            <CategoryDot slug={toSlug(bookmark.type)} />
            {bookmark.type}
          </span>
          <span>{bookmark.meta}</span>
          <span className="inline-flex items-center gap-1">
            <Clock size={11} aria-hidden="true" /> Saved {formatSaved(bookmark.savedAt)}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onRemove(bookmark.id)}
        aria-label={`Remove ${bookmark.title} from bookmarks`}
        className="shrink-0 rounded-lg p-2 text-ink-subtle transition hover:bg-red-500/10 hover:text-red-500"
      >
        <Trash2 size={16} />
      </button>
    </li>
  )
}

export default function Bookmarks() {
  const { bookmarks, categories, remove, clearAll, count } = useBookmarks()

  const [category, setCategory] = useState<string>('all')
  const [sort, setSort] = useState<SortKey>('newest')
  const [confirmClear, setConfirmClear] = useState(false)

  const visible = useMemo(() => {
    const filtered =
      category === 'all' ? bookmarks : bookmarks.filter((b) => b.type === category)

    const sorted = [...filtered]
    if (sort === 'newest') sorted.sort((a, b) => b.savedAt.localeCompare(a.savedAt))
    if (sort === 'oldest') sorted.sort((a, b) => a.savedAt.localeCompare(b.savedAt))
    if (sort === 'az') sorted.sort((a, b) => a.title.localeCompare(b.title))
    return sorted
  }, [bookmarks, category, sort])

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHero
        kicker="Your library"
        title="Bookmarks"
        icon={BookmarkIcon}
        blurb="Everything you have saved, in one place. Bookmarks are stored on this device and stay with your account."
      >
        <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur-md">
          <Layers size={15} aria-hidden="true" />
          {count} saved {count === 1 ? 'item' : 'items'}
        </span>
        {count > 0 && (
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-purple-700 shadow-lg shadow-black/20 transition hover:bg-purple-50"
          >
            <Trash2 size={15} aria-hidden="true" />
            Clear all
          </button>
        )}
      </PageHero>

      {count === 0 ? (
        <EmptyState
          icon={BookmarkIcon}
          title="Nothing saved yet"
          body="Tap the bookmark icon on anything you like — a title, an article, an event — and it will show up here."
          actionText="Browse content"
          onAction={() => {
            window.location.href = '/explore'
          }}
        />
      ) : (
        <>
          {/* Controls: category pills + sort. */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <FilterPill
                active={category === 'all'}
                onClick={() => setCategory('all')}
                label={`All (${bookmarks.length})`}
              />
              {categories.map((name) => {
                const n = bookmarks.filter((b) => b.type === name).length
                return (
                  <FilterPill
                    key={name}
                    active={category === name}
                    onClick={() => setCategory(name)}
                    label={`${name} (${n})`}
                    dot={toSlug(name)}
                  />
                )
              })}
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="bookmark-sort" className="text-xs text-ink-subtle">
                Sort
              </label>
              <select
                id="bookmark-sort"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="rounded-lg border border-line bg-surface-raised px-3 py-1.5 text-sm text-ink transition focus:border-accent"
              >
                {SORTS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon={BookmarkIcon}
              title={`No ${category} bookmarks`}
              body="Nothing saved in this category yet."
              actionText="Show all"
              onAction={() => setCategory('all')}
            />
          ) : (
            <section aria-labelledby="bookmark-list">
              <SectionHeader
                id="bookmark-list"
                title="Saved items"
                icon={BookmarkIcon}
                subtitle={`${visible.length} shown`}
              />
              <ul className="space-y-3">
                {visible.map((bookmark) => (
                  <BookmarkRow key={bookmark.id} bookmark={bookmark} onRemove={remove} />
                ))}
              </ul>
            </section>
          )}

          {/* Keeps saving discoverable once the list isn't empty. */}
          <section className="surface-card flex flex-wrap items-center justify-between gap-3 p-5">
            <p className="text-sm text-ink-muted">
              Spotted something you want to come back to? Save it from any content or article page.
            </p>
            <Link
              to="/explore"
              className="inline-flex items-center gap-2 text-sm font-semibold text-accent transition hover:gap-3"
            >
              Find more <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </section>
        </>
      )}

      <ConfirmDialog
        isOpen={confirmClear}
        title="Clear all bookmarks?"
        body={`This removes all ${count} saved items from this device. It can't be undone.`}
        confirmText="Clear everything"
        isWarning
        onConfirm={() => {
          clearAll()
          setConfirmClear(false)
        }}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  )
}

/** Category filter chip. */
function FilterPill({
  active,
  onClick,
  label,
  dot,
}: {
  active: boolean
  onClick: () => void
  label: string
  dot?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
        active
          ? 'border-accent bg-accent text-accent-ink'
          : 'border-line bg-surface-raised text-ink-muted hover:border-accent hover:text-accent'
      }`}
    >
      {dot && <CategoryDot slug={dot} />}
      {label}
    </button>
  )
}

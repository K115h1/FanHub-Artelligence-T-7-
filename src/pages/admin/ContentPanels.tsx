// Content panels — the add and edit forms for the Content Manager.
//
// Split out of ContentManager.tsx so that file stays page layout. Both panels
// share the same modal shell and field set, because an added title and an edited
// title differ only in which fields are pre-filled and locked.

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import type { CatalogEdit, CatalogRow, ContentStatus, FandomKey } from '../../features/admin/types'
import { FANDOM_LABELS } from '../../features/admin/AdminDataProvider'
import { useCatalog } from '../../features/admin/hooks'
import { AdminButton } from '../../components/admin/shared'
import PosterThumb from '../../components/common/PosterThumb'

const CONTENT_TYPES: Record<FandomKey, string> = {
  movies: 'movie',
  anime: 'series',
  games: 'game',
  comics: 'comic',
  kpop: 'music_artist',
  tvshows: 'series',
}

const CATEGORY_SLUGS: Record<FandomKey, string> = {
  movies: 'movies',
  anime: 'anime',
  games: 'gaming',
  comics: 'comics',
  kpop: 'k-pop',
  tvshows: 'tvshows',
}

const STATUSES: ContentStatus[] = ['released', 'announced', 'discontinued']

// ---------- shared modal shell ----------

function PanelShell({
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  title: string
  subtitle: string
  onClose: () => void
  children: React.ReactNode
  footer: React.ReactNode
}) {
  const dialogRef = useRef<HTMLDivElement>(null)

  // Focus the dialog on open and close on Escape.
  useEffect(() => {
    dialogRef.current?.focus()
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="surface-card my-8 w-full max-w-2xl shadow-2xl focus:outline-none"
      >
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-ink">{title}</h2>
            <p className="mt-0.5 truncate text-xs text-ink-subtle">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-lg p-1.5 text-ink-subtle transition hover:bg-surface-sunken hover:text-ink"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="space-y-4 px-5 py-4">{children}</div>

        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3.5">
          {footer}
        </footer>
      </div>
    </div>,
    document.body,
  )
}

// ---------- shared fields ----------

const FIELD_CLASS =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink transition placeholder:text-ink-subtle focus:border-accent'

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-xs font-semibold text-ink-muted">
      {children}
    </label>
  )
}

/**
 * Comma-separated genre input.
 *
 * The API takes a list, and typing "Action, Adventure" is faster than clicking
 * 80 checkboxes, so this parses on save and normalises each entry's casing to a
 * known genre where one exists.
 */
function GenreField({
  id,
  value,
  onChange,
  known,
}: {
  id: string
  value: string[]
  onChange: (next: string[]) => void
  known: string[]
}) {
  const [text, setText] = useState(value.join(', '))

  // Re-sync when the panel switches between rows.
  useEffect(() => {
    setText(value.join(', '))
  }, [value])

  function commit(next: string) {
    setText(next)
    // Match the casing of a known genre so "action" and "Action" do not both
    // end up in the tag list.
    onChange(
      next
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
          const match = known.find((g) => g.toLowerCase() === part.toLowerCase())
          return match ?? part
        }),
    )
  }

  return (
    <div>
      <Label htmlFor={id}>Genres</Label>
      <input
        id={id}
        type="text"
        value={text}
        onChange={(event) => commit(event.target.value)}
        placeholder="Action, Adventure, Drama"
        className={FIELD_CLASS}
      />
      <p className="mt-1 text-[11px] text-ink-subtle">
        Separate with commas. {value.length} tag{value.length === 1 ? '' : 's'} ·{' '}
        {known.length} exist in the catalogue.
      </p>
    </div>
  )
}

function YearField({
  id,
  value,
  onChange,
  error,
}: {
  id: string
  value: number | null
  onChange: (next: number | null) => void
  error?: string
}) {
  const [text, setText] = useState(value === null ? '' : String(value))

  useEffect(() => {
    setText(value === null ? '' : String(value))
  }, [value])

  return (
    <div>
      <Label htmlFor={id}>Release year</Label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={text}
        onChange={(event) => {
          setText(event.target.value)
          const trimmed = event.target.value.trim()
          if (trimmed === '') {
            onChange(null)
            return
          }
          // Only accept a plausible year; reject rather than store nonsense.
          if (/^\d{4}$/.test(trimmed)) onChange(Number(trimmed))
        }}
        placeholder="1995"
        aria-invalid={error ? true : undefined}
        className={`${FIELD_CLASS} ${error ? 'border-rose-500' : ''}`}
      />
      {error && <p className="mt-1 text-[11px] text-rose-500">{error}</p>}
    </div>
  )
}

// ---------- edit panel ----------

export function EditPanel({
  row,
  onClose,
  onSave,
  onRevert,
  canRevert,
}: {
  row: CatalogRow
  onClose: () => void
  onSave: (patch: Partial<CatalogEdit>) => void
  onRevert: () => void
  canRevert: boolean
}) {
  const { genres: known } = useCatalog()
  const [title, setTitle] = useState(row.title)
  const [year, setYear] = useState<number | null>(row.releaseYear)
  const [genres, setGenres] = useState<string[]>(row.genres)
  const [synopsis, setSynopsis] = useState(row.synopsis ?? '')
  const [status, setStatus] = useState<ContentStatus>(row.status)
  const [posterPath, setPosterPath] = useState(row.posterPath ?? '')

  const titleError = title.trim() === '' ? 'A title is required.' : null
  const yearError =
    year !== null && (year < 1888 || year > 2100) ? 'Enter a year between 1888 and 2100.' : null
  const invalid = titleError !== null || yearError !== null

  // Only send fields that actually changed, so an untouched panel saves nothing.
  function save() {
    const patch: Partial<CatalogEdit> = {}
    if (title.trim() !== row.title) patch.title = title.trim()
    if (year !== row.releaseYear) patch.releaseYear = year
    if (genres.join('|') !== row.genres.join('|')) patch.genres = genres
    const cleanSynopsis = synopsis.trim()
    if (cleanSynopsis !== (row.synopsis ?? '')) patch.synopsis = cleanSynopsis || null
    if (status !== row.status) patch.status = status
    if (posterPath.trim() !== (row.posterPath ?? '')) patch.posterPath = posterPath.trim() || null
    onSave(patch)
  }

  return (
    <PanelShell
      title="Edit title"
      subtitle={`content_id ${row.id} · ${row.slug} · ${FANDOM_LABELS[row.fandom]}`}
      onClose={onClose}
      footer={
        <>
          {canRevert && (
            <AdminButton variant="secondary" onClick={onRevert} className="mr-auto">
              Revert this row
            </AdminButton>
          )}
          <AdminButton variant="secondary" onClick={onClose}>
            Cancel
          </AdminButton>
          <AdminButton variant="primary" onClick={save} disabled={invalid}>
            Save changes
          </AdminButton>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="edit-title">Title</Label>
          <input
            id="edit-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            aria-invalid={titleError ? true : undefined}
            className={`${FIELD_CLASS} ${titleError ? 'border-rose-500' : ''}`}
          />
          {titleError && <p className="mt-1 text-[11px] text-rose-500">{titleError}</p>}
        </div>

        <YearField id="edit-year" value={year} onChange={setYear} error={yearError ?? undefined} />

        <div>
          <Label htmlFor="edit-status">Status</Label>
          <select
            id="edit-status"
            value={status}
            onChange={(event) => setStatus(event.target.value as ContentStatus)}
            className={FIELD_CLASS}
          >
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {value[0].toUpperCase() + value.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <GenreField id="edit-genres" value={genres} onChange={setGenres} known={known} />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="edit-poster">Poster path</Label>
          <div className="flex items-start gap-3">
            {/* Preview the path as typed, so a typo is visible here rather than
                as a broken tile somewhere downstream. Falls back to the
                placeholder wash when the path is empty or does not load. */}
            <PosterThumb posterPath={posterPath.trim() || null} title={title} className="w-16 shrink-0 rounded" />
            <div className="flex-1">
              <input
                id="edit-poster"
                type="text"
                value={posterPath}
                onChange={(event) => setPosterPath(event.target.value)}
                placeholder="/images/movies/die-hard.jpg"
                className={FIELD_CLASS}
              />
              <p className="mt-1 text-[11px] text-ink-subtle">
                Path to the image file, not a full URL. Leave empty if there is no artwork.
              </p>
            </div>
          </div>
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="edit-synopsis">Synopsis</Label>
          <textarea
            id="edit-synopsis"
            value={synopsis}
            onChange={(event) => setSynopsis(event.target.value)}
            rows={4}
            placeholder="A short summary of the title."
            className={`${FIELD_CLASS} resize-y`}
          />
        </div>
      </div>

      <p className="rounded-lg border border-line bg-surface-sunken px-3 py-2 text-[11px] text-ink-muted">
        <span className="font-semibold">Read-only:</span> the slug, content type and category are
        derived from the title and fandom, so they are not editable here.
      </p>
    </PanelShell>
  )
}

// ---------- create panel ----------

export function CreatePanel({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (draft: Omit<CatalogRow, 'id'>) => void
}) {
  const { genres: known } = useCatalog()
  const [title, setTitle] = useState('')
  const [fandom, setFandom] = useState<FandomKey>('movies')
  const [year, setYear] = useState<number | null>(null)
  const [genres, setGenres] = useState<string[]>([])
  const [posterPath, setPosterPath] = useState('')
  const [synopsis, setSynopsis] = useState('')
  const [status, setStatus] = useState<ContentStatus>('released')

  const titleError = title.trim() === '' ? 'A title is required.' : null
  const yearError =
    year !== null && (year < 1888 || year > 2100) ? 'Enter a year between 1888 and 2100.' : null
  const invalid = titleError !== null || yearError !== null

  function submit() {
    const clean = title.trim()
    onCreate({
      title: clean,
      slug: clean
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, ''),
      fandom,
      categorySlug: CATEGORY_SLUGS[fandom],
      contentType: CONTENT_TYPES[fandom],
      releaseYear: year,
      genres,
      posterPath: posterPath.trim() || null,
      synopsis: synopsis.trim() || null,
      status,
    })
  }

  return (
    <PanelShell
      title="Add a title"
      subtitle="Adds a new title to the catalogue."
      onClose={onClose}
      footer={
        <>
          <AdminButton variant="secondary" onClick={onClose}>
            Cancel
          </AdminButton>
          <AdminButton variant="primary" onClick={submit} disabled={invalid}>
            Add title
          </AdminButton>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="new-title">Title</Label>
          <input
            id="new-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Princess Mononoke"
            aria-invalid={titleError ? true : undefined}
            className={`${FIELD_CLASS} ${titleError ? 'border-rose-500' : ''}`}
          />
          {titleError && <p className="mt-1 text-[11px] text-rose-500">{titleError}</p>}
        </div>

        <div>
          <Label htmlFor="new-fandom">Fandom</Label>
          <select
            id="new-fandom"
            value={fandom}
            onChange={(event) => setFandom(event.target.value as FandomKey)}
            className={FIELD_CLASS}
          >
            {(Object.keys(FANDOM_LABELS) as FandomKey[]).map((key) => (
              <option key={key} value={key}>
                {FANDOM_LABELS[key]}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-ink-subtle">
            content_type becomes &ldquo;{CONTENT_TYPES[fandom]}&rdquo;.
          </p>
        </div>

        <YearField id="new-year" value={year} onChange={setYear} error={yearError ?? undefined} />

        <div className="sm:col-span-2">
          <GenreField id="new-genres" value={genres} onChange={setGenres} known={known} />
        </div>

        <div>
          <Label htmlFor="new-status">Status</Label>
          <select
            id="new-status"
            value={status}
            onChange={(event) => setStatus(event.target.value as ContentStatus)}
            className={FIELD_CLASS}
          >
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {value[0].toUpperCase() + value.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="new-poster">Poster path</Label>
          <div className="flex items-start gap-3">
            <PosterThumb
              posterPath={posterPath.trim() || null}
              title={title || 'New title'}
              className="w-16 shrink-0 rounded"
            />
            <div className="flex-1">
              <input
                id="new-poster"
                type="text"
                value={posterPath}
                onChange={(event) => setPosterPath(event.target.value)}
                placeholder="/images/movies/die-hard.jpg"
                className={FIELD_CLASS}
              />
              <p className="mt-1 text-[11px] text-ink-subtle">
                Path to a file already in <code className="text-ink-muted">public/images/</code>.
                Leave empty if there is no artwork.
              </p>
            </div>
          </div>
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="new-synopsis">Synopsis</Label>
          <textarea
            id="new-synopsis"
            value={synopsis}
            onChange={(event) => setSynopsis(event.target.value)}
            rows={3}
            placeholder="Optional."
            className={`${FIELD_CLASS} resize-y`}
          />
        </div>
      </div>
    </PanelShell>
  )
}

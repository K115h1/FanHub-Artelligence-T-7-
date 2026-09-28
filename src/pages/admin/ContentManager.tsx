// ContentManager — route: /admin/content.
//
// Browses the catalogue and lets an administrator add, edit and remove rows.
// The rows come from /admin/contents, paged and filtered in SQL, so what is on
// screen here is what MySQL holds and an edit is visible to visitors at once.
// It used to be the bundled src/data/catalog.json with changes layered on in
// localStorage, which meant an administrator's work was invisible to everyone
// else and gone on another machine.
//
// Deletion is deliberately awkward, and now genuinely so: a removal is a real
// DELETE, so the confirmation spells the title out and says plainly that there
// is no undo. The old "discard changes" undo existed only because the edits were
// a local overlay, and it could not undo a real delete.

import { useState } from 'react'
import {
  BookMarked,
  Library,
  Pencil,
  Plus,
  SearchX,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import { FANDOM_LABELS } from '../../features/admin/AdminDataProvider'
import { useContentMutations } from '../../features/admin/useContentMutations'
import { useCatalog } from '../../features/admin/hooks'
import type { CatalogRow, FandomKey } from '../../features/admin/types'
import { CreatePanel, EditPanel } from './ContentPanels'
import PosterThumb from '../../components/common/PosterThumb'
import {
  AdminButton,
  AdminPageHeader,
  FilterInput,
  FilterSelect,
  Pagination,
  StatTile,
  StatusPill,
  TableSkeleton,
} from '../../components/admin/shared'
import { EmptyState } from '../../components/common/EmptyState'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'

const FANDOM_OPTIONS = [
  { value: 'all', label: 'All fandoms' },
  ...(Object.keys(FANDOM_LABELS) as FandomKey[]).map((key) => ({
    value: key,
    label: FANDOM_LABELS[key],
  })),
]

// The contents.status column values. 'Announced' and 'Discontinued' were never
// valid for it, so the filter offered two options that matched nothing.
const STATUS_OPTIONS = [
  { value: 'all', label: 'Any status' },
  { value: 'released', label: 'Released' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'ended', label: 'Ended' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default function ContentManager() {
  const catalog = useCatalog()
  // Writes go to the API. The old localStorage overlay's "revert" and "discard
  // all" controls are gone: an edit is now a real UPDATE, so there is no
  // un-committed state left to roll back.
  const { updateRow, addRow, deleteRow, busy, error: mutationError, clearError } =
    useContentMutations(catalog.refresh)
  const [editing, setEditing] = useState<CatalogRow | null>(null)
  const [creating, setCreating] = useState(false)
  const [removing, setRemoving] = useState<CatalogRow | null>(null)

  return (
    <>
      <AdminPageHeader
        title="Content Manager"
        description="Search, tag and edit every title in the catalogue."
        action={
          <div className="flex gap-2">
            <AdminButton variant="primary" onClick={() => setCreating(true)}>
              <Plus size={14} aria-hidden="true" />
              Add title
            </AdminButton>
          </div>
        }
      />

      {/* A failed write, and a load failure, are both shown here rather than
          swallowed: silently doing nothing is how an administrator loses an
          edit they believed was saved. */}
      {(mutationError || catalog.error) && (
        <p
          role="alert"
          className="mb-4 flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-600"
        >
          <TriangleAlert size={15} aria-hidden="true" />
          {mutationError ?? catalog.error}
          <button
            type="button"
            onClick={clearError}
            className="ml-auto text-xs font-semibold underline hover:no-underline"
          >
            Dismiss
          </button>
        </p>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile icon={Library} label="Titles" value={catalog.total.toLocaleString()} hint="Matching filters" />
        <StatTile
          icon={BookMarked}
          label="Genres"
          value={catalog.genres.length}
          tone="plain"
          hint="Across all fandoms"
        />
        <StatTile
          icon={Pencil}
          label="Status"
          value={catalog.query.status === 'all' ? 'Any' : catalog.query.status}
          tone="plain"
          hint="Filtered server-side"
        />
        <StatTile
          icon={TriangleAlert}
          label="Page"
          value={`${catalog.page} / ${catalog.pageCount}`}
          tone="plain"
          hint={catalog.isFiltered ? 'Filtered view' : 'Full catalogue'}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <FilterInput
          value={catalog.query.search}
          onChange={(search) => catalog.setQuery({ search })}
          label="Search titles"
          placeholder="Search 2,490 titles…"
        />
        <FilterSelect
          value={catalog.query.fandom}
          onChange={(fandom) => catalog.setQuery({ fandom: fandom as typeof catalog.query.fandom })}
          label="Fandom"
          options={FANDOM_OPTIONS}
        />
        <FilterSelect
          value={catalog.query.genre}
          onChange={(genre) => catalog.setQuery({ genre })}
          label="Genre"
          options={[
            { value: '', label: catalog.genres.length ? 'All genres' : 'All genres' },
            ...catalog.genres.map((genre) => ({ value: genre, label: genre })),
          ]}
        />
        <FilterSelect
          value={catalog.query.status}
          onChange={(status) => catalog.setQuery({ status: status as typeof catalog.query.status })}
          label="Status"
          options={STATUS_OPTIONS}
        />
        {catalog.isFiltered && (
          <AdminButton variant="secondary" onClick={catalog.resetQuery}>
            Clear filters
          </AdminButton>
        )}
      </div>

      {catalog.loading && catalog.rows.length === 0 ? (
        <TableSkeleton />
      ) : catalog.rows.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No titles match those filters"
          body="Try a shorter search term, or switch the fandom and genre back to all."
          actionText="Clear filters"
          onAction={catalog.resetQuery}
        />
      ) : (
        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-subtle">
                  <th scope="col" className="px-4 py-3 font-semibold">ID</th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    <span className="sr-only">Poster</span>
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">Title</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Fandom</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Year</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Genres</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {catalog.rows.map((row) => (
                  <tr key={row.id} className="align-middle transition hover:bg-surface-sunken/50">
                    <td className="px-4 py-3 text-xs tabular-nums text-ink-subtle">{row.id}</td>
                    <td className="px-4 py-3">
                      <PosterThumb
                        posterPath={row.posterPath}
                        title={row.title}
                        size="sm"
                        className="w-10 rounded"
                      />
                    </td>
                    <td className="max-w-[20rem] px-4 py-3">
                      <p className="truncate font-medium text-ink">{row.title}</p>
                      <p className="truncate text-[11px] text-ink-subtle">{row.slug}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-muted">
                      {FANDOM_LABELS[row.fandom]}
                    </td>
                    <td className="px-4 py-3 text-xs tabular-nums text-ink-muted">
                      {row.releaseYear ?? '—'}
                    </td>
                    <td className="max-w-[14rem] px-4 py-3">
                      <p className="truncate text-xs text-ink-muted">
                        {row.genres.join(', ') || '—'}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <StatusPill value={row.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <AdminButton
                          variant="secondary"
                          onClick={() => setEditing(row)}
                          aria-label={`Edit ${row.title}`}
                        >
                          <Pencil size={13} aria-hidden="true" />
                          Edit
                        </AdminButton>
                        <AdminButton
                          variant="danger"
                          onClick={() => setRemoving(row)}
                          aria-label={`Remove ${row.title}`}
                        >
                          <Trash2 size={13} aria-hidden="true" />
                        </AdminButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={catalog.page}
            pageCount={catalog.pageCount}
            total={catalog.total}
            pageSize={catalog.pageSize}
            onChange={catalog.goToPage}
          />
        </div>
      )}

      {editing && (
        <EditPanel
          row={editing}
          busy={busy}
          onClose={() => setEditing(null)}
          onSave={(patch) => {
            void updateRow(editing.id, patch)
            setEditing(null)
          }}
        />
      )}

      {creating && (
        <CreatePanel
          busy={busy}
          onClose={() => setCreating(false)}
          onCreate={(draft) => {
            void addRow(draft)
            setCreating(false)
          }}
        />
      )}

      <ConfirmDialog
        isOpen={removing !== null}
        title="Remove this title?"
        body={
          removing
            ? `"${removing.title}" (id ${removing.id}) will be deleted from the database. It disappears from the public site immediately, and re-adding it means importing it again — there is no undo.`
            : ''
        }
        confirmText="Remove title"
        isWarning
        onConfirm={() => {
          if (removing) void deleteRow(removing.id)
          setRemoving(null)
        }}
        onCancel={() => setRemoving(null)}
      />
    </>
  )
}

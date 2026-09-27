// ContentManager — route: /admin/content.
//
// Browses the full 2,490-title catalogue and lets an administrator add, edit and
// remove rows. The catalogue is the generated src/data/catalog.json, verified
// row-for-row against the database seed files by scripts/verifyCatalog.mjs, so
// what is on screen here is what MySQL holds.
//
// Deletion is deliberately awkward: a mis-click on a bulk-imported row is
// unrecoverable without re-running the importer, so removing a title spells the
// title out in the confirmation and every removal can be reverted.

import { useState } from 'react'
import {
  BookMarked,
  Library,
  Pencil,
  Plus,
  RotateCcw,
  SearchX,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import { useAdminData, FANDOM_LABELS } from '../../features/admin/AdminDataProvider'
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

const STATUS_OPTIONS = [
  { value: 'all', label: 'Any status' },
  { value: 'released', label: 'Released' },
  { value: 'announced', label: 'Announced' },
  { value: 'discontinued', label: 'Discontinued' },
]

export default function ContentManager() {
  const { updateRow, addRow, deleteRow, revertRow, resetContent, changeCount } = useAdminData()
  const catalog = useCatalog()
  const [editing, setEditing] = useState<CatalogRow | null>(null)
  const [creating, setCreating] = useState(false)
  const [removing, setRemoving] = useState<CatalogRow | null>(null)
  const [resetting, setResetting] = useState(false)

  return (
    <>
      <AdminPageHeader
        title="Content Manager"
        description="Search, tag and edit every title in the catalogue."
        action={
          <div className="flex gap-2">
            {changeCount > 0 && (
              <AdminButton variant="secondary" onClick={() => setResetting(true)}>
                <RotateCcw size={13} aria-hidden="true" />
                Discard {changeCount} change{changeCount === 1 ? '' : 's'}
              </AdminButton>
            )}
            <AdminButton variant="primary" onClick={() => setCreating(true)}>
              <Plus size={14} aria-hidden="true" />
              Add title
            </AdminButton>
          </div>
        }
      />

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
          label="Your changes"
          value={changeCount}
          tone={changeCount > 0 ? 'warning' : 'plain'}
          hint="Pending review"
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

      {catalog.rows.length === 0 ? (
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
          onClose={() => setEditing(null)}
          onSave={(patch) => {
            updateRow(editing.id, patch)
            setEditing(null)
          }}
          onRevert={() => {
            revertRow(editing.id)
            setEditing(null)
          }}
          canRevert={changeCount > 0}
        />
      )}

      {creating && (
        <CreatePanel
          onClose={() => setCreating(false)}
          onCreate={(draft) => {
            addRow(draft)
            setCreating(false)
          }}
        />
      )}

      <ConfirmDialog
        isOpen={removing !== null}
        title="Remove this title?"
        body={
          removing
            ? `"${removing.title}" (id ${removing.id}) will be removed from the catalogue. You can restore it with Discard changes.`
            : ''
        }
        confirmText="Remove title"
        isWarning
        onConfirm={() => {
          if (removing) deleteRow(removing.id)
          setRemoving(null)
        }}
        onCancel={() => setRemoving(null)}
      />

      <ConfirmDialog
        isOpen={resetting}
        title="Discard all changes?"
        body={`${changeCount} change${changeCount === 1 ? '' : 's'} will be reverted, restoring every title to its original entry.`}
        confirmText="Discard changes"
        isWarning
        onConfirm={() => {
          resetContent()
          setResetting(false)
        }}
        onCancel={() => setResetting(false)}
      />
    </>
  )
}

// MerchandiseManager, route: /admin/merchandise.
//
// Lets you add, edit and delete rows in merchandise_items. The public page only
// reads them, so without this the only way to add a product was editing SQL by
// hand, and names, blurbs, tags and photos were all fixed at seed time.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ImageOff, Package, Pencil, Plus, ShoppingBag, Trash2, X } from 'lucide-react'
import {
  AdminButton,
  AdminPageHeader,
  FilterInput,
  FilterSelect,
  Pagination,
  StatTile,
  TableSkeleton,
  formatDate,
} from '../../components/admin/shared'
import { EmptyState } from '../../components/common/EmptyState'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import { getCategories } from '../../services/content.service'
import {
  createMerchandise,
  deleteMerchandise,
  getMerchandise,
  updateMerchandise,
} from '../../services/merchandise.service'
import type {
  CategoryDto,
  MerchandiseEdit,
  MerchandiseItem,
  MerchandisePayload,
  MerchandiseSort,
} from '../../types/models'

const PAGE_SIZE = 25

type Draft = Omit<MerchandisePayload, 'categoryId'> & { categoryId: number | '' }

const EMPTY_DRAFT: Draft = {
  categoryId: '',
  name: '',
  description: '',
  imagePath: '',
  tag: '',
  priceNote: '',
  isUpcoming: true,
}

export default function MerchandiseManager() {
  const [items, setItems] = useState<MerchandiseItem[]>([])
  const [categories, setCategories] = useState<CategoryDto[]>([])
  const [total, setTotal] = useState(0)
  const [pageCount, setPageCount] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState<MerchandiseSort>('name')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [editing, setEditing] = useState<MerchandiseItem | null>(null)
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [saving, setSaving] = useState(false)
  const [draftError, setDraftError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<MerchandiseItem | null>(null)
  const runId = useRef(0)

  useEffect(() => {
    void getCategories()
      .then(setCategories)
      .catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    const mine = ++runId.current
    setLoading(true)
    setError(null)
    void getMerchandise({
      categoryId: category === 'all' ? undefined : Number(category),
      search: search.trim() || undefined,
      sort,
      page,
      pageSize: PAGE_SIZE,
    })
      .then((result) => {
        if (mine !== runId.current) return
        setItems(result.items)
        setTotal(result.totalCount)
        setPageCount(result.pageCount)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (mine !== runId.current) return
        setItems([])
        setError(err instanceof Error ? err.message : 'The catalogue could not be loaded.')
        setLoading(false)
      })
  }, [category, search, sort, page])

  const upcomingCount = useMemo(() => items.filter((i) => i.isUpcoming).length, [items])
  const withPhoto = useMemo(() => items.filter((i) => i.imagePath).length, [items])

  const openCreate = useCallback(() => {
    setEditing(null)
    setDraft(EMPTY_DRAFT)
    setDraftError(null)
  }, [])

  function openEdit(item: MerchandiseItem) {
    const owner = categories.find((c) => c.slug === item.categorySlug)
    setEditing(item)
    setDraft({
      categoryId: owner?.id ?? '',
      name: item.name,
      description: item.description ?? '',
      imagePath: item.imagePath ?? '',
      tag: item.tag ?? '',
      priceNote: item.priceNote ?? '',
      isUpcoming: item.isUpcoming,
    })
    setDraftError(null)
  }

  async function save() {
    if (saving) return
    if (!draft.name.trim()) {
      setDraftError('Give the product a name.')
      return
    }
    if (draft.categoryId === '') {
      setDraftError('Pick a fandom.')
      return
    }

    setSaving(true)
    setDraftError(null)
    try {
      if (editing) {
        const edit: MerchandiseEdit = {
          name: draft.name.trim(),
          description: draft.description?.trim() || null,
          imagePath: draft.imagePath?.trim() || null,
          tag: draft.tag?.trim() || null,
          priceNote: draft.priceNote?.trim() || null,
          isUpcoming: draft.isUpcoming,
        }
        await updateMerchandise(editing.id, edit)
        setNotice(`Saved "${edit.name}".`)
      } else {
        await createMerchandise({
          categoryId: Number(draft.categoryId),
          name: draft.name.trim(),
          description: draft.description?.trim() || null,
          imagePath: draft.imagePath?.trim() || null,
          tag: draft.tag?.trim() || null,
          priceNote: draft.priceNote?.trim() || null,
          isUpcoming: draft.isUpcoming,
        })
        setNotice(`Added "${draft.name.trim()}".`)
      }
      setEditing(null)
      setDraft(EMPTY_DRAFT)
      setPage(1)
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : 'That did not save.')
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    const name = deleting.name
    try {
      await deleteMerchandise(deleting.id)
      setItems((prev) => prev.filter((i) => i.id !== deleting.id))
      setTotal((prev) => Math.max(0, prev - 1))
      setNotice(`Deleted "${name}".`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That product could not be deleted.')
    } finally {
      setDeleting(null)
    }
  }

  const panelOpen = editing !== null || draft.name !== '' || draftError !== null

  return (
    <>
      <AdminPageHeader
        title="Merchandise"
        description="Everything the shop showcase reads. Public display only — there is no cart."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile icon={Package} label="Products" value={total} />
        <StatTile
          icon={ShoppingBag}
          label="Marked upcoming"
          value={upcomingCount}
          tone="plain"
          hint="On this page"
        />
        <StatTile
          icon={ImageOff}
          label="Without a photo"
          value={items.length - withPhoto}
          tone="plain"
          hint="On this page"
        />
        <StatTile
          icon={Pencil}
          label="Page"
          value={`${page} of ${pageCount}`}
          tone="plain"
        />
      </div>

      {notice && (
        <p
          role="status"
          className="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-700"
        >
          {notice}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-600"
        >
          {error}
        </p>
      )}

      {panelOpen && (
        <div className="surface-card mb-5 space-y-3 p-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-ink">
              {editing ? `Edit "${editing.name}"` : 'Add a product'}
            </h2>
            <button
              type="button"
              onClick={() => {
                setEditing(null)
                setDraft(EMPTY_DRAFT)
                setDraftError(null)
              }}
              aria-label="Discard"
              className="ml-auto rounded-lg p-1 text-ink-subtle transition hover:bg-surface-raised hover:text-ink"
            >
              <X size={15} aria-hidden="true" />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" id="merch-name">
              <input
                id="merch-name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="w-full rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm text-ink focus:border-accent"
              />
            </Field>

            <Field label="Fandom" id="merch-category">
              <select
                id="merch-category"
                value={draft.categoryId}
                disabled={editing !== null}
                onChange={(e) =>
                  setDraft({ ...draft, categoryId: e.target.value ? Number(e.target.value) : '' })
                }
                className="w-full rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm text-ink focus:border-accent disabled:opacity-60"
              >
                <option value="">Choose a fandom…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Image path" id="merch-image" hint="e.g. /images/merchandise/anime/riyadh.jpg">
              <input
                id="merch-image"
                value={draft.imagePath ?? ''}
                onChange={(e) => setDraft({ ...draft, imagePath: e.target.value })}
                className="w-full rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm text-ink focus:border-accent"
              />
            </Field>

            <Field label="Tag" id="merch-tag" hint="Limited Edition | Pre-Order | Collectible">
              <input
                id="merch-tag"
                value={draft.tag ?? ''}
                onChange={(e) => setDraft({ ...draft, tag: e.target.value })}
                className="w-full rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm text-ink focus:border-accent"
              />
            </Field>

            <Field label="Price note" id="merch-price" hint="Free | From $12 | TBC">
              <input
                id="merch-price"
                value={draft.priceNote ?? ''}
                onChange={(e) => setDraft({ ...draft, priceNote: e.target.value })}
                className="w-full rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm text-ink focus:border-accent"
              />
            </Field>

            <Field label="Description" id="merch-description">
              <textarea
                id="merch-description"
                rows={3}
                value={draft.description ?? ''}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                className="w-full rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm text-ink focus:border-accent"
              />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm text-ink-muted">
            <input
              type="checkbox"
              checked={draft.isUpcoming}
              onChange={(e) => setDraft({ ...draft, isUpcoming: e.target.checked })}
              className="h-4 w-4 rounded border-line"
            />
            Announced but not on sale yet
          </label>

          {draftError && (
            <p role="alert" className="text-xs font-medium text-red-500">
              {draftError}
            </p>
          )}

          <div className="flex gap-2">
            <AdminButton variant="primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Add product'}
            </AdminButton>
            <AdminButton
              onClick={() => {
                setEditing(null)
                setDraft(EMPTY_DRAFT)
                setDraftError(null)
              }}
            >
              Cancel
            </AdminButton>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <FilterInput
          value={search}
          onChange={(value) => {
            setSearch(value)
            setPage(1)
          }}
          label="Search merchandise"
          placeholder="Search names, tags and descriptions…"
        />
        <FilterSelect
          value={category}
          onChange={(value) => {
            setCategory(value)
            setPage(1)
          }}
          label="Fandom"
          options={[
            { value: 'all', label: 'All fandoms' },
            ...categories.map((c) => ({ value: String(c.id), label: c.name })),
          ]}
        />
        <FilterSelect
          value={sort}
          onChange={(value) => setSort(value as MerchandiseSort)}
          label="Sort"
          options={[
            { value: 'name', label: 'A – Z' },
            { value: 'newest', label: 'Newest first' },
            { value: 'views', label: 'Most viewed' },
          ]}
        />
        <AdminButton variant="primary" className="ml-auto" onClick={openCreate}>
          <Plus size={14} aria-hidden="true" />
          Add product
        </AdminButton>
      </div>

      {loading ? (
        <TableSkeleton rows={8} columns={5} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products match"
          body="Clear the filters, or add the first product for this fandom."
          actionText="Clear filters"
          onAction={() => {
            setSearch('')
            setCategory('all')
            setPage(1)
          }}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-ink-subtle">
                <th className="py-2 pr-3 font-medium">Product</th>
                <th className="py-2 pr-3 font-medium">Fandom</th>
                <th className="py-2 pr-3 font-medium">Tag</th>
                <th className="py-2 pr-3 font-medium">Price</th>
                <th className="py-2 pr-3 font-medium">Added</th>
                <th className="py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((item) => (
                <tr key={item.id} className="align-middle">
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-surface-sunken"
                      >
                        {item.imagePath ? (
                          <span
                            className="absolute inset-0 bg-cover bg-center"
                            style={{ backgroundImage: `url(${item.imagePath})` }}
                          />
                        ) : (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <ImageOff size={14} className="text-ink-subtle" />
                          </span>
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-ink">{item.name}</span>
                        <span className="block truncate text-xs text-ink-subtle">
                          {item.description || 'No description'}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="py-2 pr-3 text-ink-muted">{item.categorySlug}</td>
                  <td className="py-2 pr-3 text-ink-muted">{item.tag || '—'}</td>
                  <td className="py-2 pr-3 text-ink-muted">{item.priceNote || 'TBC'}</td>
                  <td className="py-2 pr-3 text-xs text-ink-subtle">{formatDate(item.createdAt)}</td>
                  <td className="py-2">
                    <div className="flex justify-end gap-1.5">
                      <AdminButton onClick={() => openEdit(item)} aria-label={`Edit ${item.name}`}>
                        <Pencil size={13} aria-hidden="true" />
                        Edit
                      </AdminButton>
                      <AdminButton
                        variant="danger"
                        onClick={() => setDeleting(item)}
                        aria-label={`Delete ${item.name}`}
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
      )}

      {pageCount > 1 && (
        <div className="mt-5">
          <Pagination
            page={page}
            pageCount={pageCount}
            total={total}
            pageSize={PAGE_SIZE}
            onChange={setPage}
          />
        </div>
      )}

      <ConfirmDialog
        isOpen={deleting !== null}
        title="Delete this product?"
        body={
          deleting
            ? `"${deleting.name}" will be removed from the catalogue and the public showcase. The image file is left on disk.`
            : ''
        }
        confirmText="Delete"
        isWarning
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  )
}

function Field({
  label,
  id,
  hint,
  children,
}: {
  label: string
  id: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-ink-muted">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-ink-subtle">{hint}</p>}
    </div>
  )
}

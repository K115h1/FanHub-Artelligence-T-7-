// useContentMutations — the write side of the content manager.
//
// The panel used to keep a localStorage overlay of edits, deletions and additions
// and offered "revert this row" and "discard all changes" on top of it. That
// whole model disappears once the API is the source of truth: an edit is a real
// UPDATE, and a delete is a real DELETE, so there is nothing to revert to. The
// undo affordances are gone rather than faked, because a button that appears to
// restore a deleted row and silently does nothing is worse than no button.
//
// Each mutation re-reads the current page afterwards instead of patching local
// state, so what the administrator sees is what the database holds — including
// server-side effects like a slug collision or a genre that had to be created.
import { useCallback, useEffect, useState } from 'react'
import * as adminApi from '../../services/admin.service'
import { getCategories } from '../../services/content.service'
import type { CatalogEdit, CatalogRow, FandomKey } from './types'
import { CONTENT_TYPE_BY_FANDOM, FANDOM_BY_SLUG } from './categorySlugs'

export interface ContentMutations {
  /**
   * Apply an edit to a row, then re-read the page.
   *
   * Partial on purpose: the edit panel sends only the fields that changed, and
   * the API treats an omitted field as "leave it alone". Sending all six
   * unconditionally would blank a genre list and a synopsis on every save.
   */
  updateRow(id: number, patch: Partial<CatalogEdit>): Promise<void>
  /** Create a title, then re-read the page. */
  addRow(draft: Omit<CatalogRow, 'id'>): Promise<void>
  /** Permanently delete a row, then re-read the page. */
  deleteRow(id: number): Promise<void>
  /** True while any mutation is in flight. */
  busy: boolean
  /** The last failure, for the page to show. Cleared by clearError. */
  error: string | null
  clearError(): void
}

export function useContentMutations(onChanged: () => void): ContentMutations {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // contents.category_id is a foreign key, so creating a title needs the numeric
  // id — the form only knows the fandom, and the two are not the same value
  // ('games' is category 3, whose slug is 'gaming').
  //
  // Resolved from the server's own category list rather than a hardcoded map,
  // because the live database and the seed file disagree on the TV Shows slug
  // ('tv-shows' vs 'tvshows'). A title created against a slug the database does
  // not hold would fail on the foreign key with nothing the administrator could
  // act on, so the mapping comes from the same place the filter does.
  const [categoryIdByFandom, setCategoryIdByFandom] = useState<
    Partial<Record<FandomKey, number>>
  >({})
  useEffect(() => {
    let cancelled = false
    void getCategories()
      .then((all) => {
        if (cancelled) return
        setCategoryIdByFandom(
          Object.fromEntries(
            all
              .map((c) => [FANDOM_BY_SLUG[c.slug], c.id] as const)
              .filter((pair): pair is [FandomKey, number] => pair[0] !== undefined),
          ),
        )
      })
      .catch(() => {
        // Surfaced on submit as "the category could not be resolved", which is
        // more useful than a create that fails on a foreign key.
        if (!cancelled) setCategoryIdByFandom({})
      })
    return () => {
      cancelled = true
    }
  }, [])

  /**
   * Run one mutation, then always re-read.
   *
   * `onChanged` runs in a finally so the table refreshes even after a failure:
   * a partial failure (the row saved, the genre did not) must not leave the
   * administrator looking at a stale row.
   */
  const run = useCallback(
    async (work: () => Promise<unknown>) => {
      setBusy(true)
      setError(null)
      try {
        await work()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'That change could not be saved.')
      } finally {
        setBusy(false)
        onChanged()
      }
    },
    [onChanged],
  )

  const updateRow = useCallback(
    (id: number, patch: Partial<CatalogEdit>) =>
      run(() =>
        adminApi.updateContent(id, {
          title: patch.title,
          // `null` means "clear this field" in the panel, but the API reads an
          // omitted field as "leave alone" and null as an explicit value, so a
          // cleared year has to be left out rather than sent as null — a
          // non-nullable ushort column would reject it.
          releaseYear: patch.releaseYear ?? undefined,
          genres: patch.genres,
          synopsis: patch.synopsis ?? undefined,
          shortSynopsis: patch.synopsis ?? undefined,
          status: patch.status,
          posterPath: patch.posterPath ?? undefined,
        }),
      ),
    [run],
  )

  const addRow = useCallback(
    (draft: Omit<CatalogRow, 'id'>) =>
      run(async () => {
        const categoryId = categoryIdByFandom[draft.fandom]
        // Checked before the request, not after a foreign-key error: category 0
        // does not exist, and the database's complaint is not actionable.
        if (!categoryId) {
          throw new Error(
            'That fandom could not be resolved to a category, so nothing was created. Reload and try again.',
          )
        }

        return adminApi.createContent({
          title: draft.title,
          // Left blank so the API slugifies the title. A hand-typed slug is the
          // easiest way to create a duplicate that 404s on the public site.
          slug: '',
          categoryId,
          contentType: CONTENT_TYPE_BY_FANDOM[draft.fandom],
          status: draft.status,
          synopsis: draft.synopsis ?? undefined,
          shortSynopsis: draft.synopsis ?? undefined,
          releaseYear: draft.releaseYear ?? undefined,
          posterPath: draft.posterPath ?? undefined,
          genres: draft.genres,
        })
      }),
    [run, categoryIdByFandom],
  )

  const deleteRow = useCallback((id: number) => run(() => adminApi.deleteContent(id)), [run])

  return { updateRow, addRow, deleteRow, busy, error, clearError: useCallback(() => setError(null), []) }
}

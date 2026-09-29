// useContentMutations, the write side of the content manager.
//
// An edit is a real UPDATE and a delete a real DELETE, so there is no uncommitted
// overlay to revert. Each mutation re-reads the page rather than patching local
// state, so the table always shows what the database holds.
import { useCallback, useEffect, useState } from 'react'
import * as adminApi from '../../services/admin.service'
import { getCategories } from '../../services/content.service'
import type { CatalogEdit, CatalogRow, FandomKey } from './types'
import { CONTENT_TYPE_BY_FANDOM, FANDOM_BY_SLUG } from './categorySlugs'

export interface ContentMutations {
  /**
   * Partial on purpose: the API treats an omitted field as "leave it alone", so
   * sending every field would blank a genre list on each save.
   */
  updateRow(id: number, patch: Partial<CatalogEdit>): Promise<void>
  addRow(draft: Omit<CatalogRow, 'id'>): Promise<void>
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

  // category_id is a foreign key and the form only knows the fandom, which is a
  // different value ('games' is the category whose slug is 'gaming'). Resolved
  // from the server's list because the live database and the seed file disagree
  // on the TV Shows slug; a wrong slug fails on the foreign key.
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
        // Surfaces on submit as "the category could not be resolved", which beats
        // a create that dies on a foreign key.
        if (!cancelled) setCategoryIdByFandom({})
      })
    return () => {
      cancelled = true
    }
  }, [])

  // onChanged runs in a finally, so a partial failure (row saved, genre not)
  // still refreshes rather than leaving a stale row on screen.
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
          // A cleared value must be omitted, not sent as null: the API reads an
          // omitted field as "leave alone", and release_year is non-nullable.
          releaseYear: patch.releaseYear ?? undefined,
          genres: patch.genres,
          // Distinct fields, not one value written to both, that overwrote the
          // long synopsis with the one-line blurb on every save.
          synopsis: patch.synopsis ?? undefined,
          shortSynopsis: patch.shortSynopsis ?? undefined,
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
          shortSynopsis: draft.shortSynopsis ?? undefined,
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

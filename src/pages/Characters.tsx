// Characters, route: /characters.
//
// Bios are usually absent: the supplied files are wallpapers and cosplay
// photographs with no descriptions, and inventing one would be fabricating
// character detail.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Users } from 'lucide-react'
import { getCharacters } from '../services/character.service'
import type { Character } from '../types/models'
import PageHero from '../components/common/PageHero'
import SectionHeader from '../components/common/SectionHeader'
import { EmptyState } from '../components/common/EmptyState'
import { CardGridSkeleton } from '../components/common/skeletons'
import { FilterSelect } from '../components/admin/shared'
import CharacterCard from '../components/characters/CharacterCard'

const CATEGORY_NAMES: Record<string, string> = {
  anime: 'Anime',
  cosplay: 'Cosplay',
  'k-pop': 'K-Pop',
  manga: 'Manga',
  movies: 'Movies',
  gaming: 'Gaming',
  comics: 'Comics',
  'tv-shows': 'TV Shows',
}

export default function Characters() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Bumped per load so a slow request cannot overwrite a newer one.
  const runId = useRef(0)

  useEffect(() => {
    const mine = ++runId.current
    setLoading(true)
    setError(null)
    void getCharacters()
      .then((all) => {
        if (mine !== runId.current) return
        setCharacters(all)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (mine !== runId.current) return
        setError(err instanceof Error ? err.message : 'The character list could not be loaded.')
        setLoading(false)
      })
  }, [])

  // Counted from the fetched set, so a filter can only offer a category that
  // returns something. A chip leading to an empty grid is a dead control.
  const categories = useMemo(() => {
    const counts = new Map<string, number>()
    for (const c of characters) counts.set(c.categorySlug, (counts.get(c.categorySlug) ?? 0) + 1)
    return [...counts.entries()]
      .map(([slug, count]) => ({ slug, name: CATEGORY_NAMES[slug] ?? slug, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  }, [characters])

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return characters.filter((c) => {
      if (filter !== 'all' && c.categorySlug !== filter) return false
      if (needle && !c.name.toLowerCase().includes(needle)) return false
      return true
    })
  }, [characters, filter, search])

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-8">
      <PageHero
        kicker="Cosplay"
        title="Characters"
        icon={Users}
        blurb="Costumes, wallpapers and cosplay from across the fandoms. Filter by fandom, or search by name."
      />

      <section aria-labelledby="characters-grid">
        <SectionHeader id="characters-grid" title="All characters" icon={Users} />

        {error && (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-600"
          >
            {error}
          </p>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label htmlFor="character-search" className="sr-only">
            Search characters by name
          </label>
          <input
            id="character-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name…"
            className="w-full max-w-xs rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm text-ink transition focus:border-accent"
          />
          {categories.length > 1 && (
            <FilterSelect
              value={filter}
              onChange={setFilter}
              label="Fandom"
              options={[
                { value: 'all', label: `All fandoms (${characters.length})` },
                ...categories.map((c) => ({ value: c.slug, label: `${c.name} (${c.count})` })),
              ]}
            />
          )}
          <span className="text-xs text-ink-subtle">{visible.length} shown</span>
        </div>

        {loading ? (
          <CardGridSkeleton count={12} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Users}
            title={characters.length === 0 ? 'No characters yet' : 'No characters match'}
            body={
              characters.length === 0
                ? 'Character profiles are still being catalogued.'
                : 'Try a different name, or switch the fandom back to all.'
            }
            actionText={characters.length === 0 ? undefined : 'Clear filters'}
            onAction={characters.length === 0 ? undefined : () => { setFilter('all'); setSearch('') }}
          />
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {visible.map((character) => (
              <CharacterCard key={character.id} character={character} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

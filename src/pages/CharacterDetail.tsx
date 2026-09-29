// CharacterDetail, route: /characters/:id.
//
// Reads one character out of the list, because /community/characters has no
// single-item route. Fine at 89 rows; past a few thousand it needs a real
// endpoint.
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Users } from 'lucide-react'
import { getCharacters } from '../services/character.service'
import type { Character } from '../types/models'
import { EmptyState } from '../components/common/EmptyState'
import { Spinner } from '../components/common/Spinner'
import CharacterCard from '../components/characters/CharacterCard'
import { CategoryDot } from '../components/common/CategoryArt'

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

export default function CharacterDetail() {
  const { id } = useParams<{ id: string }>()
  const [character, setCharacter] = useState<Character | null>(null)
  const [others, setOthers] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const wanted = Number(id)
    if (!Number.isFinite(wanted)) {
      setLoading(false)
      setError('That is not a character id.')
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    void getCharacters()
      .then((all) => {
        if (cancelled) return
        const found = all.find((c) => c.id === wanted) ?? null
        setCharacter(found)
        setOthers(
          found
            ? all.filter((c) => c.id !== found.id && c.categorySlug === found.categorySlug).slice(0, 4)
            : [],
        )
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'That character could not be loaded.')
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) return <Spinner label="Loading character" />

  if (error || !character) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <EmptyState
          icon={Users}
          title={error ? 'Could not load that character' : 'No such character'}
          body={error ?? 'That character is not in the catalogue any more.'}
          actionText="All characters"
          onAction={() => window.location.assign('/characters')}
        />
      </div>
    )
  }

  const category = CATEGORY_NAMES[character.categorySlug] ?? character.categorySlug

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-6 sm:px-8">
      <Link
        to="/characters"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition hover:text-ink"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        All characters
      </Link>

      <article className="surface-card overflow-hidden">
        <div className="relative aspect-[4/5] bg-surface-sunken sm:aspect-square lg:aspect-[3/2]">
          {character.imagePath && (
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${character.imagePath})` }}
            />
          )}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/85 to-transparent"
          />
        </div>

        <div className="space-y-3 p-5 sm:p-6">
          <h1 className="text-2xl font-bold text-ink sm:text-3xl">{character.name}</h1>
          <p className="flex items-center gap-1.5 text-sm font-medium text-ink-muted">
            <CategoryDot slug={character.categorySlug} />
            {category}
          </p>

          {character.bio ? (
            <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">{character.bio}</p>
          ) : (
            <p className="max-w-2xl text-sm text-ink-subtle">
              No profile write-up for this one yet &mdash; it is here for the photograph.
            </p>
          )}
        </div>
      </article>

      {others.length > 0 && (
        <section aria-labelledby="more-characters">
          <h2 id="more-characters" className="mb-4 text-sm font-semibold text-ink">
            More from {category}
          </h2>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {others.map((other) => (
              <CharacterCard key={other.id} character={other} />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

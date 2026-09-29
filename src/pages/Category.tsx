// Category page — /category/:slug (one "child" page per category).
//
// Titles and events come from the API, so each fandom shows its real catalogue
// rather than the handful in the mock. Articles are still local: the schema has
// no articles table.
// Same glassy purple design language as the homepage (low roundness, blur).
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { useAsync } from '../hooks/useAsync'
import { getCategories, getContents, getGenres } from '../services/content.service'
import { getEvents } from '../services/event.service'
import { getCharacters } from '../services/character.service'
import { getMerchandise } from '../services/merchandise.service'
import ContentCard from '../components/common/ContentCard'
import CharacterCard from '../components/characters/CharacterCard'
import MerchandiseCard from '../components/common/MerchandiseCard'
import { CategoryPageSkeleton } from '../components/common/skeletons'
import Pagination from '../components/common/Pagination'
import { CONTENT_SORT_OPTIONS } from '../services/content.service'
import { categoryIcon, sortCategories } from '../lib/categoryIcons'
import { categoryBanner } from '../lib/categoryBanners'
import { ARTICLES_BY_CATEGORY } from '../lib/mockData'

// Shared card look (same as Home): translucent glass panel, purple edge.
const glassCard =
  'rounded-lg border border-purple-500/20 bg-white/60 backdrop-blur-xl transition hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/10 dark:bg-white/[0.06]'

// Purple gradient used for artwork placeholders + banners.
const purpleGradient = 'bg-gradient-to-br from-purple-600 via-purple-500 to-purple-400'

// One figure in the at-a-glance strip.
function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={`${glassCard} p-4`}>
      <dd className="text-2xl font-bold leading-none text-black tabular-nums dark:text-white">
        {value}
      </dd>
      <dt className="mt-1.5 text-xs font-medium text-black/60 dark:text-white/60">{label}</dt>
    </div>
  )
}

// The sorts /api/contents accepts. Defined in the service so this page and the
// Explorer cannot drift apart.
const SORT_OPTIONS = CONTENT_SORT_OPTIONS

/**
 * Native <select> styling for the Sort and Genre controls.
 *
 * The `[&>option]:` variants are the point: the open list is painted by the OS,
 * so it showed as a plain grey list against the purple theme. Theme tokens mean
 * light and dark are both right from one class string. `accent-*` tints the
 * selected row, which is otherwise the OS highlight blue.
 */
const SELECT_CLASS = [
  'rounded-lg border border-accent/40 px-3 py-1.5 text-sm transition focus:border-accent',
  'bg-[var(--surface-raised)] text-[var(--ink)]',
  '[&>option]:bg-[var(--surface-raised)]',
  '[&>option]:text-[var(--ink)]',
  // Some platforms bold the active row; left alone it looks like a fault.
  '[&>option]:font-normal',
  '[&>option]:font-normal',
  'accent-[var(--accent)]',
].join(' ')

// Section heading with the little purple bar (matches Home).
function SectionTitle({ title, count }: { title: string; count?: number }) {
  return (
    <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-black dark:text-white">
      <span className={`h-5 w-1.5 rounded-md ${purpleGradient}`} />
      {title}
      {count !== undefined && (
        <span className="text-sm font-normal text-black/40 dark:text-white/40">({count})</span>
      )}
    </h2>
  )
}

// Small translucent chip on the banner: "2 content · 1 articles · 0 events".
function CountChip({ n, label }: { n: number; label: string }) {
  return (
    <span className="rounded-md border border-white/30 bg-white/10 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-md">
      {n} {label}
    </span>
  )
}

// Small link chip — used for jumping between category pages.
function CategoryChip({ slug, name }: { slug: string; name: string }) {
  return (
    <Link
      to={`/category/${slug}`}
      className="rounded-md border border-purple-500/30 px-3 py-1.5 text-sm font-medium text-black/70 transition hover:border-purple-500 hover:bg-purple-500 hover:text-white dark:text-white/70 dark:hover:text-white"
    >
      {name}
    </Link>
  )
}

// All category chips (used by the empty + not-found states). Falls back to the
// canonical list if the categories request has not landed, so a visitor is
// never offered nothing to click.
const FALLBACK_CHIPS = [
  'anime',
  'gaming',
  'movies',
  'tv-shows',
  'k-pop',
  'comics',
  'manga',
  'cosplay',
] as const

function CategoryChips({
  exclude = '',
  categories = [],
}: {
  exclude?: string
  categories?: { slug: string; name: string }[]
}) {
  const chips =
    categories.length > 0
      ? sortCategories(categories).filter((c) => c.slug !== exclude)
      : FALLBACK_CHIPS.filter((slug) => slug !== exclude).map((slug) => ({
          slug,
          name: slug
            .split('-')
            .map((part) => part[0].toUpperCase() + part.slice(1))
            .join(' '),
        }))

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {chips.map((c) => (
        <CategoryChip key={c.slug} slug={c.slug} name={c.name} />
      ))}
    </div>
  )
}

export default function Category() {
  const { slug = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()

  // Sort, genre and page all live in the URL so a filtered view is shareable
  // and the back button works. Changing a filter returns to page 1.
  const sort = searchParams.get('sort') ?? 'popular'
  const genreId = searchParams.get('genre') ? Number(searchParams.get('genre')) : undefined
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
  const PAGE_SIZE = 24

  const { data: categories } = useAsync(() => getCategories(), [])

  // Declared before the genre fetch, which needs this category's id.
  const category = (categories ?? []).find((c) => c.slug === slug)

  const { data: result, loading } = useAsync(
    () => getContents({ category: slug, genreId, page, pageSize: PAGE_SIZE, sort }),
    [slug, genreId, page, sort],
  )
  const { data: apiEvents } = useAsync(() => getEvents(), [])
  // Genres are per-category in the schema, so the filter only offers buckets
  // that actually exist in this fandom.
  const { data: genres } = useAsync(
    () => (category ? getGenres(category.id) : Promise.resolve([])),
    [category?.id],
  )

  // Characters and merchandise, per fandom. Both endpoints take a categoryId and
  // filter in SQL, so this asks the database for one fandom's rows rather than
  // fetching everything and discarding most of it in the browser.
  //
  // This is what makes a fandom like Cosplay work at all: it has no titles, so
  // without these two the page had nothing to show despite holding 14 costume
  // profiles and 9 products. The client-side re-filter is belt-and-braces — the
  // API already filters, but a page that quietly shows another fandom's rows
  // because a query param was dropped is worse than one that shows none.
  const { data: apiCharacters } = useAsync(
    () => (category ? getCharacters(category.id) : Promise.resolve([])),
    [category?.id],
  )
  const { data: apiMerch } = useAsync(
    () => (category ? getMerchandise({ categoryId: category.id, pageSize: 12 }) : Promise.resolve(null)),
    [category?.id],
  )

  // Articles are still local: the schema has no articles table.
  const articles = ARTICLES_BY_CATEGORY[slug] ?? []
  const content = result?.items ?? []
  const events = (apiEvents ?? []).filter((e) => e.categorySlug === slug)
  const characters = (apiCharacters ?? []).filter((c) => c.categorySlug === slug)
  const merchandise = (apiMerch?.items ?? []).filter((m) => m.categorySlug === slug)

  function setParam(patch: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === '') next.delete(key)
      else next.set(key, value)
    }
    // Any filter change invalidates the current page number.
    if (!('page' in patch)) next.delete('page')
    setSearchParams(next, { replace: true })
  }

  // Unknown slug → friendly not-found with shortcuts to the real categories.
  if (categories && !category) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className={`${glassCard} p-10 text-center`}>
          <h1 className="mb-2 text-2xl font-bold text-black dark:text-white">Category not found</h1>
          <p className="mb-6 text-black/60 dark:text-white/60">
            There’s no category at{' '}
            <span className="rounded-md bg-purple-500/10 px-1.5 py-0.5 font-mono text-sm text-purple-600 dark:text-purple-400">
              /category/{slug}
            </span>
            . Pick one below.
          </p>
          <CategoryChips categories={categories ?? []} />
        </div>
      </div>
    )
  }

  // Wait for the category list before deciding the slug is unknown, otherwise
  // every direct visit flashes the "not found" panel.
  if (loading || !category) {
    return <CategoryPageSkeleton />
  }

  const Icon = categoryIcon(slug)
  // Undefined for a fandom with no banner, which falls back to the gradient.
  const banner = categoryBanner(slug)
  // Counts every kind of thing this page can render. Leaving characters and
  // merchandise out is what made Cosplay look empty while holding 23 rows.
  const isEmpty =
    content.length + articles.length + events.length + characters.length + merchandise.length ===
    0
  const totalTitles = result?.totalCount ?? 0
  const pageCount = result?.pageCount ?? 1

  // Counts for the stat strip. Derived from what this page's results carry, so
  // nothing is invented — a fandom with no release years shows zero.
  const withPoster = content.filter((item) => item.posterPath).length
  const withYear = content.filter((item) => item.releaseYear).length
  const avgViews = content.length
    ? Math.round(content.reduce((sum, item) => sum + item.viewCount, 0) / content.length)
    : 0
  // Per-100 rather than a raw count, because this is a sample of 24 out of
  // hundreds — "437 of 513" would need its own sentence to explain.
  const percent = (n: number) => `${Math.round((n / Math.max(content.length, 1)) * 100)}%`

  return (
    <div className="mx-auto w-full max-w-7xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
      {/* Banner — a photograph of the fandom where one exists, over the same
          purple gradient the homepage hero uses.

          The image is a CSS background on its own layer, with the gradient
          beneath it and a scrim above. A path that 404s simply fails to paint
          and the gradient shows through, so a fandom without a banner (manga)
          is a missing decoration rather than a broken page. */}
      <section className="relative overflow-hidden rounded-lg border border-purple-500/20">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-700 via-purple-600 to-purple-500" />
        {banner && (
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${banner})` }}
          />
        )}
        {/* Two scrims. The first is a left-weighted wash so the title, blurb and
            chips stay legible over any photograph; the second is a flat purple
            multiply, which keeps the palette on-brand without hiding the fandom
            behind the artwork. */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-black/20" />
        <div className="absolute inset-0 bg-purple-900/35 mix-blend-multiply" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_45%)]" />
        <div className="relative flex flex-col gap-3 p-6 sm:p-10">
          <span className="flex h-14 w-14 items-center justify-center rounded-md border border-white/30 bg-white/10 text-white backdrop-blur-md">
            <Icon size={26} />
          </span>
          <h1 className="text-3xl font-bold text-white sm:text-4xl">{category.name}</h1>
          <p className="max-w-xl text-sm text-white/80 sm:text-base">{category.description}</p>
          <div className="mt-1 flex flex-wrap gap-2">
            <CountChip n={totalTitles} label="titles" />
            {/* Only shown when this fandom actually has them, so the strip does
                not read "0 costumes" on a fandom that has no such concept. */}
            {characters.length > 0 && <CountChip n={characters.length} label="costumes" />}
            {merchandise.length > 0 && <CountChip n={merchandise.length} label="products" />}
            <CountChip n={articles.length} label="articles" />
            <CountChip n={events.length} label="events" />
          </div>
        </div>
      </section>

      {/* At-a-glance numbers. Which tiles appear depends on what this fandom
          actually holds: a title fandom gets artwork coverage and average
          views, and a fandom with no titles at all — Cosplay — gets its
          costume and product counts instead of four zeroes. */}
      {(totalTitles > 0 || characters.length > 0 || merchandise.length > 0) && (
        <section aria-label={`${category.name} at a glance`}>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {totalTitles > 0 && (
              <>
                <StatTile label="Titles" value={totalTitles.toLocaleString()} />
                <StatTile label="Genres" value={(genres ?? []).length} />
                <StatTile label="With artwork" value={percent(withPoster)} />
                <StatTile label="Avg views" value={avgViews.toLocaleString()} />
              </>
            )}
            {characters.length > 0 && (
              <StatTile label="Costumes" value={characters.length.toLocaleString()} />
            )}
            {merchandise.length > 0 && (
              <StatTile label="Products" value={merchandise.length.toLocaleString()} />
            )}
          </dl>
          {totalTitles > 0 && withYear > 0 && (
            <p className="mt-2 text-xs text-black/50 dark:text-white/50">
              {percent(withYear)} of these titles list a release year.
            </p>
          )}
        </section>
      )}

      {/* Genre buckets, each a link into the filtered list. Doubles as the
          primary way to narrow a fandom down. */}
      {(genres ?? []).length > 0 && (
        <section aria-labelledby="genres-heading">
          <SectionTitle title="Browse by genre" />
          <ul className="flex flex-wrap gap-2">
            {(genres ?? []).map((genre) => (
              <li key={genre.id}>
                <button
                  type="button"
                  onClick={() => setParam({ genre: String(genre.id) })}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                    genreId === genre.id
                      ? 'border-purple-500 bg-purple-500 text-white'
                      : 'border-purple-500/30 text-black/70 hover:border-purple-500 hover:text-purple-600 dark:text-white/70 dark:hover:text-purple-400'
                  }`}
                >
                  {genre.name}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {isEmpty ? (
        /* Nothing in this category yet — offer the other fandoms instead. */
        <div className={`${glassCard} p-10 text-center`}>
          <h2 className="mb-2 text-xl font-bold text-black dark:text-white">Nothing here yet</h2>
          <p className="mb-6 text-black/60 dark:text-white/60">
            {category.name} content is on its way — check back soon, or explore another fandom.
          </p>
          <CategoryChips exclude={category.slug} categories={categories ?? []} />
        </div>
      ) : (
        <div className="space-y-10">
          {/* Every title in the fandom, listed a page at a time. The filters
              live in the URL, so a sorted or filtered view can be linked. */}
          {totalTitles > 0 && (
            <section aria-label={`${category.name} content`}>
              <SectionTitle title="Content" count={totalTitles} />

              {/* Sort + genre. Hidden entirely for a fandom with one genre
                  bucket, so a thin category does not show a pointless select. */}
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-xs font-medium text-ink-muted">
                  Sort
                  <select
                    value={sort}
                    onChange={(event) => setParam({ sort: event.target.value })}
                    className={SELECT_CLASS}
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                {(genres ?? []).length > 1 && (
                  <label className="flex items-center gap-2 text-xs font-medium text-ink-muted">
                    Genre
                    <select
                      value={genreId ?? ''}
                      onChange={(event) =>
                        setParam({ genre: event.target.value || null })
                      }
                      className={SELECT_CLASS}
                    >
                      <option value="">All genres</option>
                      {(genres ?? []).map((genre) => (
                        <option key={genre.id} value={genre.id}>
                          {genre.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {genreId && (
                  <button
                    type="button"
                    onClick={() => setParam({ genre: null })}
                    className="text-xs font-semibold text-purple-600 hover:underline dark:text-purple-400"
                  >
                    Clear genre
                  </button>
                )}
              </div>

              {content.length === 0 ? (
                <p className="rounded-lg border border-dashed border-purple-500/30 px-4 py-10 text-center text-sm text-black/60 dark:text-white/60">
                  No titles match that filter.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {content.map((item) => (
                    <ContentCard key={item.id} item={item} />
                  ))}
                </div>
              )}

              {pageCount > 1 && (
                <div className="mt-6 border-t border-purple-500/20 pt-4">
                  <Pagination
                    page={page}
                    pageCount={pageCount}
                    total={totalTitles}
                    pageSize={PAGE_SIZE}
                    onChange={(next) => {
                      setParam({ page: String(next) })
                      // Back to the top of the list, or the new page is
                      // scrolled off-screen and looks like nothing happened.
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                    className="text-black/60 dark:text-white/60"
                  />
                </div>
              )}
            </section>
          )}

          {/* Costumes — the character_profiles rows for this fandom. Sits after
              Content and before Articles so that a fandom with no titles
              (Cosplay) still leads with the thing it actually has, while a
              title fandom keeps its titles first. */}
          {characters.length > 0 && (
            <section aria-label={`${category.name} costumes`}>
              <SectionTitle title="Costumes" count={characters.length} />
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {characters.map((character) => (
                  <CharacterCard key={character.id} character={character} />
                ))}
              </ul>
            </section>
          )}

          {/* Products — merchandise_items for this fandom. Display only; the
              shop has no cart, so these are the same cards as /merchandise and
              deliberately not links. */}
          {merchandise.length > 0 && (
            <section aria-label={`${category.name} products`}>
              <SectionTitle title="Products" count={merchandise.length} />
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {merchandise.map((item) => (
                  <MerchandiseCard key={item.id} item={item} />
                ))}
              </ul>
            </section>
          )}

          {/* Articles — filtered from the ARTICLES_BY_CATEGORY hashmap */}
          {articles.length > 0 && (
            <section aria-label={`${category.name} articles`}>
              <SectionTitle title="Articles" count={articles.length} />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {articles.map((article) => (
                  <Link
                    key={article.id}
                    to={`/articles/${article.id}`}
                    className={`${glassCard} p-4`}
                  >
                    <span className={`mb-3 flex h-1.5 w-12 rounded-md ${purpleGradient}`} />
                    <h3 className="mb-1.5 font-semibold text-black dark:text-white">
                      {article.title}
                    </h3>
                    <p className="mb-3 text-sm text-black/60 dark:text-white/60">
                      {article.excerpt}
                    </p>
                    <div className="flex items-center justify-between text-xs text-black/50 dark:text-white/50">
                      <span>{article.readMeta}</span>
                      <span className="rounded-md border border-purple-500/30 px-2 py-0.5 text-purple-600 dark:text-purple-400">
                        {article.type}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Events — from the API, filtered to this fandom */}
          {events.length > 0 && (
            <section aria-label={`${category.name} events`}>
              <SectionTitle title="Upcoming Events" count={events.length} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {events.map((event) => (
                  <Link
                    key={event.id}
                    to={`/events/${event.id}`}
                    className={`${glassCard} flex items-center gap-4 p-4`}
                  >
                    <div
                      className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-md text-white ${purpleGradient}`}
                    >
                      <span className="text-lg font-bold leading-none">
                        {event.startsAt ? new Date(event.startsAt).getDate() : '--'}
                      </span>
                      <span className="text-[10px] font-semibold">
                        {event.startsAt
                          ? new Date(event.startsAt)
                              .toLocaleDateString('en-GB', { month: 'short' })
                              .toUpperCase()
                          : 'TBA'}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-black dark:text-white">
                        {event.title}
                      </h3>
                      <p className="inline-flex items-center gap-1 text-sm text-black/60 dark:text-white/60">
                        <MapPin size={12} />{' '}
                        {event.isOnline ? 'Online' : (event.city ?? event.location ?? 'TBA')}
                      </p>
                    </div>
                    <span className="rounded-md border border-purple-500/30 px-2 py-0.5 text-xs font-medium text-purple-600 dark:text-purple-400">
                      {event.categorySlug}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Jump to a sibling category */}
      <section aria-label="Other categories">
        <SectionTitle title="More Categories" />
        <div className="flex flex-wrap gap-2">
          {sortCategories(categories ?? [])
            .filter((c) => c.slug !== category.slug)
            .map((c) => (
              <CategoryChip key={c.slug} slug={c.slug} name={c.name} />
            ))}
        </div>
      </section>
    </div>
  )
}

// Explorer — search results and browse. Reads ?q= from the URL (written by the
// header search bar) and filters content, articles and events in one pass.
// When the services layer lands, only the loader functions change.
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search as SearchIcon, Sparkles } from 'lucide-react'
import SectionHeader from '../components/common/SectionHeader'
import ContentCard from '../components/common/ContentCard'
import ArticleCard from '../components/common/ArticleCard'
import { EmptyState } from '../components/common/EmptyState'
import { useAsync } from '../hooks/useAsync'
import { getContents, getCategories, CONTENT_SORT_OPTIONS } from '../services/content.service'
import Pagination from '../components/common/Pagination'
import { getEvents } from '../services/event.service'
import { sortCategories } from '../lib/categoryIcons'

// ARTICLES is still local: the schema has no articles table. Content and
// events come from the API, so a search covers all 2,490 titles rather than the
// twelve in the mock.
import { ARTICLES } from '../lib/mockData'

// Case-insensitive "does this haystack contain the needle" test.
function matches(needle: string, ...fields: (string | null | undefined)[]): boolean {
  return fields.some((field) => (field ?? '').toLowerCase().includes(needle))
}

export default function Explorer() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''

  // Other pages deep-link in with a category or sort already applied — a
  // content page's "More like this" row sends ?category=anime. Honouring them
  // here is what makes those links land on the right list instead of a generic
  // one.
  const category = searchParams.get('category') ?? ''
  const sort = searchParams.get('sort') ?? ''
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
  const PAGE_SIZE = 24

  // Content search runs on the API, which searches title and synopsis across the
  // whole catalogue. The empty query is a browse, not a filter.
  const { data: contentPage } = useAsync(
    () =>
      getContents({
        search: query || undefined,
        category: category || undefined,
        page,
        pageSize: PAGE_SIZE,
        // A search defaults to A-Z; a browse or category view keeps the choice.
        sort: sort || (query ? 'title' : 'popular'),
      }),
    [query, category, page, sort],
  )

  const { data: events } = useAsync(() => getEvents(), [])
  const { data: categories } = useAsync(() => getCategories(), [])

  const activeCategory = (categories ?? []).find((c) => c.slug === category)

  function setParam(patch: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === '') next.delete(key)
      else next.set(key, value)
    }
    if (!('page' in patch)) next.delete('page')
    setSearchParams(next, { replace: true })
  }

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const content = contentPage?.items ?? []
    const allEvents = events ?? []

    if (!needle) {
      return {
        content: content,
        articles: ARTICLES.slice(0, 8),
        events: category ? allEvents.filter((e) => e.categorySlug === category) : allEvents,
        isBrowsing: true,
      }
    }

    return {
      content,
      articles: ARTICLES.filter((article) =>
        matches(needle, article.title, article.excerpt, article.type),
      ),
      // The API has no event search, so the small list is filtered here.
      events: allEvents.filter((event) =>
        matches(needle, event.title, event.city, event.location, event.categorySlug),
      ),
      isBrowsing: false,
    }
  }, [query, contentPage, events])

  const total = results.content.length + results.articles.length + results.events.length

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="space-y-2">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-ink sm:text-3xl">
          <SearchIcon size={24} className="text-accent" aria-hidden="true" />
          {!results.isBrowsing
            ? 'Search results'
            : activeCategory
              ? activeCategory.name
              : 'Explore'}
        </h1>
        <p className="text-sm text-ink-muted">
          {!results.isBrowsing
            ? `${total} ${total === 1 ? 'result' : 'results'} for “${query}”`
            : activeCategory
              ? `${(contentPage?.totalCount ?? 0).toLocaleString()} titles in ${activeCategory.name}.`
              : 'Browse everything on the site, or use the search bar above to filter it.'}
        </p>
      </header>

      {total === 0 ? (
        <EmptyState
          icon={SearchIcon}
          title={`Nothing found for “${query}”`}
          body="Try a broader term, or browse by category instead."
        />
      ) : (
        <>
          {results.content.length > 0 && (
            <section aria-labelledby="res-content">
              <SectionHeader
                id="res-content"
                title="Content"
                icon={Sparkles}
                // Only useful on a browse or a category view; a search is
                // already ranked by relevance.
                action={
                  results.isBrowsing ? (
                    <select
                      value={sort}
                      onChange={(event) => setParam({ sort: event.target.value })}
                      aria-label="Sort titles"
                      className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink transition focus:border-accent"
                    >
                      <option value="">Most popular</option>
                      {CONTENT_SORT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : undefined
                }
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {results.content.map((item) => (
                  <ContentCard key={item.id} item={item} />
                ))}
              </div>

              {(contentPage?.pageCount ?? 0) > 1 && (
                <div className="mt-6 border-t border-line pt-4">
                  <Pagination
                    page={page}
                    pageCount={contentPage?.pageCount ?? 1}
                    total={contentPage?.totalCount ?? 0}
                    pageSize={PAGE_SIZE}
                    onChange={(next) => {
                      setParam({ page: String(next) })
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                  />
                </div>
              )}
            </section>
          )}

          {results.articles.length > 0 && (
            <section aria-labelledby="res-articles">
              <SectionHeader id="res-articles" title="Articles" icon={Sparkles} />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {results.articles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Browse-by-category fallback, so a dead-end search still offers a way
          forward instead of a blank page. */}
      <section aria-labelledby="res-categories">
        <SectionHeader id="res-categories" title="Or browse by category" icon={Sparkles} />
        <div className="flex flex-wrap gap-2">
          {sortCategories(categories ?? []).map((category) => (
            <Link
              key={category.slug}
              to={`/category/${category.slug}`}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-raised px-3 py-1.5 text-sm text-ink-muted transition hover:border-accent hover:text-accent"
            >
              {category.name}
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

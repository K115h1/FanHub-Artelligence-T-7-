// Explorer — the search results / browse page.
//
// This exists because the header search bar needs somewhere real to send
// people. It used to be a ComingSoon placeholder, which meant submitting a
// search landed on a "not built yet" screen.
//
// Reads ?q= from the URL (written by the header form) and filters the mock
// fixtures across every content type at once — content, articles and events —
// so one search box covers the whole site. When the services layer lands, only
// the two loader functions change; the filtering and rendering stay.
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search as SearchIcon, Sparkles } from 'lucide-react'
import SectionHeader from '../components/common/SectionHeader'
import ContentCard from '../components/common/ContentCard'
import ArticleCard from '../components/common/ArticleCard'
import { EmptyState } from '../components/common/EmptyState'
import {
  ARTICLES,
  CATEGORIES,
  FEATURED_CONTENT,
  UPCOMING_EVENTS,
} from '../lib/mockData'

// Case-insensitive "does this haystack contain the needle" test.
function matches(needle: string, ...fields: string[]): boolean {
  return fields.some((field) => field.toLowerCase().includes(needle))
}

export default function Explorer() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''

  // Everything the visitor hasn't filtered for, shown when the box is empty.
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase()

    if (!needle) {
      return {
        content: FEATURED_CONTENT.slice(0, 8),
        articles: ARTICLES.slice(0, 8),
        events: UPCOMING_EVENTS,
        isBrowsing: true,
      }
    }

    return {
      content: FEATURED_CONTENT.filter((item) =>
        matches(needle, item.title, item.description, item.type),
      ),
      articles: ARTICLES.filter((article) =>
        matches(needle, article.title, article.excerpt, article.type),
      ),
      events: UPCOMING_EVENTS.filter((event) =>
        matches(needle, event.title, event.location, event.tag),
      ),
      isBrowsing: false,
    }
  }, [query])

  const total = results.content.length + results.articles.length + results.events.length

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="space-y-2">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-ink sm:text-3xl">
          <SearchIcon size={24} className="text-accent" aria-hidden="true" />
          {results.isBrowsing ? 'Explore' : 'Search results'}
        </h1>
        <p className="text-sm text-ink-muted">
          {results.isBrowsing
            ? 'Browse everything on the site, or use the search bar above to filter it.'
            : `${total} ${total === 1 ? 'result' : 'results'} for “${query}”`}
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
              <SectionHeader id="res-content" title="Content" icon={Sparkles} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {results.content.map((item) => (
                  <ContentCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          )}

          {results.articles.length > 0 && (
            <section aria-labelledby="res-articles">
              <SectionHeader id="res-articles" title="Articles" icon={Sparkles} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          {CATEGORIES.map((category) => (
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

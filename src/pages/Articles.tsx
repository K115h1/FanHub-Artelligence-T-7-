// Articles, the full list, filterable by fandom and sortable.
//
// Linked from the home page, the sidebar, the category pages and the article
// detail page, so it needs to be a real index rather than a placeholder.
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Newspaper, Search as SearchIcon } from 'lucide-react'
import PageHero from '../components/common/PageHero'
import SectionHeader from '../components/common/SectionHeader'
import ArticleCard from '../components/common/ArticleCard'
import { EmptyState } from '../components/common/EmptyState'
import { SearchBar } from '../components/common/SearchBar'
import { CategoryDot } from '../components/common/CategoryArt'
import { ARTICLES, CATEGORIES, toSlug } from '../lib/mockData'
import { getArticleDetail } from '../lib/details'

type SortKey = 'newest' | 'oldest' | 'az' | 'quick'

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Newest first' },
  { key: 'oldest', label: 'Oldest first' },
  { key: 'az', label: 'A – Z' },
  { key: 'quick', label: 'Quickest read' },
]

export default function Articles() {
  const [query, setQuery] = useState('')
  const [fandom, setFandom] = useState('all')
  const [sort, setSort] = useState<SortKey>('newest')

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()

    const filtered = ARTICLES.filter((article) => {
      if (fandom !== 'all' && toSlug(article.type) !== fandom) return false
      if (!needle) return true
      return [article.title, article.excerpt, article.type].some((field) =>
        field.toLowerCase().includes(needle),
      )
    })

    const sorted = [...filtered]
    if (sort === 'az') sorted.sort((a, b) => a.title.localeCompare(b.title))
    if (sort === 'quick') {
      // Fall back to a nominal length when a fixture has no detail entry.
      sorted.sort(
        (a, b) => (getArticleDetail(a.id)?.readMinutes ?? 5) - (getArticleDetail(b.id)?.readMinutes ?? 5),
      )
    }
    // The fixture readMeta starts with a view count, not a date, so "newest"
    // and "oldest" fall back to id order rather than inventing a sort.
    if (sort === 'newest') sorted.sort((a, b) => b.id - a.id)
    if (sort === 'oldest') sorted.sort((a, b) => a.id - b.id)
    return sorted
  }, [query, fandom, sort])

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHero
        kicker="The fan press"
        title="Articles"
        icon={Newspaper}
        blurb="Reviews, news, reading lists and opinion from across the eight fandoms."
      >
        <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur-md">
          <Newspaper size={15} aria-hidden="true" />
          {ARTICLES.length} published
        </span>
      </PageHero>

      {/* Filters */}
      <section aria-label="Filter articles" className="surface-card space-y-4 p-5">
        <div className="max-w-xl">
          <SearchBar value={query} onSearch={setQuery} placeholder="Search articles…" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterPill active={fandom === 'all'} onClick={() => setFandom('all')} label={`All (${ARTICLES.length})`} />
          {CATEGORIES.map((category) => {
            const n = ARTICLES.filter((a) => a.type === category.name).length
            if (n === 0) return null
            return (
              <FilterPill
                key={category.slug}
                active={fandom === category.slug}
                onClick={() => setFandom(category.slug)}
                label={`${category.name} (${n})`}
                dot={category.slug}
              />
            )
          })}
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="article-sort" className="text-xs text-ink-subtle">
            Sort
          </label>
          <select
            id="article-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-lg border border-line bg-surface-raised px-3 py-1.5 text-sm text-ink transition focus:border-accent"
          >
            {SORTS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Results */}
      <section aria-labelledby="article-list">
        <SectionHeader
          id="article-list"
          title="All articles"
          icon={Newspaper}
          subtitle={`${visible.length} ${visible.length === 1 ? 'article' : 'articles'}`}
        />

        {visible.length === 0 ? (
          <EmptyState
            icon={SearchIcon}
            title="No articles match"
            body="Try a different fandom, or clear the search box."
            actionText="Clear search"
            onAction={() => {
              setQuery('')
              setFandom('all')
            }}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {visible.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </section>

      <section className="surface-card flex flex-wrap items-center justify-between gap-3 p-5">
        <p className="text-sm text-ink-muted">
          Missing something? There’s a feedback form for content requests.
        </p>
        <Link to="/feedback" className="text-sm font-semibold text-accent transition hover:underline">
          Request an article
        </Link>
      </section>
    </div>
  )
}

function FilterPill({
  active,
  onClick,
  label,
  dot,
}: {
  active: boolean
  onClick: () => void
  label: string
  dot?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
        active
          ? 'border-accent bg-accent text-accent-ink'
          : 'border-line bg-surface-raised text-ink-muted hover:border-accent hover:text-accent'
      }`}
    >
      {dot && <CategoryDot slug={dot} />}
      {label}
    </button>
  )
}

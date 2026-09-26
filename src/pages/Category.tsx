// Category page — /category/:slug (one "child" page per category).
// mockData pre-groups every list into hashmaps keyed by category slug, so this
// page just looks up its own slug: one read per list, no filtering per render.
// Same glassy purple design language as the homepage (low roundness, blur).
import { Link, useParams } from 'react-router-dom'
import { Eye, MapPin } from 'lucide-react'
import {
  ARTICLES_BY_CATEGORY,
  CATEGORIES,
  CATEGORY_MAP,
  CONTENT_BY_CATEGORY,
  EVENTS_BY_CATEGORY,
} from '../lib/mockData'

// Shared card look (same as Home): translucent glass panel, purple edge.
const glassCard =
  'rounded-lg border border-purple-500/20 bg-white/60 backdrop-blur-xl transition hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/10 dark:bg-white/[0.06]'

// Purple gradient used for artwork placeholders + banners.
const purpleGradient = 'bg-gradient-to-br from-purple-600 via-purple-500 to-purple-400'

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

// All category chips (used by the empty + not-found states).
function CategoryChips({ exclude = '' }: { exclude?: string }) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {CATEGORIES.filter((c) => c.slug !== exclude).map((c) => (
        <CategoryChip key={c.slug} slug={c.slug} name={c.name} />
      ))}
    </div>
  )
}

export default function Category() {
  const { slug = '' } = useParams()

  // Single hashmap lookups — O(1) each, no array filtering in render.
  const category = CATEGORY_MAP[slug]
  const content = CONTENT_BY_CATEGORY[slug] ?? []
  const articles = ARTICLES_BY_CATEGORY[slug] ?? []
  const events = EVENTS_BY_CATEGORY[slug] ?? []

  // Unknown slug → friendly not-found with shortcuts to the real categories.
  if (!category) {
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
          <CategoryChips />
        </div>
      </div>
    )
  }

  const Icon = category.icon
  const isEmpty = content.length + articles.length + events.length === 0

  return (
    <div className="mx-auto w-full max-w-7xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
      {/* Banner — same gradient treatment as the homepage hero */}
      <section className="relative overflow-hidden rounded-lg border border-purple-500/20">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-700 via-purple-600 to-purple-500" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.25),transparent_45%)]" />
        <div className="relative flex flex-col gap-3 p-6 sm:p-10">
          <span className="flex h-14 w-14 items-center justify-center rounded-md border border-white/30 bg-white/10 text-white backdrop-blur-md">
            <Icon size={26} />
          </span>
          <h1 className="text-3xl font-bold text-white sm:text-4xl">{category.name}</h1>
          <p className="max-w-xl text-sm text-white/80 sm:text-base">{category.description}</p>
          <div className="mt-1 flex flex-wrap gap-2">
            <CountChip n={content.length} label="content" />
            <CountChip n={articles.length} label="articles" />
            <CountChip n={events.length} label="events" />
          </div>
        </div>
      </section>

      {isEmpty ? (
        /* Nothing in this category yet — offer the other fandoms instead. */
        <div className={`${glassCard} p-10 text-center`}>
          <h2 className="mb-2 text-xl font-bold text-black dark:text-white">Nothing here yet</h2>
          <p className="mb-6 text-black/60 dark:text-white/60">
            {category.name} content is on its way — check back soon, or explore another fandom.
          </p>
          <CategoryChips exclude={category.slug} />
        </div>
      ) : (
        <div className="space-y-10">
          {/* Content — filtered from the CONTENT_BY_CATEGORY hashmap */}
          {content.length > 0 && (
            <section aria-label={`${category.name} content`}>
              <SectionTitle title="Content" count={content.length} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {content.map((item) => (
                  <Link
                    key={item.id}
                    to={`/content/${item.id}`}
                    className={`${glassCard} overflow-hidden`}
                  >
                    {/* Artwork placeholder — purple gradient stand-in for real media */}
                    <div className={`flex h-32 items-center justify-center ${purpleGradient}`}>
                      <span className="text-4xl font-black text-white/30">
                        {item.title.charAt(0)}
                      </span>
                    </div>
                    <div className="space-y-1.5 p-4">
                      <h3 className="font-semibold text-black dark:text-white">{item.title}</h3>
                      <p className="text-sm text-black/60 dark:text-white/60">{item.description}</p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="inline-flex items-center gap-1 text-xs text-black/50 dark:text-white/50">
                          <Eye size={12} /> {item.views}
                        </span>
                        <span className="rounded-md border border-purple-500/30 px-2 py-0.5 text-xs font-medium text-purple-600 dark:text-purple-400">
                          {item.type}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Articles — filtered from the ARTICLES_BY_CATEGORY hashmap */}
          {articles.length > 0 && (
            <section aria-label={`${category.name} articles`}>
              <SectionTitle title="Articles" count={articles.length} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

          {/* Events — filtered from the EVENTS_BY_CATEGORY hashmap */}
          {events.length > 0 && (
            <section aria-label={`${category.name} events`}>
              <SectionTitle title="Upcoming Events" count={events.length} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {events.map((event) => (
                  <div key={event.id} className={`${glassCard} flex items-center gap-4 p-4`}>
                    <div
                      className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-md text-white ${purpleGradient}`}
                    >
                      <span className="text-lg font-bold leading-none">{event.day}</span>
                      <span className="text-[10px] font-semibold">{event.month}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-black dark:text-white">
                        {event.title}
                      </h3>
                      <p className="inline-flex items-center gap-1 text-sm text-black/60 dark:text-white/60">
                        <MapPin size={12} /> {event.location}
                      </p>
                    </div>
                    <span className="rounded-md border border-purple-500/30 px-2 py-0.5 text-xs font-medium text-purple-600 dark:text-purple-400">
                      {event.tag}
                    </span>
                  </div>
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
          {CATEGORIES.filter((c) => c.slug !== category.slug).map((c) => (
            <CategoryChip key={c.slug} slug={c.slug} name={c.name} />
          ))}
        </div>
      </section>
    </div>
  )
}

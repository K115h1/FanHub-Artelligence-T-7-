// ArticleCard — the tile used by the article rows.
// <article> rather than a <Link> wrapper, for the same reason as ContentCard:
// the bookmark button can't sit inside an anchor.
import { Link } from 'react-router-dom'
import type { Article } from '../../lib/mockData'
import { toSlug } from '../../lib/mockData'
import { CategoryDot } from './CategoryArt'
import BookmarkButton from './BookmarkButton'
import RatingDisplay from './RatingDisplay'

export default function ArticleCard({ article }: { article: Article }) {
  const slug = toSlug(article.type)

  return (
    <article className="surface-card group relative flex flex-col gap-2 p-4 hover:-translate-y-0.5">
      <div className="flex items-center gap-2 text-xs text-ink-subtle">
        <CategoryDot slug={slug} />
        <span className="font-medium text-accent">{article.type}</span>
        <div className="relative z-10 ml-auto">
          <BookmarkButton kind="article" refId={article.id} title={article.title} size="sm" />
        </div>
      </div>

      <h3 className="line-clamp-2 font-semibold text-ink">
        {/* Stretched link; the bookmark button sets z-10 to sit above it. */}
        <Link
          to={`/articles/${article.id}`}
          className="transition after:absolute after:inset-0 hover:text-accent"
        >
          {article.title}
        </Link>
      </h3>
      <p className="line-clamp-2 flex-1 text-sm text-ink-muted">{article.excerpt}</p>

      <div className="flex items-center justify-between text-xs text-ink-subtle">
        <span>{article.readMeta}</span>
        <RatingDisplay kind="article" refId={article.id} />
      </div>
    </article>
  )
}

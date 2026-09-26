// ArticleCard — the tile used by the article rows.
import { Link } from 'react-router-dom'
import type { Article } from '../../lib/mockData'
import { toSlug } from '../../lib/mockData'
import { CategoryDot } from './CategoryArt'

export default function ArticleCard({ article }: { article: Article }) {
  const slug = toSlug(article.type)

  return (
    <Link
      to={`/articles/${article.id}`}
      className="surface-card group flex flex-col gap-2 p-4 hover:-translate-y-0.5"
    >
      <div className="flex items-center gap-2 text-xs text-ink-subtle">
        <CategoryDot slug={slug} />
        <span className="font-medium text-accent">{article.type}</span>
      </div>

      <h3 className="line-clamp-2 font-semibold text-ink transition group-hover:text-accent">
        {article.title}
      </h3>
      <p className="line-clamp-2 flex-1 text-sm text-ink-muted">{article.excerpt}</p>

      <span className="mt-1 text-xs text-ink-subtle">{article.readMeta}</span>
    </Link>
  )
}

// ArticleDetail — one article, readable.
//
// The article list and every article card link here, so this is where the
// bookmark and rating actions live for articles.
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Clock, User, Share2, Check, ArrowRight, Newspaper } from 'lucide-react'
import PageHero from '../components/common/PageHero'
import SectionHeader from '../components/common/SectionHeader'
import ArticleCard from '../components/common/ArticleCard'
import BookmarkButton from '../components/common/BookmarkButton'
import RatingDisplay from '../components/common/RatingDisplay'
import { RatingStars } from '../components/common/RatingStars'
import SignInPrompt from '../components/common/SignInPrompt'
import { CategoryDot } from '../components/common/CategoryArt'
import { useAuth } from '../context/AuthContext'
import { useRatings } from '../context/RatingsContext'
import { ARTICLES, CATEGORY_MAP, toSlug } from '../lib/mockData'
import { getArticleDetail } from '../lib/details'

export default function ArticleDetail() {
  const { id } = useParams()
  const { isAuthed } = useAuth()
  const { get, set } = useRatings()
  const [copied, setCopied] = useState(false)

  const article = useMemo(() => ARTICLES.find((a) => String(a.id) === id), [id])
  const detail = article ? getArticleDetail(article.id) : null
  const rating = article ? get('article', article.id) : 0

  const more = useMemo(
    () => (article ? ARTICLES.filter((a) => a.id !== article.id).slice(0, 4) : []),
    [article],
  )

  if (!article) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold text-ink">We couldn’t find that article</h1>
        <Link to="/articles" className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
          All articles <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
    )
  }

  const category = CATEGORY_MAP[toSlug(article.type)]

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard can be blocked; not worth interrupting the article for.
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHero
        kicker={article.type}
        title={article.title}
        icon={Newspaper}
        blurb={article.excerpt}
      >
        <div className="flex flex-wrap items-center gap-2">
          <BookmarkButton kind="article" refId={article.id} title={article.title} size="md" />
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-black/25 px-3 py-2 text-sm font-medium text-white backdrop-blur-md transition hover:bg-black/40"
          >
            {copied ? <Check size={15} aria-hidden="true" /> : <Share2 size={15} aria-hidden="true" />}
            {copied ? 'Link copied' : 'Share'}
          </button>
        </div>
      </PageHero>

      {/* Byline */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-muted">
        {detail && (
          <span className="inline-flex items-center gap-1.5">
            <User size={14} aria-hidden="true" />
            {detail.author}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <Clock size={14} aria-hidden="true" />
          {article.readMeta}
          {detail && <span className="text-ink-subtle">· {detail.readMinutes} min read</span>}
        </span>
        {category && (
          <Link
            to={`/category/${category.slug}`}
            className="inline-flex items-center gap-1.5 text-accent transition hover:underline"
          >
            <CategoryDot slug={category.slug} />
            {category.name}
          </Link>
        )}
      </div>

      {/* Body */}
      <article className="surface-card space-y-4 p-5 sm:p-7">
        {detail ? (
          detail.body.map((paragraph) => (
            <p key={paragraph.slice(0, 40)} className="leading-relaxed text-ink">
              {paragraph}
            </p>
          ))
        ) : (
          <p className="leading-relaxed text-ink-muted">{article.excerpt}</p>
        )}
      </article>

      {/* Rating */}
      <section aria-labelledby="article-rate" className="surface-card p-5">
        <h2 id="article-rate" className="text-sm font-semibold text-ink">
          Rate this article
        </h2>
        {isAuthed ? (
          <>
            <div className="mt-3">
              <RatingStars value={rating} onChange={(next) => set('article', article.id, next)} />
            </div>
            <p className="mt-2 text-xs text-ink-subtle">
              {rating === 0
                ? 'Tap a star to rate. Tap the same star again to clear it.'
                : `You rated this ${rating}/5.`}
            </p>
          </>
        ) : (
          <div className="mt-3">
            <SignInPrompt message="Sign in to rate this article." />
          </div>
        )}
        {rating > 0 && (
          <p className="mt-3 flex items-center gap-1.5 border-t border-line pt-3 text-xs text-ink-subtle">
            <RatingDisplay kind="article" refId={article.id} />
            saved to your profile
          </p>
        )}
      </section>

      {more.length > 0 && (
        <section aria-labelledby="more-articles">
          <SectionHeader id="more-articles" title="Read next" icon={Newspaper} viewAllHref="/articles" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {more.map((other) => (
              <ArticleCard key={other.id} article={other} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

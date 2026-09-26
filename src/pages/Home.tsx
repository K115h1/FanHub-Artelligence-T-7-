// Home page — landing page (SRS sitemap lives in the Footer).
// Sections: hero carousel → category row → featured content → latest articles.
// Glassy "casual premium" style: purple-only accents, translucent cards with
// backdrop blur, restrained gradients, low roundness (rounded-lg / rounded-md).
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Eye, ArrowRight } from 'lucide-react'
import { ARTICLES, CATEGORIES, FEATURED_CONTENT, SLIDES } from '../lib/mockData'

// Shared card look: translucent glass panel with a purple-tinted edge.
const glassCard =
  'rounded-lg border border-purple-500/20 bg-white/60 backdrop-blur-xl transition hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/10 dark:bg-white/[0.06]'

// Purple gradient used for artwork placeholders and the hero backdrop.
const purpleGradient = 'bg-gradient-to-br from-purple-600 via-purple-500 to-purple-400'

// ---------- Hero carousel ----------

function Hero() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const total = SLIDES.length

  const goNext = useCallback(() => setIndex((i) => (i + 1) % total), [total])
  const goPrev = () => setIndex((i) => (i - 1 + total) % total)

  // Autoplay — stops while the user hovers the banner (and while paused).
  useEffect(() => {
    if (paused) return
    const timer = setInterval(goNext, 6000)
    return () => clearInterval(timer)
  }, [paused, goNext])

  const slide = SLIDES[index]

  return (
    <section
      aria-label="Highlights"
      className="relative overflow-hidden lg:h-[70vh] rounded-lg border border-purple-500/20"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Backdrop: layered purple gradients + blur for the glassy look */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-700 via-purple-600 to-purple-500" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.25),transparent_45%)]" />
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />

      {/* Slide content */}
      <div className="relative flex min-h-[260px] flex-col justify-center gap-3 p-6 sm:min-h-[320px] sm:p-10">
        <p className="text-xs font-semibold tracking-[0.3em] my-auto text-white/70 uppercase">
          {slide.kicker}
        </p>
        <h1 className="max-w-2xl text-3xl font-bold text-white sm:text-5xl ">{slide.title}</h1>
        <p className="max-w-xl text-sm text-white/80 sm:text-base">{slide.blurb}</p>
        <div className="mt-2">
          <Link
            to="/explorer"
            className="inline-flex items-center gap-2 rounded-md bg-white/90 px-5 py-2.5 text-sm font-semibold text-purple-700 transition hover:bg-white"
          >
            Explore Now <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      {/* Arrows */}
      <button
        aria-label="Previous slide"
        onClick={goPrev}
        className="absolute top-1/2 left-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md border border-white/30 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/25"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        aria-label="Next slide"
        onClick={goNext}
        className="absolute top-1/2 right-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md border border-white/30 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/25"
      >
        <ChevronRight size={18} />
      </button>

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`h-2 rounded-md transition-all ${
              i === index ? 'w-6 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'
            }`}
          />
        ))}
      </div>
    </section>
  )
}

// ---------- Small section header ----------

function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-xl font-bold text-black dark:text-white">
        <span className={`h-5 w-1.5 rounded-md ${purpleGradient}`} />
        {title}
      </h2>
      <Link
        to={href}
        className="inline-flex items-center gap-1 text-sm font-medium text-purple-600 transition hover:text-purple-500 dark:text-purple-400"
      >
        View all <ArrowRight size={14} />
      </Link>
    </div>
  )
}

// ---------- Page ----------

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
      <Hero />

      {/* Categories */}
      <section aria-label="Categories">
        <SectionHeader title="Categories" href="/explorer" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {CATEGORIES.map(({ slug, name, icon: Icon }) => (
            <Link
              key={slug}
              to={`/category/${slug}`}
              className={`${glassCard} group flex flex-col items-center gap-2 p-4 text-center`}
            >
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-md text-white shadow-md shadow-purple-500/30 transition group-hover:scale-105 ${purpleGradient}`}
              >
                <Icon size={20} />
              </span>
              <span className="text-sm font-medium text-black/80 dark:text-white/80">{name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured content */}
      <section aria-label="Featured content">
        <SectionHeader title="Featured Content" href="/explorer" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Homepage shows the first four; category pages use the full list. */}
          {FEATURED_CONTENT.slice(0, 4).map((item) => (
            <Link key={item.id} to={`/content/${item.id}`} className={`${glassCard} overflow-hidden`}>
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

      {/* Latest articles */}
      <section aria-label="Latest articles">
        <SectionHeader title="Latest Articles" href="/articles" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Homepage shows the first four; category pages use the full list. */}
          {ARTICLES.slice(0, 4).map((article) => (
            <Link key={article.id} to={`/articles/${article.id}`} className={`${glassCard} p-4`}>
              <span className={`mb-3 flex h-1.5 w-12 rounded-md ${purpleGradient}`} />
              <h3 className="mb-1.5 font-semibold text-black dark:text-white">{article.title}</h3>
              <p className="mb-3 text-sm text-black/60 dark:text-white/60">{article.excerpt}</p>
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
    </div>
  )
}

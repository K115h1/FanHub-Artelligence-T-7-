// Merchandise — the shop is not open yet.
//
// Per the SRS this is DISPLAY ONLY: no cart, no checkout, no payments. Rather
// than leave a bare "coming soon" placeholder, this page shows what the shop
// will stock, takes email sign-ups for launch news, and says plainly why
// nothing is for sale.
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, ShoppingBag, Bell, Check, Sparkles, Tag, CreditCard, Clock } from 'lucide-react'
import PageHero from '../components/common/PageHero'
import SectionHeader from '../components/common/SectionHeader'
import CategoryArt, { CategoryDot } from '../components/common/CategoryArt'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { CATEGORIES } from '../lib/mockData'

const SIGNUP_KEY = 'fanhub-merch-notify'

/** Fandom → the kinds of thing the shop will stock for it. */
const STOCK_PREVIEW: Record<string, string[]> = {
  anime: ['Apparel', 'Pins', 'Posters'],
  gaming: ['Apparel', 'Desk set', 'Artbook'],
  movies: ['Posters', 'Mugs', 'Replicas'],
  'tv-shows': ['Apparel', 'Mugs', 'Blankets'],
  'k-pop': ['Photocards', 'Lightsticks', 'Apparel'],
  comics: ['Comic prints', 'Apparel', 'Tote bags'],
  manga: ['Artbooks', 'Stationery', 'Apparel'],
  cosplay: ['Prop replicas', 'Fabric', 'Tool kits'],
}

/** Why there's no checkout — stated up front rather than discovered later. */
const NOT_YET = [
  { icon: CreditCard, title: 'No payments yet', body: 'There is no cart or checkout. Payment handling is out of scope for this build.' },
  { icon: Clock, title: 'Stock is unconfirmed', body: 'Nothing is listed because nothing is allocated. Inventories land with the shop.' },
  { icon: Package, title: 'Images are placeholders', body: 'Product photography is still being shot, so tiles use generated artwork.' },
]

export default function Merchandise() {
  const [email, setEmail] = useState('')
  const [signedUp, setSignedUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notified, setNotified] = useLocalStorage<string[]>(SIGNUP_KEY, [])

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const alreadyIn = useMemo(
    () => notified.some((e) => e.toLowerCase() === email.trim().toLowerCase()),
    [notified, email],
  )

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!valid) {
      setError('That does not look like an email address.')
      return
    }
    if (!alreadyIn) setNotified((current) => [...current, email.trim()])
    setError(null)
    setSignedUp(true)
    setEmail('')
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHero
        kicker="Coming soon"
        title="Merchandise"
        icon={ShoppingBag}
        blurb="The Fan Hub Plus shop is being put together. Here's what we're stocking, and you can sign up to hear when it opens."
      >
        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-purple-700 shadow-lg shadow-black/20">
          <Clock size={15} aria-hidden="true" />
          Not open for sale
        </span>
      </PageHero>

      {/* ---- Sign-up ---- */}
      <section aria-labelledby="merch-notify" className="surface-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 id="merch-notify" className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Bell size={16} className="text-accent" aria-hidden="true" />
              Get launch news
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              One email when the shop goes live. Stored on this device for now — there's no mailing
              list server yet.
            </p>
          </div>

          {signedUp ? (
            <p
              role="status"
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-accent-soft px-4 py-2.5 text-sm font-semibold text-accent"
            >
              <Check size={16} aria-hidden="true" /> You're on the list
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="flex w-full shrink-0 gap-2 sm:w-auto">
              <label htmlFor="merch-email" className="sr-only">
                Email address
              </label>
              <input
                id="merch-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError(null)
                  setSignedUp(false)
                }}
                placeholder="you@example.com"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'merch-email-error' : undefined}
                className="w-full min-w-0 rounded-lg border border-line bg-surface-raised px-3 py-2.5 text-sm text-ink transition focus:border-accent sm:w-56"
              />
              <button
                type="submit"
                className="shrink-0 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink transition hover:bg-accent-hover"
              >
                Notify me
              </button>
            </form>
          )}
        </div>
        {error && (
          <p id="merch-email-error" role="alert" className="mt-2 text-xs text-red-500">
            {error}
          </p>
        )}
      </section>

      {/* ---- Why there's nothing to buy ---- */}
      <section aria-labelledby="merch-not-yet">
        <SectionHeader
          id="merch-not-yet"
          title="Why there's nothing to buy yet"
          icon={Tag}
        />
        <div className="grid gap-3 sm:grid-cols-3">
          {NOT_YET.map((item) => (
            <div key={item.title} className="surface-card p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <item.icon size={18} aria-hidden="true" />
              </span>
              <h3 className="mt-3 text-sm font-semibold text-ink">{item.title}</h3>
              <p className="mt-1 text-sm text-ink-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- What we'll stock ---- */}
      <section aria-labelledby="merch-preview">
        <SectionHeader
          id="merch-preview"
          title="What we're planning to stock"
          icon={Sparkles}
          subtitle="Placeholder artwork, not products"
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {CATEGORIES.map((category) => (
            <div
              key={category.slug}
              className="overflow-hidden rounded-xl border border-line transition hover:-translate-y-0.5 hover:border-accent"
            >
              <div className="aspect-square">
                <CategoryArt
                  slug={category.slug}
                  name={category.name}
                  icon={category.icon}
                />
              </div>
              <div className="space-y-1 p-2.5">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                  <CategoryDot slug={category.slug} />
                  {category.name}
                </span>
                <ul className="space-y-0.5">
                  {(STOCK_PREVIEW[category.slug] ?? ['TBC']).map((line) => (
                    <li key={line} className="text-[11px] text-ink-subtle">
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="surface-card flex flex-wrap items-center justify-between gap-3 p-5">
        <p className="text-sm text-ink-muted">
          Merch is display-only for now. Everything else on the site is fully browsable.
        </p>
        <Link
          to="/explore"
          className="inline-flex items-center gap-2 text-sm font-semibold text-accent transition hover:gap-3"
        >
          Go and explore <Package size={15} aria-hidden="true" />
        </Link>
      </section>
    </div>
  )
}

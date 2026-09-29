// Merchandise, the shop showcase. Not open for sale yet.
//
// SRS says display only, so no cart and no payments. We show what has been
// photographed, take email sign ups for launch news, and say plainly that none
// of it is for sale yet.
//
// The grid reads merchandise_items through /community/merchandise. That is paged
// and filterable like the Explorer, so it keeps working once there is more than
// the 45 rows we have now.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Bell, Check, Clock, CreditCard, Package, Search, ShoppingBag, Sparkles, Tag } from 'lucide-react'
import PageHero from '../components/common/PageHero'
import SectionHeader from '../components/common/SectionHeader'
import MerchandiseCard from '../components/common/MerchandiseCard'
import Pagination from '../components/common/Pagination'
import { CardGridSkeleton } from '../components/common/skeletons'
import { EmptyState } from '../components/common/EmptyState'
import { SearchBar } from '../components/common/SearchBar'
import CategoryArt, { CategoryDot } from '../components/common/CategoryArt'
import { FilterSelect } from '../components/admin/shared'
import {
  MERCHANDISE_SORT_OPTIONS,
  getMerchandise,
} from '../services/merchandise.service'
import { getCategories } from '../services/content.service'
import { categoryIcon } from '../lib/categoryIcons'
import type { CategoryDto, MerchandiseItem, MerchandiseSort } from '../types/models'
import { useLocalStorage } from '../hooks/useLocalStorage'

const SIGNUP_KEY = 'fanhub-merch-notify'
const PAGE_SIZE = 24

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

const SHOP_INFO = [
  {
    icon: CreditCard,
    title: 'Browse only',
    body: 'No cart or checkout. Merchandise is a look at what the shop will carry.',
  },
  {
    icon: Clock,
    title: 'New arrivals weekly',
    body: 'Fresh drops land through the year, so keep an eye on the collections.',
  },
  {
    icon: Package,
    title: 'Collectible editions',
    body: 'Limited runs, box sets and artist exclusives across every fandom.',
  },
]

export default function Merchandise() {
  const [searchParams, setSearchParams] = useSearchParams()
  const categoryId = searchParams.get('category') ? Number(searchParams.get('category')) : undefined
  const sort = (searchParams.get('sort') as MerchandiseSort) ?? 'name'
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)

  const [items, setItems] = useState<MerchandiseItem[]>([])
  const [categories, setCategories] = useState<CategoryDto[]>([])
  const [total, setTotal] = useState(0)
  const [pageCount, setPageCount] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const runId = useRef(0)

  const [email, setEmail] = useState('')
  const [signedUp, setSignedUp] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [notified, setNotified] = useLocalStorage<string[]>(SIGNUP_KEY, [])

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const alreadyIn = useMemo(
    () => notified.some((e) => e.toLowerCase() === email.trim().toLowerCase()),
    [notified, email],
  )

  useEffect(() => {
    void getCategories()
      .then(setCategories)
      .catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    const mine = ++runId.current
    setLoading(true)
    setError(null)
    void getMerchandise({ categoryId, sort, page, pageSize: PAGE_SIZE })
      .then((result) => {
        if (mine !== runId.current) return
        setItems(result.items)
        setTotal(result.totalCount)
        setPageCount(result.pageCount)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (mine !== runId.current) return
        setItems([])
        setError(err instanceof Error ? err.message : 'The showcase could not be loaded.')
        setLoading(false)
      })
  }, [categoryId, sort, page])

  function setParam(patch: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === '') next.delete(key)
      else next.set(key, value)
    }
    if (!('page' in patch)) next.delete('page')
    setSearchParams(next, { replace: true })
  }

  const onSearch = useCallback(
    (value: string) => setParam({ search: value || null }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchParams, setSearchParams],
  )

  const hasFilters = categoryId !== undefined || searchParams.get('search')

  function handleSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!valid) {
      setFormError('That does not look like an email address.')
      return
    }
    if (!alreadyIn) setNotified((current) => [...current, email.trim().toLowerCase()])
    setFormError(null)
    setSignedUp(true)
    setEmail('')
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:py-8">
      <PageHero
        kicker="Coming soon"
        title="Merchandise"
        icon={ShoppingBag}
        blurb="The Fan Hub Plus shop is being put together. Here's what has been photographed so far, and you can sign up to hear when it opens."
      >
        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-purple-700 shadow-lg shadow-black/20">
          <Clock size={15} aria-hidden="true" />
          Not open for sale
        </span>
      </PageHero>

      <section aria-labelledby="merch-notify" className="surface-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 id="merch-notify" className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Bell size={16} className="text-accent" aria-hidden="true" />
              Get launch news
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              One email when the shop goes live. No spam, unsubscribe any time.
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
            <form onSubmit={handleSignup} className="flex w-full shrink-0 gap-2 sm:w-auto">
              <label htmlFor="merch-email" className="sr-only">
                Email address
              </label>
              <input
                id="merch-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setFormError(null)
                  setSignedUp(false)
                }}
                placeholder="you@example.com"
                aria-invalid={Boolean(formError)}
                aria-describedby={formError ? 'merch-email-error' : undefined}
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
        {formError && (
          <p id="merch-email-error" role="alert" className="mt-2 text-xs text-red-500">
            {formError}
          </p>
        )}
      </section>

      <section aria-labelledby="merch-showcase">
        <SectionHeader
          id="merch-showcase"
          title="The showcase"
          icon={ShoppingBag}
          subtitle="A look at what's been photographed. Nothing is for sale yet."
        />

        {error && (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-600"
          >
            {error}
          </p>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="w-full max-w-xs">
            <SearchBar
              value={searchParams.get('search') ?? ''}
              onSearch={onSearch}
              placeholder="Search products…"
            />
          </div>

          <FilterSelect
            value={categoryId === undefined ? 'all' : String(categoryId)}
            onChange={(value) => setParam({ category: value === 'all' ? null : value })}
            label="Fandom"
            options={[
              { value: 'all', label: 'All fandoms' },
              ...categories.map((c) => ({ value: String(c.id), label: c.name })),
            ]}
          />

          <FilterSelect
            value={sort}
            onChange={(value) => setParam({ sort: value === 'name' ? null : value })}
            label="Sort"
            options={MERCHANDISE_SORT_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
          />
        </div>

        {loading ? (
          <CardGridSkeleton count={12} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={hasFilters ? Search : ShoppingBag}
            title={hasFilters ? 'Nothing matches those filters' : 'Currently restocking'}
            body={
              hasFilters
                ? 'Try a different fandom, or clear the search box.'
                : "We're currently restocking, so merchandise is unavailable right now. Sign up above and we'll let you know when it's back."
            }
            actionText={hasFilters ? 'Clear filters' : undefined}
            onAction={
              hasFilters ? () => setSearchParams(new URLSearchParams(), { replace: true }) : undefined
            }
          />
        ) : (
          <>
            <p className="mb-3 text-xs text-ink-subtle">
              {total} {total === 1 ? 'product' : 'products'}
            </p>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((item) => (
                <MerchandiseCard key={item.id} item={item} />
              ))}
            </ul>
          </>
        )}

        {pageCount > 1 && (
          <div className="mt-6 border-t border-line pt-4">
            <Pagination
              page={page}
              pageCount={pageCount}
              total={total}
              pageSize={PAGE_SIZE}
              onChange={(next) => {
                setParam({ page: String(next) })
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            />
          </div>
        )}
      </section>

      <section aria-labelledby="merch-why">
        <SectionHeader id="merch-why" title="Why there's nothing to buy yet" icon={Tag} />
        <div className="grid gap-3 sm:grid-cols-3">
          {SHOP_INFO.map((item) => (
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

      <section aria-labelledby="merch-preview">
        <SectionHeader
          id="merch-preview"
          title="What we're planning to stock"
          icon={Sparkles}
          subtitle="Artwork and formats we're stocking"
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {categories.map((category) => {
            const Icon = categoryIcon(category.slug)
            return (
              <Link
                key={category.id}
                to={`/merchandise?category=${category.id}`}
                className="group overflow-hidden rounded-xl border border-line transition hover:border-accent"
              >
                <div className="aspect-square">
                  <CategoryArt
                    slug={category.slug}
                    name={category.name}
                    icon={Icon}
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
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}

// Page skeletons, composed placeholders shaped like the page they stand in for.
//
// A skeleton is only worth more than a spinner if it predicts the layout, so
// each of these is a copy of the real page's block structure with the text and
// images blanked. When the real markup changes, this should change with it, 
// that coupling is the whole point, and it is why they live next to each other
// rather than in a generic "Loading..." component.
//
// All of them are full-page-width, because every one replaces a whole main element
// during a route's data fetch. The padding matches the page it replaces so
// nothing shifts when the data lands.
import { Skeleton, SkeletonRegion, SkeletonText } from '../ui/Skeleton'

/** Grid of poster cards. `count` should match the page's real page size. */
export function CardGridSkeleton({ count = 8, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 ${className}`} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-xl bg-surface-sunken">
          {/* Matches the h-40 artwork band on ContentCard. */}
          <Skeleton className="h-40 rounded-none" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-4 w-4/5 rounded" />
            <Skeleton className="h-3 w-2/5 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** A fandom landing page: banner, stat strip, then a card grid. */
export function CategoryPageSkeleton() {
  return (
    <SkeletonRegion label="Loading category" className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <Skeleton className="h-44 rounded-lg" />
      <div className="flex flex-wrap gap-2" aria-hidden="true">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-6 w-28 rounded-full" />
        ))}
      </div>
      <CardGridSkeleton count={8} />
    </SkeletonRegion>
  )
}

/**
 * A title detail page: hero art beside a metadata column.
 *
 * The two-column split matches ContentDetail's real `lg:grid-cols-3`, with the
 * wide block spanning two columns.
 */
export function ContentDetailSkeleton() {
  return (
    <SkeletonRegion label="Loading title" className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <Skeleton className="h-64 rounded-xl border border-line" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Skeleton className="h-80 rounded-xl border border-line" />
          <SkeletonText lines={5} />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-48 rounded-xl border border-line" />
          <Skeleton className="h-24 rounded-lg border border-line" />
        </div>
      </div>
    </SkeletonRegion>
  )
}

/** An event detail page: a tall hero and a short body. */
export function EventDetailSkeleton() {
  return (
    <SkeletonRegion label="Loading event" className="mx-auto w-full max-w-5xl space-y-4 px-4 py-10 sm:px-6">
      <Skeleton className="h-56 rounded-xl border border-line" />
      <div className="space-y-3">
        <Skeleton className="h-7 w-1/2 rounded" />
        <SkeletonText lines={4} />
      </div>
    </SkeletonRegion>
  )
}

/** An article detail page: headline, byline, body. */
export function ArticleDetailSkeleton() {
  return (
    <SkeletonRegion label="Loading article" className="mx-auto w-full max-w-3xl space-y-4 px-4 py-10 sm:px-6">
      <Skeleton className="h-10 w-4/5 rounded" />
      <Skeleton className="h-3 w-32 rounded" />
      <Skeleton className="h-56 w-full rounded-xl" />
      <SkeletonText lines={8} />
    </SkeletonRegion>
  )
}

/**
 * A paged list of rows, for admin tables and similar.
 *
 * `columns` skeleton cells per row. Row skeletons are table-ish rather than
 * card-ish so the eye reads "list still arriving" rather than "grid".
 */
export function ListSkeleton({
  rows = 8,
  columns = 5,
  className = '',
}: {
  rows?: number
  columns?: number
  className?: string
}) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-4 rounded-lg border border-line p-3">
          {Array.from({ length: columns }, (_, c) => (
            <Skeleton
              key={c}
              className={`h-4 rounded ${c === 0 ? 'w-2/5' : 'flex-1'}`}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * The generic route fallback, used while a lazily-imported route's chunk is in
 * flight. Deliberately unopinionated: at this point the router does not yet know
 * which page is coming, so this can only be a neutral centred block.
 */
export function RouteFallback() {
  return (
    <SkeletonRegion label="Loading page" className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <Skeleton className="h-8 w-56 rounded" />
        <CardGridSkeleton count={6} />
      </div>
    </SkeletonRegion>
  )
}

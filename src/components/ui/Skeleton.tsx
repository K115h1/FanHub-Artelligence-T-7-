// Skeleton — the one primitive every loading placeholder is built from.
//
// Before this existed each page hand-rolled its own `<div className="h-64
// animate-pulse rounded-xl bg-surface-sunken" />`, in three slightly different
// spellings. That is fine until a page needs a fourth one and copies the third.
//
// Design notes:
//   * `animate-pulse` rather than a bespoke shimmer keyframe, because index.css
//     already collapses animation for `prefers-reduced-motion` and for the
//     in-app reduce-motion toggle. A new keyframe would have to be wired into
//     both, and would then be the one that ignores them.
//   * Nothing here is announced. A screen reader reading a dozen empty divs is
//     noise, so the blocks are `aria-hidden` and the *container* carries the
//     status. See SkeletonRegion below for that.
//   * Sized by className, not by props. Skeletons mirror a layout that already
//     exists in the page, so the page's own spacing utilities are the honest
//     sizes; a second vocabulary here would just drift from them.
//   * No corner radius in the base. Two `rounded-*` utilities have equal
//     specificity, so which one applies depends on the order Tailwind emits them
//     in the stylesheet — not the order they appear in the class attribute. A
//     default here would therefore make every call site's radius a coin flip
//     (passing `rounded-xl` would silently lose). Each caller states the shape
//     it mirrors instead, which also lets genuinely different shapes (a pill for
//     a stat chip) exist. If these ever need real overrides, add tailwind-merge —
//     the `cn` helper in lib/utils.ts is still a placeholder — and put a default
//     back.
import type { HTMLAttributes } from 'react'

/** A single shimmering block. Pass a `rounded-*` utility to shape it. */
export function Skeleton({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div aria-hidden="true" className={`animate-pulse bg-surface-sunken ${className}`} {...rest} />
  )
}

/**
 * Several lines of text-shaped skeleton.
 *
 * `lines` repeats a block, and the last line is shortened because a paragraph
 * whose final line is full-width reads as a solid block rather than as text.
 */
export function SkeletonText({
  lines = 3,
  className = '',
}: {
  lines?: number
  className?: string
}) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className={`h-3 animate-pulse rounded bg-surface-sunken ${i === lines - 1 ? 'w-3/5' : 'w-full'}`}
        />
      ))}
    </div>
  )
}

/**
 * Wraps skeletons and gives the group a single accessible name.
 *
 * The blocks inside stay `aria-hidden`; this is the one thing that is exposed,
 * so assistive tech hears "Loading" once instead of nothing at all. Without it a
 * skeleton is completely silent, which is worse than a spinner — it looks like
 * an empty page rather than a page that is working.
 */
export function SkeletonRegion({
  label = 'Loading',
  className = '',
  children,
}: {
  label?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  )
}

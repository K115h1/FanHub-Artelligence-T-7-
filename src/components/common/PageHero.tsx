// PageHero — the banner at the top of a non-home page.
//
// Same visual language as the home carousel (purple wash, left-weighted scrim)
// but shorter and static, so interior pages still open with a hero without
// stealing the homepage's sliding banner. Artwork is generated, not remote.
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export default function PageHero({
  kicker,
  title,
  blurb,
  icon: Icon,
  children,
}: {
  kicker: string
  title: string
  blurb?: string
  icon?: LucideIcon
  /** Buttons or controls pinned under the blurb. */
  children?: ReactNode
}) {
  return (
    <section className="relative overflow-hidden rounded-xl border border-line">
      <div aria-hidden="true" className="accent-wash absolute inset-0" />
      {/* Second hue so consecutive pages don't look identical. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/25 to-transparent mix-blend-overlay"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent"
      />

      <div className="relative flex min-h-[220px] flex-col justify-center gap-3 p-6 sm:min-h-[260px] sm:p-10">
        <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-white/70 uppercase">
          {Icon && <Icon size={14} aria-hidden="true" />}
          {kicker}
        </p>
        <h1 className="text-3xl font-bold text-white sm:text-4xl">{title}</h1>
        {blurb && <p className="max-w-xl text-sm leading-relaxed text-white/80">{blurb}</p>}
        {children && <div className="mt-2 flex flex-wrap items-center gap-3">{children}</div>}
      </div>
    </section>
  )
}

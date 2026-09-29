// PageHero, the banner at the top of a non-home page.
//
// Same visual language as the home carousel (purple wash, left-weighted scrim)
// but shorter and static, so interior pages still open with a hero without
// stealing the homepage's sliding banner. Artwork is generated, not remote, 
// unless the page passes `image`, in which case that artwork is layered over
// the same wash (see the comment on the image layer below).
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export default function PageHero({
  kicker,
  title,
  blurb,
  icon: Icon,
  image,
  children,
}: {
  kicker: string
  title: string
  blurb?: string
  icon?: LucideIcon
  /**
   * Artwork to sit behind the title, the same image the originating card
   * showed. Omit it and the banner is the purple wash alone, which is what
   * every page without a specific image wants.
   */
  image?: string | null
  /** Buttons or controls pinned under the blurb. */
  children?: ReactNode
}) {
  return (
    <section className="relative overflow-hidden rounded-xl border border-line">
      {/* The wash is never removed, only covered: it is what shows through if
          `image` 404s or the title has no artwork, so this component has no
          broken-image state to handle. */}
      <div aria-hidden="true" className="accent-wash absolute inset-0" />

      {/* The artwork, as a CSS background for the same reason CategoryArt uses
          one: a bad path fails silently and the wash under it still paints,
          where an img element would show a broken-image glyph. The title and blurb
          are real text, so the picture is decoration and stays aria-hidden. */}
      {image && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${image})` }}
        />
      )}

      {/* Second hue so consecutive pages don't look identical. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/25 to-transparent mix-blend-overlay"
      />
      {/* Only when artwork is present: a flat knock-down, because a bright
          poster would otherwise fight the scrim below it for legibility. */}
      {image && <div aria-hidden="true" className="absolute inset-0 bg-black/35" />}
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

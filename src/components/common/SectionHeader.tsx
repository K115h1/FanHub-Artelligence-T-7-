// SectionHeader — the heading row that opens every homepage section.
//
// Shared so the spacing, the accent bar and the "View all" link stay
// identical across sections instead of drifting apart one copy-paste at a time.
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export default function SectionHeader({
  title,
  icon: Icon,
  viewAllHref,
  subtitle,
  id,
}: {
  title: string
  icon?: LucideIcon
  viewAllHref?: string
  subtitle?: string
  /** Set this and point the wrapping <section aria-labelledby> at it, so the
      heading is announced once rather than twice. */
  id?: string
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 id={id} className="flex items-center gap-2 text-lg font-bold text-ink sm:text-xl">
          <span aria-hidden="true" className="h-5 w-1.5 rounded-full bg-accent" />
          {Icon && <Icon size={18} className="text-accent" aria-hidden="true" />}
          {title}
        </h2>
        {subtitle && <p className="mt-1 ml-3.5 text-sm text-ink-muted">{subtitle}</p>}
      </div>

      {viewAllHref && (
        <Link
          to={viewAllHref}
          className="inline-flex items-center gap-1 text-sm font-medium text-accent transition hover:gap-2"
        >
          View all <ArrowRight size={14} aria-hidden="true" />
        </Link>
      )}
    </div>
  )
}

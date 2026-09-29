// SectionHeader, the heading row that opens every homepage section, shared so
// the spacing and "View all" link stay identical across them.
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export default function SectionHeader({
  title,
  icon: Icon,
  viewAllHref,
  subtitle,
  id,
  action,
}: {
  title: string
  icon?: LucideIcon
  viewAllHref?: string
  subtitle?: string
  /** Set this and point the wrapping section element (aria-labelledby) at it, so the
      heading is announced once rather than twice. */
  id?: string
  /** A control on the right, e.g. a sort dropdown. Takes precedence over the
      "View all" link, since a section rarely needs both. */
  action?: ReactNode
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

      {action ??
        (viewAllHref && (
          <Link
            to={viewAllHref}
            className="inline-flex items-center gap-1 text-sm font-medium text-accent transition hover:gap-2"
          >
            View all <ArrowRight size={14} aria-hidden="true" />
          </Link>
        ))}
    </div>
  )
}

// EmptyState, the "nothing here yet" panel.
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  body?: string
  actionText?: string
  onAction?: () => void
}

export function EmptyState({ icon: Icon, title, body, actionText, onAction }: EmptyStateProps) {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line-strong bg-surface-sunken px-6 py-14 text-center">
      {Icon && (
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Icon className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
        </span>
      )}
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {body && <p className="max-w-sm text-sm text-ink-muted">{body}</p>}
      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-1 rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-accent-ink transition hover:bg-accent-hover"
        >
          {actionText}
        </button>
      )}
    </div>
  )
}

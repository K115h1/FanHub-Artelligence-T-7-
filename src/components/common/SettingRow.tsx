// SettingRow — the bordered block that groups related settings on the
// Profile page. One row per group, with an optional heading and a footnote.
import type { ReactNode } from 'react'

export default function SettingRow({
  title,
  description,
  footnote,
  children,
}: {
  title: string
  description?: string
  footnote?: string
  children: ReactNode
}) {
  return (
    <section className="surface-card p-5">
      <header className="mb-1">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-ink-subtle">{description}</p>}
      </header>

      {/* divide-y separates the rows without needing a border on each child. */}
      <div className="divide-y divide-line [&>*+*]:pt-1">{children}</div>

      {footnote && <p className="mt-3 text-xs text-ink-subtle">{footnote}</p>}
    </section>
  )
}

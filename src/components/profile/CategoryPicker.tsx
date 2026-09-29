// CategoryPicker, the toggle grid used for both Favourites and Interests.
//
// One component for both on purpose. The two lists differ only in wording and in
// which endpoint they save to, and a duplicated grid would drift.
//
// Interaction is immediate: a click saves straight away rather than staging a
// draft behind a Save button. A category list is a handful of toggles, and
// making someone hunt for a Save button to say "I like anime" is friction for
// no benefit. The hook rolls back and shows an error if the write fails.
import { Check } from 'lucide-react'
import type { CategoryChip } from '../../services/auth.service'
import { Skeleton } from '../ui/Skeleton'

export default function CategoryPicker({
  all,
  selected,
  onToggle,
  disabled = false,
  label,
}: {
  all: CategoryChip[]
  selected: CategoryChip[]
  onToggle: (ids: number[]) => void
  disabled?: boolean
  /** Describes what this list is FOR, shown under the heading. */
  label: string
}) {
  const selectedIds = new Set(selected.map((c) => c.id))

  if (all.length === 0) {
    // Six placeholders rather than one block: the real grid wraps at four
    // columns, so anything else would shift when the data lands.
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-11 rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div>
      <div
        role="group"
        aria-label={label}
        className="grid grid-cols-2 gap-2 sm:grid-cols-3"
      >
        {all.map((category) => {
          const on = selectedIds.has(category.id)
          return (
            <button
              key={category.id}
              type="button"
              disabled={disabled}
              aria-pressed={on}
              onClick={() =>
                onToggle(
                  on
                    ? selected.filter((c) => c.id !== category.id).map((c) => c.id)
                    : [...selected.map((c) => c.id), category.id],
                )
              }
              className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                on
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-line text-ink-muted hover:border-accent/50 hover:text-ink'
              }`}
            >
              <span className="truncate">{category.name}</span>
              {on && <Check size={14} aria-hidden="true" className="shrink-0" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Toggle — a labelled on/off switch.
//
// Built here rather than inline in the Settings page because the Profile
// settings and privacy tabs both need one, and a hand-rolled switch in each
// place is how the two end up looking subtly different.
interface ToggleProps {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  /** Explains what turning this on actually does. Rendered under the label. */
  description?: string
  disabled?: boolean
}

export default function Toggle({ checked, onChange, label, description, disabled }: ToggleProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <label className={`block text-sm font-medium ${disabled ? 'text-ink-subtle' : 'text-ink'}`}>
          {label}
        </label>
        {description && <p className="mt-0.5 text-xs text-ink-subtle">{description}</p>}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          checked ? 'bg-accent' : 'bg-line-strong'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </button>
    </div>
  )
}

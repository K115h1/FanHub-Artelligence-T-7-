// SearchBar — the one search field, used in two places.
//
//   variant="default" → a standalone dark pill (Explorer results, future pages)
//   variant="header"  → the compact translucent pill that sits in the Header
//
// Both share this component so the debounce, the clear button and the keyboard
// behaviour exist once. The header previously had its own raw <input>, which is
// how the site ended up with two search bars that behaved differently.
//
// SUBMIT BEHAVIOUR: pass `onSubmit` (the Header does) and the bar renders a
// <form> — Enter or the button submits, and the debounce only smooths typing.
// Omit it (the Explorer does) and `onSearch` fires on a debounce, which is what
// you want when results update live under the field.
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Search, X } from 'lucide-react'
import { useDebounce } from '../../hooks/useDebounce'

export type SearchBarVariant = 'default' | 'header'

interface SearchBarProps {
  value?: string
  /** Debounced: fires as the user types, after 300ms of quiet. */
  onSearch?: (query: string) => void
  /** Immediate: fires on Enter / button click. Ignores the debounce. */
  onSubmit?: (query: string) => void
  placeholder?: string
  variant?: SearchBarVariant
  autoFocus?: boolean
}

export function SearchBar({
  value = '',
  onSearch,
  onSubmit,
  placeholder = 'Search...',
  variant = 'default',
  autoFocus = false,
}: SearchBarProps) {
  const [query, setQuery] = useState(value)
  const debouncedQuery = useDebounce(query, 300)
  const isHeader = variant === 'header'

  // Keep the newest callbacks in refs so the effects below don't need them as
  // dependencies — otherwise a caller passing an inline arrow function would
  // re-fire the search on every render.
  const onSearchRef = useRef(onSearch)
  const onSubmitRef = useRef(onSubmit)
  useEffect(() => {
    onSearchRef.current = onSearch
    onSubmitRef.current = onSubmit
  }, [onSearch, onSubmit])

  // Echo `value` back into the field when the parent changes it (e.g. the
  // Explorer rewrites ?q=). Guarded on an actual change so typing is never
  // clobbered by the parent echoing our own value straight back.
  const lastProp = useRef(value)
  useEffect(() => {
    if (value !== lastProp.current) {
      lastProp.current = value
      setQuery(value)
    }
  }, [value])

  // Live search, whenever a handler is supplied. The Header decides what that
  // means: on /explore it rewrites ?q= so results filter as you type; on every
  // other page it passes no handler, so typing does nothing until Enter.
  useEffect(() => {
    onSearchRef.current?.(debouncedQuery.trim())
  }, [debouncedQuery])

  function handleClear() {
    setQuery('')
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmitRef.current?.(query.trim())
  }

  const clearButton = query && (
    <button
      type="button"
      onClick={handleClear}
      aria-label="Clear search"
      className={
        isHeader
          ? 'absolute right-10 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-subtle transition hover:bg-accent-soft hover:text-ink'
          : 'absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-purple-400 transition hover:bg-purple-500/20 hover:text-purple-100'
      }
    >
      <X className="h-4 w-4" />
    </button>
  )

  // ---- header variant: icon/submit button on the RIGHT, no left icon ----
  if (isHeader) {
    return (
      <form
        onSubmit={handleFormSubmit}
        role="search"
        className="relative flex min-w-0 flex-1 items-center rounded-full border border-accent/60 px-4 transition hover:border-accent focus-within:border-accent"
      >
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label="Search"
          autoFocus={autoFocus}
          className="w-full min-w-0 border-0 bg-transparent py-2 text-ink outline-none placeholder:text-ink-subtle"
        />
        {clearButton}
        <button
          type="submit"
          aria-label="Search"
          className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition hover:text-accent sm:h-9 sm:w-9"
        >
          <Search size={16} />
        </button>
      </form>
    )
  }

  // ---- default variant: icon on the left, standalone field ----
  return (
    <div className="relative w-full" role="search">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-purple-400"
        aria-hidden="true"
      />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        aria-label="Search"
        autoFocus={autoFocus}
        className="w-full rounded-xl border border-purple-500/40 bg-linear-0 from-purple-950 to-purple-900 py-3 pl-10 pr-10 text-sm text-purple-50 placeholder:text-purple-400/50 transition focus:border-purple-400"
      />
      {clearButton}
    </div>
  )
}

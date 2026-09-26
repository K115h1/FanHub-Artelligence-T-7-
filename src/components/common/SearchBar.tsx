// SearchBar — the shared search field, in two looks:
//   "default" → standalone dark pill   "header" → compact pill in the Header
//
// Pass onSubmit (the Header does) to get a <form> that submits on Enter.
// Omit it and onSearch fires on a debounce, for results that update as you type.
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

  // Syncs from `value` when the parent changes it, but only on a real change,
  // so a parent echoing our own value back can't clobber typing.
  const lastProp = useRef(value)
  useEffect(() => {
    if (value !== lastProp.current) {
      lastProp.current = value
      setQuery(value)
    }
  }, [value])

  // Fires only if a handler was passed. The Header supplies one on /explore
  // (rewrites ?q= as you type) and omits it elsewhere, so typing does nothing.
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

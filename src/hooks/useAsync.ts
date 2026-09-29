// useAsync, one place for "fetch something, then be loading / errored / done".
//
// Every page that calls a service needs the same three pieces of state and the
// same unmount guard, so they live here rather than being retyped per page. The
// guard matters: without it, a slow response that arrives after the visitor has
// navigated away calls setState on a component that is gone, and React logs a
// warning that looks like a real bug.
//
// Deliberately not a data library. There is no cache, no background refresh and
// no request deduplication, the catalogue is small enough that a fresh request
// per page visit is simpler than explaining a cache to whoever reads this next.
import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../types/api'

export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
  /** Re-runs the request. */
  refetch: () => void
}

export function useAsync<T>(
  run: () => Promise<T>,
  deps: unknown[],
  options: { immediate?: boolean } = {},
): AsyncState<T> {
  const { immediate = true } = options

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(immediate)
  const [error, setError] = useState<string | null>(null)

  // Bumped on every run, so a slow earlier response can tell it has been
  // superseded and drop its result instead of overwriting a newer one.
  const requestId = useRef(0)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  // `run` is intentionally not a dependency: callers pass an inline closure, so
  // including it would re-fetch on every render. `deps` is the contract.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const runRef = useRef(run)
  runRef.current = run

  const execute = useCallback(() => {
    const id = ++requestId.current
    setLoading(true)
    setError(null)

    runRef.current()
      .then((result) => {
        if (!mounted.current || id !== requestId.current) return
        setData(result)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (!mounted.current || id !== requestId.current) return
        // ApiError already carries wording a visitor can read.
        setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (immediate) execute()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, loading, error, refetch: execute }
}

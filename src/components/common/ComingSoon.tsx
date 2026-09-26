// ComingSoon — shared placeholder rendered by every route until its real page
// is built. Reads the route's `handle.title` from src/app/router.tsx, so the
// router stays the single source of truth for page names.
// When a real page is built, only its one route entry changes (→ lazy import).
import { useMatches } from 'react-router-dom'

interface RouteHandle {
  title?: string
}

export default function ComingSoon() {
  const matches = useMatches()
  const handle = matches.at(-1)?.handle as RouteHandle | undefined
  const title = handle?.title ?? 'Untitled page'

  return (
    <section className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-semibold tracking-widest text-gray-500 uppercase dark:text-white/50">
        FanHub Plus
      </p>
      <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl dark:text-white">{title}</h1>
      <p className="text-gray-600 dark:text-white/60">
        This route is wired up but the page hasn&rsquo;t been built yet. It will
        be implemented during the feature build phase.
      </p>
    </section>
  )
}

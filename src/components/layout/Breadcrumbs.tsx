// Breadcrumbs — navigation clarity across categories (SRS accessibility item).
// Placeholder export for RootLayout; will read route `handle.title` values
// from src/app/router.tsx when implemented — the route table already carries them.
import { useMatches } from 'react-router-dom'

interface RouteHandle {
  title?: string
}

export default function Breadcrumbs() {
  const matches = useMatches()
  const trail = matches
    .map((match) => (match.handle as RouteHandle | undefined)?.title)
    .filter((title): title is string => Boolean(title))

  // No chrome until there is more than one crumb (i.e. Home itself).
  if (trail.length < 2) return null

  return (
    <nav aria-label="Breadcrumb" data-slot="breadcrumbs" className="px-4 py-2 text-sm text-gray-500 dark:text-white/50">
      {trail.join(' / ')}
    </nav>
  )
}

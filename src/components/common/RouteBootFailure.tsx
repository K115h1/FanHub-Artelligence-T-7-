// RouteBootFailure — last-resort screen when the router cannot start.
//
// This is NOT the normal loading state. The normal one is RouteFallback, shown
// while a lazy chunk downloads. This renders only when the router itself throws
// before it can produce any route at all: a malformed route config, or a loader
// that threw at module scope. In that state there is no Header, no Sidebar and
// no router context, so this cannot be a page component and has to stand alone.
//
// It offers a reload rather than a dead end, because the usual cause is a stale
// chunk after a deploy — the old index.html referencing assets that no longer
// exist — and a refresh is what actually fixes that.
import { TriangleAlert } from 'lucide-react'

export default function RouteBootFailure() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="surface-card w-full max-w-md p-6 text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/15 text-rose-500">
          <TriangleAlert size={22} aria-hidden="true" />
        </span>

        <h1 className="mb-2 text-xl font-bold text-ink">The app didn&rsquo;t start</h1>
        <p className="mb-6 text-sm leading-relaxed text-ink-muted">
          Something went wrong before any page could load. This is usually a
          cached copy of an older build — reloading fetches the current files.
        </p>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink transition hover:bg-accent-hover"
        >
          Reload
        </button>
      </div>
    </main>
  )
}

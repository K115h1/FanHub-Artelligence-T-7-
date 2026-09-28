// Dashboard — the member's landing page.
//
// Four panels, all from one hook: a greeting, the fandoms they have favourited,
// what they have been doing, and what they have bookmarked. Previously a static
// page with placeholder tiles that linked nowhere useful.
//
// Each panel renders independently. A signed-in member with nothing favourited
// or bookmarked still gets a real page, because "you have not done anything yet"
// is a true answer and an empty grid would look broken.
import { Link } from 'react-router-dom'
import { ArrowRight, Bookmark, History, PenLine, Sparkles, Star } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useDashboardSummary } from '../features/dashboard/useDashboardSummary'
import { useSubmissions } from '../features/dashboard/useSubmissions'
import ContentCard from '../components/common/ContentCard'
import { ListSkeleton, CardGridSkeleton } from '../components/common/skeletons'
import { Skeleton } from '../components/ui/Skeleton'
import { CategoryDot } from '../components/common/CategoryArt'
import { EmptyState } from '../components/common/EmptyState'
import SectionHeader from '../components/common/SectionHeader'
import CreateSubmission from '../components/dashboard/CreateSubmission'
import SubmissionList from '../components/dashboard/SubmissionList'

export default function Dashboard() {
  const { current, isAuthed } = useAuth()
  const summary = useDashboardSummary()
  // Created content is member-only: both endpoints behind it are [Authorize], so
  // this hook is only mounted once there is a token to send.
  const submissions = useSubmissions()

  const firstName = (current?.name ?? '').trim().split(/\s+/)[0] || 'there'

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* ---- Greeting ---- */}
      <header>
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">
          {!isAuthed
            ? 'Welcome to FanHub Plus'
            : summary.loading
              ? 'Welcome back'
              : `${summary.hello}, ${firstName}`}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {/* Three states, not two. Keying the "confirm your email" prompt off
              isVerified alone showed it to signed-out visitors, who have no
              email to confirm and no profile to be sent to. */}
          {!isAuthed ? (
            <>
              Sign in and this fills up with your fandoms, your bookmarks and your
              recent activity.
            </>
          ) : current?.isVerified ? (
            <>Here&rsquo;s what you&rsquo;ve been up to.</>
          ) : (
            <>
              Here&rsquo;s what you&rsquo;ve been up to.{' '}
              <Link
                to="/profile?tab=interests"
                className="font-medium text-accent hover:underline"
              >
                Confirm your email
              </Link>{' '}
              to get a verified badge.
            </>
          )}
        </p>
      </header>

      {/* ---- Favourite fandoms ---- */}
      <section aria-labelledby="dash-favourites">
        <SectionHeader
          id="dash-favourites"
          title="Your fandoms"
          icon={Star}
          action={
            <Link
              to="/profile?tab=interests"
              className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
            >
              Edit
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          }
        />

        {summary.loading ? (
          <Skeleton className="h-11 w-full max-w-md" />
        ) : summary.favoriteFandoms.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {summary.favoriteFandoms.map((fandom) => (
              <Link
                key={fandom.id}
                to={`/explore?category=${fandom.slug}`}
                className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink transition hover:border-accent hover:text-accent"
              >
                <CategoryDot slug={fandom.slug} />
                {fandom.name}
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-muted">
            No favourites yet.{' '}
            <Link to="/profile?tab=interests" className="font-medium text-accent hover:underline">
              Pick a few
            </Link>{' '}
            and they&rsquo;ll show up here.
          </p>
        )}
      </section>

      {/* ---- Recent activity ---- */}
      <section aria-labelledby="dash-activity">
        <SectionHeader id="dash-activity" title="Recent activity" icon={History} />

        {summary.loading ? (
          <ListSkeleton rows={4} columns={3} />
        ) : summary.activity.length > 0 ? (
          <ul className="surface-card divide-y divide-line">
            {summary.activity.map((entry) => (
              <li key={entry.id} className="flex items-center gap-3 px-4 py-3">
                <Sparkles size={15} className="shrink-0 text-accent" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{entry.label}</span>
                <time className="shrink-0 text-xs text-ink-subtle">{entry.when}</time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-muted">
            Nothing yet. Anything you do — bookmarking, rating, verifying — lands here.
          </p>
        )}
      </section>

      {/* ---- Create ---- */}
      {isAuthed && (
        <section aria-labelledby="dash-create">
          <SectionHeader
            id="dash-create"
            title="Create"
            icon={PenLine}
            subtitle="Anything you write here goes to an administrator for review before it goes live."
          />
          <div className="grid gap-5 lg:grid-cols-2">
            <CreateSubmission draft={submissions} />
            <div>
              <h3 className="mb-4 text-sm font-semibold text-ink">What you have sent</h3>
              <SubmissionList draft={submissions} />
            </div>
          </div>
        </section>
      )}

      {/* ---- Bookmarks ---- */}
      <section aria-labelledby="dash-bookmarks">
        <SectionHeader
          id="dash-bookmarks"
          title="Bookmarked"
          icon={Bookmark}
          action={
            <Link
              to="/bookmarks"
              className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
            >
              See all
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          }
        />

        {summary.loading ? (
          <CardGridSkeleton count={4} />
        ) : summary.bookmarks.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {summary.bookmarks.slice(0, 8).map((item) => (
              <ContentCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Bookmark}
            title="No bookmarks yet"
            body="Bookmark a title and it will wait for you here."
          />
        )}
      </section>
    </div>
  )
}

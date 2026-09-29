// Feedback, the suggestion / bug / query form.
//
// Public by design: a feedback form that demands a login stops exactly the
// people most likely to report a problem. Submissions POST to
// /community/feedback, which writes the `feedback` table the admin panel reads
// at /admin/feedback.
//
// What changed and why:
//
//   * This page used to write every submission to a localStorage array and
//     never call the API. The complaint was real, the queue was built, and the
//     two never met: a report existed only in the browser that sent it, was
//     invisible to every administrator, and vanished with the browsing data.
//     It now goes through features/feedback/hooks.ts, so a submitted complaint
//     lands in MySQL and appears in the moderator's queue on next load.
//   * The local `FeedbackType` and `FeedbackEntry` interfaces declared here are
//     gone. They shadowed the API shapes in types/models.ts under the same
//     names, with incompatible fields, string ids, a non-nullable `rating` of
//     0 for "unrated", and no `status` at all. Anything crossing the wire now
//     uses the shared type.
//   * The "Clear history" button is gone with the localStorage it cleared. There
//     is no endpoint for a fan to delete their own feedback, and a button that
//     only erased the local view while the row stayed in the queue would have
//     been a lie. The panel is now read-only, which is what it always really was.
import { useCallback, useMemo, useState } from 'react'
import {
  MessageSquare,
  Bug,
  Lightbulb,
  HelpCircle,
  Send,
  Check,
  Loader2,
  AlertCircle,
  Clock,
} from 'lucide-react'
import PageHero from '../components/common/PageHero'
import SectionHeader from '../components/common/SectionHeader'
import { RatingStars } from '../components/common/RatingStars'
import { useAuth } from '../context/AuthContext'
import { useAuthModal } from '../context/AuthModalContext'
import { useMyFeedback, useSubmitFeedback } from '../features/feedback/hooks'
import type { FeedbackEntry, FeedbackStatus } from '../types/models'

/** `feedback.type` as the API spells it. */
export type FeedbackType = 'bug' | 'suggestion' | 'query' | 'content'

const TYPES: { key: FeedbackType; label: string; icon: typeof Bug; hint: string }[] = [
  { key: 'bug', label: 'Something is broken', icon: Bug, hint: 'A page that errors, or does something unexpected.' },
  { key: 'suggestion', label: 'I have an idea', icon: Lightbulb, hint: 'A feature, or a change to something existing.' },
  { key: 'query', label: 'I have a question', icon: HelpCircle, hint: 'How something works, or where to find it.' },
  { key: 'content', label: 'Content request', icon: MessageSquare, hint: 'A title, character or event you want added.' },
]

/**
 * Must match the server's limit in CommunityService.SubmitFeedbackAsync. It was
 * 600 here against 4000 there, so the browser rejected messages the API would
 * have accepted and the shorter cap looked like a product decision.
 */
const MAX_MESSAGE = 4000

/** Wording for each status, so the fan can see their report was worked. */
const STATUS_LABELS: Record<FeedbackStatus, string> = {
  open: 'Received',
  reviewed: 'Being looked at',
  resolved: 'Resolved',
  dismissed: 'Closed',
}

// ---------- Field wrapper ----------
// Keeps label / control / error / hint markup identical across the form.
function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {hint && !error && <p className="mt-0.5 text-xs text-ink-subtle">{hint}</p>}
      <div className="mt-1.5">{children}</div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  )
}

/** One row in "What you've sent". Reads the shared API shape. */
function HistoryCard({ entry }: { entry: FeedbackEntry }) {
  const meta = TYPES.find((t) => t.key === entry.type)
  const Icon = meta?.icon ?? MessageSquare
  // status is a plain string from the API, so an unrecognised value falls back
  // rather than indexing to undefined and rendering nothing.
  const statusLabel = STATUS_LABELS[entry.status as FeedbackStatus] ?? entry.status

  return (
    <li className="surface-card p-4">
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-accent" aria-hidden="true" />
        <span className="text-xs font-semibold text-accent">{meta?.label ?? entry.type}</span>
        <span className="ml-auto text-xs text-ink-subtle">
          {new Date(entry.createdAt).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
          })}
        </span>
      </div>
      <p className="mt-2 line-clamp-3 text-sm text-ink-muted">{entry.message}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-subtle">
        {entry.rating != null && entry.rating > 0 && <span>Priority: {'★'.repeat(entry.rating)}</span>}
        <span className="ml-auto rounded-full bg-line-strong/40 px-2 py-0.5 font-semibold text-ink-muted">
          {statusLabel}
        </span>
      </div>
    </li>
  )
}

export default function Feedback() {
  const { current } = useAuth()
  const { open: openAuth } = useAuthModal()

  const { submitting, error: submitError, submit, clearError } = useSubmitFeedback()
  const {
    entries,
    loading,
    error: historyError,
    signedIn,
    refresh,
  } = useMyFeedback(current?.id ?? null)

  const [type, setType] = useState<FeedbackType>('bug')
  const [message, setMessage] = useState('')
  const [rating, setRating] = useState(5)
  const [email, setEmail] = useState('')
  const [touched, setTouched] = useState(false)
  const [justSent, setJustSent] = useState(false)

  const trimmed = message.trim()
  const messageError =
    trimmed.length === 0
      ? 'Please tell us what you think.'
      : trimmed.length < 10
        ? 'A little more detail helps — at least 10 characters.'
        : trimmed.length > MAX_MESSAGE
          ? `That is too long — ${MAX_MESSAGE.toLocaleString('en-GB')} characters at most.`
          : null
  const emailError =
    email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      ? 'That does not look like an email address.'
      : email.trim().length > 255
        ? 'That email address is too long.'
        : null
  const canSend = !messageError && !emailError && !submitting

  const activeType = TYPES.find((t) => t.key === type) ?? TYPES[0]

  // Newly sent entries are held here until the next list refresh, so the fan
  // sees their complaint appear immediately instead of after a refetch.
  const [pending, setPending] = useState<FeedbackEntry[]>([])
  const sorted = useMemo(
    () =>
      [...pending, ...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [pending, entries],
  )

  const handleSend = useCallback(async () => {
    if (messageError || emailError) {
      setTouched(true)
      return
    }

    const created = await submit({
      type,
      message: trimmed,
      // Only `content` carries a rating; the column is nullable, so anything
      // else is sent as absent rather than as a misleading 1-5.
      rating: type === 'content' ? rating : undefined,
      email: email.trim() || undefined,
    })

    // On failure the message is left in the box so it is not retyped. The
    // server's wording is already in `submitError`.
    if (!created) return

    setPending((current) => [created, ...current])
    setMessage('')
    setRating(5)
    setEmail('')
    setTouched(false)
    setJustSent(true)
    // Re-read so the card carries the stored status and id rather than the
    // optimistic copy if the server normalised anything.
    refresh()
  }, [messageError, emailError, submit, type, trimmed, rating, email, refresh])

  const showError = (err: string | null) => (touched ? err : null)

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHero
        kicker="Help us improve"
        title="Feedback"
        icon={MessageSquare}
        blurb="Found a bug, got an idea, or just want to ask something? This goes straight to the people building the site."
      >
        <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur-md">
          <Send size={15} aria-hidden="true" />
          {signedIn ? sorted.length : 0} sent
        </span>
      </PageHero>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* ---- Form ---- */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void handleSend()
          }}
          className="space-y-5 lg:col-span-3"
        >
          <section className="surface-card space-y-5 p-5">
            <div>
              <h2 className="text-sm font-semibold text-ink">What kind of feedback is this?</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {TYPES.map((option) => {
                  const Icon = option.icon
                  const active = type === option.key
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setType(option.key)}
                      aria-pressed={active}
                      className={`flex items-start gap-3 rounded-lg border p-3 text-left transition ${
                        active
                          ? 'border-accent bg-accent-soft'
                          : 'border-line bg-surface-raised hover:border-accent'
                      }`}
                    >
                      <Icon
                        size={17}
                        aria-hidden="true"
                        className={`mt-0.5 shrink-0 ${active ? 'text-accent' : 'text-ink-subtle'}`}
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-ink">{option.label}</span>
                        <span className="mt-0.5 block text-xs text-ink-subtle">{option.hint}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Rating only makes sense for content requests. */}
            {type === 'content' && (
              <div>
                <span className="block text-sm font-medium text-ink">How much do you want this?</span>
                <p className="mt-0.5 text-xs text-ink-subtle">
                  Helps us judge what to add first.
                </p>
                <div className="mt-2">
                  <RatingStars value={rating} onChange={setRating} />
                </div>
              </div>
            )}

            <Field
              id="feedback-message"
              label="Your message"
              hint={activeType.hint}
              error={showError(messageError) ?? undefined}
            >
              <textarea
                id="feedback-message"
                value={message}
                rows={5}
                maxLength={MAX_MESSAGE}
                onChange={(e) => {
                  setMessage(e.target.value)
                  setJustSent(false)
                  clearError()
                }}
                onBlur={() => setTouched(true)}
                aria-invalid={Boolean(touched && messageError)}
                aria-describedby={touched && messageError ? 'feedback-message-error' : undefined}
                placeholder="The more detail the better — what you did, what you expected, what happened."
                className="w-full resize-y rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm text-ink transition focus:border-accent"
              />
              <div className="mt-1 text-right text-xs text-ink-subtle">
                {message.length.toLocaleString('en-GB')}/{MAX_MESSAGE.toLocaleString('en-GB')}
              </div>
            </Field>

            <Field
              id="feedback-email"
              label="Email (optional)"
              hint="Only if you'd like a reply."
              error={showError(emailError) ?? undefined}
            >
              <input
                id="feedback-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  clearError()
                }}
                onBlur={() => setTouched(true)}
                aria-invalid={Boolean(touched && emailError)}
                aria-describedby={touched && emailError ? 'feedback-email-error' : undefined}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm text-ink transition focus:border-accent"
              />
            </Field>

            {/* Server-side rejections land here, so a silent no-op is impossible. */}
            {submitError && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400"
              >
                <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>
                  {submitError} Your message is still in the box — fix it and send again.
                </span>
              </p>
            )}

            <div className="flex flex-wrap items-center justify-end gap-3">
              {justSent && (
                <span role="status" className="inline-flex items-center gap-1.5 text-sm text-accent">
                  <Check size={15} aria-hidden="true" /> Thanks — sent
                </span>
              )}
              <button
                type="submit"
                disabled={!canSend}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send size={15} aria-hidden="true" />
                    Send feedback
                  </>
                )}
              </button>
            </div>

            {!current && (
              <p className="text-xs text-ink-subtle">
                Sign in to keep your feedback tied to your account.{' '}
                {/* Opens the overlay rather than navigating. This sits directly
                    under a form the visitor may already have filled in, and a
                    route change to a sign-in page would throw that away. */}
                <button
                  type="button"
                  onClick={() => openAuth('login')}
                  className="font-semibold text-accent underline-offset-2 hover:underline"
                >
                  Sign in
                </button>{' '}
                to attach it to your account.
              </p>
            )}
          </section>
        </form>

        {/* ---- History ---- */}
        <div className="space-y-4 lg:col-span-2">
          <SectionHeader
            title="What you've sent"
            icon={Clock}
            subtitle={current ? `Signed in as ${current.name}` : 'Anonymous'}
          />

          {/* Anonymous rows have no user id, so there is nothing to scope a
              history query to. Say so rather than showing an empty list that
              looks like nothing was ever sent. */}
          {!signedIn ? (
            <div className="surface-card p-5 text-sm text-ink-muted">
              <p>
                Sign in to see the feedback you've sent and follow its status. You can still
                send feedback while signed out — it just won't appear here.
              </p>
              <button
                type="button"
                onClick={() => openAuth('login')}
                className="mt-3 text-sm font-semibold text-accent underline-offset-2 hover:underline"
              >
                Sign in
              </button>
            </div>
          ) : historyError ? (
            <div className="surface-card p-5 text-sm text-ink-muted">
              <p role="alert">{historyError}</p>
              <button
                type="button"
                onClick={refresh}
                className="mt-3 text-sm font-semibold text-accent underline-offset-2 hover:underline"
              >
                Try again
              </button>
            </div>
          ) : loading ? (
            <div className="surface-card flex items-center gap-2 p-5 text-sm text-ink-muted">
              <Loader2 size={15} className="animate-spin" aria-hidden="true" />
              Loading your feedback…
            </div>
          ) : sorted.length === 0 ? (
            <div className="surface-card p-5 text-sm text-ink-muted">
              Nothing sent yet. Anything you submit shows up here so you can check it went
              through.
            </div>
          ) : (
            <ul className="space-y-3">
              {sorted.map((entry) => (
                <HistoryCard key={entry.id} entry={entry} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

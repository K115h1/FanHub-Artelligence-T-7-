// Feedback — the suggestion / bug / query form.
//
// Public by design: a feedback form that demands a login stops exactly the
// people most likely to report a problem. Submissions are stored per account on
// the device; `feedback.service.ts` will POST them once the API exists.
import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare, Bug, Lightbulb, HelpCircle, Send, Check, Trash2, Clock } from 'lucide-react'
import PageHero from '../components/common/PageHero'
import SectionHeader from '../components/common/SectionHeader'
import { RatingStars } from '../components/common/RatingStars'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { useAuth } from '../context/AuthContext'
import { useLocalStorage } from '../hooks/useLocalStorage'

export type FeedbackType = 'bug' | 'suggestion' | 'query' | 'content'

export interface FeedbackEntry {
  id: string
  type: FeedbackType
  /** 1–5 stars. Only meaningful for `content`. */
  rating: number
  message: string
  /** Set when the visitor is signed in; empty for anonymous submissions. */
  email: string
  createdAt: string
}

const STORAGE_PREFIX = 'fanhub-feedback'

const TYPES: { key: FeedbackType; label: string; icon: typeof Bug; hint: string }[] = [
  { key: 'bug', label: 'Something is broken', icon: Bug, hint: 'A page that errors, or does something unexpected.' },
  { key: 'suggestion', label: 'I have an idea', icon: Lightbulb, hint: 'A feature, or a change to something existing.' },
  { key: 'query', label: 'I have a question', icon: HelpCircle, hint: 'How something works, or where to find it.' },
  { key: 'content', label: 'Content request', icon: MessageSquare, hint: 'A title, character or event you want added.' },
]

const MAX_MESSAGE = 600

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

export default function Feedback() {
  const { current } = useAuth()
  const storageKey = `${STORAGE_PREFIX}:${current?.id ?? 'guest'}`
  const [entries, setEntries] = useLocalStorage<FeedbackEntry[]>(storageKey, [])

  const [type, setType] = useState<FeedbackType>('bug')
  const [message, setMessage] = useState('')
  const [rating, setRating] = useState(5)
  const [email, setEmail] = useState('')
  const [touched, setTouched] = useState(false)
  const [justSent, setJustSent] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  const trimmed = message.trim()
  const messageError =
    trimmed.length === 0 ? 'Please tell us what you think.' : trimmed.length < 10 ? 'A little more detail helps — at least 10 characters.' : null
  const emailError =
    email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? 'That does not look like an email address.' : null
  const canSend = !messageError && !emailError

  const activeType = TYPES.find((t) => t.key === type) ?? TYPES[0]

  const sorted = useMemo(
    () => [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [entries],
  )

  const handleSend = useCallback(() => {
    if (!canSend) {
      setTouched(true)
      return
    }
    const entry: FeedbackEntry = {
      id: `fb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type,
      rating: type === 'content' ? rating : 0,
      message: trimmed,
      email: email.trim(),
      createdAt: new Date().toISOString(),
    }
    setEntries((current) => [entry, ...current])
    setMessage('')
    setRating(5)
    setTouched(false)
    setJustSent(true)
  }, [canSend, type, rating, trimmed, email, setEntries])

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
          {entries.length} sent from this device
        </span>
      </PageHero>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* ---- Form ---- */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
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
              hint={`${activeType.hint}`}
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
                }}
                onBlur={() => setTouched(true)}
                aria-invalid={Boolean(touched && messageError)}
                aria-describedby={touched && messageError ? 'feedback-message-error' : undefined}
                placeholder="The more detail the better — what you did, what you expected, what happened."
                className="w-full resize-y rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm text-ink transition focus:border-accent"
              />
              <div className="mt-1 text-right text-xs text-ink-subtle">
                {message.length}/{MAX_MESSAGE}
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
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched(true)}
                aria-invalid={Boolean(touched && emailError)}
                aria-describedby={touched && emailError ? 'feedback-email-error' : undefined}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm text-ink transition focus:border-accent"
              />
            </Field>

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
                <Send size={15} aria-hidden="true" />
                Send feedback
              </button>
            </div>

            {!current && (
              <p className="text-xs text-ink-subtle">
                You're not signed in, so this is saved on this device only.{' '}
                <Link to="/login" className="font-semibold text-accent underline-offset-2 hover:underline">
                  Sign in
                </Link>{' '}
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
            subtitle={current ? `Signed in as ${current.name}` : 'Anonymous, on this device'}
          />

          {sorted.length === 0 ? (
            <div className="surface-card p-5 text-sm text-ink-muted">
              Nothing sent yet. Anything you submit shows up here so you can check it went
              through.
            </div>
          ) : (
            <>
              <ul className="space-y-3">
                {sorted.map((entry) => {
                  const meta = TYPES.find((t) => t.key === entry.type)
                  const Icon = meta?.icon ?? MessageSquare
                  return (
                    <li key={entry.id} className="surface-card p-4">
                      <div className="flex items-center gap-2">
                        <Icon size={14} className="text-accent" aria-hidden="true" />
                        <span className="text-xs font-semibold text-accent">{meta?.label}</span>
                        <span className="ml-auto text-xs text-ink-subtle">
                          {new Date(entry.createdAt).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-3 text-sm text-ink-muted">{entry.message}</p>
                      {entry.rating > 0 && (
                        <p className="mt-2 text-xs text-ink-subtle">
                          Priority: {'★'.repeat(entry.rating)}
                        </p>
                      )}
                    </li>
                  )
                })}
              </ul>

              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="inline-flex items-center gap-2 text-xs font-semibold text-ink-muted transition hover:text-red-500"
              >
                <Trash2 size={13} aria-hidden="true" />
                Clear history
              </button>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmClear}
        title="Clear feedback history?"
        body={`This removes all ${entries.length} entries from this device.`}
        confirmText="Clear"
        isWarning
        onConfirm={() => {
          setEntries([])
          setConfirmClear(false)
        }}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  )
}

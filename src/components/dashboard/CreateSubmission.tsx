// CreateSubmission — the "create something" panel on the dashboard.
//
// This is the member-facing half of the fan_submissions table. The table, the
// POST endpoint and the admin moderation queue all existed; this is the form
// that was missing, so nothing had ever written to it from the member's side.
//
// The member says WHAT they are sending — an article, a character profile, or
// an event highlight. Those are the three kinds the SRS names, and they are
// stored in fan_submissions.kind so the moderation queue can filter and route
// them. The shape below the picker is the same for all three, because the table
// holds a title and a body either way; only the kind differs.
import { useState, type FormEvent } from 'react'
import { FileText, Landmark, PenLine, Send, UserSquare2 } from 'lucide-react'
import type { UseSubmissions } from '../../features/dashboard/useSubmissions'
import { SUBMISSION_KINDS, type SubmissionKind } from '../../services/submission.service'

const KIND_ICON: Record<SubmissionKind, typeof FileText> = {
  article: FileText,
  character_profile: UserSquare2,
  event_highlight: Landmark,
}

// Matches the column widths in database/01_schema.sql. The body is bounded too
// so a pasted novel cannot sit in a TEXT column until it stalls the list query.
const MAX_TITLE = 255
const MAX_BODY = 5000

export default function CreateSubmission({ draft }: { draft: UseSubmissions }) {
  const { categories, submit, submitting, error, clearError } = draft
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [categoryId, setCategoryId] = useState('')
  // Defaults to an article, the most common thing sent, so the common case is
  // one click fewer while the other two are one click away.
  const [kind, setKind] = useState<SubmissionKind>('article')
  const [done, setDone] = useState(false)

  // A signed-out visitor sees nothing rather than a form that 401s on submit.
  if (categories.length === 0 && !submitting) {
    return null
  }

  const titleError = title.trim().length > MAX_TITLE ? 'Keep the title under 255 characters.' : null
  const bodyError = body.trim().length > MAX_BODY ? 'That is longer than 5000 characters.' : null
  const categoryError = categoryId ? null : 'Pick a fandom so it lands in the right place.'
  const canSend =
    title.trim().length > 0 && body.trim().length > 0 && categoryId !== '' && !titleError && !bodyError

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSend || submitting) return

    const created = await submit({ categoryId: Number(categoryId), kind, title, body })
    if (!created) return

    // Only clear on success. Clearing first would throw away the draft on a
    // failed post, which is the one time the user most wants it kept.
    setTitle('')
    setBody('')
    setCategoryId('')
    setDone(true)
  }

  return (
    <form onSubmit={onSubmit} className="surface-card space-y-4 p-5">
      <div className="flex items-center gap-2">
        <PenLine size={16} className="text-accent" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-ink">Share something with the fandom</h3>
      </div>
      <p className="text-xs text-ink-muted">
        Write a theory, a review, a character card &mdash; anything. An administrator reviews it
        before it appears on the site.
      </p>

      {/* ---- What kind of content this is ----
          A radio group rather than a <select>, because there are only three
          options and each needs a line of explanation. Radios also mean the
          choice is visible at a glance instead of hidden behind a dropdown. */}
      <fieldset>
        <legend className="mb-2 text-xs font-medium text-ink-muted">What are you sending?</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {SUBMISSION_KINDS.map((option) => {
            const Icon = KIND_ICON[option.value]
            const selected = kind === option.value
            return (
              <label
                key={option.value}
                className={`cursor-pointer rounded-lg border p-3 transition ${
                  selected
                    ? 'border-accent bg-accent-soft'
                    : 'border-line hover:border-accent/60'
                }`}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="submission-kind"
                    value={option.value}
                    checked={selected}
                    onChange={() => setKind(option.value)}
                    className="sr-only"
                  />
                  <Icon
                    size={15}
                    aria-hidden="true"
                    className={selected ? 'text-accent' : 'text-ink-subtle'}
                  />
                  <span
                    className={`text-xs font-semibold ${selected ? 'text-accent' : 'text-ink'}`}
                  >
                    {option.label}
                  </span>
                </span>
                <span className="mt-1 block text-[11px] leading-snug text-ink-muted">
                  {option.blurb}
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>

      <div>
        <label htmlFor="submission-title" className="block text-xs font-medium text-ink-muted">
          Title
        </label>
        <input
          id="submission-title"
          type="text"
          value={title}
          maxLength={MAX_TITLE + 20}
          onChange={(e) => {
            setTitle(e.target.value)
            setDone(false)
            clearError()
          }}
          placeholder="What is it called?"
          aria-invalid={Boolean(titleError)}
          aria-describedby={titleError ? 'submission-title-error' : undefined}
          className="mt-1 w-full rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm text-ink transition focus:border-accent"
        />
        {titleError && (
          <p id="submission-title-error" className="mt-1 text-xs text-red-500">
            {titleError}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="submission-category" className="block text-xs font-medium text-ink-muted">
          Fandom
        </label>
        <select
          id="submission-category"
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value)
            setDone(false)
            clearError()
          }}
          aria-invalid={Boolean(categoryError && (title || body))}
          className="mt-1 w-full rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm text-ink transition focus:border-accent"
        >
          <option value="">Choose a fandom&hellip;</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        {categoryError && (title || body) && (
          <p className="mt-1 text-xs text-red-500">{categoryError}</p>
        )}
      </div>

      <div>
        <label htmlFor="submission-body" className="block text-xs font-medium text-ink-muted">
          Your write-up
        </label>
        <textarea
          id="submission-body"
          value={body}
          rows={6}
          maxLength={MAX_BODY + 100}
          onChange={(e) => {
            setBody(e.target.value)
            setDone(false)
            clearError()
          }}
          placeholder="Say as much as you like."
          aria-invalid={Boolean(bodyError)}
          aria-describedby={bodyError ? 'submission-body-error' : undefined}
          className="mt-1 w-full rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm text-ink transition focus:border-accent"
        />
        <div className="mt-1 flex items-baseline justify-between gap-2">
          {bodyError ? (
            <p id="submission-body-error" className="text-xs text-red-500">
              {bodyError}
            </p>
          ) : (
            <span />
          )}
          <span className="text-[11px] text-ink-subtle">
            {body.length}/{MAX_BODY}
          </span>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-xs font-medium text-red-500">
          {error}
        </p>
      )}
      {done && (
        <p role="status" className="text-xs font-medium text-emerald-600">
          Sent for review. It will show up below as pending.
        </p>
      )}

      <button
        type="submit"
        disabled={!canSend || submitting}
        className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-ink transition hover:bg-accent-hover disabled:opacity-60"
      >
        <Send size={14} aria-hidden="true" />
        {submitting ? 'Sending…' : 'Send for review'}
      </button>
    </form>
  )
}

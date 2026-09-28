// SubmissionList — what this member has sent, and where each one got to.
//
// Pairs with CreateSubmission. A freshly posted row is 'pending' and appears
// only here and in the admin queue, which is why the status is spelled out
// rather than implied: a submission that does not appear on the homepage looks
// broken unless you can see that it is waiting for a human.
import { FileText, Inbox } from 'lucide-react'
import type { UseSubmissions } from '../../features/dashboard/useSubmissions'
import { submissionKindLabel } from '../../services/submission.service'
import { ListSkeleton } from '../common/skeletons'
import { EmptyState } from '../common/EmptyState'

// The three values fan_submissions.status allows. Anything else is a data
// problem, and is labelled as unknown rather than silently shown as pending.
const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-600',
  approved: 'bg-emerald-500/10 text-emerald-600',
  rejected: 'bg-rose-500/10 text-rose-600',
}

export default function SubmissionList({ draft }: { draft: UseSubmissions }) {
  const { submissions, loading, isEmpty } = draft

  if (loading) return <ListSkeleton rows={3} columns={1} />

  if (isEmpty) {
    return (
      <EmptyState
        icon={Inbox}
        title="You have not sent anything yet"
        body="Whatever you write above lands here with its review status."
      />
    )
  }

  return (
    <ul className="surface-card divide-y divide-line">
      {submissions.map((entry) => {
        const style = STATUS_STYLE[entry.status] ?? 'bg-ink-subtle/10 text-ink-subtle'
        return (
          <li key={entry.id} className="flex items-start gap-3 px-4 py-3">
            <FileText size={15} className="mt-0.5 shrink-0 text-ink-subtle" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{entry.title}</p>
              {/* line-clamp rather than truncate: a submission is worth reading a
                  line of, and a single truncated line throws away the body. */}
              <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">{entry.body}</p>
              {/* The kind, and the moderator's note when there is one. A rejection
                  with no explanation is the worst possible outcome, so when a note
                  exists it is shown in full rather than truncated. */}
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-subtle">
                <span className="rounded bg-surface-sunken px-1.5 py-0.5 font-medium">
                  {submissionKindLabel(entry.kind)}
                </span>
                {entry.moderatorNote && (
                  <span className="text-ink-muted">Reviewer: {entry.moderatorNote}</span>
                )}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${style}`}
            >
              {entry.status}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

// SignInPrompt — signed-out state for the personalised homepage sections.
// The homepage is public, so these fall back to global picks and say so,
// rather than rendering empty and looking broken.
import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'

export default function SignInPrompt({
  message = 'Sign in and this section tailors itself to what you have been reading.',
}: {
  message?: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-dashed border-line-strong bg-surface-sunken px-4 py-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Lock size={15} aria-hidden="true" />
      </span>
      <p className="flex-1 text-sm text-ink-muted">
        {message}{' '}
        <Link to="/login" className="font-semibold text-accent underline-offset-2 hover:underline">
          Sign in
        </Link>{' '}
        to personalise it.
      </p>
    </div>
  )
}

// InterestsTab — the member's two category lists, plus email verification.
//
// The picture upload used to live here and has moved to the Profile tab: it is
// part of who you are rather than what you like. What stays is the two
// independent category lists and the one-off "confirm your email" prompt, which
// belongs next to the other unfinished account setup.
import { useState } from 'react'
import { BadgeCheck, TriangleAlert } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useProfileCategories } from '../../features/profile/useProfileCategories'
import * as api from '../../services/auth.service'
import CategoryPicker from './CategoryPicker'

export default function InterestsTab() {
  const { current } = useAuth()
  const categories = useProfileCategories(Boolean(current?.userId))
  const [verifyBusy, setVerifyBusy] = useState(false)
  const [verifyNote, setVerifyNote] = useState<string | null>(null)

  async function onSendVerification() {
    if (!current) return
    setVerifyNote(null)
    setVerifyBusy(true)
    try {
      const result = await api.sendVerification(current.email)
      setVerifyNote(
        result.token
          ? 'No mail server in development, so here is the link directly. Open it to finish verifying.'
          : 'If that address needs verifying, a link is on its way.',
      )
    } catch (err) {
      setVerifyNote(err instanceof Error ? err.message : 'Could not send the verification link.')
    } finally {
      setVerifyBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* ---- Verification ---- */}
      {current && !current.isVerified && (
        <div className="surface-card border-amber-500/40 p-5">
          <div className="flex items-start gap-3">
            <TriangleAlert size={18} className="mt-0.5 shrink-0 text-amber-500" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-ink">Confirm your email address</h3>
              <p className="mt-1 text-xs text-ink-muted">
                {current.email} has not been verified yet.
              </p>
              <button
                type="button"
                onClick={onSendVerification}
                disabled={verifyBusy}
                className="mt-3 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink transition hover:bg-accent-hover disabled:opacity-60"
              >
                {verifyBusy ? 'Sending…' : 'Send the link'}
              </button>
              {verifyNote && (
                <p className="mt-2 text-xs break-words text-ink-subtle">{verifyNote}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---- The two category lists ---- */}
      {categories.unavailable ? (
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold text-ink">Favourites and interests</h3>
          <p className="mt-1 text-xs text-ink-muted">
            This account was created on this device, so there is nothing on the server to
            save to. Sign in against the API to pick fandoms.
          </p>
        </div>
      ) : (
        <>
          {categories.error && (
            <p
              role="alert"
              className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-600"
            >
              {categories.error}
            </p>
          )}

          <div className="surface-card p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-semibold text-ink">Favourite fandoms</h3>
              {categories.saving && <span className="text-[11px] text-ink-subtle">Saving…</span>}
            </div>
            <p className="mt-1 mb-3 text-xs text-ink-muted">
              The fandoms you have pinned. These lead your sidebar and the homepage shelves.
            </p>
            <CategoryPicker
              all={categories.all}
              selected={categories.favorites}
              onToggle={(ids) => void categories.setFavorites(ids)}
              disabled={categories.saving}
              label="Favourite fandoms"
            />
          </div>

          <div className="surface-card p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-semibold text-ink">Categories of interest</h3>
              {categories.saving && <span className="text-[11px] text-ink-subtle">Saving…</span>}
            </div>
            <p className="mt-1 mb-3 text-xs text-ink-muted">
              A broader signal used to shape recommendations. Following a fandom here does
              not add it to your favourites, and un-favouriting one does not remove it from here.
            </p>
            <CategoryPicker
              all={categories.all}
              selected={categories.interests}
              onToggle={(ids) => void categories.setInterests(ids)}
              disabled={categories.saving}
              label="Categories of interest"
            />
          </div>
        </>
      )}

      {current?.isVerified && (
        <p className="flex items-center gap-1.5 text-xs text-ink-subtle">
          <BadgeCheck size={14} className="text-emerald-500" aria-hidden="true" />
          {current.email} is verified.
        </p>
      )}
    </div>
  )
}

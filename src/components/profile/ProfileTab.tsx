// ProfileTab — identity: the account's avatar, name and bio.
//
// The profile PICTURE is a placeholder for now. There is no upload endpoint
// (`services/upload.service.ts` is still a stub), so the button is disabled and
// says so rather than opening a file picker that cannot do anything. The
// initials avatar from `common/Avatar` stands in, which is how the rest of the
// app already renders an account with no picture.
import { useEffect, useState, type FormEvent } from 'react'
import { Camera, Mail, Check, LoaderCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import Avatar from '../common/Avatar'

const MAX_NAME = 40
const MAX_BIO = 160

export default function ProfileTab() {
  const { current, updateProfile } = useAuth()

  // Local draft state, so typing doesn't rewrite storage on every keystroke.
  //
  // These are seeded from the account ONCE. The parent gives this component a
  // `key` of the account id, so switching accounts in the header remounts it
  // with fresh values. Doing it with an effect instead would mean re-seeding
  // whenever the name changes — including the change we just saved — which
  // would fight the user's cursor mid-edit.
  const [name, setName] = useState(current?.name ?? '')
  const [bio, setBio] = useState(current?.bio ?? '')
  const [saved, setSaved] = useState(false)

  // Clear the "Saved" confirmation after a moment so it doesn't linger.
  useEffect(() => {
    if (!saved) return
    const timer = setTimeout(() => setSaved(false), 2500)
    return () => clearTimeout(timer)
  }, [saved])

  if (!current) return null

  const nameError = name.trim() ? null : 'Name cannot be empty.'
  const nameTooLong = name.length > MAX_NAME ? `Keep it under ${MAX_NAME} characters.` : null
  const bioTooLong = bio.length > MAX_BIO ? `Keep it under ${MAX_BIO} characters.` : null
  const canSave = !nameError && !nameTooLong && !bioTooLong && (name !== current.name || bio !== current.bio)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSave) return
    updateProfile({ name, bio })
    setSaved(true)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* ---- Avatar ---- */}
      <section className="surface-card p-5">
        <h3 className="text-sm font-semibold text-ink">Profile picture</h3>
        <div className="mt-4 flex items-center gap-4">
          <div className="relative">
            <Avatar name={name || current.name} size="md" />
            <span
              aria-hidden="true"
              className="absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-ink-subtle text-white"
            >
              <Camera size={12} />
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm text-ink-muted">Showing your initials on a purple tile.</p>
            <p className="mt-0.5 text-xs text-ink-subtle">
              Uploading a photo arrives with the media API — there's nowhere to send the file yet.
            </p>
          </div>

          <button
            type="button"
            disabled
            className="shrink-0 cursor-not-allowed rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink-subtle opacity-60"
          >
            Change photo
          </button>
        </div>
      </section>

      {/* ---- Name + bio ---- */}
      <section className="surface-card p-5">
        <h3 className="text-sm font-semibold text-ink">Your details</h3>

        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="profile-name" className="block text-xs font-medium text-ink-muted">
              Display name
            </label>
            <input
              id="profile-name"
              type="text"
              value={name}
              maxLength={MAX_NAME + 10}
              onChange={(e) => {
                setName(e.target.value)
                setSaved(false)
              }}
              aria-invalid={Boolean(nameError || nameTooLong)}
              aria-describedby={nameError || nameTooLong ? 'profile-name-error' : undefined}
              className="mt-1 w-full rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm text-ink transition focus:border-accent"
            />
            {(nameError || nameTooLong) && (
              <p id="profile-name-error" className="mt-1 text-xs text-red-500">
                {nameError ?? nameTooLong}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="profile-bio" className="block text-xs font-medium text-ink-muted">
              Bio
            </label>
            <textarea
              id="profile-bio"
              value={bio}
              rows={3}
              maxLength={MAX_BIO + 20}
              onChange={(e) => {
                setBio(e.target.value)
                setSaved(false)
              }}
              placeholder="Tell other fans what you're into."
              aria-invalid={Boolean(bioTooLong)}
              aria-describedby={bioTooLong ? 'profile-bio-error' : undefined}
              className="mt-1 w-full resize-y rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm text-ink transition focus:border-accent"
            />
            <div className="mt-1 flex items-center justify-between">
              {bioTooLong ? (
                <p id="profile-bio-error" className="text-xs text-red-500">
                  {bioTooLong}
                </p>
              ) : (
                <span />
              )}
              <span className="text-xs text-ink-subtle">
                {bio.length}/{MAX_BIO}
              </span>
            </div>
          </div>

          {/* Email is an identity field — shown, but not editable. */}
          <div>
            <span className="block text-xs font-medium text-ink-muted">Email</span>
            <p className="mt-1 flex items-center gap-2 rounded-lg border border-line bg-surface-sunken px-3 py-2 text-sm text-ink-subtle">
              <Mail size={14} aria-hidden="true" />
              {current.email}
            </p>
            <p className="mt-1 text-xs text-ink-subtle">
              Changing an email needs a verification step, so it's read-only here.
            </p>
          </div>
        </div>

        {/* Save bar */}
        <div className="mt-5 flex items-center justify-end gap-3">
          {saved && (
            <span role="status" className="inline-flex items-center gap-1.5 text-xs text-accent">
              <Check size={14} aria-hidden="true" /> Saved
            </span>
          )}
          <button
            type="submit"
            disabled={!canSave}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-ink transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {canSave ? <Check size={15} aria-hidden="true" /> : <LoaderCircle size={15} aria-hidden="true" />}
            Save changes
          </button>
        </div>
      </section>
    </form>
  )
}

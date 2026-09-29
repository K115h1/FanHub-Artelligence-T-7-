// AvatarUploader, the picture, its buttons, and the file input.
//
// Extracted because the first version of this was written inline in
// InterestsTab and then had to be moved to the Profile tab; a control that has
// to be relocated should not have had its upload logic welded to a tab.
//
// The input is visually hidden but NOT hidden from assistive tech: a styled
// label or a display:none input is unreachable by keyboard, and the button
// that drives it is the only thing a sighted user sees. The button is a real
// button element, and the input carries an aria-label so it is still findable.
import { useRef, useState } from 'react'
import { Camera, Trash2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import * as api from '../../services/auth.service'
import { MAX_UPLOAD_BYTES, ACCEPTED_IMAGE_TYPES, validateImage } from '../../services/upload.service'
import Avatar from '../common/Avatar'

export default function AvatarUploader() {
  const { current, refreshProfile } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onPick(file: File) {
    setError(null)

    // Checked here for a fast, specific message, and again on the server, this
    // is a convenience, not the control. The server's magic-byte check is the
    // one that actually matters, since the browser's type is only a claim.
    const problem = validateImage(file)
    if (problem) return setError(problem)

    setBusy(true)
    try {
      await api.uploadAvatar(file)
      await refreshProfile()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That image could not be uploaded.')
    } finally {
      setBusy(false)
    }
  }

  async function onRemove() {
    setError(null)
    setBusy(true)
    try {
      await api.removeAvatar()
      await refreshProfile()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The picture could not be removed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-4 flex items-center gap-4">
      <Avatar name={current?.name ?? '?'} src={current?.avatarPath} size="md" />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink transition hover:bg-accent-hover disabled:opacity-60"
          >
            <Camera size={13} aria-hidden="true" />
            {busy ? 'Working…' : current?.avatarPath ? 'Replace' : 'Upload'}
          </button>
          {current?.avatarPath && (
            <button
              type="button"
              onClick={onRemove}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted transition hover:border-rose-500 hover:text-rose-500 disabled:opacity-60"
            >
              <Trash2 size={13} aria-hidden="true" />
              Remove
            </button>
          )}
        </div>

        <p className="mt-2 text-[11px] text-ink-subtle">
          {ACCEPTED_IMAGE_TYPES.map((t) => t.replace('image/', '').toUpperCase()).join(', ')}, up to{' '}
          {Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB. Square images look best.
        </p>
        {error && (
          <p role="alert" className="mt-1 text-xs font-medium text-rose-500">
            {error}
          </p>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        aria-label="Choose a profile picture"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          // Reset so picking the same file twice still fires a change event.
          event.target.value = ''
          if (file) void onPick(file)
        }}
      />
    </div>
  )
}

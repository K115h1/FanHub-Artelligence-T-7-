// PrivacyTab — what the account shares, and a link to the policy itself.
//
// These toggles are NOT decorative. `personalisedRecommendations` and
// `profileVisibility` are read by the homepage (see pages/Home.tsx), and
// `reduceMotion` from Settings is read document-wide — so switching them off
// visibly changes the site.
import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { useSettings } from '../../context/SettingsContext'
import { useAuth } from '../../context/AuthContext'
import type { ProfileVisibility } from '../../types/models'
import Toggle from '../common/Toggle'
import SettingRow from '../common/SettingRow'

const VISIBILITY_OPTIONS: { value: ProfileVisibility; label: string; hint: string }[] = [
  { value: 'public', label: 'Public', hint: 'Anyone can see your profile and activity.' },
  { value: 'followers', label: 'Followers', hint: 'Only people who follow you.' },
  { value: 'private', label: 'Private', hint: 'Only you can see your profile.' },
]

export default function PrivacyTab() {
  const { settings, updateSettings } = useSettings()
  const { current } = useAuth()

  return (
    <div className="space-y-4">
      {/* ---- Who can see you ---- */}
      <SettingRow
        title="Profile visibility"
        description="Applies to this account on this device."
      >
        <div className="py-3">
          <div
            role="radiogroup"
            aria-label="Profile visibility"
            className="flex shrink-0 gap-1 rounded-lg border border-line p-0.5"
          >
            {VISIBILITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={settings.profileVisibility === option.value}
                onClick={() => updateSettings({ profileVisibility: option.value })}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  settings.profileVisibility === option.value
                    ? 'bg-accent text-accent-ink'
                    : 'text-ink-muted hover:bg-accent-soft hover:text-accent'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-subtle">
            {VISIBILITY_OPTIONS.find((o) => o.value === settings.profileVisibility)?.hint}
          </p>
        </div>
      </SettingRow>

      {/* ---- What you share ---- */}
      <SettingRow
        title="What you share"
        description="Nothing here leaves your device yet — there is no analytics or email service connected. These switches record your choice so the behaviour is already in place when one is."
      >
        <Toggle
          label="Personalised recommendations"
          description="Powers “For You” and “Based on your recent activity” on the homepage. Turning this off shows the same sections as general popular picks instead."
          checked={settings.personalisedRecommendations}
          onChange={(next) => updateSettings({ personalisedRecommendations: next })}
        />
        <Toggle
          label="Share activity for analytics"
          description="Include your reading activity in anonymous, site-wide statistics."
          checked={settings.shareActivityForAnalytics}
          onChange={(next) => updateSettings({ shareActivityForAnalytics: next })}
        />
        <Toggle
          label="Email notifications"
          description="Product and demo announcements sent to your address."
          checked={settings.emailNotifications}
          onChange={(next) => updateSettings({ emailNotifications: next })}
        />
      </SettingRow>

      {/* ---- Policy ---- */}
      <div className="surface-card p-5">
        <h3 className="text-sm font-semibold text-ink">Privacy policy</h3>
        <p className="mt-1 text-xs text-ink-subtle">
          How Fan Hub Plus collects, stores and shares information. This is a demonstration
          document and does not describe a live service.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link
            to="/privacy"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-ink transition hover:bg-accent-hover"
          >
            Read the privacy policy
            <ExternalLink size={14} aria-hidden="true" />
          </Link>
          {current && (
            <span className="text-xs text-ink-subtle">
              Applies to {current.email} on this device.
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

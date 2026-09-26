// Profile — the member's own account area.
//
// Three tabs: Profile (identity), Settings (display + motion), Privacy (data
// sharing). The active tab lives in the URL (`?tab=settings`) so it can be
// linked to and survives a reload — and so the Breadcrumbs bar and the page
// title can reflect it.
//
// The whole page sits behind RequireAuth in the router, so a signed-out visitor
// gets the login popup instead of this.
import { useSearchParams } from 'react-router-dom'
import { User, Settings, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Avatar from '../components/common/Avatar'
import ProfileTab from '../components/profile/ProfileTab'
import SettingsTab from '../components/profile/SettingsTab'
import PrivacyTab from '../components/profile/PrivacyTab'

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'privacy', label: 'Privacy', icon: ShieldCheck },
] as const

type TabId = (typeof TABS)[number]['id']

function isTabId(value: string | null): value is TabId {
  return TABS.some((tab) => tab.id === value)
}

export default function Profile() {
  const { current } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  // Fall back to the Profile tab for anything unrecognised, so a hand-edited
  // ?tab=nonsense doesn't blank the page.
  const requested = searchParams.get('tab')
  const active: TabId = isTabId(requested) ? requested : 'profile'

  function selectTab(id: TabId) {
    // replace: tab switching shouldn't fill the back button with every click.
    setSearchParams(id === 'profile' ? {} : { tab: id }, { replace: true })
  }

  if (!current) return null

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {/* ---- Identity header ---- */}
      <header className="surface-card flex items-center gap-4 p-5">
        <Avatar name={current.name} size="md" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold text-ink">{current.name}</h1>
          <p className="truncate text-sm text-ink-muted">{current.email}</p>
          {current.bio && <p className="mt-1 line-clamp-2 text-sm text-ink-subtle">{current.bio}</p>}
        </div>
      </header>

      {/* ---- Tabs ---- */}
      <div role="tablist" aria-label="Profile sections" className="flex gap-1 border-b border-line">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`tab-${id}`}
              aria-selected={isActive}
              aria-controls={`panel-${id}`}
              onClick={() => selectTab(id)}
              className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
                isActive
                  ? 'border-accent text-accent'
                  : 'border-transparent text-ink-muted hover:border-line-strong hover:text-ink'
              }`}
            >
              <Icon size={16} aria-hidden="true" />
              {label}
            </button>
          )
        })}
      </div>

      {/* ---- Panels ----
          ProfileTab is keyed on the account id so switching accounts remounts
          it with the new values instead of syncing via an effect. */}
      <div role="tabpanel" id={`panel-${active}`} aria-labelledby={`tab-${active}`}>
        {active === 'profile' && <ProfileTab key={current.id} />}
        {active === 'settings' && <SettingsTab />}
        {active === 'privacy' && <PrivacyTab />}
      </div>
    </div>
  )
}

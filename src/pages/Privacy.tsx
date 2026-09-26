// PrivacyPolicy — the mock policy document.
//
// A DEMONSTRATION DOCUMENT. Nothing here describes a live service: there is no
// server, no analytics and no email sending. It is written to show the shape a
// real policy would take, and it deliberately describes what the code actually
// does today (localStorage on the visitor's own device), so it isn't quietly
// making claims the app doesn't honour.
//
// The per-account switches that back this up are in Profile → Privacy.
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { SETTINGS_STORAGE_KEY } from '../types/models'

// The last two localStorage keys the auth + theme providers use. Named here so
// the policy names the real keys rather than invented ones. (The theme key,
// "fanhub-theme", is owned by ThemeProvider and isn't referenced directly.)
const ACCOUNT_KEY = 'fanhub-accounts'
const SESSION_KEY = 'fanhub-session'

const SECTIONS = [
  {
    heading: 'What we store',
    body: [
      'This build has no server. Everything you enter is saved in your browser’s localStorage and is never transmitted anywhere.',
      `Your account (name and email) is stored under the "${ACCOUNT_KEY}" key, and the id of the account you are currently signed into under "${SESSION_KEY}".`,
      `Your display preferences — theme, text size, autoplay, motion and privacy choices — are stored together under the "${SETTINGS_STORAGE_KEY}" key.`,
    ],
  },
  {
    heading: 'What we collect',
    body: [
      'Nothing. There is no analytics script, no tracking pixel, no third-party embed and no error-reporting service in this project.',
      'The "Share activity for analytics" switch in your privacy settings therefore has nothing to send yet. It records your preference so the behaviour is already correct if a service is connected later.',
    ],
  },
  {
    heading: 'How your information is used',
    body: [
      'Your name is displayed on anything you post or comment as. Your email address is used only to identify your account on this device, and appears in the account switcher.',
      'Reading activity is used on your own device to power the "For You" and "Based on your recent activity" sections of the homepage. If you turn off personalised recommendations, those sections fall back to general popular picks and stop reading your history.',
    ],
  },
  {
    heading: 'Who can see your profile',
    body: [
      'This is controlled by the "Profile visibility" setting in your privacy options, which offers public, followers-only and private.',
      'Because there is no server, this preference currently describes intended behaviour rather than an enforced access rule. Real enforcement arrives with the account API.',
    ],
  },
  {
    heading: 'Cookies and local storage',
    body: [
      'The project uses localStorage, not cookies. It stores no tracking identifiers, no session tokens and no third-party data.',
      'You can clear everything this app has stored at any time by clearing site data for this origin in your browser settings. Signing out leaves your accounts on the device; clearing site data removes them entirely.',
    ],
  },
  {
    heading: 'Your rights',
    body: [
      'You can edit or delete your stored data at any time. Editing is in Profile; signing out clears the active session; clearing site data for this origin removes every account and preference.',
      'A production deployment would add export and deletion requests, plus a contact address for data-subject requests. Neither is implemented here.',
    ],
  },
  {
    heading: 'Children',
    body: [
      'This is an academic demonstration project and is not directed at children. It collects no personal information from anyone, of any age.',
    ],
  },
  {
    heading: 'Changes to this policy',
    body: [
      'A real policy would carry a version number and a last-updated date, and would ask for consent before changing how data is used. This document is static.',
    ],
  },
]

export default function PrivacyPolicy() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold tracking-[0.25em] text-ink-subtle uppercase">
          Legal
        </p>
        <h1 className="text-3xl font-bold text-ink">Privacy Policy</h1>
        <p className="text-sm text-ink-muted">
          Demonstration document for the Fan Hub Plus coursework build. It describes what this
          project actually does, not a live service.
        </p>
      </header>

      <nav aria-label="Back">
        <Link
          to="/profile?tab=privacy"
          className="inline-flex items-center gap-2 text-sm font-medium text-accent transition hover:gap-3"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Back to your privacy settings
        </Link>
      </nav>

      <div className="space-y-4">
        {SECTIONS.map((section) => (
          <section key={section.heading} className="surface-card p-5">
            <h2 className="text-base font-semibold text-ink">{section.heading}</h2>
            <div className="mt-2 space-y-2">
              {section.body.map((paragraph) => (
                <p key={paragraph} className="text-sm leading-relaxed text-ink-muted">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <footer className="surface-card p-5">
        <h2 className="text-base font-semibold text-ink">Questions</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          This document is part of a student project and has no legal standing. For a real
          deployment this section would name the organisation, a contact address and a data
          protection officer.
        </p>
      </footer>
    </div>
  )
}

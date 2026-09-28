// Demo accounts — the two seeded accounts, used by the offline sign-in
// fallback and to pre-populate the account switcher.
//
// WHY THE ADMIN PASSWORD IS "admin". It is a demo credential for a student
// project, listed in docs/credentials.md and printed on the login page. The
// real enforcement is the Argon2id hash in database/05_reference_data.sql
// checked by AuthService — this file grants no access on its own.
//
// Ada Lovelace is the only administrator. `roleForEmail` exists to keep the
// offline fallback usable, and it is a CLIENT-side approximation, so it is
// deliberately as narrow as possible: exactly one address maps to admin and
// everything else falls through to 'registered'. Widening this list is how a
// second admin would appear to exist.
//
// SECURITY NOTE: this is a mock, and only the fallback path reads it. When the
// API answers — including a rejection — the server's role is what counts, and
// `/api/admin/*` is behind [Authorize(Roles = "admin")]. See the header comment
// in app/providers/AuthProvider.tsx for why a network failure may fall back
// here but a rejection never does.

import type { UserRole } from '../types/models'

export interface DemoAccount {
  name: string
  email: string
  password: string
  role: UserRole
  blurb: string
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    name: 'Ada Lovelace',
    email: 'admin@fanhubplus.com',
    password: 'admin',
    role: 'admin',
    blurb: 'Full control panel: content, users, moderation and statistics.',
  },
  {
    name: 'Grace Hopper',
    email: 'user@fanhubplus.test',
    password: 'user123',
    role: 'registered',
    blurb: 'Dashboard, bookmarks, submissions and feedback — no admin panel.',
  },
]

/**
 * The role for a known demo email, or 'registered' for anything else.
 *
 * The default is the point: an address nobody listed is an ordinary member, and
 * it takes an explicit row above to be an admin.
 */
export function roleForEmail(email: string): UserRole {
  const match = DEMO_ACCOUNTS.find(
    (account) => account.email.toLowerCase() === email.trim().toLowerCase(),
  )
  return match?.role ?? 'registered'
}

// Demo accounts — the three roles from the SRS, used to sign in during a demo.
//
// Why these live here rather than in the database: there is no server yet, and
// AuthProvider keeps accounts in localStorage. Assigning a role from a fixed
// list means the admin panel is demonstrable and the credentials match
// docs/credentials.md, without a sign-up form that could hand itself admin.
//
// SECURITY NOTE: this is a mock. Typing the admin email grants admin, because
// there is no real authentication to check against. Real enforcement arrives
// with the API — the server decides the role, never the client.

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
    email: 'admin@fanhubplus.test',
    password: 'admin123',
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

/** The role for a known demo email, or 'registered' for anything else. */
export function roleForEmail(email: string): UserRole {
  const match = DEMO_ACCOUNTS.find(
    (account) => account.email.toLowerCase() === email.trim().toLowerCase(),
  )
  return match?.role ?? 'registered'
}

/** True when this email belongs to a seeded demo account. */
export function isDemoEmail(email: string): boolean {
  return DEMO_ACCOUNTS.some(
    (account) => account.email.toLowerCase() === email.trim().toLowerCase(),
  )
}

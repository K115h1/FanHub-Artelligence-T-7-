# User Credentials — FanHub Plus

> **Mandatory deliverable.** The project report must list login credentials for
> every user type, with passwords.
>
> These are the **mock** credentials used by the frontend demo. There is no
> server-side authentication yet: `AuthProvider` keeps accounts in this
> browser's localStorage and `lib/demoAccounts.ts` assigns each account its
> role. Passwords are therefore not checked and are listed here for the demo
> script only. Real hashed credentials arrive with the API.

| Role               | Email                   | Password   | Notes                                            |
| ------------------ | ----------------------- | ---------- | ------------------------------------------------ |
| Administrator      | `admin@fanhubplus.test` | `admin123` | Signs in as **Ada Lovelace**. Accesses `/admin`.  |
| Registered User    | `user@fanhubplus.test`  | `user123`  | Signs in as **Grace Hopper**. No admin panel.     |
| Visitor            | _(no account required)_ | —          | Browses public content only.                      |

The login page (`/login`) has one-click buttons for both accounts, so the
credentials do not need typing during a demo.

## How roles are assigned

`lib/demoAccounts.ts` holds a fixed list of known emails. On sign-in,
`roleForEmail()` returns the matching role, or `registered` for any other
address. A visitor cannot self-assign admin through the UI — there is no role
picker on the sign-up path.

**This is a client-side mock and is not a security control.** Typing
`admin@fanhubplus.test` grants admin because there is no server to ask. The
requirement that only admins reach `/admin` is enforced twice over once the API
exists: `RequireAdmin` on the client, and an authorization check on every
`/api/admin/*` endpoint on the server. The client guard is convenience, not
protection.

## Database accounts to seed

These frontend accounts are not database rows. When the API and its seeder land,
`database/02_seed_data.sql` must insert matching users and role assignments:

- a `users` row for the administrator, plus a `user_roles` row linking it to the
  `admin` role from the `roles` table
- a `users` row for the registered user, linked to the `registered` role
- `users.is_verified = 1` for both, so the demo does not stop at a verification
  prompt

Passwords must be stored **hashed** (bcrypt/argon2) — never in plain text. The
hashes belong in the seed file; this file documents them for the report only.

## Reset / verification demo

- Password-reset link flow: to be demonstrated once the email/token feature is
  implemented.
- Email verification: tokenized link documented here when implemented.

## Security note

- `docs/credentials.md` is documentation only. The real password hashes live in
  `database/02_seed_data.sql`.
- The front-end demo accounts above are intentionally obvious. Replace them
  before any deployment that leaves a development machine.

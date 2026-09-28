# User Credentials — FanHub Plus

> **Mandatory deliverable.** The project report must list login credentials for
> every user type, with passwords.

These are real credentials now, not a mock. The API is the authority: it
verifies the password against the Argon2id hash in
`database/05_reference_data.sql` and decides the role from the `user_roles`
table. `docs/credentials.md` documents the plaintext for the report; the
database only ever holds the hash.

| Role            | Email                  | Password  | Notes                                                     |
| --------------- | ---------------------- | --------- | --------------------------------------------------------- |
| Administrator   | `admin@fanhubplus.com` | `admin`   | **Ada Lovelace**. The only admin. Accesses `/admin`.       |
| Registered User | `user@fanhubplus.test` | `user123` | Grace Hopper. No admin panel.                              |
| Visitor         | _(no account required)_ | —         | Browses public content only.                               |

## The administrator

**Ada Lovelace is the only administrator.** `admin@fanhubplus.com` / `admin` is
the single original admin account, and it is the only way into the control
panel.

That is enforced in two places, and both matter:

- `AuthService.RegisterAsync` assigns the hardcoded `DefaultRole` of
  `registered` to every new sign-up. There is no role picker on the sign-up
  path, so a visitor cannot grant themselves admin by registering.
- Every endpoint under `/api/admin/*` carries `[Authorize(Roles = "admin")]`,
  which reads the role claim minted at login from the `user_roles` row. Hiding
  `/admin` in the client is convenience, not protection.

Promotion to admin is a deliberate act: an existing admin does it in
`/admin/users`. The panel warns before demoting the last remaining admin, since
that would lock everyone out of it.

> Grace Hopper was an administrator in earlier revisions of this project and was
> demoted. The current seed grants `admin` to user 1 alone.

## The login page

The login form lists the two demo credentials as text so they can be read off
the screen during a demonstration.

It does **not** offer one-click sign-in buttons. An earlier version had a "Quick
sign-in" panel whose buttons called `signIn()` with a password held in
`lib/demoAccounts.ts`; reaching the admin panel never required knowing a
password. Signing in now goes through exactly the same path for everyone, and
the printed list is documentation rather than a way in.

## How roles are assigned

The server decides, from the database:

- `user_roles` gives Ada the `admin` role and everyone else `registered`.
- `AuthService.PrimaryRole` reads an account's roles and treats `admin` as
  winning over any other, so an account holding both is treated as an admin.
- The token minted at login carries that role, and it is the token the admin
  endpoints check.

`src/lib/demoAccounts.ts` also maps one address to `admin`, but only on the
offline fallback path — the one where the API is unreachable and the app falls
back to device accounts so a demo still works. It grants nothing when the API is
answering. See the header comment in `src/app/providers/AuthProvider.tsx`.

## Security note

- `docs/credentials.md` is documentation only. The real password hashes live in
  `database/05_reference_data.sql` and are never stored in plain text.
- These are intentionally obvious demo credentials for a development machine.
  `admin` is a five-character password, which is below the six-character minimum
  `RegisterAsync` and `ChangePasswordAsync` enforce on user-chosen passwords.
  That is fine for a seeded demo account but must be changed before any
  deployment that leaves a development machine.

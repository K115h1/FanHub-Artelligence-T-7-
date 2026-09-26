# User Credentials — FanHub Plus

> **MANDATORY deliverable.** The project report must list login credentials for every user type, with passwords.
> Fill in the final values once authentication and seed data are built.

| Role               | Email                      | Password | Notes                                  |
| ------------------ | -------------------------- | -------- | -------------------------------------- |
| Administrator      | `admin@fanhubplus.test`    | _TBD_    | Accesses `/admin` control panel        |
| Registered User    | `user@fanhubplus.test`     | _TBD_    | Full dashboard, bookmarks, feedback    |
| Visitor            | _(no account required)_    | —        | Browses public content only            |

## Reset / verification demo

- Password-reset link flow: to be demonstrated once the email/token feature is implemented.
- Email verification: tokenized link documented here when implemented.

## Security note

- Passwords are stored **hashed** (bcrypt/argon2) in the database — never in plain text.
- This file is documentation only; real credentials live in `database/02_seed_data.sql` as hashes.

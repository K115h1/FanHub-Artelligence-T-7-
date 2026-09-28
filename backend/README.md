# Fan Hub Plus — Backend (C# / ASP.NET Core Web API)

The API that serves the catalogue, authentication and moderation. The schema
lives in `../database/` as plain SQL, and the React frontend in `../src/`.

## Layout

```
backend/
├── FanHubPlus.slnx                        # solution
├── src/
│   ├── FanHubPlus.Domain/                 # entities + enums, no framework deps
│   ├── FanHubPlus.Infrastructure/         # DbContext, repositories, MySQL (Pomelo)
│   ├── FanHubPlus.Application/            # services, DTOs, validation
│   └── FanHubPlus.Api/                    # controllers, auth, Program.cs
└── tests/
    ├── FanHubPlus.UnitTests/              # no database needed
    └── FanHubPlus.IntegrationTests/       # needs MySQL, skips without it
```

## Layering

A judging criterion, so it is worth being explicit about:

1. **Api** receives the HTTP request and binds it to a DTO. No logic here.
2. **Application** runs the use-case and validates the input.
3. **Infrastructure** talks to MySQL through EF Core (parameterised SQL).
4. Results come back as DTOs — a database entity never reaches the browser.

```
Controller → IContentService → IContentRepository → MySQL → back up the same route
```

Every repository has an interface named with the `I` prefix, as the project
naming rules require. Interfaces are the seam the SRS asks for, not ceremony
added for its own sake: there is one implementation of each.

## Setup

### 1. Database

Load the SQL files **in this order** — the order matters:

```powershell
cd ..\database
$env:MYSQL_PWD = "..."
$db = "C:/Users/DELL/Desktop/FanHub-Artelligence-T-7-/database"
$mysql = "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe"

& $mysql -u root --default-character-set=utf8mb4 fanhubplus -e "SOURCE $db/01_schema.sql;"
foreach ($f in @('04_movies','04_anime','04_games','04_comics','04_kpop','04_tvshows')) {
    & $mysql -u root --default-character-set=utf8mb4 fanhubplus -e "SOURCE $db/${f}_seed.sql;"
}
& $mysql -u root --default-character-set=utf8mb4 fanhubplus -e "SOURCE $db/05_reference_data.sql;"
& $mysql -u root --default-character-set=utf8mb4 fanhubplus -e "SOURCE $db/06_community_seed.sql;"
& $mysql -u root --default-character-set=utf8mb4 fanhubplus -e "SOURCE $db/07_submission_kind.sql;"
& $mysql -u root --default-character-set=utf8mb4 fanhubplus -e "SOURCE $db/08_supplied_art_seed.sql;"
```

`05_reference_data.sql` goes **after** the `04_*` files because they insert
categories with a plain `INSERT`; loading it first would make those fail on a
duplicate key. It is safe to re-run, because it upserts.

That file seeds the three roles and all eight categories. Without it the
`roles` table is empty and the first registration fails on a foreign key.

`08_supplied_art_seed.sql` also goes after `05`, for the same reason: it looks
categories up by slug to fill in `merchandise_items.category_id` and
`character_profiles.category_id`. It is safe to re-run — every statement is
`INSERT ... SELECT ... WHERE NOT EXISTS`, so a second run adds nothing.

Regenerate it with `node scripts/buildSuppliedArtSeed.mjs` rather than editing it
by hand. It derives every row from the image files actually present in
`public/images/`, so a path in the SQL cannot point at a file that is not there
— the failure `scripts/fixPosterPaths.mjs` exists to repair, after every movie
poster went dead at once. Add or remove artwork on disk, re-run the generator,
reload the file. `--check` reports the counts without writing.

`scripts/importSuppliedArt.mjs` is still what fetches and places the images;
this file is only the step that turns what landed on disk into rows.

**`09_cosplay_pictures_catalog.sql` and `10_merchandise_catalog.sql` are
deliberately not in that list.** They are the raw image manifests the artwork
importer produced from the supplied zips, written in SQLite dialect
(`INTEGER PRIMARY KEY`, `TEXT`, no `ENGINE`/`CHARSET`), so `SOURCE`-ing them
against MySQL will fail. They are kept for provenance only: every image they
list is already bound to `merchandise_items.image_path` and
`character_profiles.image_path` by `08_supplied_art_seed.sql`, and the app
reads only those two tables.

### Use `SOURCE`, never a PowerShell pipe

```powershell
# WRONG - silently corrupts every non-ASCII character
Get-Content 04_tvshows_seed.sql -Raw | & $mysql -u root fanhubplus
```

`Get-Content` without `-Encoding` reads the file as the system codepage, so
`é` (bytes `C3 A9`) reaches MySQL as the two characters `Ã©` and is stored as
bytes `C3 83 C2 A9`. The load appears to succeed. The damage is only visible if
you happen to know the title should carry an accent — which is exactly how
`90 Day Fiancé` and `Re:Zero − Starting Life in Another World` reached the
database mangled.

Letting MySQL read the file with `SOURCE` passes the bytes through untouched.
Verify afterwards:

```powershell
node scripts\testScanMojibake.mjs   # proves the detector can still go red
node scripts\scanMojibake.mjs       # scans all 54 text columns
```

The detector is in `scripts/lib/mojibake.mjs` and the test matters more than
the scan: an earlier version of the scan used a `REGEXP` with `\xC3`, which
MySQL's ICU engine does not read as a byte escape, so it matched nothing and
reported a clean database.

### Re-loading one fandom

The `04_*` files use plain `INSERT` on purpose. InnoDB does not see rows
upserted earlier in the same transaction, so the `content_genres` links would
fail on a foreign key. The pattern is delete-then-load:

```sql
DELETE cg FROM content_genres cg JOIN contents c ON c.content_id = cg.content_id
  WHERE c.category_id = 6;
DELETE FROM contents  WHERE category_id = 6;
DELETE FROM genres    WHERE category_id = 6;
DELETE FROM categories WHERE category_id = 6;
```

then load `04_tvshows_seed.sql` followed by `05_reference_data.sql`.

### 2. Secrets

Nothing sensitive is committed. Set these with user-secrets:

```powershell
cd src\FanHubPlus.Api
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:FanhubPlus" "Server=127.0.0.1;Port=3306;Database=fanhubplus;User=root;Password=YOUR_PASSWORD"
dotnet user-secrets set "Jwt:Key" "a-long-random-string-at-least-32-characters-long"
```

`appsettings.json` holds only non-secret values: issuer, audience, token
lifetime, CORS origins.

### 3. Run

```powershell
dotnet run --project src\FanHubPlus.Api
```

- API: `http://localhost:5068`
- Swagger: `http://localhost:5068/swagger` (Development only)
- Health check: `http://localhost:5068/health`

**The port is 5068, not 5000.** It comes from
`src\FanHubPlus.Api\Properties\launchSettings.json`, and the frontend's
`VITE_API_URL` in `../.env.local` is set to match. If you force a different
port with `--urls`, every request from the browser fails CORS while
`/health` still answers, which looks like a broken database but is only a
port mismatch.

To point the frontend somewhere else, change `VITE_API_URL` *and* the CORS
allow-list, which is a list of full origins including the port:

```powershell
dotnet user-secrets set "Cors:Origins:3" "http://localhost:5180"
```

## Tests

```powershell
dotnet test                                    # 38 unit tests, no database
$env:FANHUBPLUS_TEST_DB = "Server=127.0.0.1;Port=3306;Database=fanhubplus;User=root;Password=..."
dotnet test tests\FanHubPlus.IntegrationTests   # adds 5 database tests
```

The integration tests skip rather than fail when `FANHUBPLUS_TEST_DB` is unset,
so a plain `dotnet test` passes on a machine with no MySQL.

## Endpoints

| Method | Route | Auth | What it does |
|---|---|---|---|
| POST | `/api/auth/register` | — | Create an account, returns a token |
| POST | `/api/auth/login` | — | Sign in, returns a token |
| GET | `/api/auth/me` | user | Current profile |
| PUT | `/api/auth/me` | user | Update name / bio |
| POST | `/api/auth/change-password` | user | Change password |
| POST | `/api/auth/forgot-password` | — | Issues a reset token |
| POST | `/api/auth/reset-password` | — | Redeems a reset token |
| GET | `/api/contents` | — | Browse: search, category, genre, type, sort, paging |
| GET | `/api/contents/{slug}` | — | Detail. `?category=` disambiguates a shared slug |
| GET | `/api/contents/id/{id}` | — | Detail by id |
| GET | `/api/contents/categories` | — | Categories with content counts |
| GET | `/api/contents/genres` | — | Genres, optionally per category |
| POST | `/api/contents/{id}/rating` | user | Rate 1–5 |
| DELETE | `/api/contents/{id}/rating` | user | Clear a rating |
| POST | `/api/contents/{id}/bookmark` | user | Toggle a bookmark |
| GET | `/api/contents/bookmarks` | user | The signed-in user's bookmarks |
| GET | `/api/community/events` | — | Fan events |
| POST | `/api/community/feedback` | optional | Send feedback (public form) |
| GET | `/api/community/merchandise` | — | Merchandise items |
| GET | `/api/community/characters` | — | Character profiles |
| GET | `/api/community/upcoming-releases` | — | Upcoming releases |
| GET | `/api/community/submissions/mine` | user | The caller's own submissions |
| POST | `/api/community/submissions` | user | Submit fan content for review |
| GET | `/api/admin/stats` | admin | Dashboard figures |
| GET | `/api/admin/stats/categories` | admin | Per-category totals |
| GET | `/api/admin/users` | admin | All accounts |
| PUT | `/api/admin/users/{id}/role` | admin | Change a role |
| GET/POST/PUT/DELETE | `/api/admin/contents…` | admin | Catalogue CRUD |
| GET/PUT/DELETE | `/api/admin/feedback…` | admin | Moderation queue |
| GET | `/api/admin/submissions?status=&kind=` | admin | Moderation queue, filterable |
| GET | `/api/admin/submissions/counts` | admin | How many in each status |
| PUT | `/api/admin/submissions/{id}/status` | admin | Approve or reject, with an optional note |

### Fan submissions

A member submits content of one of three kinds. The three are the kinds the SRS
names for user-created content: `article`, `character_profile` and
`event_highlight`. They are stored in `fan_submissions.kind`.

```jsonc
POST /api/community/submissions
{
  "categoryId": 2,
  "kind": "character_profile",   // one of the three above
  "title": "Spike Spiegel",
  "body": "A bounty hunter with a prosthetic arm…"
}
```

Anything else in `kind` is rejected with a 400 rather than defaulted, because
the moderation queue filters on it and a silently-substituted default would
file a character profile in the article queue.

A decision records who made it, when, and optionally why. The note is what the
fan sees next to the outcome on their dashboard:

```jsonc
PUT /api/admin/submissions/5/status
{ "status": "rejected", "note": "Needs a bio and a series to attach it to." }
```

`kind` and `status` go over the wire in the same lowercase snake_case the
columns store — `character_profile`, not `CharacterProfile`. This is
`EnumConverter.ToWireString`, and it is not a style choice: the client's filter
lists are spelled in lowercase, so returning the PascalCase name makes every
count read zero and every status comparison quietly fail. See
`docs/working-notes.md`.

Everything under `/api/admin` carries `[Authorize(Roles = "admin")]`. The
frontend hides the panel from non-admins too, but that is convenience — the
attribute is the check that actually matters.

## Why there are no EF migrations

The schema is version-controlled as SQL (`01_schema.sql` plus the generated
`04_*_seed.sql` files), so it is reviewed, diffed and applied with the same
tools as everything else. EF is only the read/write layer over a database that
already exists; a migration would try to create tables that are already there.

`AppDbContext.OnModelCreating` maps the model onto the existing DDL, including
the composite keys and the per-category uniqueness rules.

## Seeding demo accounts

`05_reference_data.sql` already contains an admin and a registered user, with
hashes the API can verify. To regenerate a hash:

```powershell
dotnet run --project src\FanHubPlus.Api -- --hash-password admin --user "Ada Lovelace"
```

Hashes are salted per user, so generate one per account. The plaintext demo
passwords are listed in `../docs/credentials.md`.

## Notes and limits

- Passwords are hashed with the framework's Argon2id `PasswordHasher`. Plaintext
  is never stored or logged.
- Login returns the same message whether the email is unknown or the password
  is wrong, so the endpoint cannot be used to enumerate accounts.
- A sign-up always gets the `registered` role. `admin` is only assignable by an
  existing admin, so there is no route to self-promote.
- Content slugs are unique per category, not globally: "Akira" legitimately
  exists in both Anime and Comics.
- Metadata (synopsis, poster, release year) is nullable and mostly still empty.
  That is the enrichment pass, not a bug.
- `POST /api/auth/forgot-password` returns the token in the response body so the
  flow can be demonstrated without a mail server. Remove that before deploying.

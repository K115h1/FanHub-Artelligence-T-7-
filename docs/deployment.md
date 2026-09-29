# Deploying to Render

## The deployed stack

| Piece | Where | URL |
|---|---|---|
| Frontend | Vercel | https://fan-hub-artelligence-t-7.vercel.app/ |
| API | Render web service | `https://fanhubplus-api.onrender.com` |
| Database | Render private service, MySQL 8 | internal only, `fanhubplus-db:3306` |

The API hostname is derived from the `name:` of the API service in
`render.yaml`. Rename the service and the Vercel build has to change with it.

## Deploying the API and database

The API deploys to Render as a normal .NET web service. The database **also
deploys to Render, but not as a managed service** — see the caveat below.

In Render: **New → Blueprint**, point at the repository, and Render reads
`render.yaml`. It creates two services:

| Service | Type | Reachable from |
|---|---|---|
| `fanhubplus-db` | MySQL 8, private service, 10 GB disk | other services only |
| `fanhubplus-api` | ASP.NET Core 10 web service | the internet |

**Watch the database logs on first boot.** They should show every file from
`01_schema.sql` through `11_view_counts.sql` importing. If one errors, the
container does not start and the API has nothing to connect to. A fresh
database ends up with 25 tables, 8 categories, 3 roles, 3,383 titles, 12 events
and 2 users with real Argon2 password hashes.

## The one manual step: the frontend's API URL

Vercel does not read `.env.local`, and `.env.production` is git-ignored, so
nothing committed here reaches the deployed frontend. Set it in the Vercel
dashboard:

**Project → Settings → Environment Variables**

| Name | Value |
|---|---|
| `VITE_API_URL` | `https://fanhubplus-api.onrender.com/api` |

Set it for both **Production** and **Preview**, then redeploy. The `/api` suffix
is required — the controllers are routed `api/[controller]`, and without it every
request is a 404.

Vite inlines `VITE_*` at **build** time, so changing this value requires a
rebuild, not just a restart.

## The other manual step: CORS

`render.yaml` already allows the Vercel production origin at
`Cors__Origins__1`. Two things to know about it:

- **No trailing slash.** A CORS origin is scheme + host + port. The browser
  sends the origin it is actually on, which never has one, so
  `https://x.vercel.app/` does not match `https://x.vercel.app` and the request
  is refused while `/health` still answers.
- **Vercel previews get a different origin per deployment.** A preview build
  will be blocked. Copy the origin from the Vercel preview page and add it as
  `Cors__Origins__2`, then the API redeploys.

If requests fail with no console error at all, suspect this before anything
else. It is the single most common cause of "the app deployed but shows no
data".

## The caveat: Render has no managed MySQL

Render's first-party datastores are **Render Postgres** and **Render Key
Value** (Redis). There is no managed MySQL. So MySQL here is a
**self-managed private service**: the official `mysql:8` image, run by you, with
a Render disk attached (`deploy/mysql/Dockerfile`).

What that means in practice:

- **It is private.** No public URL, no `fromService`, so the database is not
  reachable from the internet at all. That part is a genuine win.
- **You operate it.** Nobody patches MySQL for you. Track security releases.
- **It needs a paid plan.** Render disks are not available on the free tier, so
  `fanhubplus-db` is on `starter`. The API is on `free`.
- **Backups are yours.** Render's daily disk snapshots are explicitly *not*
  recommended as a backup strategy by MySQL's own guidance. Use `mysqldump`.

### Why not move to Render Postgres

It is the better-managed option and it would be free-tier eligible, but the
schema is MySQL-shaped in ways that are not mechanical to convert:

- `ENUM` columns throughout, read and written through a custom snake_case
  converter (`Infrastructure/EnumConverter.cs`) that exists specifically because
  MySQL's `ENUM` stores different words from the C# members.
- `utf8mb4_unicode_ci` collation assumptions.
- `ON DUPLICATE KEY UPDATE` in `05_reference_data.sql` and the seeds.
- `AUTO_INCREMENT`, `ENGINE=InnoDB` DDL in 18 files.

That is a large, risky rewrite for a hosting benefit. Keeping MySQL is the
right trade unless the paid tier is a problem — in which case the answer is a
managed MySQL host (Aiven, PlanetScale, DigitalOcean) plus a one-line
connection-string change, not a database port.

## The schema loads itself on first boot

`deploy/mysql/Dockerfile` copies the SQL files into
`/docker-entrypoint-initdb.d/`, which the MySQL image runs **once**, against an
empty volume, in **sorted filename order**.

That ordering is load-bearing, and the numeric prefixes already encode it:

```
01_schema.sql            the tables
02, 03                  comments only
04_*_seed.sql            categories 1-5, genres, titles
05_reference_data.sql    roles + remaining categories   <- must follow every 04_*
06 .. 11                events, migrations, catalogues
```

`05` has to come after the `04_*` files because those insert categories with a
plain `INSERT` and `05` upserts the same rows. Load `05` first and the `04`
files fail on a duplicate key. Sorted order happens to be correct order.

**This only runs on first boot.** Restarting or redeploying does not re-apply
it, because the volume is no longer empty. That is what you want for a database,
but it means a schema change is a new numbered file plus a manual apply.

### Verified

The load path was checked end to end against an empty database, in sorted
order, with every file sourced individually:

```
18 files, 0 failures
25 tables · 8 categories · 3 roles · 3,383 titles · 113 genres · 3,521 links
utf8mb4 intact: "Les Misérables" stored as 14 characters / 15 bytes
```

That check found a real bug. `09_cosplay_pictures_catalog.sql` and
`10_merchandise_catalog.sql` were generated as **SQLite** DDL and could not load
on MySQL at all:

- `INTEGER PRIMARY KEY` is a SQLite rowid alias and auto-increments there. On
  MySQL it is a plain integer, so every row inserts a literal `0`.
- `name TEXT NOT NULL UNIQUE` is rejected outright with **ERROR 1170** — MySQL
  will not index a `TEXT` column without a prefix length.

In a Docker init directory one failure aborts the whole thing, so the database
container would never have started. Both files are now MySQL DDL matching the
house style in `01_schema.sql`.

To re-run the check after adding a SQL file:

```powershell
$env:MYSQL_PWD = "..."
mysql -u root -e "DROP DATABASE IF EXISTS fanhubplus_ci;
                 CREATE DATABASE fanhubplus_ci CHARACTER SET utf8mb4
                 COLLATE utf8mb4_unicode_ci;"
foreach ($f in (Get-ChildItem database\*.sql | Sort-Object Name)) {
    $root = "C:/path/to/repo/database"
    mysql -u root --default-character-set=utf8mb4 fanhubplus_ci -e "SOURCE $root/$($f.Name);"
    if ($LASTEXITCODE -ne 0) { "FAILED: $($f.Name)" }
}
```

Use `SOURCE`, never `Get-Content | mysql`. A PowerShell pipe reads the file as
the system codepage and re-encodes every non-ASCII character; `Les Misérables`
lands in the database as `Les MisÃ©rables`. See `docs/working-notes.md`.

## Secrets

Nothing secret is in this repository. `render.yaml` marks generated values
`generateValue: true`, so Render creates them and shows them once.

| Env var | Where it goes |
|---|---|
| `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD` | generated on the db service |
| `JWT__SigningKey` | generated on the API |
| `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | the API's view of the db |

`JWT__SigningKey` is **not** in the local repository. If it is absent locally the
API falls back to the development signing key, which is fine for `dotnet run` and
must never reach production.

Locally these live in user-secrets, outside the repo:

```powershell
dotnet user-secrets set "ConnectionStrings:FanhubPlus" "Server=127.0.0.1;Database=fanhubplus;User=root;Password=..."
dotnet user-secrets set "Jwt:SigningKey" "..."
```

The API also accepts the discrete `DB_*` variables, which is what Render's
`fromService` hands over one value at a time. See
`Infrastructure/ServiceCollectionExtensions.cs`.

## CORS — the one thing that will bite you

See the CORS section above. The short version: the allow-list is in
`render.yaml`, the Vercel production origin is already there, and a preview
deployment needs its own entry added.

## Two changes made for deployment

**The server version is declared, not detected.** `ServiceCollectionExtensions`
used `ServerVersion.AutoDetect(connectionString)`, which opens a database
connection while the DbContext is being configured. On Render the MySQL
container and the API start independently, so the first request — and the
health check that triggers it — would fail until MySQL finished its first-boot
schema import. It now declares MySQL 8.0, and adds `EnableRetryOnFailure` so an
idle API instance reconnects instead of throwing on the first request after a
lull.

**A Dockerfile, not Render's native .NET runtime.** The project targets
`net10.0` and there is no `global.json` pinning the SDK, so the native runtime
would resolve whatever .NET versions the image ships this month. The Dockerfile
pins `mcr.microsoft.com/dotnet/sdk:10`.

## Health check

`/health` is configured as the Render health check path for both services. The
API's is the only one that matters; MySQL's is a shell-piped `mysqladmin ping`,
which is how the MySQL image is meant to be probed.

## Things to do after the first deploy

1. **Set `VITE_API_URL` in the Vercel dashboard**, then redeploy the frontend.
   Nothing works until you do — the built bundle still points at localhost.
2. **Check the browser console.** A CORS error means the origin list is
   missing an entry.
3. **Take a `mysqldump`.** Disk snapshots are not a backup.
4. **Rotate `MYSQL_PASSWORD`.** It is generated and visible in the dashboard.

## Verifying a deploy

```powershell
curl https://fanhubplus-api.onrender.com/health
curl https://fanhubplus-api.onrender.com/api/contents/categories
```

`/health` returning ok proves the app started and the health check passed. The
second call proves it can reach MySQL and read real data — if the first works
and the second does not, the problem is the database, not the app.

**The free API sleeps after inactivity** and takes roughly 50 seconds to wake.
The first request after a lull will hang for that long. That is the free tier,
not a bug.

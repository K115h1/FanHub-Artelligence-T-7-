# Deploying to Render

## The short version

The API deploys to Render as a normal .NET web service. The database **also
deploys to Render, but not as a managed service** — see the caveat below.

```powershell
git push origin main
```

Then in Render: **New → Blueprint**, point at the repository, and Render reads
`render.yaml`. It creates two services:

| Service | Type | Reachable from |
|---|---|---|
| `fanhubplus-db` | MySQL 8, private service, 10 GB disk | other services only |
| `fanhubplus-api` | ASP.NET Core 10 web service | the internet |

The frontend is a separate static site. It can go on Render too, or anywhere —
it is just a Vite build.

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

The API ships a CORS allow-list of dev-server origins. The deployed frontend's
origin is not on it, so every browser request will be blocked while `/health`
still answers — which looks like a broken database rather than a CORS problem.

Add one entry per deployed frontend origin:

```yaml
- key: Cors__Origins__1
  value: https://fanhubplus.onrender.com
```

CORS origins are **scheme + host + port**. `https://x.onrender.com` and
`https://x.onrender.com/` are different strings, and the trailing slash will not
match.

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

1. **Add the frontend origin to CORS.** See above. Nothing works until you do.
2. **Set `VITE_API_URL`** on the frontend to the API's public URL, and rebuild.
   The value must include the `/api` suffix — the controllers are routed
   `api/[controller]`.
3. **Take a `mysqldump`.** Disk snapshots are not a backup.
4. **Rotate `MYSQL_PASSWORD`.** It is generated and visible in the dashboard.

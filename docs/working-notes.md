# Working notes

Things that are easy to get wrong in this repo, discovered the hard way.

## `tsc --noEmit` checks nothing

The root `tsconfig.json` is `"files": []` with project references. Running

```powershell
tsc --noEmit
```

against it succeeds without reading a single source file. It will report zero
errors no matter what is broken.

Use one of these instead:

```powershell
npm run typecheck        # tsc -p tsconfig.app.json --noEmit
npm run build            # tsc -b && vite build
```

`tsc -b` follows the references and does check. The bare `--noEmit` does not.

## A successful build does not mean the app works

Two real bugs reached production despite a clean typecheck:

- **A circular import** (`mockData` → `events` → `mockData`) compiled fine and
  built fine, then crashed every page at runtime. Fixed by moving `toSlug` into
  its own `lib/slug.ts`. The rule: if two modules import each other, the cycle
  is the bug, regardless of what the compiler says.
- **Wrong relative paths** in a component one directory deeper than expected
  passed `tsc` and failed the bundler.

`npm run build` catches more than `typecheck` does. Neither catches a cycle.

## The API and the frontend must agree on enum spelling

The MySQL `ENUM` columns store snake_case (`music_artist`). EF Core's default
string conversion writes the C# member name verbatim (`MusicArtist`), which then
fails to convert back on read — a 500 on any request that touches a K-Pop title.
`Infrastructure/EnumConverter.cs` maps both directions.

### The same trap, in both directions, fails silently

Two follow-on bugs from the same root, both of which looked like working code:

**Reading.** `Enum.TryParse(value, ignoreCase: true)` handles casing but *not*
the underscore, so `"character_profile"` does not match `CharacterProfile`. A
query filter built on it therefore never matched, and returned the whole table
instead of none — the admin queue's kind filter appeared to do nothing. Use
`EnumConverter.TryParse<T>()`, which bridges the underscore.

**Writing.** `status.ToString()` puts `"Pending"` on the wire, but the client
spells its filter list `'pending'`. Every comparison missed and every count read
zero: the admin queue showed "All statuses (5), Pending (0)". Use
`EnumConverter.ToWireString()`, which emits the same word the column stores.

Neither throws. Both just quietly show the wrong thing, which is why
`EnumConversionTests` pins the round trip.

## The API port is 5068, and the CORS allow-list is per-port

`launchSettings.json` sets `applicationUrl` to `http://localhost:5068`, and
`.env.local` sets `VITE_API_URL` to match. 5000 is a habit, not this app's port.

Forcing another port with `--urls` fails in a misleading way: the API answers
`/health` fine, so it looks healthy, but every browser request is blocked by
CORS, because the allow-list holds full origins *including* the port. The
console shows only `blocked by CORS policy` and the page renders as empty data
rather than an error.

```powershell
dotnet user-secrets set "Cors:Origins:3" "http://localhost:5180"
```

## Route constraints

ASP.NET Core has no built-in `uint` constraint. Using `{id:uint}` fails the whole
route table build, so *every* endpoint returns 500 — including `/health`, which
makes it look like a database problem rather than a routing one. Use `:int`.

## PowerShell mangles non-ASCII when piping to a program

`$OutputEncoding` defaults to Windows-1252, so piping a UTF-8 file into
`mysql.exe` turns `é` into `?`. Always set this first:

```powershell
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
```

Verified by checking `Les Misérables` is 14 characters / 15 bytes with a `C3A9`.

### Setting `$OutputEncoding` was not enough

It fixes the *output* side only. The read is the problem:

```powershell
# WRONG - still corrupts, even with $OutputEncoding set above
Get-Content 04_tvshows_seed.sql -Raw | & $mysql -u root fanhubplus
```

`Get-Content` without `-Encoding` decodes the file as the system codepage
first, so `é` (bytes `C3 A9`) becomes the two characters `Ã©` before the pipe
even starts. MySQL then stores bytes `C3 83 C2 A9` — valid UTF-8, wrong
value. The load reports success.

Do not pipe. Let MySQL read the file:

```powershell
& $mysql -u root --default-character-set=utf8mb4 fanhubplus -e "SOURCE C:/.../04_tvshows_seed.sql;"
```

### The same trap applies to editing a file

`Get-Content -Raw` then `Set-Content -Encoding UTF8` re-encodes every
non-ASCII character and adds a BOM. It hit `04_tvshows_seed.sql` and left
`90 Day FiancÃ©` in a file that is supposed to be generated. The fix belongs in
the generator — `scripts/lib/catalogParse.mjs` had the wrong `categorySlug`, and
re-running `scripts/importCatalog.mjs` produced a clean file. Patching the
generated output by hand is what created the mess in the first place.

Node's `readFileSync`/`writeFileSync` are always UTF-8 and are the right tool
for this. `scripts/findNonAscii.mjs` reports code points, and
`scripts/hexpeek.mjs` shows raw bytes, so a character can be identified rather
than guessed at.

## A check that cannot fail is worse than no check

`scripts/scanMojibake.mjs` reported a clean database while matching nothing,
because the `REGEXP` used `[\xC3][\x80-\xBF]` and MySQL 8's ICU engine does not
read `\xC3` as a byte escape. Every "0 rows affected" it printed was an
artefact of a broken pattern, not a clean database.

Two rules follow:

- **Put the logic where the semantics are unambiguous.** The detector is a
  byte-pattern question, so it runs in Node
  (`scripts/lib/mojibake.mjs`), not in SQL.
- **Prove the check can go red before trusting a green result.**
  `scripts/testScanMojibake.mjs` plants a known-bad row, confirms it is caught,
  and removes it. It also asserts that real titles in this database are *not*
  flagged, since a detector that flags everything is as useless as one that
  flags nothing.

## `categorySlug` may differ from `fandomKey`

`scripts/lib/catalogParse.mjs` keeps the database slug separate from the key
used for the poster manifest and the image folder:

```js
games:    { categorySlug: "gaming",  ... }   // manifest key "games"
kpop:     { categorySlug: "k-pop",   ... }   // manifest key "kpop"
tvshows:  { categorySlug: "tv-shows", ... }  // manifest key "tvshows"
```

`tvshows` was shipped as `categorySlug: "tvshows"` while the frontend, the nav
and `05_reference_data.sql` all used `tv-shows`, so the seeded category could
never be reached. The posters live in `public/images/tvshows/`, which is why
the two words have to differ.

## Poster paths and filenames must be generated together

Two runs used different conventions: the database got TMDB's own hash
(`/images/movies/zhG3vKWyDRaZ....jpg`) while the files on disk were saved by slug
(`12-angry-men.jpg`). All 513 paths were dead links.

`scripts/fixPosterPaths.mjs` reconciles them and reports coverage per fandom. Run
it with no flag to see the damage first, `--apply` to write.

## Schema load order

`01_schema.sql` → `04_*_seed.sql` → `05_reference_data.sql` → `06_community_seed.sql`
→ `07_submission_kind.sql` → `08_supplied_art_seed.sql`

`05` must come **after** the `04_*` files: those plain-INSERT categories 1-5, so
loading `05` first makes all five fail on a duplicate key. `05` seeds the
`roles` table, which is empty otherwise — and registration inserts a row that
foreign-keys onto it, so a database without `05` cannot accept a sign-up.

`08` needs `05` for the same reason: it resolves `category_id` by slug for the
merchandise and character rows. It is written by
`scripts/buildSuppliedArtSeed.mjs` and is idempotent, so regenerate rather than
hand-editing.

That script reads the image files in `public/images/` and writes one row per
file, rather than carrying its own copy of the filenames. That is deliberate:
paths and filenames were once generated in two separate runs, the database took
one convention and the disk the other, and all 513 movie posters became dead
links. Deriving the SQL from the directory listing makes that divergence
impossible to express.

`09_cosplay_pictures_catalog.sql` and `10_merchandise_catalog.sql` are **not**
part of the load order. They are SQLite-dialect image manifests kept for
provenance; `SOURCE`-ing them into MySQL fails, and the app has no use for them
because `08` already binds every one of those images to `merchandise_items` and
`character_profiles`.

## `Include` everything a DTO reads, or the field serialises empty

`ContentSummaryDto` reads `c.Category.Slug` for the card badge. `BrowseAsync`
included `ContentGenres` but not `Category`, so EF left the navigation null, the
DTO emitted `CategorySlug = ""`, and every card on every browse-driven list
rendered an empty category pill. No error, no 500 — just a blank.

The rule: if a DTO touches a navigation property, the query must `Include` it.
`AsNoTracking` does not prevent the lazy load from being *possible*; it just
means the property is null unless you asked for it.

## `setSearchParams` replaces, it does not merge

`setSearchParams({ q: next })` in the header search discarded every other query
param, so `/explore?category=anime` lost its category on the first keystroke and
silently fell back to the whole catalogue. Build a `new URLSearchParams(existing)`,
mutate it, pass that. Same trap in the category page's own filter controls.

## `tsconfig.app.json` has `noUnusedLocals`

An import left behind after a refactor fails the build. Worth grepping for the
icon you just stopped using rather than silencing it.

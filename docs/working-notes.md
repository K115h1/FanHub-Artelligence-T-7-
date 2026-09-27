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

## Route constraints

ASP.NET Core has no built-in `uint` constraint. Using `{id:uint}` fails the whole
route table build, so *every* endpoint returns 500 — including `/health`, which
makes it look like a database problem rather than a routing one. Use `:int`.

## PowerShell mangles non-ASCII when piping to a program

`$OutputEncoding` defaults to Windows-1252, so piping a UTF-8 file into `mysql.exe`
turns `é` into `?`. Always set this first:

```powershell
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
```

Verified by checking `Les Misérables` is 14 characters / 15 bytes with a `C3A9`.

## Poster paths and filenames must be generated together

Two runs used different conventions: the database got TMDB's own hash
(`/images/movies/zhG3vKWyDRaZ....jpg`) while the files on disk were saved by slug
(`12-angry-men.jpg`). All 513 paths were dead links.

`scripts/fixPosterPaths.mjs` reconciles them and reports coverage per fandom. Run
it with no flag to see the damage first, `--apply` to write.

## Schema load order

`01_schema.sql` → `04_*_seed.sql` → `05_reference_data.sql` → `06_community_seed.sql`

`05` must come **after** the `04_*` files: those plain-INSERT categories 1-5, so
loading `05` first makes all five fail on a duplicate key. `05` seeds the
`roles` table, which is empty otherwise — and registration inserts a row that
foreign-keys onto it, so a database without `05` cannot accept a sign-up.

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

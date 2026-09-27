# ATTRIBUTION — AI Tool Usage Disclosure

Competition rule: AI may assist the process, but must not replace the team's own design and implementation. All AI tools used must be acknowledged here.

## Tools Used

| Tool                          | Where it was used                                                                                          | Human review/verification                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| OpenCode (MiMo agent)          | Project scaffolding, folder structure, README.md, summary.md, config files                                  | Team edited and reviewed                                                                       |
| OpenCode (MiMo agent)          | First-draft implementation of core components/pages/context (e.g. AuthContext, AdminLayout, Login, routing guards) | AI generated the initial working code, team then modified logic, styling, and behavior |
| OpenCode (Space Bunny agent)   | Helped with layout inconsistencies and debugging                                                             | Team reviewed every file                                                                        |
| OpenCode (MiMo agent)          | Added descriptive comments to updated sections for teammates to understand the updates pulled from the repo  | Team reviewed every file                                                                        |
| OpenCode (MiMo agent)          | Removed unnecessary comments at the end of production                                                        | Team reviewed every file, removed ones missed, and added more where necessary                  |
| —                              | Remaining files are placeholder stubs, not yet implemented                                                   | For now, still `export {}` files                                                                |

## Image assets — provenance disclosure

Separate from AI tooling, and disclosed here because it is the same kind of
question: where did this content come from?

The 2,696 posters in `public/images/` were **not** sourced from a licensed
provider. They were collected by scraping image-search results, delivered as two
archives, and reconciled to the catalogue by `scripts/importImages.mjs`. The
scraper's own audit trail (`query_used`, `matched_title`, `score`) is committed
in `data/provenance/`.

Film, comic and album artwork remains copyrighted by its owners. The team
judged that a demonstrable, fully-populated catalogue mattered more than
avoiding the files for a competition submission, and that the provenance is
better disclosed than hidden. These images are **not redistributable**, and any
release beyond jury review should replace them via the licensed path
(`importCatalog.mjs` already merges TMDB `external_id` and `release_year`).

Full detail, including every reconciliation step and the three images
deliberately left unattached: **[docs/poster-assets.md](./docs/poster-assets.md)**.

## Examples of acceptable AI assistance

- Generating syntax examples or boilerplate snippets
- Explaining errors, debugging suggestions
- Reviewing code for security or performance issues
- Drafting diagrams or documentation outlines

## Examples of unacceptable use (to be avoided)

- Submitting fully AI-generated documentation or code without meaningful modification
- Using ready-made AI website templates as the core of the submission

**Rule of thumb:** AI is our assistant, not our developer. The team must be able to explain and defend every design decision and every line of submitted code before the jury.

_Created: 25/09/26_

_Last updated: 27/09/26_
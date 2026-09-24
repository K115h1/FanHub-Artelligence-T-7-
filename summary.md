# Project Summary — Fan Hub Plus (Artelligence, TechWiz 7)

This document is your reference map: what the project is, which decisions have been made, what every path is for, and what happens next.

---

## 1. What We Are Building

**Fan Hub Plus** is an end-to-end web application — a unified "Fandom Universe" portal serving eight communities: **Anime, Gaming, Movies, TV Shows, K-Pop, Comics, Manga, and Cosplay**.

Three user roles:

| Role             | Capabilities                                                                 |
| ---------------- | ---------------------------------------------------------------------------- |
| **Visitor**      | Browse limited content, view the chatbot FAQs                                |
| **Registered**   | Full browsing, search/filter/sort, dashboard, bookmarks, notes, ratings, feedback, event discovery |
| **Administrator**| Everything above plus full content management, moderation, and usage statistics |

### Mandatory feature set (from the SRS)

1. **Authentication** — registration, login, secure sessions, forgot/reset password with tokenized links, email verification, editable profiles with favorite fandoms, optional avatar upload.
2. **Personalized dashboard** — greeting, recent activity, favorite fandoms, bookmarked items.
3. **Content explorer** — curated content across all 8 categories with multi-level filtering (category, genre, release year, popularity, content type) and sorting (latest, most popular, alphabetical).
4. **Interactive multimedia center** — embedded video/audio/trailers, admin-controlled tagging, 5-star / thumbs-up-down ratings.
5. **Character profiles & featured articles** — card-based profiles, rich-text articles, timeline-style event highlights, user fan-content submissions requiring admin approval.
6. **Merchandise showcase & resource library** — image galleries grouped by fandom, upcoming-releases list, backend-driven tags (`Limited Edition`, `Pre-Order`, `Collectible`), view-count tracking.
7. **Feedback system** — categorized feedback forms (bug / suggestion / query).
8. **Bookmarking, notes, and sharing** — bookmark articles, profiles, videos, merchandise; attach personal notes.
9. **Location-aware events** — map/GPS discovery of nearby conventions and meetups, calendar filtered by city with ticket links.
10. **Admin control panel** — add/edit/remove content, media, profiles, articles, feedback, fan submissions; view usage statistics.
11. **Accessibility & UI** — dark-mode toggle, font-size adjustment, breadcrumbs, smooth transitions, loading spinners.

**Optional (deferred):** AI-powered chatbot with FAQ answers, recommendations, guided flows, and stored chat history.

---

## 2. Decisions Already Made

| Decision            | Choice                                     | Rationale                                                          |
| ------------------- | ------------------------------------------ | ------------------------------------------------------------------ |
| Frontend location   | **Repo root** (not a `client/` subfolder)  | Less churn; the Vite app already lives here                        |
| Backend             | **C# / ASP.NET Core Web API**              | SRS-approved stack; layered architecture scores with the judges    |
| Database            | **MySQL**                                  | Works with EF Core via the Pomelo provider; easy hosting           |
| Frontend state      | **Plain Context + fetch hooks**            | Zero extra dependencies; explicit, easy to defend at the jury Q&A   |
| AI chatbot          | **Deferred** until mandatory features done | SRS marks it optional; structure is already reserved for it        |
| Repo layout         | `src/` + `backend/` + `database/` + `docs/` | Clean separation of UI, business logic, and data layers           |

---

## 3. Path-by-Path Explanation

### Root files

| Path                | What it is                                                                                                     |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| `src/`              | The entire React + TypeScript frontend. Vite serves it in development and bundles it for production.            |
| `public/`           | Files served as-is (favicon, icons). No processing, no imports.                                                 |
| `backend/`          | The C# solution: API, business logic, data access, and tests.                                                   |
| `database/`         | Plain `.sql` scripts — schema, seed data, test data. Submit these as-is; also loadable on any MySQL server.      |
| `docs/`             | Everything a human reads: diagrams, report material, credentials.                                               |
| `README.md`         | The front door: overview, stack, layout, setup commands, deliverables checklist.                                |
| `summary.md`        | This file — decisions, feature list, and the meaning of every path.                                             |
| `ATTRIBUTION.md`    | Mandatory disclosure of every AI tool used (competition ethics rule).                                           |
| `.env.example`      | Template of frontend environment variables. Real `.env` files are git-ignored so secrets never leak.            |
| `.gitignore`        | Keeps `node_modules`, `dist`, `.env`, .NET `bin/obj`, and `appsettings.Development.json` out of git.            |
| `index.html`        | The single HTML page Vite boots. Will be cleaned of leftover template markup during the build.                  |
| `package.json`      | Frontend dependencies, pinned versions, and scripts (`dev`, `build`, `lint`, `format`).                         |
| `vite.config.ts`    | Vite + React + Tailwind plugin wiring.                                                                          |
| `tsconfig*.json`    | TypeScript configuration. `@/*` path alias maps to the `src/` root for clean imports.                           |
| `.oxlintrc.json`    | Linter configuration — the rubric requires automated linting with zero warnings.                                |

### `src/` — frontend internals

| Path               | Layer        | What goes there                                                                                       |
| ------------------ | ------------ | ----------------------------------------------------------------------------------------------------- |
| `src/main.tsx`     | Entry        | Mounts the React app into the DOM.                                                                     |
| `src/App.tsx`      | Composition  | Wraps the app in ThemeProvider → AuthProvider → Router. (Currently still Vite demo code — to be replaced.) |
| `src/index.css`    | Styling      | Tailwind import plus design tokens (colors, fonts) that power dark mode and font scaling.              |
| `src/app/`         | Wiring       | `providers/` (ThemeProvider, AuthProvider, ToasterProvider) and `router.tsx` (the route table).        |
| `src/routes/`      | Guards       | `RequireAuth` and `RequireAdmin` — redirect visitors away from protected pages.                        |
| `src/pages/`       | **UI layer** | One file per URL. `pages/auth/` holds login/register/reset; `pages/admin/` holds the admin panel.      |
| `src/components/`  | **UI layer** | Reusable, stateless pieces. `ui/` = primitives (Button, Card, Dialog), `layout/` = Header/Footer/Breadcrumbs, `common/` = Spinner/EmptyState/RatingStars/SearchBar, `charts/` = admin stats visuals. |
| `src/features/`    | **Business** | One folder per domain (`auth`, `explorer`, `bookmarks`, `events`, `admin`, …) each containing its custom hooks — the only place components get data. |
| `src/services/`    | **Data**     | Every network call in the app. One service per domain (`content.service.ts`, …) plus a shared `http.ts` fetch wrapper that handles errors and sessions. |
| `src/types/`       | **Data**     | `models.ts` (User, Category, Content, CharacterProfile, MerchandiseItem, Bookmark, Feedback, FanEvent…), `api.ts` (ApiResponse, Paginated, ApiError), `enums.ts` (UserRole, ContentType, FeedbackType, SortOption). These mirror the SQL tables 1:1. |
| `src/hooks/`       | Business     | Generic, domain-free hooks: `useDebounce`, `useLocalStorage`, `useMediaQuery`, `useGeolocation`.        |
| `src/lib/`         | Business     | `cn()` class-name utility, date/number formatters, validators, and constants (`CATEGORIES`, `SORT_OPTIONS`). |
| `src/context/`     | Business     | `AuthContext` (current user, login/logout, session) and `ThemeContext` (dark mode + font-size preference). |
| `src/assets/`      | Media        | Images, sounds, fonts imported into the bundle.                                                        |

### `backend/` — C# internals

| Path                                   | What goes there                                                                                     |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `backend/FanHubPlus.sln`               | The Visual Studio / `dotnet` solution tying all projects together.                                   |
| `backend/src/FanHubPlus.Api/`          | **Presentation layer.** Controllers, middleware (auth, error handling), `Program.cs`, `appsettings.json`. No business logic here. |
| `backend/src/FanHubPlus.Application/`  | **Business layer.** Services implementing use-cases (register user, bookmark content, submit feedback), DTOs passed over the wire, input validators. |
| `backend/src/FanHubPlus.Domain/`       | **Domain layer.** Plain entity classes and enums matching the database — no framework dependencies.  |
| `backend/src/FanHubPlus.Infrastructure/`| **Data layer.** EF Core `DbContext`, repository implementations, MySQL (Pomelo) configuration, migrations. |
| `backend/tests/FanHubPlus.UnitTests/`  | Fast tests for business logic in isolation.                                                           |
| `backend/tests/FanHubPlus.IntegrationTests/` | End-to-end tests hitting the API and database together.                                          |

Request flow: **Controller → Application service → Repository (Infrastructure) → MySQL → back up the same route**, with DTOs preventing database entities from leaking to the browser.

### `database/` — SQL scripts

| File                | What goes there                                                                                   |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| `01_schema.sql`     | `CREATE TABLE` statements with primary keys, foreign keys, and indexes for every entity.           |
| `02_seed_data.sql`  | The 8 categories, sample content for each, plus admin/regular-user accounts for demo login.        |
| `03_test_data.sql`  | Extra records used to demonstrate filtering, sorting, pagination, and empty-state handling.        |

### `docs/` — deliverables

| Path                     | What goes there                                                                                            |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `docs/diagrams/`         | ERD, Data Flow Diagrams, flowcharts, sitemap, architecture diagram (required in the report).                |
| `docs/report/`           | Problem definition, design specifications, database design write-up, test-data description, assumptions.    |
| `docs/credentials.md`    | **Mandatory:** login credentials for Visitor, Registered User, and Admin roles with passwords.              |

---

## 4. Engineering Standards We Must Follow

These come directly from the TechWiz judging rubric:

**Conventions (TypeScript / .NET)**
- Types, interfaces, classes: `PascalCase` (`UserProfile`, `ContentPayload`) — no `I` prefix in TypeScript.
- Functions, variables, properties: `camelCase` (`getUserData`, `isLoggedIn`).
- Constants: `UPPER_SNAKE_CASE` (`MAX_RETRY_LIMIT`); enums: `PascalCase` (`UserRole.Admin`).
- .NET interfaces use the `I` prefix (`IContentRepository`); .NET methods are `PascalCase` (`CalculateTotal`).

**Security**
- Secrets only in `.env` / environment variables / user-secrets — never in source.
- Parameterized queries only (EF Core handles this automatically).
- Sanitize user-provided rich text before rendering; never inject raw HTML.

**Quality**
- Automated linting (`oxlint`) with zero warnings; add Prettier for formatting.
- No unused dependencies, no dead code, no leftover template files.
- Graceful error states for empty lists, invalid input, and failed network calls.
- Avoid N+1 database queries (use `Include()`/projections) and O(n²) frontend loops.
- Regular, structured git commits from every team member (git repo not yet initialized).

---

## 5. Build Order (next steps, when we start building together)

1. **Repo hygiene** — `git init`, clean `index.html`, delete Vite demo code, fix `package.json`, add Prettier, real `.env.example`.
2. **Database** — write `01_schema.sql` + seed data with the 8 categories and 3 test accounts.
3. **Backend core** — solution scaffold, `DbContext`, auth endpoints (register/login/session, password reset, email verification, profile + avatar).
4. **Frontend shell** — router, layout with breadcrumbs, dark mode + font scaling, auth pages, route guards.
5. **Feature verticals** — one at a time (endpoint → service → hook → page): Dashboard → Explorer → Content Detail + ratings → Characters → Articles + submissions → Merchandise → Bookmarks/Notes → Feedback → Events/GPS.
6. **Admin panel** — content CRUD, moderation queues, usage statistics.
7. **Quality pass** — lint clean, error states, tests, fresh-clone build check.
8. **Deliverables** — sitemap on Home, diagrams, report, credentials, video, hosting.
9. **Optional** — chatbot (rule-based first).

---

## 6. Key Contacts Between Documents

- **SRS source:** `Fan Hub Plus End-to-End Web Solutions_SRS.pdf` — defines scope and mandatory features.
- **Rubric source:** `Code-Create-Compete.pdf` — defines how the project is judged (quality, security, documentation, AI ethics).
- **AI usage log:** `ATTRIBUTION.md` — keep it updated every time an AI tool contributes.

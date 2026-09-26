# FanHub Plus — Artelligence (TechWiz 7)

**Category:** End-to-End Web Solutions (Full-Stack)
**Theme:** Fandom Universe — a single, visually rich hub for Anime, Gaming, Movies, TV Shows, K-Pop, Comics, Manga, and Cosplay fans.

> **Status:** 🏗️ **Scaffolding phase.** All folder paths and placeholder files are in place. The application itself has **not been built yet** — implementation comes next, phase by phase.

---

## Tech Stack (decided)

| Layer      | Technology                                                        |
| ---------- | ----------------------------------------------------------------- |
| Frontend   | React 19 + TypeScript, Vite, Tailwind CSS v4 (repo root `src/`)   |
| Backend    | C# with ASP.NET Core Web API (`backend/`)                         |
| Database   | MySQL, via EF Core + Pomelo provider (`database/` SQL scripts)    |
| State      | Plain React Context + custom fetch hooks (no Redux, no React Query) |
| Chatbot    | Optional AI/rule-based assistant — **deferred until all mandatory requirements are complete** |

---

## Repository Layout

```
Artelligence_Techwiz/
├── src/                  # React + TypeScript frontend (the Vite app lives at the root)
├── public/               # Static assets served by Vite
├── backend/              # C# / ASP.NET Core Web API solution
├── database/             # MySQL schema, seed data, and test data (.sql scripts)
├── docs/                 # Diagrams, project report material, credentials
├── README.md             # This file — project overview and setup
├── summary.md            # Detailed project summary + explanation of every path
├── ATTRIBUTION.md        # Disclosure of all AI tools used (competition requirement)
├── .env.example          # Template for frontend environment variables
├── .gitignore            # Ignores secrets, build output, dependencies
├── index.html            # Vite entry HTML
├── package.json          # Frontend dependencies and scripts
└── vite.config.ts        # Vite + Tailwind + React configuration
```

See **[summary.md](./summary.md)** for a path-by-path explanation of the entire project structure.

---

## Frontend structure (`src/`)

```
src/
├── app/         # App wiring: providers and the router
├── routes/      # Route guards (RequireAuth, RequireAdmin)
├── pages/       # One file per route (Home, Login, Dashboard, Explorer, admin/…)
├── components/  # Reusable UI — ui/ primitives, layout/, common/, charts/
├── features/    # Business logic per domain (auth, explorer, bookmarks, …)
├── services/    # Data layer — every network request lives here
├── types/       # Shared TypeScript models, enums, and API contracts
├── hooks/       # Generic hooks (useDebounce, useMediaQuery, …)
├── lib/         # Utilities: cn(), formatters, validators, constants
├── context/     # AuthContext (session) and ThemeContext (dark mode + font size)
└── assets/      # Images, icons, media files
```

**Layering rule (a judging criterion):** `pages` + `components` handle **UI**, `features` + `context` + `hooks` handle **business logic**, `services` + `types` handle **data**. Data flows upward only — services never import from pages.

---

## Backend structure (`backend/`)

```
backend/
├── src/
│   ├── FanHubPlus.Api/             # Controllers, middleware, Program.cs
│   ├── FanHubPlus.Application/     # Business logic, DTOs, validators
│   ├── FanHubPlus.Domain/          # Entities and enums
│   └── FanHubPlus.Infrastructure/  # EF Core DbContext, repositories, MySQL
└── tests/
    ├── FanHubPlus.UnitTests/
    └── FanHubPlus.IntegrationTests/
```

**Naming conventions (.NET):** classes/interfaces/methods `PascalCase`; interfaces prefixed with `I` (e.g. `IContentRepository`); parameters and locals `camelCase`; constants `PascalCase` or `ALL_CAPS`.

**Security rules:**
- Connection strings and API keys come from **environment variables / .NET user-secrets** — never committed to source.
- All SQL goes through EF Core or **parameterized queries** — never string concatenation (SQL-injection defense).
- Rich text is sanitized before rendering (XSS defense).

---

## Database (`database/`)

| File                 | Purpose                                             |
| -------------------- | --------------------------------------------------- |
| `01_schema.sql`      | All tables, primary keys, foreign keys, indexes     |
| `02_seed_data.sql`   | The 8 fandom categories, demo content, test accounts |
| `03_test_data.sql`   | Extra test data used for demonstrating features     |

Core entities: `User`, `Role`, `Category`, `Content`, `CharacterProfile`, `MerchandiseItem`, `Bookmark`, `Feedback`, `FanEvent`, `FanSubmission`, `ChatbotQuery`, `ActivityLog`.

---

## Getting Started (to be written during the build phase)

```bash
# Frontend
npm install
npm run dev

# Backend (from backend/)
dotnet restore
dotnet run --project src/FanHubPlus.Api

# Database
mysql -u root -p < database/01_schema.sql
mysql -u root -p < database/02_seed_data.sql
```

> These commands will become fully accurate once the build phase begins. Installation instructions are a **mandatory submission deliverable** and will be finalized then.

---

## Competition Deliverables Checklist

- [x] Project structure and folder paths
- [x] `README.md` with overview and setup area
- [x] `ATTRIBUTION.md` (AI tools disclosure)
- [ ] Full source code (frontend + backend)
- [ ] `.sql` schema scripts
- [ ] Installation instructions (final)
- [ ] User credentials for all roles — `docs/credentials.md`
- [ ] Diagrams (ERD, DFD, flowcharts, sitemap) — `docs/diagrams/`
- [ ] Project report — `docs/report/`
- [ ] Sitemap on the home page
- [ ] Demo video (`.mp4`)
- [ ] Hosted URL
"# FandomHub-Artelligence-T-7-" 
"# FandomHub-Artelligence-T-7-" 
"# FandomHub-Artelligence-T-7-" 
"# FandomHub-Artelligence-T-7-" 
"# FandomHub-Artelligence-T-7-" 

# Fan Hub Plus — Backend (C# / ASP.NET Core Web API)

> **STATUS:** Scaffold only. The solution has not been created yet — directories below mark where each project will live.

## Layout

```
backend/
├── FanHubPlus.sln                     # solution file (created with `dotnet new sln`)
├── src/
│   ├── FanHubPlus.Api/                # Presentation: controllers, middleware, Program.cs
│   ├── FanHubPlus.Application/        # Business logic: services, DTOs, validators
│   ├── FanHubPlus.Domain/             # Entities and enums (no framework dependencies)
│   └── FanHubPlus.Infrastructure/     # Data: EF Core DbContext, repositories, MySQL
└── tests/
    ├── FanHubPlus.UnitTests/          # xUnit tests for business logic
    └── FanHubPlus.IntegrationTests/   # API + database end-to-end tests
```

## Layering (a judging criterion: clean separation of UI / business / data)

1. **Api** receives an HTTP request → binds to a DTO.
2. **Application** service performs the use-case and validation.
3. **Infrastructure** repository talks to MySQL via EF Core (parameterized SQL automatically).
4. Results travel back as DTOs — database entities never reach the browser.

## Planned controllers

`AuthController`, `ProfileController`, `CategoryController`, `ContentController`,
`CharacterController`, `MerchandiseController`, `BookmarkController`,
`FeedbackController`, `EventController`, `SubmissionController`, `AdminController`
(+ `ChatbotController` — deferred).

## Stack notes

- **MySQL** via `Pomelo.EntityFrameworkCore.MySql`.
- Connection string read from **environment variable / .NET user-secrets** — never committed.
- Auth: session or JWT with password hashing (never store plain-text passwords).
- Global exception middleware → consistent `{ statusCode, message }` error responses.
- CORS configured to allow the Vite dev server (`http://localhost:5173`).

## Naming conventions (rubric)

| Element            | Convention              | Example                  |
| ------------------ | ----------------------- | ------------------------ |
| Classes            | PascalCase              | `UserProcessor`          |
| Interfaces         | I-prefix + PascalCase   | `IContentRepository`     |
| Methods            | PascalCase              | `GetCustomer()`          |
| Parameters/locals  | camelCase               | `orderId`, `totalAmount` |
| Constants          | PascalCase / ALL_CAPS   | `MaxRetryCount`          |

## Commands (once created)

```bash
dotnet new sln -n FanHubPlus
dotnet new webapi -n FanHubPlus.Api -o src/FanHubPlus.Api
dotnet new classlib -n FanHubPlus.Domain -o src/FanHubPlus.Domain
dotnet new classlib -n FanHubPlus.Application -o src/FanHubPlus.Application
dotnet new classlib -n FanHubPlus.Infrastructure -o src/FanHubPlus.Infrastructure
dotnet new xunit -n FanHubPlus.UnitTests -o tests/FanHubPlus.UnitTests
dotnet new xunit -n FanHubPlus.IntegrationTests -o tests/FanHubPlus.IntegrationTests
```

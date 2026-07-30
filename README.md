# Gear List

Gear List is a mobile-first application for planning and prioritizing airsoft gear
purchases. The repository currently contains the complete Stage 9 MVP:
a responsive React frontend, a .NET 10 API, PostgreSQL persistence, first-party
JWT authentication with rotating refresh tokens, private gear-list and
gear-item CRUD, dashboard summaries, purchase history, transactional
reordering, installable PWA assets, user-scoped offline reads, and tested
quality and accessibility safeguards.

The visual shell adapts the supplied Boreal Design System into a practical
gear-planning interface: cold navy surfaces, glacier-blue focus states,
restrained ember accents, glass panels, generous spacing, and technical mono
labels.

## Architecture

The frontend uses feature-based organization. The backend is a pragmatic
modular monolith in one deployable project.

```text
.
├── frontend/
│   └── src/
│       ├── app/              composition and providers
│       ├── features/         product capabilities
│       ├── pwa/              connectivity, offline storage, and service worker UI
│       ├── shared/           feature-agnostic UI and types
│       ├── test/             shared test setup
│       ├── index.css
│       └── main.tsx
├── backend/
│   ├── Common/               small cross-cutting concepts
│   ├── Domain/               entities and enums
│   ├── Features/             vertical use cases and endpoints
│   ├── Infrastructure/       technical implementations
│   ├── Middleware/           HTTP pipeline behavior
│   ├── Persistence/          EF Core configuration and migrations
│   └── Program.cs            composition root
├── backend-tests/            tests organized by backend boundary
├── docs/
│   └── architecture.md       implemented architecture and decisions
├── Boreal Design System/     visual reference supplied with the project
├── LoadoutQueue.slnx
├── docker-compose.yml
└── .env.example
```

Read [docs/architecture.md](docs/architecture.md) for dependency rules,
request and authentication flows, current offline status, rejected patterns,
and future extraction criteria.

Generated folders such as `node_modules`, `dist`, `bin`, and `obj` are ignored.
Folders are added only when they contain an implemented responsibility.

## Requirements

- Node.js 22 or newer
- npm 11 or newer
- .NET SDK 10
- Docker Desktop or another Docker Engine with Compose

## Quick start

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Vite serves the app at `http://localhost:5173`.
The HTTP client targets `http://localhost:8080` by default and can be overridden
with `VITE_API_BASE_URL`.

The service worker is generated only for a production build. To test
installation and offline behavior locally:

```bash
npm run build
npm run preview -- --host=127.0.0.1
```

Open the preview URL in Chrome or Edge and use the install button in Settings,
the browser address bar, or the browser's **Install app** menu. Installation
requires HTTPS in deployment; localhost and `127.0.0.1` are treated as secure
development origins.

After an authenticated online visit, the latest dashboard, lists, accessories,
summaries, and purchase history are copied to IndexedDB. On a later offline
visit, the same local user can read that snapshot. A banner labels offline data
and every create, edit, delete, status, archive, and reorder operation is
blocked until `/api/health` confirms connectivity. Offline writes and
background synchronization are intentionally outside the MVP.

### Backend

```bash
cd backend
dotnet restore
dotnet run
```

To enable Swagger and use a fixed local address in PowerShell:

```powershell
$env:ASPNETCORE_ENVIRONMENT = "Development"
$env:ASPNETCORE_URLS = "http://localhost:8080"
$env:ConnectionStrings__DefaultConnection = "Host=localhost;Port=5432;Database=loadout_queue;Username=loadout;Password=change-me"
$env:Jwt__SigningKey = "replace-with-at-least-32-random-characters"
dotnet run
```

Foundation endpoints and tooling:

- `GET /` — API metadata
- `GET /health` — process liveness, independent from PostgreSQL
- `GET /api/health` — readiness, including PostgreSQL connectivity
- `/swagger` — Swagger UI in Development
- `/swagger/v1/swagger.json` — OpenAPI document in Development

Authentication endpoints:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Gear-list endpoints, all authenticated:

- `GET /api/gear-lists`
- `GET /api/gear-lists/{id}`
- `POST /api/gear-lists`
- `PUT /api/gear-lists/{id}`
- `DELETE /api/gear-lists/{id}`

Ownership always comes from the JWT. Requests for another user's list return
`404 Not Found`, and delete archives the list instead of removing its row.

Gear-item endpoints, all authenticated:

- `GET /api/gear-lists/{listId}/items`
- `GET /api/gear-lists/{listId}/items/{itemId}`
- `POST /api/gear-lists/{listId}/items`
- `PUT /api/gear-lists/{listId}/items/{itemId}`
- `DELETE /api/gear-lists/{listId}/items/{itemId}`
- `PATCH /api/gear-lists/{listId}/items/{itemId}/status`
- `PUT /api/gear-lists/{listId}/items/reorder`

Items receive a server-controlled position within their priority. PUT and PATCH
require the current `Version`; stale mutations return `409 Conflict` with the
latest item. Entering `Purchased` records `PurchasedAt`.

Reorder requests contain the complete item snapshot with priority, position,
and version. They are committed atomically; stale or incomplete snapshots
return `409 Conflict` with the current server order.

Dashboard endpoints, all authenticated:

- `GET /api/dashboard/summary`
- `GET /api/dashboard/purchases`
- `GET /api/gear-lists/{listId}/summary`

The frontend keeps the short-lived access token in memory and renews it before
expiration through the rotating `HttpOnly` refresh cookie. React Router
protects application routes, TanStack Query owns server state, and React Hook
Form plus Zod validate authentication, list, and accessory forms.

## Quality and accessibility

The application provides explicit loading, error, retry, and empty states for
every remote-data screen. A render error boundary preserves a recoverable
application shell, non-retryable API failures are not requested repeatedly,
and a `401 Unauthorized` from an authenticated query or mutation triggers one
central refresh attempt. If that refresh fails, private query data is cleared
and the router returns to login.

Keyboard and assistive-technology support includes:

- skip links and focus movement to the main landmark after navigation;
- a descriptive document title and polite route announcement;
- dialogs with Escape handling, focus trapping, focus restoration, unique
  accessible names, and background scroll locking;
- validation errors connected to their fields with `aria-invalid` and
  `aria-describedby`;
- live operation, connectivity, offline, and service-worker feedback;
- localized dnd-kit keyboard instructions and reorder announcements;
- visible focus states and reduced-motion support;
- a real `404` page instead of silently redirecting invalid URLs.

Vitest exercises these behaviors and uses axe-core for automated semantic
accessibility checks. The axe test disables only `color-contrast`, because
jsdom has no layout or rendered-pixel information; contrast remains governed
by the Boreal-derived design tokens and should also be checked in a real
browser before deployment.

### PostgreSQL and API with Docker

Copy `.env.example` to `.env`, replace the local password, and run:

```bash
docker compose up --build
```

PostgreSQL is exposed on port `5432` and the API on `8080` by default. The
database volume is persistent.

## Railway production

Production runs in the Railway project `gear-list-app` with three services:
`gear-list-web`, `gear-list-api`, and `Postgres`.

- Web: `https://gearlist.sur-tec.com.ar`
- API: `https://api.gearlist.sur-tec.com.ar`

The default `*.up.railway.app` public domains are removed. Cloudflare contains
the CNAME and Railway ownership TXT records for both custom domains, configured
as DNS-only records. Railway provisions and renews their TLS certificates.

`frontend/railway.json` and `backend/railway.json` define Docker builds, health
checks, and restart behavior. The API additionally runs
`dotnet LoadoutQueue.Api.dll --migrate` as its pre-deploy command, so a failed
migration prevents the new application revision from starting.

Required production variables include:

- API: `ConnectionStrings__DefaultConnection`, `Jwt__SigningKey`,
  `Cors__AllowedOrigins__0`, `PasswordRecovery__FrontendBaseUrl`,
  `Resend__ApiKey`, `Resend__FromAddress`, and `Resend__FromName`.
- Web build: `VITE_API_BASE_URL`.

Secrets are stored only in Railway. Deploy local source with:

```bash
railway up backend --path-as-root --service gear-list-api --detach
railway up frontend --path-as-root --service gear-list-web --detach
```

## Database and migrations

The committed `InitialCreate` migration contains ASP.NET Core Identity tables,
gear lists, gear items, indexes, monetary precision, check constraints,
restricted domain deletes, and the gear-item concurrency token.
`AddAuthentication` adds hashed, revocable refresh tokens and their indexes.
`AddPasswordRecovery` adds persistent Data Protection keys.

Start PostgreSQL and configure the same password used in `.env`:

```bash
docker compose up -d postgres
```

```powershell
$env:ConnectionStrings__DefaultConnection = "Host=localhost;Port=5432;Database=loadout_queue;Username=loadout;Password=change-me"
cd backend
dotnet ef database update
```

Create a future migration from `backend/`:

```bash
dotnet ef migrations add MigrationName --output-dir Persistence/Migrations
```

Migrations are never applied automatically on application startup.

## Authentication

Registration and login return a short-lived JWT access token in the JSON
response. The refresh token is random, stored only as a SHA-256 hash in
PostgreSQL, and sent in an `HttpOnly`, `SameSite=Strict` cookie that is `Secure`
in Production.

Refresh operations rotate the token transactionally while locking the current
token row. Logout revokes the active refresh token and clears the cookie. Login
and registration share a fixed-window per-IP rate limit.

Password recovery sends a non-enumerating response whether or not the account
exists. Identity reset tokens expire after 30 minutes, are single-use, and are
encoded in the URL fragment so they are not sent to the frontend host in an
HTTP request. A successful reset revokes every existing refresh session.
ASP.NET Core Data Protection keys are stored in PostgreSQL so valid links
survive API restarts and deployments.

Configure email delivery without committing secrets:

```powershell
$env:PasswordRecovery__FrontendBaseUrl = "http://localhost:5173"
$env:Resend__ApiKey = "re_your_resend_api_key"
$env:Resend__FromAddress = "no-reply@sur-tec.com.ar"
```

`PasswordRecovery__FrontendBaseUrl` must be the public frontend origin in
production. Keep Resend click tracking disabled for password-reset mail so the
provider does not rewrite the signed link.

`Jwt__SigningKey` must contain at least 32 bytes and must be replaced for every
deployed environment. Never commit a production signing key.

## Verification

```bash
cd frontend
npm test -- --run
npm run build

cd ..
dotnet test LoadoutQueue.slnx
dotnet build LoadoutQueue.slnx -c Release

docker compose config
```

Backend integration tests require Docker because they create an isolated
PostgreSQL 17 container and apply all migrations.

At the Stage 9 cutoff, `npm audit` reports
`GHSA-qwww-vcr4-c8h2` for React Router's RSC mode. Gear List uses a
client-only `BrowserRouter` and does not enable RSC or Server Actions. The npm
registry currently offers no patched 7.x release; its forced fix downgrades to
7.11.0, which carries additional advisories. The application therefore remains
on 7.18.2 until a compatible fix or a reviewed major-version migration is
available.

## Current scope

Stages 1 through 9 include:

- repository configuration and a responsive frontend shell;
- `ApplicationUser`, `GearList`, `GearItem`, `RefreshToken`, and domain enums;
- PostgreSQL persistence through EF Core and committed migrations;
- indexes, decimal precision, constraints, restricted deletes, and optimistic
  concurrency metadata;
- Swagger/OpenAPI in Development;
- structured Serilog request logging and correlation IDs;
- global Problem Details exception handling;
- separate liveness and database-readiness endpoints;
- Identity password hashing and unique email enforcement;
- registration, login, access JWTs, refresh rotation, logout, and current user;
- refresh-token hashing, revocation, row locking, and secure cookies;
- FluentValidation and authentication rate limiting;
- Testcontainers integration tests against PostgreSQL;
- authenticated gear-list create, list, detail, update, and archive endpoints;
- ownership enforcement without accepting client-supplied owner identifiers;
- FluentValidation contracts and consistent `404` responses for foreign lists;
- authenticated gear-item CRUD scoped through an owned, active list;
- category, priority, status, price, URL, and length validation;
- automatic positions within each priority;
- purchase timestamp handling and hard delete for items;
- optimistic version rotation and conflict responses with the current item;
- transactional cross-priority reordering with complete-snapshot validation;
- authenticated React Router application shell and in-memory session;
- automatic access-token renewal through the refresh cookie;
- live dashboard, list management, list detail, and purchase history screens;
- complete create/edit forms for lists and accessories;
- purchase confirmation with actual price and recorded purchase date;
- dnd-kit pointer and keyboard ordering connected to the API;
- a central Fetch client and TanStack Query reorder mutation;
- query invalidation after successful mutations and conflicts;
- Boreal-derived dark/light design with desktop, tablet, and mobile layouts;
- behavior tests for login, API errors, forms, purchased status, priorities,
  offline state, totals, reordering, and query invalidation;
- generated manifest, standalone metadata, app icons, local fonts, app-shell
  precaching, offline fallback, and service worker;
- controlled update notification and browser installation prompt;
- centralized API health probing, offline/reconnection banners, and refetch on
  reconnect;
- Dexie snapshots isolated by user for dashboard, lists, accessories,
  summaries, and purchase history;
- local identity fallback for authenticated offline reloads;
- explicit offline write guards with no optimistic fake saves;
- tests for IndexedDB fallback, user isolation, connectivity transitions,
  installation prompts, and offline write blocking.
- a global render error boundary and centralized expired-session recovery;
- explicit loading, retry, operation-feedback, per-lane empty, and `404`
  states;
- accessible route focus and announcements, skip links, validation
  descriptions, focus-managed dialogs, and localized keyboard drag-and-drop;
- axe-core semantic checks plus regression tests for fatal errors, query
  states, session expiry, and modal keyboard behavior;
- finalized setup, verification, quality, offline, and architecture
  documentation.

## Architectural boundaries

- `app` composes frontend features and shared code.
- Features may depend on `shared`; `shared` never depends on a feature or app.
- Backend features implement vertical use cases and may use EF Core directly.
- Domain code does not depend on features, persistence, or the HTTP pipeline.
- `Program.cs` registers dependencies and maps feature endpoints explicitly.
- PostgreSQL remains the source of truth.

The project deliberately avoids separate layer projects, generic repositories,
Unit of Work wrappers, MediatR, CQRS, AutoMapper, reflection-based module
discovery, and interfaces without a concrete substitution need.

## Next stages

The MVP roadmap is complete. Possible later capabilities include shared lists,
offline writes with an explicit conflict policy, notifications, price history,
attachments, and deployment automation. They are intentionally outside the
current architecture until a concrete requirement justifies them.

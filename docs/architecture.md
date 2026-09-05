# Architecture

Answer each of these, in your own words, once the system has taken real shape.

- What are the moving pieces, and how do they talk to each other?
- Where does each piece run?
- What is the request path for one representative user action, end to end?
- What did you decide *not* to build, and why?

---

## Phase 0 foundation (current state)

At the Phase 0 foundation checkpoint, the application structure was a React/Vite browser client calling an Express API with Axios, with Prisma prepared for PostgreSQL. Local development used Docker PostgreSQL and the production target was planned as Supabase PostgreSQL. Authentication was intentionally deferred at that checkpoint; later Phase 2 and follow-up work implemented Express bcrypt/JWT authentication with HTTP-only cookies.

The original Phase 0 representative request was `GET /api/health`: the browser or other client requested Express, which loaded environment variables, applied CORS, JSON, and cookie middleware, and returned a health response. Database-backed CRM actions were deferred at that checkpoint and are implemented in the later phase sections below.

---

## Phase 2 — Authentication and roles

Authentication is implemented by Express, not Supabase. The React client uses an Axios instance configured with `withCredentials: true`; it posts credentials to `/api/auth/login`. Express finds the seeded Prisma user, compares the supplied password with bcrypt, signs a minimal JWT containing only the user ID, and sends it as an HTTP-only session cookie. The JWT never appears in a JSON response or browser storage.

On browser startup, the auth provider calls `/api/auth/me` to restore the session. Auth middleware reads and verifies the cookie, reloads the user from PostgreSQL, and attaches only the safe user fields to the request. Role middleware then checks the current database role on protected server routes. `/api/auth/manager-check` is a deliberately limited authentication demonstration route; it is not business functionality.

For local development the cookie is `httpOnly`, `sameSite=lax`, and non-secure so it works over localhost HTTP. In production (`NODE_ENV=production`), it is `secure` and `sameSite=none` for the planned separate frontend/backend HTTPS deployment. CORS accepts only `CLIENT_URL` with credentials enabled.

The public authentication flow also includes `POST /api/auth/register`, which normalizes email, validates an eight-character minimum password, hashes with bcrypt, and always creates a `SALES_REP`. React exposes `/register`, redirects successful registration to `/login`, restores sessions through `/api/auth/me`, and sends logout to `/api/auth/logout` before navigating to `/login`. Authenticated `/` and `/dashboard` render the dashboard; existing protected CRM routes remain behind `ProtectedRoute`.

---

## Phase 3 - Companies

The authenticated React client uses Axios to call the Express Companies module. Every Companies endpoint passes through JWT authentication; Express reloads the current user and checks authorization before Prisma queries. Managers can list and act on every company. Sales reps can list, view, and edit companies they own or can reach through an existing collaborator deal relationship; create requests always use the authenticated sales-rep ID rather than a submitted owner ID. Archiving and restoring are manager-only operations, matching the role requirement that grants company archiving to sales managers.

## Phase 4 — Deals

The Deals feature is exposed through the Express API under `/api/deals` and consumed by the React/Vite application through the shared Axios client. Prisma remains the only application data-access layer for deals.

A representative create-deal request is: the authenticated browser submits title, exact decimal value, expected close date, company ID, and (for managers) owner ID through Axios; Express verifies the HTTP-only JWT and reloads the current user; the deal route verifies that the company is accessible and active, verifies that the owner is a Sales Rep, forces new deals to `NEW`, and persists the record with Prisma/PostgreSQL. The API returns safe company and owner fields for the UI.

Deal access is enforced in the server query: managers can access every non-deleted deal, while Sales Reps can access deals they own or where they are an existing collaborator. The React UI does not implement authorization by itself.

Deal deletion is implemented as a soft delete through `deletedAt`, so normal lists hide deleted deals without destroying relationships that support immutable history. Server-side search/filter/sort/pagination, reporting dashboard, immutable history, and past-due alerts are documented in the later phase sections below.

## Phase 5 - Deal lifecycle

The lifecycle API adds `PATCH /api/deals/:id/stage` and `POST /api/deals/:id/reopen` to the existing authenticated Deals router. The route reuses the existing `findAccessibleDeal` query, so managers retain global access and sales reps retain ownership/collaborator access. Server-side validation uses explicit forward and backward transition maps in `backend/src/config/dealLifecycle.js`; it does not infer business rules from enum ordering. Fixed stage probabilities are centralized in the same configuration for later weighted reporting.

Each accepted stage change updates the Deal and appends a `STAGE_CHANGED` DealEvent in one Prisma transaction. Closing stores `closedAt` and the immediately previous stage in `stageBeforeClose`; only managers can reopen Won or Lost deals, and reopening restores that saved stage while clearing both close fields. The React deal detail page presents the current lifecycle and only the valid next/backward/reopen actions, while the API remains authoritative.

## Phase 6 - Collaborators

Collaborator management is exposed through `GET /api/deals/:id/collaborators`, `GET /api/deals/:id/collaborator-candidates`, `POST /api/deals/:id/collaborators`, and `DELETE /api/deals/:id/collaborators/:userId`. Every endpoint requires the existing HTTP-only-cookie authentication and the existing deal access query. Managers and the deal owner may add or remove collaborators; other collaborators may view the list and update the deal but cannot manage membership.

The existing `DealCollaborator` composite key remains the single source of truth for membership. The server verifies that target users are Sales Reps, rejects the owner and duplicate rows, and returns safe user fields only. Because `dealAccess()` already checks owner or collaborator membership, adding a row immediately grants deal access and removing it immediately removes access for a non-owner. No database schema migration was required.

## Phase 7 - Deal finding

`GET /api/deals` now accepts `search`, `companyId`, `stage`, `ownerId`, `sortBy`, `sortOrder`, `page`, and `pageSize`. Express validates these parameters, combines search and field filters with the existing manager-or-owner-or-collaborator access predicate, and passes the resulting `where`, allowlisted `orderBy`, `skip`, and `take` directly to Prisma. The matching `count` uses the same `where` conditions, so deleted or unauthorized deals cannot affect returned results or totals.

The React Deals page sends each search, filter, sort, and pagination change to the API and renders only the returned page. A representative request is `GET /api/deals?search=acme&stage=PROPOSAL&sortBy=value&sortOrder=desc&page=1&pageSize=10`; the API returns `deals` plus `pagination.page`, `pageSize`, `total`, and `totalPages`. No client-side full-dataset filtering or pagination was added.

## Phase 8 - Bulk actions and CSV export

Managers use `POST /api/deals/bulk-reassign` and `POST /api/deals/bulk-advance`. The server validates the request once, then processes each selected deal independently so every ID receives a success or rejection result. Each successful reassignment or stage advance is persisted in its own Prisma transaction together with the corresponding immutable `DealEvent`; one rejected deal does not roll back unrelated successful deals. Bulk advancement calls the shared lifecycle persistence helper used by the single-stage endpoint, including close-field handling for `NEGOTIATION` to `WON`.

`GET /api/deals/export` queries all non-deleted, open deals directly, applying the same manager-or-owner-or-collaborator access predicate without Phase 7 pagination. Express generates escaped CSV rows with company, stage, exact value, and stage-weighted value using the centralized lifecycle probabilities. Managers receive all open deals; Sales Reps receive only their authorized open deals. The Deals page selects only visible rows for bulk actions and asks the server to generate the download.

## Phase 9 - Sales CRM dashboard

Authenticated clients call `GET /api/dashboard`. The route reuses the shared `dealAccess()` predicate for every count, grouping, aggregate, and weekly query. Open count and stage/owner breakdowns use Prisma `count`/`groupBy`; weighted pipeline uses four stage-filtered decimal aggregates and the centralized Phase 5 probabilities; month and eight-week metrics query only authorized Won/Lost records by `closedAt`. The server returns metrics and exactly eight Monday-start UTC weekly buckets, while React renders the result with Recharts without downloading individual deals.

The protected React root route `/` renders this dashboard as the authenticated landing view. Companies and Deals remain available through dashboard navigation, and `/dashboard` remains an explicit alias.

## Phase 10 - Immutable deal history

`GET /api/deals/:id/history` reuses the existing deal access predicate and returns that deal's `DealEvent` rows oldest-first with deterministic timestamp/ID ordering. The response includes safe actor and owner identities, stage fields, backward reasons, and note bodies. There are no event update or delete routes. `POST /api/deals/:id/notes` is the only new history-writing action; it appends a validated plain-text `NOTE_ADDED` event.

Deal creation, normal owner reassignment, lifecycle transitions, reopen, and bulk reassignment write their corresponding events at the existing mutation boundary. State changes and required events use Prisma transactions where both a deal and event change; history is fetched only for the currently viewed deal and rendered read-only in the detail page.

## Phase 11 - Past-due alerts

`GET /api/deals/alerts/past-due` derives alerts server-side from non-deleted open deals whose `expectedCloseDate` is before the current UTC date. It applies the shared deal access predicate, then excludes only dismissal rows matching the current user's deal ID and current expected-close-date snapshot. `POST /api/deals/:id/alerts/past-due/dismiss` is authenticated and owner-only; managers and collaborators may view authorized alerts but cannot dismiss another user's deal.

Dismissals reuse `DealAlertDismissal` and its deal/user/date uniqueness constraint. Changing a deal's expected close date naturally creates a new effective alert state because the old snapshot no longer matches. The dashboard fetches alerts alongside its existing data and removes an alert locally after a successful dismissal; no polling, notification worker, or new table was added.
The same filtered response includes a server-derived actionable `count`, which is shown as the Past Due navigation badge and decremented after a successful dismissal.

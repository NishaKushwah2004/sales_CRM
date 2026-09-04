# Plan

Answer each of these, in your own words.

- How did you break the work into sessions?
- What order did you build in, and why that order?
- What did you estimate versus what it actually took?
- What did you cut when you ran short?

---

## Phase 0 — Foundation

Completed the repository and local-development foundation before feature work: initialized Git without a commit, added ignore rules, configured safe environment-variable examples, added Docker PostgreSQL, installed Prisma and Prisma Client, created the minimal Prisma datasource, verified the Express health endpoint, and replaced the Vite starter view with a Tailwind-backed Sales CRM foundation screen.

This order establishes a reproducible database and application boundary before introducing a vertical CRM feature. Time estimates and later scope changes will be recorded as work proceeds.

### Validation note

Prisma schema validation and client generation passed with Prisma 6.19.3. Docker Compose configuration passed, but Docker Desktop was unavailable. A PostgreSQL service already listening on port 5432 rejected the configured local Docker credentials, so end-to-end local Docker database connectivity remains to be verified after Docker Desktop is started and the port conflict is resolved.

## Phase 1 — Database and Prisma model

Designed the complete persistence model before adding any API or UI behavior. The schema now covers users, company archiving, deals, collaborations, immutable timeline events, and date-scoped alert dismissals. The schema was formatted, validated, and used to generate an offline initial migration and Prisma Client.

The initial migration was applied successfully, Prisma Client was generated, and the seed ran successfully. Read-only verification confirmed 4 users (1 manager and 3 sales reps), 4 companies, 5 deals, 2 collaborator relationships, and 9 timeline events.


### Verified database result

The initial migration `20260904123000_init_sales_crm` applied successfully. The seed executed successfully and a read-only Prisma inspection verified 4 users (1 manager, 3 sales reps), 4 companies, 5 deals, 2 collaborator records, and 9 timeline events. PostgreSQL accepted `pg_isready` on the Sales CRM service.

## Phase 2 — Authentication and roles

Implemented the authentication slice end to end: Prisma-backed bcrypt login, HTTP-only JWT cookie sessions, current-user restoration, reusable authentication and role middleware, a manager-only authorization check, Axios credential support, a login form, protected route, role display, and logout. No company, deal, dashboard, or other CRM business feature was added.

Validation included backend syntax/Prisma checks, frontend lint/build, and local HTTP checks for invalid credentials, manager and sales-rep sessions, unauthenticated `/me`, manager-only access, logout, and post-logout access.

## Phase 3 - Companies

Implemented the Companies vertical slice: authenticated server-side CRUD-style company routes, manager owner selection, ownership/collaboration access checks, soft archive/restore, and protected React list/create/detail/edit views. API tests verified manager flow, archive visibility, restore, sales-rep self-ownership on create, and cross-owner `403` protection. No Deal feature was implemented.

## Phase 4 — Deals

**Goal:** implement the required deal CRUD and company-to-deal view without starting lifecycle or later reporting features.

**Order:** backend authorization and CRUD first, then React deal list/create/detail/edit/delete screens, then company-detail deal display, then validation/build checks. This keeps server-side access rules authoritative before adding UI actions.

**Estimated:** 90 minutes.

**Actual:** extended across the interrupted Codex session and manual completion after the Codex usage limit was reached.

**Cut from this phase:** lifecycle transitions, collaborator management, search/filter/sort/pagination, bulk actions, CSV export, dashboard, immutable timeline behavior, and past-due alerts. Those remain deliberately separated into later phases.

## Phase 5 - Deal Lifecycle

**Intended work:** enforce the fixed forward lifecycle, one-stage backward movement with a reason, terminal Won/Lost states, manager-only reopening, centralized probabilities, append-only stage events, transactional updates, and focused detail-page controls.

**Actual work:** added explicit transition and probability configuration, transactional stage/reopen endpoints using existing access checks, close/reopen field handling, immutable `STAGE_CHANGED` events, and lifecycle controls without changing the Prisma schema or Phase 4 CRUD.

**Validation/testing:** backend syntax checks, Prisma schema validation, frontend lint, and frontend production build were run. API behavior should be exercised against the seeded PostgreSQL instance for the complete forward/backward/closed/reopen matrix.

**Deviation/cut:** no collaborator changes, search, bulk actions, dashboard, timeline UI, alerts, or deployment work was added. The existing DealEvent model was used rather than introducing a second history model.

## Phase 6 - Collaborators

**Planned work:** implement server-authoritative collaborator membership using the existing relationship, manager/owner add and remove permissions, Sales Rep-only targets, immediate access changes, collaborator update access, and detail-page list/add/remove controls.

**Actual implementation:** added collaborator list, candidate, add, and remove endpoints. The routes reuse existing authentication and deal access, preserve manager-only owner reassignment, handle duplicate and owner-target requests cleanly, and return only safe user fields. The existing detail page now displays collaborators and provides permission-aware controls.

**Testing:** frontend lint/build, backend syntax checks, Prisma validation/generation, and request-level API authorization tests were run. The request harness covered manager, owner, collaborator, unrelated rep, duplicate, manager-target, owner-target, removal, access, update, and owner-reassignment cases.

**Deviation/cut:** no schema or migration change was needed because `DealCollaborator` already has the required composite primary key and relationships. Search, filtering, bulk actions, reporting, timeline UI, and alerts remain deferred to later phases.

## Phase 7 - Deal Finding

**Intended work:** add server-side deal title/company search, company/stage/owner filters, allowlisted sorting, bounded database pagination, matching totals, and controls in the existing Deals page.

**Why server-side:** authorization, filtering, sorting, and pagination must occur in the Prisma query so a Sales Rep cannot discover another user's deal by manipulating browser state and the client never loads the full dataset.

**Actual work:** extended `GET /api/deals` with one validated Prisma query path and matching count, added deterministic tie-breaking by ID, and updated `DealsPage.jsx` to request and render only the selected page while preserving create and soft-delete behavior.

**Testing:** backend syntax, Prisma validation/generation, frontend lint/build, query-shape inspection, and request-level API validation/access tests were run. PostgreSQL/Docker availability remains the infrastructure limitation for production database integration tests.

**Estimated vs actual:** the phase was implemented as a focused backend/query and page update during the current session; no separate estimate was recorded in the existing project notes.

**Deviation/cut:** no bulk actions, CSV export, dashboard, timeline, alerts, schema changes, or other Phase 8+ functionality was added.

## Phase 8 - Bulk Actions and CSV Export

**Planned work:** add manager-only bulk reassignment and one-stage advancement with per-deal results and immutable events, plus a server-generated export of every authorized open deal with stage-weighted value.

**Actual work:** added validated bulk endpoints with independent per-deal transactions, reused the shared lifecycle persistence helper, recorded owner/stage events, added escaped exact-decimal CSV generation, and added manager selection/actions plus download controls to the existing Deals page.

**Testing:** backend syntax, Prisma validation/generation, frontend lint/build, and request-level bulk authorization/persistence checks were run. The request harness verified mixed results, duplicate and invalid targets, manager-only access, event creation, close fields, and CSV response headers. Database-backed verification remains blocked by unavailable PostgreSQL/Docker infrastructure.

**Estimated vs actual:** implemented as a focused extension during the current session; no separate estimate was recorded in the existing project notes.

**Deviation/cut:** no dashboard, analytics, timeline UI, alerts, notifications, schema migration, or other Phase 9+ feature was added.

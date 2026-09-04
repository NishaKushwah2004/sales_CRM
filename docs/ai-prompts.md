# AI prompts

The prompts you actually used, in the order you used them, grouped by what you were trying to achieve. For each significant one: what you asked, what you got back, and what you had to correct.

Include at least one prompt that produced something wrong, and what you did about it.

If you did not use AI at all, say so here, and describe your process instead.

## <What you were trying to achieve>

### Prompt

### What you got

### What you corrected

---

## Phase 0 foundation

### Prompt

Implement Phase 0 foundation only: initialize and protect Git, configure local PostgreSQL, add Prisma connectivity without CRM models, verify the existing Express server, replace the Vite starter UI with a minimal Tailwind foundation screen, and validate the stack without implementing business functionality.

### What you got

The initial foundation configuration, Prisma installation, Docker Compose setup, starter-screen replacement, and validation plan.

### What you corrected

The initial patch operation could not access the workspace after Git initialization because of a sandbox setup error. The same scoped file changes were then applied through an approved elevated workspace command. No product functionality was added.

### Validation correction

The first Prisma attempt used the latest release, which was incompatible with the local Node 20 runtime and did not provide a usable local CLI. Prisma and Prisma Client were then pinned together to version 6.19.3, after which schema validation and client generation succeeded. Docker Compose configuration validated, but Docker Desktop was not running; database connectivity therefore remains a manual verification item.

---

## Phase 1 — Database and Prisma only

### Prompt

Implement the complete Prisma/PostgreSQL data model for the assignment: users and roles, companies and archive state, deals and lifecycle state, collaborators, immutable history, reassignment data, notes, alert dismissals, indexes, seed strategy, migration, and documentation—without API, authentication, frontend, or business-feature implementation.

### What you got

A Prisma schema with six models, enums, restrictive foreign keys, exact decimal deal values, an append-only timeline model, a date-snapshot dismissal model, and an idempotent seed script using bcrypt.

### What you corrected

The migration was first generated offline while the local container was failing. Once PostgreSQL became reachable on port 5433, the same migration applied successfully, the bcrypt-based seed completed, and read-only Prisma checks verified the resulting rows and relationships.


---

## Phase 2 — Authentication and roles

### Prompt

Implement only Express-backed authentication and role authorization: bcrypt login against existing Prisma users, HTTP-only JWT cookies, current-user restoration, reusable middleware, a manager-only test route, Axios credential handling, login/protected-route/logout UI, focused validation, and relevant documentation. Do not implement CRM business features.

### What you got

Authentication routes, cookie/JWT configuration, safe-user responses, server-side current-role authorization, a login-only React flow, and role-aware authenticated UI.

### What you corrected

The first frontend check found PowerShell-created JSX files with a non-UTF-8 encoding and a fast-refresh lint violation from exporting a hook beside a component. The Phase 2 frontend files were rewritten as UTF-8 and the auth context/hook were separated; lint and production build then passed.

---

## Phase 3 - Companies

### Prompt

Implement only company list, create, detail, edit, archive, restore, server-side ownership authorization, and corresponding protected React UI; do not implement any Deal or later-phase feature.

### What you got

A focused Companies module, manager-only owner lookup/archive/restore operations, Prisma-backed server authorization, and protected list/create/detail/edit routes.

### What you corrected

Initial frontend validation caught an unused navigation import and a malformed one-time loading-effect comment. Both were corrected before final lint and production build passed.

---

## Phase 4 — Deals completion

### Prompt

Complete the existing Phase 4 Deals implementation from the current project state. Implement only the required deal CRUD, server-side ownership/collaborator access, exact decimal handling, active-company checks, manager owner selection/reassignment, soft deletion, React deal list/create/detail/edit/delete UI, company-detail deal display, and relevant documentation. Do not implement lifecycle, collaborator management, search/filter/sort/pagination, bulk actions, dashboard, history, or alerts.

### What you got

The existing backend deal routes already covered basic CRUD and authorization, while the frontend deal pages were placeholders. The completion work filled the missing deal UI, integrated accessible deals into company detail, tightened target-company authorization, and added manager-only owner reassignment.

### What you corrected

The interrupted Codex implementation had stopped after creating the backend route while the React deal pages remained placeholders. The remaining Phase 4 work was completed manually from the current source state without adding later-phase functionality.

## Phase 5 - Deal Lifecycle

### Prompt

Implement only Phase 5 Deal Lifecycle in the existing Phase 4 Sales CRM. Inspect the current repository first; preserve existing CRUD, access control, schema, and styling. Add explicit server-side forward/backward transition validation, mandatory backward reasons, terminal close fields, manager-only reopen, centralized stage probabilities, transactional DealEvent recording, lifecycle API endpoints, detail-page controls, focused validation, and Phase 5 documentation. Do not implement Phase 6 or later features.

### What you got

The existing schema already contained `DealStage`, `closedAt`, `stageBeforeClose`, and `DealEvent`, so the implementation added no migration. The backend gained centralized transition configuration and authenticated transactional stage/reopen routes. The existing detail page gained visible stage state and valid lifecycle actions.

### What you corrected

The first UI patch placed new React hooks inside the existing loading effect because the original page used a compressed one-line JSX return. Frontend lint exposed the mistake; the page was then rewritten in formatted JSX while retaining its existing edit, owner, company, and delete behavior. The final lint pass succeeded.

## Phase 6 - Deal Collaborators

### Prompt

Implement only Phase 6 Collaborators in the current Phase 5 Sales CRM. Inspect the current repository first and preserve the existing schema, deal access, CRUD, lifecycle, authentication, styling, and routing. Reuse the existing `DealCollaborator` model; add server-side list, candidate, add, and remove endpoints with manager/owner authorization, Sales Rep-only validation, duplicate handling, immediate access changes, collaborator update permissions, detail-page controls, focused tests, and documentation. Do not implement Phase 7 or later.

### What you got

The existing composite-key collaborator model and owner-or-collaborator deal access predicate were sufficient, so no migration was needed. The backend gained safe collaborator endpoints and the detail page gained list, add, and remove controls with frontend filtering for usability.

### What you corrected

The implementation kept candidate lookup separate from manager-only owner lookup because deal owners and collaborators have different authorization needs. Server-side checks remain authoritative for target role, duplicate membership, owner exclusion, and manager/owner membership management.

## Phase 8 - Bulk Actions and CSV Export

### Prompt

Implement only Phase 8 in the current Phase 7 Sales CRM. Preserve existing authentication, authorization, CRUD, lifecycle, collaborator access, and server-side finding. Add manager-only bulk reassignment and one-stage bulk advancement with per-deal results and immutable events, plus a server-generated authorized open-deal CSV with exact weighted values. Update the existing Deals page for visible-page selection, bulk actions, results, and download. Do not implement Phase 9 or later.

### What you got

The backend gained independent per-deal bulk endpoints, shared lifecycle persistence for stage advancement, owner-reassignment events, and an unpaginated server-side CSV query. The existing Deals page gained manager-only selection/actions and a server download control.

### What you corrected

The first request harness used a shared mutable in-memory auth adapter and produced false role-isolation results. Those results were discarded rather than changing authorization code. The lifecycle helper was then tightened to capture old stage and owner values before updates so event/result data remains stable under test doubles and real Prisma behavior.

## Phase 7 - Deal Finding

### Prompt

Implement only Phase 7 Deal Finding in the current Phase 6 Sales CRM. Inspect the existing README, schema, deal routes, collaborator access, and Deals page first. Extend `GET /api/deals` with database-side search over deal/company name, company/stage/owner filters, allowlisted sorting, validated pagination and matching count metadata. Preserve manager/owner/collaborator authorization, soft deletion, CRUD, lifecycle, and collaborator behavior. Update the existing Deals page to request only server-returned pages and document the work. Do not implement Phase 8 or later.

### What you got

The list endpoint now builds one Prisma `where` from access control and validated search/filter parameters, uses `orderBy`, `skip`, and `take`, and counts with the same conditions. The existing Deals page now sends query parameters for search, filters, sorting, page, and page size and renders pagination metadata.

### What you corrected

An intermediate patch left a partial JSX merge in `DealsPage.jsx`, which the focused lint check caught immediately. The page was recreated from the reviewed implementation, the accidental patch markers were removed, and lint passed before the remaining validation work continued.

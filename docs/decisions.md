# Decisions

Log the decisions that actually shaped this codebase â€” the ones where a real alternative existed and
you picked one. At least five entries. For each: what you chose, what you rejected, and why. At least
one entry must be a decision you later reversed â€” say what changed your mind. It can be any entry
below, not necessarily the last one; add a **Later reversed:** line to whichever one it is.

The records below preserve the phase decisions made during implementation. The summaries first capture the major choices with their context and consequences; the phase logs retain the more detailed rationale.

## Key Decision Summaries

### Decision A - HTTP-only cookie sessions

- **Decision:** Keep JWT sessions in HTTP-only cookies and reload the current user from PostgreSQL in `requireAuth`.
- **Context/problem:** The browser needed persistent authentication without exposing tokens or stale roles to JavaScript.
- **Alternatives rejected:** `localStorage`, `sessionStorage`, frontend-supplied roles, and a hosted authentication provider.
- **Why chosen:** Cookies prevent normal JavaScript token access, while database reloads make role changes authoritative.
- **Consequences/trade-offs:** Cross-origin deployment requires credentialed CORS and production cookie settings; frontend code cannot inspect the JWT directly.

### Decision B - Exact decimal deal values

- **Decision:** Store deal values as Prisma/PostgreSQL `Decimal(14,2)` and submit them as text from forms.
- **Context/problem:** Pipeline and weighted values must not accumulate binary floating-point errors.
- **Alternatives rejected:** JavaScript numbers and PostgreSQL floating-point columns.
- **Why chosen:** Decimal persistence and arithmetic preserve monetary precision across CRUD, dashboard, and CSV reporting.
- **Consequences/trade-offs:** API/UI code must format Decimal values explicitly instead of treating them as ordinary numbers.

### Decision C - Explicit lifecycle maps

- **Decision:** Define forward and backward transitions explicitly in `dealLifecycle.js`.
- **Context/problem:** The deal workflow permits only specific one-step moves and has terminal stages.
- **Alternatives rejected:** Inferring transitions from Prisma enum declaration order or allowing arbitrary stage strings.
- **Why chosen:** Business rules stay explicit, reviewable, and independent of enum ordering.
- **Consequences/trade-offs:** Adding a future stage requires updating the configuration and its consumers deliberately.

### Decision D - Owner-or-collaborator server access

- **Decision:** Use one shared Prisma access predicate for managers, owners, and collaborators.
- **Context/problem:** Sales Reps must not discover another user's deals by changing client filters or URLs.
- **Alternatives rejected:** React-only filtering, a second permission model, or loading all deals before authorization.
- **Why chosen:** Authorization is applied in database queries and membership changes take effect immediately.
- **Consequences/trade-offs:** Every new deal-facing endpoint must reuse the predicate and include collaborator relations correctly.

### Decision E - Append-only DealEvent history

- **Decision:** Reuse `DealEvent` for creation, stage changes, owner reassignment, and notes; expose history read-only.
- **Context/problem:** The assignment requires an immutable timeline without editable historical records.
- **Alternatives rejected:** A second timeline table and event update/delete APIs.
- **Why chosen:** Existing fields already capture actors, stages, owners, reasons, notes, and timestamps.
- **Consequences/trade-offs:** Mutations that affect history need transactional event writes, and the timeline is fetched per deal.

### Decision F - Server-side finding and reporting

- **Decision:** Perform search, filters, pagination, bulk/export calculations, and dashboard aggregation in Prisma/API queries.
- **Context/problem:** The client must not download complete datasets or calculate authorization-sensitive totals.
- **Alternatives rejected:** Client-side filtering/pagination, browser-generated CSV, and frontend dashboard aggregation.
- **Why chosen:** The server can enforce access, use database aggregation, and return only the requested page or summary.
- **Consequences/trade-offs:** The frontend has more query/loading state, and database integration tests are important for query behavior.

### Decision G - Expected-date alert snapshots

- **Decision:** Key alert dismissal by deal, dismissing user, and expected-close-date snapshot.
- **Context/problem:** A dismissed overdue deal must alert again if its close date changes and later passes.
- **Alternatives rejected:** A permanent `Deal.dismissed` flag, deleting old dismissal rows, or a background alert-status table.
- **Why chosen:** The existing composite uniqueness constraint makes reset behavior emerge from current deal state.
- **Consequences/trade-offs:** Alert retrieval must compare the current date snapshot and the user-specific dismissal rows on every request.

### Decision H - Registration remains Sales Rep-only

- **Decision:** Add public registration with bcrypt validation and a server-forced `SALES_REP` role.
- **Context/problem:** The frontend needed a registration flow without allowing privilege escalation.
- **Alternatives rejected:** Client-selected roles, automatic Manager registration, and a second auth context.
- **Why chosen:** Express remains the authority for role assignment and session state.
- **Consequences/trade-offs:** Managers must still be provisioned through the existing seed/database process.

## Later reversed: Prisma tooling choice

- **Initial decision:** The project initially attempted the latest Prisma tooling during setup.
- **Why initially chosen:** Using the latest release was the default setup path before runtime compatibility was verified.
- **What changed:** The available runtime was Node 20.19.5, while the attempted latest Prisma tooling required a newer Node version.
- **Later decision:** Pin Prisma and Prisma Client to 6.19.3, as recorded in the Phase 0 decisions and package history before the schema commit.
- **Why it was reversed:** Prisma 6.19.3 validated and generated successfully on the available runtime, while the newer tooling did not provide a usable project CLI.
- **Evidence:** The repository history shows the database/schema commit using matching Prisma 6.19.3 packages.

## Authentication flow decision

- **Chose:** Keep JWTs in the existing HTTP-only cookie flow and add registration as a server-validated Sales Rep-only endpoint.
- **Rejected:** Browser token storage, frontend-only registration role selection, or a second auth context.
- **Why:** The existing authentication architecture already centralizes session restoration and role truth in Express; registration must not create Managers or expose credentials.

---

## Phase 0 Decision 1

- **Chose:** Docker PostgreSQL 16 for local development and Supabase PostgreSQL as the future production target.
- **Rejected:** Adding additional local services or using Supabase Auth.
- **Why:** PostgreSQL directly supports the requested architecture, while the assignment requires Express-managed authentication and does not require other infrastructure services.

## Phase 0 Decision 2

- **Chose:** A root-level `prisma/schema.prisma` containing only the Prisma client generator and PostgreSQL datasource.
- **Rejected:** Designing the complete CRM data model during setup.
- **Why:** The requested Phase 0 scope requires connectivity only; the model will be designed in Phase 1 against the feature rules.

## Phase 0 Decision 3

- **Chose:** Tailwind CSS v4 via the existing Vite plugin and a CSS `@import "tailwindcss"` entry point.
- **Rejected:** Keeping the generated Vite stylesheet as the application UI foundation.
- **Why:** This verifies the locked Tailwind v4 toolchain while leaving feature UI work for later phases.

## Phase 0 Decision 4

- **Chose:** Prisma 6.19.3 and Prisma Client 6.19.3 in a root workspace package that owns the root-level Prisma schema.
- **Rejected:** The latest Prisma 7 release for this project.
- **Why:** The local runtime is Node 20.19.5, while the attempted latest Prisma tooling requires Node 22 or later. The matching Prisma 6 packages validate and generate successfully on the available runtime.

## Phase 1 Decision 1

- **Chose:** `Decimal(14,2)` / PostgreSQL `DECIMAL(14,2)` for deal value.
- **Rejected:** JavaScript or PostgreSQL floating-point values.
- **Why:** Pipeline and weighted-reporting values require exact decimal arithmetic; binary floating point would introduce avoidable rounding errors.

## Phase 1 Decision 2

- **Chose:** Prisma enums for user roles and deal stages.
- **Rejected:** Unconstrained strings or a mutable database stage table.
- **Why:** The assignment has a fixed, small vocabulary for both roles and lifecycle states. Enums make invalid stored states impossible without creating unnecessary stage-management functionality.

## Phase 1 Decision 3

- **Chose:** Fixed stage probabilities in application constants, not a per-deal database field.
- **Rejected:** Arbitrary per-deal probabilities or inventing exact percentages in the schema.
- **Why:** README requires fixed probabilities but gives no values. Constants make the eventual chosen values explicit and centrally controlled while preventing per-deal overrides; the actual percentages will be selected and documented when lifecycle/reporting logic is implemented.

## Phase 1 Decision 4

- **Chose:** One append-only `DealEvent` timeline with typed event rows for creation, stage changes, reassignments, and notes.
- **Rejected:** Mutable notes plus separate history tables that require cross-table ordering.
- **Why:** A single ordered event stream directly supports the required immutable timeline and retains the relevant old/new values for lifecycle and reassignment events.

## Phase 1 Decision 5

- **Chose:** `archivedAt` for company archiving and `deletedAt` for future deal deletion, with restrictive foreign keys.
- **Rejected:** Cascading hard deletes.
- **Why:** Archived companies must retain their deals, and immutable deal history must never disappear because a parent is deleted.

## Phase 1 Decision 6

- **Chose:** Store alert dismissals against a snapshot of the deal's expected close date.
- **Rejected:** A permanent per-deal dismissed flag.
- **Why:** When the close date changes, no dismissal row matches the new date, so a newly overdue deal naturally becomes alertable again without notification infrastructure.

## Phase 2 Decision 1

- **Chose:** JWT in an HTTP-only cookie with only the user ID in its payload.
- **Rejected:** Returning tokens to JavaScript or storing them in localStorage/sessionStorage.
- **Why:** An HTTP-only cookie prevents normal browser JavaScript from reading the token, and the minimal payload avoids stale role or sensitive data in the token.

## Phase 2 Decision 2

- **Chose:** Reload the user from PostgreSQL in authentication middleware before role checks.
- **Rejected:** Trusting a role value supplied by the frontend or carried in the JWT.
- **Why:** Server-side authorization must use the current database role, so a role change takes effect without waiting for an old token to expire.

## Phase 2 Decision 3

- **Chose:** `sameSite=lax` locally and `secure`/`sameSite=none` when `NODE_ENV=production`.
- **Rejected:** A wildcard credentialed CORS policy or one cookie setting for every deployment.
- **Why:** Localhost development needs HTTP compatibility, while separately hosted HTTPS frontend/backend deployments need cross-site credential support. CORS remains limited to `CLIENT_URL`.

## Phase 3 Decision 1

- **Chose:** Sales-rep company access is ownership or an existing collaborator-deal relationship, evaluated in the Prisma query.
- **Rejected:** React-only filtering or trusting a client-provided owner ID.
- **Why:** README ties rep visibility to ownership/collaboration and requires server-side enforcement.

## Phase 3 Decision 2

- **Chose:** Managers alone archive and restore companies; sales reps create and edit authorized companies.
- **Rejected:** Adding a separate ownership-transfer feature or expanding archive authority beyond the stated manager role.
- **Why:** README explicitly grants company archiving to managers and does not require ownership transfer.

## Phase 4 Decision 1

- **Chose:** Keep deal monetary values as Prisma/PostgreSQL `Decimal(14,2)` and send the value as text from the React form.
- **Rejected:** Converting deal values to JavaScript floating-point numbers before persistence.
- **Why:** The assignment explicitly requires exact decimal deal values, so the UI should not introduce binary floating-point rounding.

## Phase 4 Decision 2

- **Chose:** Enforce Sales Rep deal access in Prisma using ownership or an existing collaborator relationship.
- **Rejected:** Loading all deals and filtering them in React.
- **Why:** The assignment requires server-side access enforcement, and the same access predicate can be reused by list/detail/update/delete operations.

## Phase 4 Decision 3

- **Chose:** Use the existing `deletedAt` field for deal deletion rather than physically deleting the row.
- **Rejected:** Hard deletion of a deal and its related records.
- **Why:** Later immutable history and collaborator/alert relationships must not be destroyed when a deal is deleted.

## Phase 4 Decision 4

- **Chose:** Allow only managers to change `ownerId` through the deal update API.
- **Rejected:** Letting Sales Reps submit arbitrary owner IDs.
- **Why:** The README gives managers the responsibility to reassign deals and server-side authorization must prevent a rep from impersonating another owner.

## Phase 5 Decision 1

- **Chose:** An explicit forward-transition map and separate one-step backward map.
- **Rejected:** Using the numeric or declaration order of the Prisma enum.
- **Why:** Lifecycle rules are business policy, and explicit maps make skipped transitions and terminal stages unambiguous and reviewable.

## Phase 5 Decision 2

- **Chose:** Centralize fixed probabilities and transition configuration in `backend/src/config/dealLifecycle.js`.
- **Rejected:** Scattering percentages through reporting or route code, or storing per-deal probabilities.
- **Why:** Every consumer must use the same fixed values, while the schema should continue to represent the deal's stage rather than a derived reporting value.

## Phase 5 Decision 3

- **Chose:** Store `stageBeforeClose` at the moment a deal reaches Won or Lost and use it for reopening.
- **Rejected:** Reopening directly to New or guessing the prior stage from event history.
- **Why:** The schema already provides an explicit restoration field, and reopening must return to the immediately previous stage.

## Phase 5 Decision 4

- **Chose:** Update the deal and append its `STAGE_CHANGED` event in one Prisma transaction.
- **Rejected:** Performing the two writes independently.
- **Why:** A lifecycle state without its immutable event, or an event without the state change, would make the audit record unreliable.

## Phase 6 Decision 1

- **Chose:** Reuse the existing collaborator relationship as the deal-access boundary.
- **Rejected:** Adding a separate permission table or exposing collaborator membership only in the frontend.
- **Why:** The schema and Phase 4 access predicate already model owner-or-collaborator visibility, so membership changes immediately and consistently affect server-side access.

## Phase 6 Decision 2

- **Chose:** Only managers and the deal owner can add or remove collaborators.
- **Rejected:** Allowing any collaborator to manage the team.
- **Why:** The README assigns membership management to the manager or owner; collaborators receive deal access and update ability without gaining administrative control.

## Phase 6 Decision 3

- **Chose:** Permit only Sales Rep users as collaborators and keep owner membership separate.
- **Rejected:** Adding managers or duplicating the owner as a collaborator.
- **Why:** The assignment defines collaborators as Sales Reps, and the owner already has access without a second membership meaning.

## Phase 6 Decision 4

- **Chose:** Rely on the existing composite primary key for uniqueness and translate duplicate errors into a clear API response.
- **Rejected:** A pre-check alone or a second uniqueness mechanism.
- **Why:** The database constraint remains authoritative under concurrent requests, while the route avoids leaking raw Prisma errors.

## Phase 7 Decision 1

- **Chose:** Perform search, filtering, sorting, authorization, pagination, and counting in Prisma/database queries.
- **Rejected:** Loading every accessible deal into React and filtering or paginating in JavaScript.
- **Why:** Server-side querying preserves the existing access boundary, scales with the dataset, and prevents manipulated client parameters from revealing unauthorized records.

## Phase 7 Decision 2

- **Chose:** Use an explicit sort allowlist with `lastUpdate` as the default and `id ASC` as a deterministic tie-breaker.
- **Rejected:** Passing arbitrary query-string field names into Prisma `orderBy`.
- **Why:** The API exposes only the three assignment-approved sort concepts and pagination remains stable when records share the same value or timestamp.

## Phase 8 Decision 1

- **Chose:** Return an independent result for every selected ID and persist each successful operation transactionally with its event.
- **Rejected:** All-or-nothing batch transactions or silently dropping invalid records.
- **Why:** The assignment requires mixed selections to report exactly which deals succeeded and why others were rejected, while each successful state/history pair must remain atomic.

## Phase 8 Decision 2

- **Chose:** Generate CSV on the server from a separate unpaginated authorized open-deal query.
- **Rejected:** Building CSV in React from the visible page or stitching paginated API responses in the browser.
- **Why:** The export must include the complete authorized set, preserve access control, and calculate weighted monetary values consistently with backend configuration.

## Phase 9 Decision 1

- **Chose:** Aggregate dashboard data on the server with the shared access predicate, using Prisma counts/grouping and stage-filtered decimal aggregates.
- **Rejected:** Downloading all deals into React and calculating metrics or authorization in the browser.
- **Why:** Dashboard totals must not leak unauthorized deals, and the server can return only the small aggregate payload required by the charts.

## Phase 9 Decision 2

- **Chose:** Use Recharts for stage, owner, and weekly Won visualizations with Monday-start UTC buckets.
- **Rejected:** Adding another chart dependency or letting the browser derive week boundaries.
- **Why:** Recharts is already installed, and a single documented server-side week boundary keeps date-sensitive results consistent.

## Phase 10 Decision 1

- **Chose:** Reuse `DealEvent` as the single append-only history source and expose only a per-deal read endpoint.
- **Rejected:** Creating a second timeline table or event mutation APIs.
- **Why:** The existing event model already stores stage, owner, actor, and note details, and read-only access preserves the assignment's immutable history requirement.

## Phase 10 Decision 2

- **Chose:** Add notes as validated plain-text `NOTE_ADDED` events rather than a separate Note model.
- **Rejected:** Editable/deletable comments, threads, or a parallel notes table.
- **Why:** `noteBody` already supports the required immutable record, and plain-text rendering avoids introducing HTML injection or unnecessary feature scope.

## Phase 10 Decision 3

- **Chose:** Fetch history only for the open deal detail view and order it oldest-first on the server.
- **Rejected:** Loading all event history in the deal list or sorting arbitrary event results in React.
- **Why:** Per-deal loading keeps the list efficient, while backend ordering gives every client the same chronological timeline.

## Phase 11 Decision 1

- **Chose:** Key dismissal state by deal, dismissing user, and the current expected-close-date snapshot.
- **Rejected:** A permanent `dismissed` flag on Deal or deleting old dismissal rows when dates change.
- **Why:** A changed expected close date must create a fresh alert state while preserving the historical dismissal record.

## Phase 11 Decision 2

- **Chose:** Derive alerts from current open/deleted/date state and matching dismissal rows at request time.
- **Rejected:** A mutable alert-status field, cron job, or background notification table.
- **Why:** The required behavior is deterministic from existing deal state, avoids duplicated state, and needs no real-time infrastructure.

## Phase 11 Decision 3

- **Chose:** Allow owners to dismiss; managers and collaborators can view alerts but cannot dismiss another owner's alert.
- **Rejected:** Granting dismissal to every user who can view or manage the deal.
- **Why:** The assignment assigns responsibility for the overdue deal to its owner, while existing deal access still governs visibility.

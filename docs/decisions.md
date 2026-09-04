# Decisions

Log the decisions that actually shaped this codebase â€” the ones where a real alternative existed and
you picked one. At least five entries. For each: what you chose, what you rejected, and why. At least
one entry must be a decision you later reversed â€” say what changed your mind. It can be any entry
below, not necessarily the last one; add a **Later reversed:** line to whichever one it is.

## Decision 1

- **Chose:**
- **Rejected:**
- **Why:**

## Decision 2

- **Chose:**
- **Rejected:**
- **Why:**

## Decision 3

- **Chose:**
- **Rejected:**
- **Why:**

## Decision 4

- **Chose:**
- **Rejected:**
- **Why:**

## Decision 5

- **Chose:**
- **Rejected:**
- **Why:**

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

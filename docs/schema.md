# Schema

Answer each of these, in your own words.

- Table by table: what columns and types does each one have?
- Which relationships are one-to-many, and which are many-to-many?
- Which constraints are enforced by the database, and which by application code â€” and why did you draw the line there?
- What did you deliberately denormalise?
- What would break first if this had 100x the data?

---

## Phase 0 foundation (current state)

Prisma is configured with a PostgreSQL datasource using `DATABASE_URL` and a generated JavaScript client. No application models, tables, relations, constraints, denormalisation, or migrations have been designed yet; those decisions belong to Phase 1 so they can be driven by the CRM requirements.

---

## Phase 1 — Prisma data model

### Models and columns

- **User:** UUID primary key; unique 320-character email; bcrypt password hash; `MANAGER` or `SALES_REP` role; creation and update timestamps.
- **Company:** UUID primary key; name, industry, website, owner foreign key, nullable `archivedAt`, and timestamps. `archivedAt` is the archive/restore state; no company is deleted merely by archiving.
- **Deal:** UUID primary key; required company and owner foreign keys; title; `Decimal(14,2)` value; PostgreSQL `DATE` expected close date; stage enum; nullable close timestamp and pre-close stage; nullable soft-delete timestamp; and timestamps.
- **DealCollaborator:** composite primary key of deal and user IDs, plus timestamp. It is the many-to-many join table and prevents duplicate collaboration rows.
- **DealEvent:** UUID primary key; deal and actor foreign keys; event type; optional old/new stages, backward reason, previous/new owners, note body, and occurrence timestamp. This is the unified append-only timeline.
- **DealAlertDismissal:** UUID primary key; deal, dismissing user, expected-close-date snapshot, and dismissal timestamp. Its composite unique key prevents duplicate dismissals for the same date version.

### Relationships

A user owns many companies and deals. A company has many deals. Deals and sales reps are many-to-many through `DealCollaborator`. A deal has many timeline events and alert dismissals. Timeline events retain separate actor, previous-owner, and new-owner references.

### Constraints and enforcement

PostgreSQL enforces primary/foreign keys, UUID identity, unique user email, the collaborator composite primary key, date-scoped alert-dismissal uniqueness, enum values, non-null required fields, and `Decimal(14,2)` deal values. Foreign keys use `RESTRICT` so a hard deletion cannot silently erase timeline records or relationship history. The nullable `deletedAt` field supports later soft deletion of deals instead of destructive deletion.

Application code must enforce role-specific ownership, collaborator eligibility as sales reps, lifecycle transition sequencing, backward-move reasons, consistency of closed fields with `WON`/`LOST`, append-only writes to `DealEvent`, and the event-type-specific optional fields. These require transaction-aware business context that a Prisma schema alone cannot safely express.

### Indexes and scale

Indexes cover user roles; company owner/archive and archive/name access; deal company/stage, owner/stage, owner/update time, stage/expected close date, expected close date, and title; collaborator lookup by user; event timeline/actor/type access; and owner alert-dismissal lookups. They support later server-side visibility, filtering, pagination, overdue-alert, dashboard, and timeline queries. At 100x data, case-insensitive substring search across deal and company names is expected to become the first bottleneck; PostgreSQL full-text/trigram indexing should be evaluated from production query evidence rather than added prematurely.

No reporting totals or weighted values are denormalised. Dashboard values will be calculated from indexed deal data, avoiding stale aggregates during the take-home scope.

### Seed strategy

`prisma/seed.js` is idempotent for its demo users, companies, deals, collaborators, and representative events. It hashes the seed-time demo password with bcrypt before persistence. The seed ran successfully against the local database: 1 manager, 3 sales reps, 4 companies, 5 deals, 2 collaborator relationships, and 9 events. Finalized role demo credentials are now recorded in `SUBMISSION.md`.



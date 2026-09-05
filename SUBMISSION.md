# Submission

## Links

- **GitHub repository:** https://github.com/NishaKushwah2004/sales_CRM
- **Live application:** Pending deployment - not completed yet.

## Notes for the reviewer

The repository contains the completed CRM feature work through Phase 11, plus the later authentication registration/navigation follow-up. A live deployment has not been completed, so there is no production URL to open yet. PostgreSQL/Docker was unavailable in the final local environment; request-level isolated harnesses and static validation were used where appropriate, and database-backed results are not claimed.

## Demo credentials

All seeded demo users use the password `DemoPassword123!`.

| Role | Email | Password |
|------|-------|----------|
| Sales Manager | manager@demo.salescrm.test | DemoPassword123! |
| Sales Rep | ava@demo.salescrm.test | DemoPassword123! |
| Sales Rep | ben@demo.salescrm.test | DemoPassword123! |
| Sales Rep | chloe@demo.salescrm.test | DemoPassword123! |

## Stack

| Layer | What you used | Why |
|-------|---------------|-----|
| Frontend | React, Vite, React Router, Axios, Tailwind CSS v4, Recharts | The implemented browser UI and dashboard/chart stack. |
| Backend | Node.js, Express, Prisma Client, bcrypt, JWT | Server-side API, persistence access, password hashing, and HTTP-only cookie sessions. |
| Database | PostgreSQL | Relational persistence for users, companies, deals, collaborators, events, and alert dismissals. |
| Hosting | Pending deployment | Deployment has not been completed. |

## Goal checklist

| # | Goal | Status | Notes |
|---|------|--------|-------|
| 1 | Accounts and roles | Done | JWT HTTP-only cookie auth, bcrypt, Manager/Sales Rep roles, and server-side authorization. |
| 2 | Companies | Done | CRUD-style management, ownership access, archive, and restore. |
| 3 | Deals inside companies | Done | Exact decimal values, company relationship, owner, CRUD, and soft deletion. |
| 4 | Deal lifecycle | Done | Explicit transitions, backward reasons, close/reopen behavior, probabilities, and events. |
| 5 | Collaborators | Done | Sales Rep collaborators, manager/owner management, and owner-or-collaborator access. |
| 6 | Finding deals | Done | Server-side search, filters, allowlisted sorting, pagination, and totals. |
| 7 | Acting on many deals at once | Done | Manager bulk reassignment/advance with per-deal results and server-generated CSV export. |
| 8 | Dashboard | Done | Server-side metrics, weighted pipeline, stage/owner breakdowns, and eight-week Won chart. |
| 9 | Immutable history | Done | Read-only per-deal timeline, append-only events, and plain-text notes. |
| 10 | Past-due alerts | Done | Server-derived alerts, owner-only dismissal, expected-date reset semantics, and navigation count badge. |

## How much time did you actually spend?

Exact clock time was not recorded. The phase plan contains one explicit historical estimate for Phase 4 (90 minutes); the remaining effort records are transparently marked as retrospective scope notes rather than fabricated timings.

## What would you do next, with another 12 hours?

Complete deployment and database-backed end-to-end verification, then perform the assignment's Phase 12 testing/security pass. I would also address the existing frontend bundle-size warning and improve automated test coverage around the cross-phase authorization contracts.

## What are you least happy with in this codebase, and why?

The application has limited automated test infrastructure and the frontend has some large compact components. PostgreSQL/Docker unavailability also prevented a final database-backed integration run, so some verification currently relies on isolated request-level harnesses plus static checks.

## Completion status

- Features through Phase 11: completed in the repository.
- Deployment: pending; no live URL claimed.
- Phase 12 testing/security: not completed or claimed.
- Git commit/push for this documentation pass: not performed.

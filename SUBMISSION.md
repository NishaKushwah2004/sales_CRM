# Sales CRM — Submission

## Links

* **GitHub repository:** https://github.com/NishaKushwah2004/sales_CRM
* **Live application:** Pending deployment - not completed yet.

## Notes for the reviewer

This repository contains the completed Sales CRM implementation covering all 10 mandatory assignment goals, followed by Phase 12 hardening and Phase 13 Tasks & Follow-up Reminders.

The implementation includes role-based access control, company and deal management, deal lifecycle management, collaborators, server-side deal finding, bulk actions, CSV export, dashboard reporting, immutable deal history, past-due alerts, and deal-scoped task management.

A live deployment has not yet been completed, so no production URL is claimed at this stage.

Where a database-backed environment was unavailable during local verification, database-backed results are not claimed. Static validation, request-level authorization checks, and available automated tests were used where appropriate.

## Demo credentials

All seeded demo users use the password `DemoPassword123!`.

| Role          | Email                                                           | Password         |
| ------------- | --------------------------------------------------------------- | ---------------- |
| Sales Manager | [manager@demo.salescrm.test](mailto:manager@demo.salescrm.test) | DemoPassword123! |
| Sales Rep     | [ava@demo.salescrm.test](mailto:ava@demo.salescrm.test)         | DemoPassword123! |
| Sales Rep     | [ben@demo.salescrm.test](mailto:ben@demo.salescrm.test)         | DemoPassword123! |
| Sales Rep     | [chloe@demo.salescrm.test](mailto:chloe@demo.salescrm.test)     | DemoPassword123! |

## Stack

| Layer          | What you used                                               | Why                                                                                           |
| -------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Frontend       | React, Vite, React Router, Axios, Tailwind CSS v4, Recharts | Browser UI, routing, API communication, styling, and dashboard visualizations.                |
| Backend        | Node.js, Express.js, Prisma Client, bcrypt, JWT             | Server-side API, database access, password hashing, authentication, and authorization.        |
| Database       | PostgreSQL                                                  | Relational persistence for users, companies, deals, collaborators, events, alerts, and tasks. |
| Authentication | JWT + HTTP-only cookies                                     | Secure session handling with server-side role and access checks.                              |
| Hosting        | Pending deployment                                          | Deployment has not yet been completed.                                                        |

## Goal checklist

| #  | Goal                         | Status | Notes                                                                                                                                                                                         |
| -- | ---------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1  | Accounts and roles           | Done   | Email/password authentication, Manager/Sales Rep roles, bcrypt password hashing, JWT HTTP-only cookies, and server-side authorization.                                                        |
| 2  | Companies                    | Done   | Company creation/editing, ownership, archive, restore, and access-controlled visibility.                                                                                                      |
| 3  | Deals inside companies       | Done   | Deal CRUD, exact decimal values, expected close dates, company relationship, owner, and closed-deal protection.                                                                               |
| 4  | Deal lifecycle               | Done   | Explicit New → Qualified → Proposal → Negotiation → Won/Lost transitions, fixed probabilities, one-stage backward movement with reasons, closed-deal protection, and manager reopen behavior. |
| 5  | Collaborators                | Done   | Multiple Sales Rep collaborators, owner/manager management, collaborator access, and assignee validation against existing deal access.                                                        |
| 6  | Finding deals                | Done   | Server-side search, company/stage/owner filters, allowlisted sorting, pagination, and total counts without loading all deals into the browser.                                                |
| 7  | Acting on many deals at once | Done   | Manager bulk reassignment and bulk advancement with per-deal success/failure results, closed-deal protection, selection limits, and CSV export of open deals with weighted values.            |
| 8  | Dashboard                    | Done   | Open deals, weighted pipeline, Won/Lost this month, open deals by stage/owner, and Won-per-week for the last eight weeks.                                                                     |
| 9  | Immutable history            | Done   | Append-only deal events, stage-change details including backward reasons and actors, owner reassignment history, notes, and read-only timeline behavior.                                      |
| 10 | Past-due alerts              | Done   | Server-derived alerts for open overdue deals, navigation count badge, owner dismissal, and expected-date reset semantics.                                                                     |

## Phase 12 — Hardening

Phase 12 was completed as a hardening pass after the mandatory CRM functionality.

The hardening work includes:

* Backend syntax validation.
* Automated backend test coverage.
* Prisma schema validation/client generation.
* API security headers.
* Safe fallback behavior for malformed `PORT` configuration.
* Server-side protection against editing closed deals.
* Bulk selection capped at 100 deals.
* Debounced/cancelable deal-list requests.
* Authorization-focused validation around existing CRM contracts.
* Removal of unnecessary debug startup logging.

The available backend test suite completed successfully with **5/5 tests passing** in the validated environment.

Frontend validation/build is environment-dependent where required npm packages are not available locally; no unavailable database-backed or package-dependent result is represented as a successful test.

## Phase 13 — Tasks & Follow-up Reminders

The optional Tasks & Follow-up Reminders stretch feature has also been implemented.

Tasks are scoped to individual deals and support:

* Task title.
* Optional description.
* Optional due date.
* Pending/Completed status.
* Completion timestamp.
* Task editing.
* Task deletion.
* Task assignment to Sales Reps who already have access to the deal.
* Derived overdue task state in the UI.

### Task permissions

* **Manager:** full task management.
* **Deal owner:** full task management.
* **Deal collaborator:** can view and update task content/status, including completing and reopening tasks.
* Collaborators cannot create, delete, or reassign tasks.
* Task assignees must already have access to the deal.
* Task assignment is restricted to Sales Rep users.
* Task mutations are intentionally separate from immutable `DealEvent` history.

No unrelated project-management features such as recurring tasks, subtasks, comments, or a global task dashboard were added.

## Validation status

### Backend

* Source syntax checks: passed.
* Automated backend tests: passed — 5/5.
* Prisma validation/generation: completed as part of the hardening workflow.
* Server-side authorization paths were exercised through available request-level tests/harnesses.

### Frontend

* Existing frontend functionality was validated during implementation.
* Lint/build verification is dependent on the locally available npm package cache/environment.
* No build result is claimed when the required package dependency was unavailable.

### Database

PostgreSQL/Docker availability was limited during portions of final local verification. Therefore, database-backed integration results are not represented as successful unless they were actually executed against a working database.

## How much time did you actually spend?

Exact clock time was not recorded. The project was implemented incrementally by phase, with the documented phase plan used to track scope and progress rather than inventing retrospective time measurements.

## What would you do next, with another 12 hours?

The next priority would be:

1. Deploy the PostgreSQL database.
2. Deploy the backend API.
3. Deploy the frontend.
4. Configure production environment variables and CORS.
5. Run database-backed end-to-end verification against the deployed application.
6. Verify the seeded demo accounts and core Manager/Sales Rep workflows.
7. Update this document with the verified live URL and final deployment details.
8. Perform one final submission review.

I would avoid adding additional stretch features until the deployed mandatory functionality has been verified.

## What are you least happy with in this codebase, and why?

The frontend still contains some relatively large components that could be broken into smaller reusable components with more time.

The automated integration-test environment could also be stronger, particularly for database-backed end-to-end authorization scenarios. During local development, PostgreSQL/Docker availability limited some final integration verification, so the project uses a combination of automated tests, request-level authorization checks, static validation, and manual verification.

## Repository and documentation

The project documentation includes:

* `docs/architecture.md`
* `docs/schema.md`
* `docs/plan.md`
* `docs/decisions.md`
* `docs/ai-prompts.md`

These documents describe the implemented architecture, database model, development phases, technical decisions, and AI-assisted development prompts.

Git history has been maintained incrementally by phase rather than squashing the implementation into one commit.

## Completion status

* Mandatory CRM Goals 1–10: **Completed**
* Phase 12 hardening: **Completed**
* Phase 13 Tasks & Follow-up Reminders: **Completed**
* Documentation: **Completed and aligned with current implementation**
* Deployment: **Pending**
* Production database-backed end-to-end verification: **Pending deployment**
* Live application URL: **Pending deployment**
* Final submission verification: **Pending deployment**

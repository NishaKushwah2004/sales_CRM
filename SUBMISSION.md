# Sales CRM — Submission

## Links

- **GitHub repository:** https://github.com/NishaKushwah2004/sales_CRM
- **Live application:** https://sales-crm-gules-nine.vercel.app/
- **Backend API:** https://sales-crm-backend-i8ql.onrender.com
- **API health check:** https://sales-crm-backend-i8ql.onrender.com/api/health

## Notes for the reviewer

This repository contains the completed Sales CRM implementation covering all 10 mandatory assignment goals, followed by Phase 12 hardening and Phase 13 Tasks & Follow-up Reminders.

The implementation includes role-based access control, company and deal management, deal lifecycle management, collaborators, server-side deal finding, bulk actions, CSV export, dashboard reporting, immutable deal history, past-due alerts, and deal-scoped task management.

The application has been deployed with:

- **Frontend:** Vercel
- **Backend API:** Render
- **Database:** PostgreSQL hosted on Supabase

The deployed application has been manually verified with the seeded demo credentials below.

## Demo credentials

All seeded demo users use the password `DemoPassword123!`.

| Role | Email | Password |
|---|---|---|
| Sales Manager | manager@demo.salescrm.test | DemoPassword123! |
| Sales Rep | ava@demo.salescrm.test | DemoPassword123! |
| Sales Rep | ben@demo.salescrm.test | DemoPassword123! |
| Sales Rep | chloe@demo.salescrm.test | DemoPassword123! |

## Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React, Vite, React Router, Axios, Tailwind CSS v4, Recharts | Browser UI, routing, API communication, styling, and dashboard visualizations |
| Backend | Node.js, Express.js, Prisma Client, bcrypt, JWT | REST API, database access, authentication, password hashing, and authorization |
| Database | PostgreSQL / Supabase | Persistence for users, companies, deals, collaborators, events, alerts, and tasks |
| Authentication | JWT + HTTP-only cookies | Secure session handling with server-side role and access checks |
| Frontend Hosting | Vercel | Production frontend deployment |
| Backend Hosting | Render | Production API deployment |
| Database Hosting | Supabase | Production PostgreSQL database |

## Goal checklist

| # | Goal | Status | Notes |
|---|---|---|---|
| 1 | Accounts and roles | Done | Email/password authentication, Manager/Sales Rep roles, bcrypt password hashing, JWT HTTP-only cookies, and server-side authorization |
| 2 | Companies | Done | Company creation/editing, ownership, archive, restore, and access-controlled visibility |
| 3 | Deals inside companies | Done | Deal CRUD, exact decimal values, expected close dates, company relationship, owner, and closed-deal protection |
| 4 | Deal lifecycle | Done | Explicit New → Qualified → Proposal → Negotiation → Won/Lost transitions, fixed probabilities, one-stage backward movement with reasons, closed-deal protection, and manager reopen behavior |
| 5 | Collaborators | Done | Multiple Sales Rep collaborators, owner/manager management, collaborator access, and assignee validation against existing deal access |
| 6 | Finding deals | Done | Server-side search, company/stage/owner filters, allowlisted sorting, pagination, and total counts without loading all deals into the browser |
| 7 | Acting on many deals at once | Done | Manager bulk reassignment and bulk advancement with per-deal success/failure results, closed-deal protection, selection limits, and CSV export of open deals with weighted values |
| 8 | Dashboard | Done | Open deals, weighted pipeline, Won/Lost this month, open deals by stage/owner, and Won-per-week for the last eight weeks |
| 9 | Immutable history | Done | Append-only deal events, stage-change details including backward reasons and actors, owner reassignment history, notes, and read-only timeline behavior |
| 10 | Past-due alerts | Done | Server-derived alerts for open overdue deals, navigation count badge, owner dismissal, and expected-date reset semantics |

## Phase 12 — Hardening

Phase 12 was completed as a hardening pass after the mandatory CRM functionality.

The hardening work includes:

- Backend syntax validation
- Automated backend test coverage
- Prisma schema validation/client generation
- API security headers
- Safe fallback behavior for malformed `PORT` configuration
- Server-side protection against editing closed deals
- Bulk selection capped at 100 deals
- Debounced/cancelable deal-list requests
- Authorization-focused validation around existing CRM contracts
- Removal of unnecessary debug startup logging

The available backend test suite completed successfully with **5/5 tests passing** in the validated environment.

## Phase 13 — Tasks & Follow-up Reminders

The optional Tasks & Follow-up Reminders stretch feature has also been implemented.

Tasks are scoped to individual deals and support:

- Task title
- Optional description
- Optional due date
- Pending/Completed status
- Completion timestamp
- Task editing
- Task deletion
- Task assignment to Sales Reps who already have access to the deal
- Derived overdue task state in the UI

### Task permissions

- **Manager:** full task management
- **Deal owner:** full task management
- **Deal collaborator:** can view and update task content/status, including completing and reopening tasks
- Collaborators cannot create, delete, or reassign tasks
- Task assignees must already have access to the deal
- Task assignment is restricted to Sales Rep users
- Task mutations are intentionally separate from immutable `DealEvent` history

No unrelated project-management features such as recurring tasks, subtasks, comments, or a global task dashboard were added.

## Validation status

### Backend

- Source syntax checks: passed
- Automated backend tests: passed — **5/5**
- Prisma schema validation/generation: completed
- Server-side authorization paths were exercised through available request-level tests/harnesses
- Production backend health endpoint verified successfully

### Frontend

- Frontend application successfully built and deployed through Vercel
- Production frontend is accessible at:
  https://sales-crm-gules-nine.vercel.app/
- Production authentication and application workflows were manually verified

### Database

The production PostgreSQL database is hosted on Supabase.

The production database was successfully migrated and seeded with:

- **4 users**
- **4 companies**
- **5 deals**

The seeded demo users were verified through the working application.

## Deployment

### Frontend

Hosted on **Vercel**.

**Live URL:**

https://sales-crm-gules-nine.vercel.app/

The frontend uses the production backend API through the `VITE_API_URL` environment variable.

### Backend

Hosted on **Render**.

**Backend URL:**

https://sales-crm-backend-i8ql.onrender.com

**Health endpoint:**

https://sales-crm-backend-i8ql.onrender.com/api/health

The backend uses production environment variables for:

- PostgreSQL connection
- JWT secret
- JWT expiration
- HTTP-only cookie configuration
- Frontend CORS origin

Secrets are kept in deployment environment variables and are not committed to the repository.

### Database

Hosted on **Supabase PostgreSQL**.

The database contains the required schema, seed data, relationships, collaborators, timeline events, alerts, and task records.

## Production verification

The deployed application was verified using the seeded Manager account:

`manager@demo.salescrm.test`

and:

`DemoPassword123!`

The following production flow was verified:

1. Frontend loads successfully.
2. User can log in.
3. Authentication is maintained through the backend.
4. Dashboard data loads.
5. Companies and deals are accessible according to the user's role/access.
6. Production backend responds successfully.
7. Production database contains the seeded demo data.

## How much time did you actually spend?

Exact clock time was not recorded. The project was implemented incrementally by phase, with the documented phase plan used to track scope and progress rather than inventing retrospective time measurements.

## What would you do next, with another 12 hours?

With another 12 hours, I would prioritize:

1. Further UI/UX refinement and consistency across all CRM screens.
2. Expand automated database-backed end-to-end tests.
3. Improve reusable frontend component structure.
4. Add additional production monitoring and error reporting.
5. Perform a final accessibility and responsive-design review.
6. Improve deployment documentation and operational runbooks.

I would avoid adding additional stretch features until the existing mandatory functionality and production deployment are thoroughly validated.

## What are you least happy with in this codebase, and why?

The frontend still contains some relatively large components that could be broken into smaller reusable components with more time.

The automated integration-test environment could also be stronger, particularly for database-backed end-to-end authorization scenarios.

The current implementation prioritizes correctness, server-side authorization, assignment requirements, and production deployment over extensive frontend abstraction.

## Repository and documentation

The project documentation includes:

- `docs/architecture.md`
- `docs/schema.md`
- `docs/plan.md`
- `docs/decisions.md`
- `docs/ai-prompts.md`

These documents describe the implemented architecture, database model, development phases, technical decisions, and AI-assisted development prompts.

Git history has been maintained incrementally by phase rather than squashing the implementation into one commit.

## Completion status

- Mandatory CRM Goals 1–10: **Completed**
- Phase 12 hardening: **Completed**
- Phase 13 Tasks & Follow-up Reminders: **Completed**
- Documentation: **Completed**
- PostgreSQL database deployment: **Completed**
- Backend deployment: **Completed**
- Frontend deployment: **Completed**
- Production database migration and seed: **Completed**
- Production authentication verification: **Completed**
- Live application URL: **Available**
- Final deployment verification: **Completed**

## Final submission

**Live application:**  
https://sales-crm-gules-nine.vercel.app/

**GitHub repository:**  
https://github.com/NishaKushwah2004/sales_CRM

**Backend API:**  
https://sales-crm-backend-i8ql.onrender.com

**Demo Manager:**  
`manager@demo.salescrm.test`

**Demo Password:**  
`DemoPassword123!`
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

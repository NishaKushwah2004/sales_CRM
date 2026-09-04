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

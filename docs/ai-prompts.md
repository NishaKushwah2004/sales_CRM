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


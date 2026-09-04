# Decisions

Log the decisions that actually shaped this codebase — the ones where a real alternative existed and
you picked one. At least five entries. For each: what you chose, what you rejected, and why. At least
one entry must be a decision you later reversed — say what changed your mind. It can be any entry
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

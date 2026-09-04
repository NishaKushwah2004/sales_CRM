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

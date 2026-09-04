# Schema

Answer each of these, in your own words.

- Table by table: what columns and types does each one have?
- Which relationships are one-to-many, and which are many-to-many?
- Which constraints are enforced by the database, and which by application code — and why did you draw the line there?
- What did you deliberately denormalise?
- What would break first if this had 100x the data?

---

## Phase 0 foundation (current state)

Prisma is configured with a PostgreSQL datasource using `DATABASE_URL` and a generated JavaScript client. No application models, tables, relations, constraints, denormalisation, or migrations have been designed yet; those decisions belong to Phase 1 so they can be driven by the CRM requirements.

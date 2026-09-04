# Architecture

Answer each of these, in your own words, once the system has taken real shape.

- What are the moving pieces, and how do they talk to each other?
- Where does each piece run?
- What is the request path for one representative user action, end to end?
- What did you decide *not* to build, and why?

---

## Phase 0 foundation (current state)

The application is structured as a React/Vite browser client calling an Express API with Axios. Express is prepared to use Prisma against PostgreSQL. Local development uses Docker PostgreSQL; production is intended to use Supabase PostgreSQL. Authentication will remain in Express using bcrypt, JWTs, and HTTP-only cookies, but it is not implemented in Phase 0.

The current representative request is `GET /api/health`: the browser or other client requests Express, which loads environment variables, applies CORS, JSON, and cookie middleware, and returns a health response. Database-backed CRM actions are intentionally deferred until the feature phases.

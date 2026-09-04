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

---

## Phase 2 — Authentication and roles

Authentication is implemented by Express, not Supabase. The React client uses an Axios instance configured with `withCredentials: true`; it posts credentials to `/api/auth/login`. Express finds the seeded Prisma user, compares the supplied password with bcrypt, signs a minimal JWT containing only the user ID, and sends it as an HTTP-only session cookie. The JWT never appears in a JSON response or browser storage.

On browser startup, the auth provider calls `/api/auth/me` to restore the session. Auth middleware reads and verifies the cookie, reloads the user from PostgreSQL, and attaches only the safe user fields to the request. Role middleware then checks the current database role on protected server routes. `/api/auth/manager-check` is a deliberately limited authentication demonstration route; it is not business functionality.

For local development the cookie is `httpOnly`, `sameSite=lax`, and non-secure so it works over localhost HTTP. In production (`NODE_ENV=production`), it is `secure` and `sameSite=none` for the planned separate frontend/backend HTTPS deployment. CORS accepts only `CLIENT_URL` with credentials enabled.

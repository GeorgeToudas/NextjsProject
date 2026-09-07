# NextjsProject

A full-stack trial application built to explore Next.js App Router, file-system routing, dynamic UI state management, and relational database integration.

Based on the starter template for the [Next.js App Router Course](https://nextjs.org/learn).

## Contents

- [Next.js Foundations](#nextjs-foundations)
- [Database: TypeORM, migrations, and seeding](#database-typeorm-migrations-and-seeding)
- [Custom Authentication](#custom-authentication)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)

## Next.js Foundations

Completed the [Next.js App Router Course](https://nextjs.org/learn) dashboard build-out on top of the starter template:

- Dashboard routes for customers, invoices (list, create, edit), with route-level `error.tsx` and `not-found.tsx` handling for the invoice edit page.
- Server Actions in [`app/lib/actions.ts`](app/lib/actions.ts) for creating/updating/deleting invoices.
- Login page and form (`app/login/page.tsx`, `app/ui/login-form.tsx`) originally wired to NextAuth.js — since replaced, see [Custom Authentication](#custom-authentication) below.
- Static assets (`favicon.ico`, `opengraph-image.png`) moved from `public/` into `app/`, per the App Router convention of colocating them with the root layout.

## Database: TypeORM, migrations, and seeding

The project runs Postgres locally via [`docker-compose.yml`](docker-compose.yml) — a single `db` service that generates a fresh self-signed TLS certificate on every container start (the app hardcodes `ssl: 'require'` on every DB connection, so the server must offer TLS or every query, including `pnpm run seed`, fails to connect).

Schema and data access moved from raw SQL to TypeORM:

- Entities in [`app/lib/entities/`](app/lib/entities/): `User`, `Customer`, `Invoice`, `Revenue`.
- [`app/lib/data-source.ts`](app/lib/data-source.ts) — the runtime `DataSource` used by the Next.js app (API routes, Server Actions).
- [`typeorm.config.ts`](typeorm.config.ts) — a separate `DataSource` used only by the TypeORM CLI (migrations, `migration:generate`), since the CLI runs outside of Next.js and needs `dotenv` loaded manually.
- **Migrations are the only path for schema changes** — `synchronize` stays `false`. A single `InitialSchema` migration ([`migrations/1787660724695-InitialSchema.ts`](migrations)) creates the schema from scratch; this was verified against an empty database, with `migration:revert` demonstrated to cleanly undo it.
- The `Invoice → Customer` relation carries an explicit `ON DELETE RESTRICT`.
- [`app/lib/seed.ts`](app/lib/seed.ts) populates data through TypeORM repositories instead of raw SQL, run via `pnpm run seed`.

## Custom Authentication

The tutorial's NextAuth.js setup (`auth.ts`, `auth.config.ts`, `proxy.ts`) has been removed and replaced with a hand-built register/login/logout flow using TypeORM, bcrypt, zod, and jose (JWT signing). The goal was to understand how authentication works under the hood — hashing, session issuance, cookie security flags — rather than delegate it to a library.

References to the deleted files were cleaned up from [`app/lib/actions.ts`](app/lib/actions.ts), [`app/login/page.tsx`](app/login/page.tsx), [`app/ui/dashboard/sidenav.tsx`](app/ui/dashboard/sidenav.tsx), and [`app/ui/login-form.tsx`](app/ui/login-form.tsx).

### `POST /api/register`

[`app/api/register/route.ts`](app/api/register/route.ts)

- Validates the request body with zod: valid email format, password ≥ 8 characters.
- Rejects duplicate emails with `409 Conflict`.
- Hashes the password with `bcrypt.hash(password, 10)` — bcrypt generates and embeds its own random salt, so no manual salt handling is needed.
- Returns `201 Created` with only `{ id, name, email }` — the hash is never returned.

### `POST /api/login`

[`app/api/login/route.ts`](app/api/login/route.ts)

- Validates the body with zod, looks up the user, and compares the password with `bcrypt.compare`.
- Returns the **exact same** `401 Unauthorized` / `{"error":"Invalid credentials"}` whether the user doesn't exist or the password is wrong, so a caller can't enumerate registered emails from the error response.
- On success, signs a JWT (payload: user `id` only, 7-day expiry, signed with `SESSION_SECRET` via `jose`) and sets it as a `session` cookie: `httpOnly`, `sameSite: 'lax'`, `secure` in production only.
- `jose` (not `jsonwebtoken`) was chosen because it works in both the Node.js runtime and the Edge Runtime that Next.js middleware runs under — relevant for the route-protection middleware planned as a follow-up.

### `POST /api/logout`

[`app/api/logout/route.ts`](app/api/logout/route.ts)

Overwrites the `session` cookie with `maxAge: 0` (same flags as login), causing the browser to discard it immediately. No database interaction is needed — logging out only ends the client's session.

### `/register` page (intentionally unwired)

[`app/register/page.tsx`](app/register/page.tsx) is a client component with controlled inputs and inline validation, but submitting only `console.log`s the collected values — it does not call `POST /api/register` yet. Wiring it up is a follow-up task.

### Out of scope for this pass

- **Route protection middleware** — removing NextAuth means nothing currently checks the `session` cookie on protected pages like `/dashboard`; those routes are unprotected until this is rebuilt.
- **Wiring `/register` to the API.**
- **A login page UI** — only the `POST /api/login` endpoint exists so far.

## Environment variables

Copy [`.env.example`](.env.example) to `.env` and fill in the values. Notable entries:

- `POSTGRES_*` — connection details for the local Postgres container.
- `SESSION_SECRET` — signing secret for login session JWTs, generate with:

  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  ```

The real values live only in the local, gitignored `.env` file.

## Scripts

| Command                    | Purpose                                             |
| --------------------------- | ---------------------------------------------------- |
| `pnpm dev`                  | Run the app locally with Turbopack                   |
| `pnpm build` / `pnpm start` | Production build / start                             |
| `pnpm lint`                 | Run ESLint                                           |
| `pnpm migration:run`        | Apply pending TypeORM migrations                     |
| `pnpm migration:revert`     | Revert the last applied migration                    |
| `pnpm migration:generate`   | Generate a new migration from entity changes         |
| `pnpm seed`                 | Populate the database via TypeORM repositories       |

# Personal Bookmark Manager

A personal bookmark manager: users authenticate via Auth0 and manage
private collections of bookmarks. No user can read, list, or infer the existence of another
user's data.

> **Status:** `pbm-service/` has a NestJS scaffold with Prisma wired as the ORM (multi-file
> schema under `pbm-service/prisma/schema/`, `PrismaService`/`PrismaModule` in
> `src/database/`, not yet exporting `PrismaService` to anything but the repository layer).
> Global auth guard, `Collection`, and `Bookmark` modules exist with full CRUD including
> `PUT` (full replace — omitted optional fields are nulled, not left untouched); list routes
> support `limit`/`cursor`/`sort`/`q`, plus `collectionId`/`uncategorised` on bookmarks;
> `GET /me` and `GET /collections/:id/bookmarks` are implemented; the shared exception filter
> of §6 is wired globally. Swagger/OpenAPI docs are served at `GET /docs`, and `npm run
> db:seed` seeds two example owners' worth of collections/bookmarks. `pbm-ui/` now has a
> React + Vite + MUI app wired to the real API: Auth0 PKCE login/logout, and Collections,
> Bookmarks, and an "All" view bound to their respective endpoints (`pbm-ui/src/features/`).
> `pbm-ui` has a Vitest + React Testing Library suite (`npm test` / `npm run test:run`) covering
> the pure utils, the service layer, and the Collections/Bookmarks page data-flow (load, empty,
> error, create, optimistic delete + rollback). This README is corrected as implementation
> lands if anything changes.

## Stack

| Layer | Choice |
| --- | --- |
| Backend | NestJS + Prisma (Postgres) |
| Auth | Auth0 — access token (JWT, RS256), verified against a JWKS; see `DECISIONS.md` ADR-002 |
| Frontend | React + Vite + MUI |

## Repository layout

```
pbm-service/   NestJS API — see API_DESIGN.md for the contract
pbm-ui/        React frontend
transcripts/   Raw session logs (auto-saved via .claude/hooks/save_transcript.py on SessionEnd)
```

## Where the documentation lives

| Doc | Contents |
| --- | --- |
| `API_DESIGN.md` | The API contract: auth, status codes, resources, endpoints, list params, error shape, and how the cross-owner privacy invariant is enforced |
| `DECISIONS.md` | Numbered ADRs for decisions with real alternatives considered (e.g. access-token-vs-ID-token, `SET NULL` vs `CASCADE` on collection delete) |
| `AI_WORKFLOW.md` | How this repo was actually built with coding agents, including failures and how they were caught/recovered |
| `CLAUDE.md` | Rules the coding agent must follow while implementing this repo (repository-layer access, `ownerId` handling, etc.) |

## Running locally

```
cd pbm-service
cp .env.example .env       # DATABASE_URL + Postgres creds
docker compose up -d       # starts Postgres on $POSTGRES_PORT (default 5432)
npm install
npm run db:generate        # prisma generate
npm run start:dev
```

Auth config lives in `.env` (already present in `.env.example`): `AUTH0_ISSUER`,
`AUTH0_AUDIENCE`, `AUTH0_JWKS_URI` — the service fails at boot if any is missing rather
than falling open. Migrations: `npm run db:migrate`. Dev server port: `3001` — port `3000`
is reserved for the `pbm-ui` dev server, since Auth0's app config has a fixed SPA callback
of `http://localhost:3000/callback` (see `DECISIONS.md` ADR-010).
Security matrix test: `npm run test:security` (Postgres must be up).

`pbm-ui` tests: `cd pbm-ui && npm install && npm run test:run` (Vitest + React Testing
Library; no backend or Postgres required — services are mocked).

Example data: `npm run db:seed` creates two fabricated owners (`auth0|example-user-1`,
`auth0|example-user-2`, following the `auth0|test-user-a/b` shape used by the security
matrix), each with two collections and a few bookmarks — enough to exercise pagination,
filtering, and the cross-owner isolation invariant directly against the DB. These are not
tied to the real Auth0 test account, so a live login (`candidate@test.com`, below) still
starts with an empty account.

API docs: Swagger UI is served at `http://localhost:3001/docs` (raw OpenAPI JSON at
`/docs-json`) once the server is running. Every documented route still goes through the
real auth guard — use "Authorize" in the UI with a token from `scripts/get-token.mjs` to
call protected routes from the docs page itself.

## Auth0 configuration

Requests must carry an **access token** (not an ID token) as `Authorization: Bearer <jwt>`,
requested with `audience: https://bbl-candidate-test-api`. See `API_DESIGN.md` §1 and
`DECISIONS.md` ADR-002 for why ID tokens are rejected rather than merely unused.

### Getting a token for manual testing

The Auth0 client does **not** allow the password grant (`Grant type 'password' not allowed
for the client` — verified 2026-07-27), so the only way to mint a token is a real
Authorization Code + PKCE flow:

```
cd pbm-service
node scripts/get-token.mjs   # port 3000 must be free — stop the pbm-ui dev server first
```

It opens the Auth0 login page (test user: `candidate@test.com`), catches the callback on
`http://localhost:3000/callback`, and prints both tokens' decoded header/payload plus the
raw access token for `curl`. The script decodes for inspection only — it never verifies,
and is not application code.

Confirmed token format from a live run (2026-07-27): access token is a JWT, `RS256`,
`iss: https://dev-yg.us.auth0.com/` (trailing slash), `sub` present, 2 h expiry, and
`aud` is an **array** — `["https://bbl-candidate-test-api", "https://dev-yg.us.auth0.com/userinfo"]`.
No `nbf` claim is issued. The ID token's `aud` is the application client ID, which is why
it fails the API's audience check (ADR-002).

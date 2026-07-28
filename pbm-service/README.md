# pbm-service

NestJS + Prisma (Postgres) API for the Personal Bookmark Manager. Users authenticate via
Auth0 and manage private collections of bookmarks; no user can read, list, or infer the
existence of another user's data. See `../API_DESIGN.md` for the full contract and
`../DECISIONS.md` for the ADRs behind the auth/data-access choices.

## Endpoints

| Method | Route | Notes |
| --- | --- | --- |
| GET | `/health` | Public — the only route not behind the auth guard |
| GET | `/me` | Caller identity from the verified JWT |
| POST / GET | `/collections` | Create, list (paginated/filtered) |
| GET / PUT / PATCH / DELETE | `/collections/:id` | Owner-scoped; `PUT` is a full replace |
| GET | `/collections/:id/bookmarks` | Bookmarks within one owned collection |
| POST / GET | `/bookmarks` | Create, list (paginated/filtered) |
| GET / PUT / PATCH / DELETE | `/bookmarks/:id` | Owner-scoped; `PUT` is a full replace |

List routes accept `limit`/`cursor`/`sort`/`q`, plus `collectionId`/`uncategorised` on
bookmarks. Full request/response shapes, status codes, and the cross-owner privacy
invariant are documented in `../API_DESIGN.md`.

## Installation

```bash
cp .env.example .env       # DATABASE_URL + Postgres creds + Auth0 config
docker compose up -d       # starts Postgres on $POSTGRES_PORT (default 5432)
npm install
npm run db:generate        # prisma generate
npm run db:migrate         # apply migrations
```

`.env` must set `AUTH0_ISSUER`, `AUTH0_AUDIENCE`, `AUTH0_JWKS_URI` — the service fails at
boot if any is missing rather than falling open (see `../DECISIONS.md` ADR-002).

## Running the app

```bash
# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

Dev server listens on port `3001` — port `3000` is reserved for the `pbm-ui` dev server,
since Auth0's app config has a fixed SPA callback of `http://localhost:3000/callback`
(see `DECISIONS.md` ADR-010).

### Swagger / API docs

Swagger is mounted in-process — there's no separate command, it comes up automatically
with the app:

```bash
$ npm run start:dev
```

Then open:

- UI: `http://localhost:3001/docs`
- Raw OpenAPI JSON: `http://localhost:3001/docs-json`

Every documented route still goes through the real auth guard — click "Authorize" in the
UI and paste a token from `scripts/get-token.mjs` to call protected routes from the docs
page itself.

### Example data

```bash
$ npm run db:seed
```

Seeds two fabricated owners (`auth0|example-user-1`, `auth0|example-user-2`), each with
collections and bookmarks — enough to exercise pagination, filtering, and cross-owner
isolation directly against the DB. Not tied to the real Auth0 test account, so a live
login still starts with an empty account.

### Getting a token for manual testing

```bash
$ node scripts/get-token.mjs   # port 3000 must be free — stop the pbm-ui dev server first
```

Runs a real Authorization Code + PKCE flow against Auth0 and prints the decoded
header/payload plus the raw access token for `curl`/Swagger. Decodes for inspection only
— it never verifies, and is not application code.

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# security matrix (owner-isolation across every endpoint; Postgres must be up)
$ npm run test:security

# test coverage
$ npm run test:cov
```

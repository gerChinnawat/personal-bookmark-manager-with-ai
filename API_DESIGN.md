# API Design

The contract for the bookmark manager API, and the mechanisms that enforce it.

> **Placeholders:** anything marked `[FILL: …]` must be replaced with something true about
> this repo before submission. Do not ship an unfilled placeholder, and do not fill one with
> a plausible guess — every claim below is meant to be checkable against the committed code.

**Base URL:** `http://localhost:3001` · **Content type:** `application/json` · **Version:** unversioned — single consumer (this take-home's own frontend), no external clients to break; revisit if that changes.

---

## 1. Authentication

| Item | Value |
| --- | --- |
| Credential accepted | Auth0 **access token** only, as `Authorization: Bearer <jwt>` |
| Issuer | `https://dev-yg.us.auth0.com/` (trailing slash — verified against the discovery document) |
| Audience | `https://bbl-candidate-test-api`. **The live token's `aud` is an array** (`["https://bbl-candidate-test-api", "https://dev-yg.us.auth0.com/userinfo"]` — confirmed via a real PKCE flow, 2026-07-27), so the check must accept the audience appearing as a member, not only as a scalar |
| Signing algorithm | `RS256`, pinned. The `alg` header on the token is never trusted |
| Key source | JWKS at `https://dev-yg.us.auth0.com/.well-known/jwks.json` (from the discovery document), cached 10 minutes, refetched immediately on an unknown `kid` |
| Claims verified | signature, `iss`, `aud`, `exp`, `nbf` *when present* (Auth0 does not issue `nbf` on these tokens — confirmed 2026-07-27), `sub` present |
| Identity | `ownerId` is derived from the verified `sub` claim, and from nothing else |

Rationale for choosing the access token over the ID token: see `DECISIONS.md` ADR-002.

**ID tokens are actively rejected**, not merely unused: an ID token's `aud` claim is the
Auth0 application's `client_id`, not `https://bbl-candidate-test-api` — so it legitimately
fails the `aud` check and returns 401. This is standard OIDC semantics, not an implementation
quirk. Proof: `pbm-service/test/security-matrix.e2e-spec.ts` — the "ID token (aud =
client_id)" auth state asserts 401 on every protected route.

Both claims above were confirmed against live tokens on 2026-07-27: the password grant is
disabled on this Auth0 client (`unauthorized_client`), so `pbm-service/scripts/get-token.mjs`
runs a real Authorization Code + PKCE flow and prints the decoded (not verified) header and
payload of both tokens. The access token's `aud` array and the ID token's client-ID `aud`
matched the design assumptions exactly. (Finding and the decision to verify via a live flow:
user-driven; script: agent-written on instruction.)

### Route protection

A global guard denies by default. Every route is authenticated unless explicitly marked
`@Public()`, and the only public route is:

| Route | Why it is public |
| --- | --- |
| `GET /health` | liveness probe, returns no data |

---

## 2. Status codes

The mapping is uniform across resources. The 404-not-403 rule is the load-bearing one.

| Situation | Status | Body |
| --- | --- | --- |
| Success, resource returned | 200 | resource |
| Created | 201 | resource, plus `Location` header |
| Deleted | 204 | empty |
| No / malformed / expired token | 401 | error envelope, `code: UNAUTHENTICATED` |
| Valid token, resource belongs to another user | **404** | error envelope, `code: NOT_FOUND` |
| Valid token, resource does not exist at all | **404** | error envelope, `code: NOT_FOUND` — **byte-identical to the row above** |
| Body fails validation | 400 | error envelope with field-level detail |
| Unique constraint violated | 409 | error envelope, `code: CONFLICT` |
| Unhandled | 500 | error envelope, no internal detail leaked |

**Why 404 and not 403 for cross-owner access.** §3 of the brief forbids a user from learning
of the *existence* of another user's data. A 403 distinguishes "exists but is not yours" from
"does not exist", which is an existence oracle: an attacker can enumerate ids and learn which
ones are real. Returning an identical 404 for both cases collapses that distinction.

This also constrains timing and error text — see §6.

---

## 3. Resources

### Collection

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` (`cuid`) | non-sequential by design — sequential ids leak volume and adjacency across owners |
| `name` | `string` | 1–100 chars, required |
| `ownerId` | `string` | server-assigned from token `sub`; **never accepted from the client on any verb** |
| `createdAt` / `updatedAt` | ISO 8601 | server-assigned |

### Bookmark

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | as above |
| `url` | `string` | `http://` or `https://` only, required — other schemes (`javascript:`, `data:`, `file:`) are rejected with 400 |
| `title` | `string` | required |
| `notes` | `string \| null` | optional |
| `collectionId` | `string \| null` | nullable — a bookmark can be uncategorised |
| `ownerId` | `string` | as above |
| `createdAt` / `updatedAt` | ISO 8601 | |

`ownerId` is present in the model but **is not** serialised in responses.
Rationale: it is always the caller's own id and carries no information the caller doesn't
already have, so omitting it keeps the response surface minimal rather than exposing an
internal identifier for no client benefit.

---

## 4. Endpoints

| Method | Path | Success | Errors | Notes |
| --- | --- | --- | --- | --- |
| `GET` | `/me` | 200 | 401 | returns `{ sub, email, name }` from the token claims only; performs no DB lookup and no upsert — there is no separate Users table, `ownerId` *is* `sub` |
| `GET` | `/collections` | 200 | 401 | list, scoped to owner. See §5 for params |
| `POST` | `/collections` | 201 | 400, 401, 409 | `ownerId` from token |
| `GET` | `/collections/:id` | 200 | 401, 404 | |
| `PUT` | `/collections/:id` | 200 | 400, 401, 404 | full replace; omitted optional fields are nulled |
| `PATCH` | `/collections/:id` | 200 | 400, 401, 404 | partial; unknown keys rejected, not ignored |
| `DELETE` | `/collections/:id` | 204 | 401, 404 | see §7 for effect on bookmarks |
| `GET` | `/collections/:id/bookmarks` | 200 | 401, 404 | **404 if the collection is not the caller's** — not an empty list |
| `GET` | `/bookmarks` | 200 | 401 | |
| `POST` | `/bookmarks` | 201 | 400, 401, 404 | 404 if `collectionId` refers to a collection the caller does not own |
| `GET` | `/bookmarks/:id` | 200 | 401, 404 | |
| `PUT` | `/bookmarks/:id` | 200 | 400, 401, 404 | |
| `PATCH` | `/bookmarks/:id` | 200 | 400, 401, 404 | reassigning `collectionId` re-validates ownership of the target |
| `DELETE` | `/bookmarks/:id` | 204 | 401, 404 | |

**PUT vs PATCH.** PUT replaces the mutable fields wholesale; a field absent from a PUT body is
set to null (where nullable) or rejected (where required). PATCH applies only the keys present.
Both reject unknown keys with 400 rather than silently dropping them, so that a client typo
never looks like a successful write.

**Two places ownership is checked on writes**, not one: the row being modified, *and* any row
it points at. `POST /bookmarks` with someone else's `collectionId` is the case most
implementations miss.

---

## 5. List parameters

Applies to `GET /collections`, `GET /bookmarks`, `GET /collections/:id/bookmarks`.

| Param | Type | Default | Notes |
| --- | --- | --- | --- |
| `limit` | int | `25` | max `100`; values above the max are **rejected with 400**, not clamped — consistent with the "reject rather than silently reinterpret" rule applied to unknown PUT/PATCH keys |
| `cursor` | string | — | opaque cursor. See note below |
| `sort` | enum | `createdAt:desc` | allow-list only; arbitrary column names are rejected |
| `collectionId` | string | — | bookmarks only, filters to that collection (404 if not the caller's) |
| `uncategorised` | boolean | — | bookmarks only; `uncategorised=true` returns bookmarks with `collectionId = null`. A separate flag rather than overloading `collectionId=null`, since query-string `null` is ambiguous between "the string `null`" and "absent" |
| `q` | string | — | implemented; case-insensitive substring match against `title` and `notes` |

**A default limit exists on every list route.** An unbounded list is a trivial
denial-of-service and a memory hazard once seed data grows.

**Cursor note.** The cursor is a base64-encoded JSON payload of `{ createdAt, id }` — the
keyset position of the last row in the previous page, matching the default
`createdAt:desc` sort. It is **not** separately validated as belonging to the caller: the
query that consumes it always re-applies the `ownerId` filter first, so a forged or
foreign cursor can only reposition the caller within their own scoped result set — it
cannot be used to seek into another user's rows.

---

## 6. Error shape

One envelope, produced by a single exception filter (`[FILL: path, once implemented]`), used by every route.

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found",
    "details": [{ "field": "url", "issue": "must be a valid http(s) URL" }],
    "requestId": "01J…"
  }
}
```

Rules the filter enforces:

- `message` is drawn from a fixed set of strings. It **never interpolates an id, name, or any
  field value belonging to a resource the caller does not own** — that would reintroduce the
  existence oracle that the 404 policy closes.
- `details` appears only on 400, and only ever describes the caller's own submitted input.
- 500 responses carry `requestId` and nothing else. Stack traces and Prisma error text are
  logged, never serialised. The filter must explicitly catch `PrismaClientKnownRequestError`
  — Nest's default behaviour otherwise leaks the constraint name and table in the response.
  `[FILL: confirm this once the filter is implemented.]`

---

## 7. The collection ↔ bookmark relation

- One collection has many bookmarks. One bookmark belongs to zero or one collection.
- `Bookmark.collectionId` is nullable, so "uncategorised" is a real state, not a sentinel row.
- Both tables carry `ownerId` directly. `Bookmark.ownerId` is **denormalised** rather than
  inferred through the collection, because a bookmark can exist with no collection — there
  would otherwise be no ownership path for uncategorised bookmarks. Cost: the two `ownerId`
  values can in principle disagree; prevented at the application layer — the repository
  layer always sets `Bookmark.ownerId` from the authenticated request's `sub`, never copies
  it from the referenced collection, and re-validates the target collection's `ownerId`
  independently on every write that sets `collectionId` (see §4). A composite FK
  `(collectionId, ownerId)` → `Collection(id, ownerId)` was considered and rejected: Postgres
  requires a unique index on `Collection(id, ownerId)` to support it, which is redundant with
  the primary key and adds schema complexity for a guarantee the application layer already
  provides. `[FILL: confirm with a test once implemented.]`
- Indexes: `@@index([ownerId, createdAt])` on both tables, plus `@@index([ownerId, collectionId])`
  on `Bookmark`. Every index leads with `ownerId`, mirroring the fact that every query filters
  on it.

**On delete of a collection: `SET NULL`** — bookmarks survive and become uncategorised.
Chosen because `Bookmark.collectionId` is already modeled as nullable/optional (a bookmark
can exist with no collection), so treating collection deletion as "this bookmark loses its
collection" rather than "this bookmark is destroyed" is consistent with that model and avoids
silent data loss. Rejected alternatives: `CASCADE` (deletes bookmarks the user may still want,
surprising for a "delete this folder" action); `409 unless empty` (forces manual cleanup
before an otherwise-valid delete, poor UX for no added safety since `SET NULL` already loses
no data). Recorded as ADR-003.
Enforced at the Prisma schema level (`onDelete: SetNull` in `schema.prisma`), not via an
application-level transaction — since the referential action is declarative and applies
uniformly regardless of how the row is deleted (including any future raw-SQL or admin-tool
deletes), which an application-level-only check would not cover.

---

## 8. How the privacy invariant is enforced

Four independent layers. Any one of them failing alone does not breach the invariant.

| # | Layer | Mechanism | Proof |
| --- | --- | --- | --- |
| 1 | Authentication | global deny-by-default guard (`pbm-service/src/modules/auth/jwt-auth.guard.ts`, registered as `APP_GUARD` in `auth.module.ts`); `ownerId` from verified `sub` only (`current-user.decorator.ts`) | `pbm-service/test/security-matrix.e2e-spec.ts` — 6 invalid auth states × every registered protected route → 401 |
| 2 | Data access | every Prisma call lives in a repository layer (`pbm-service/src/database/<entity>/<entity>.repository.ts`, one per model); every method takes `ownerId` as its first parameter and includes it in `where`. Controllers and services cannot reach `PrismaService` directly — enforced by module boundaries: `PrismaService` (`pbm-service/src/database/prisma.service.ts`) is provided by `PrismaModule` (`pbm-service/src/database/prisma.module.ts`) and not exported from it; only repository classes registered in that same module are exported | `pbm-service/src/database/collection/collection.repository.ts`, `pbm-service/src/database/bookmark/bookmark.repository.ts` (every method takes `ownerId` first and scopes `where` on it); exercised by the cross-owner 404 and list-scoping cases in `test/security-matrix.e2e-spec.ts` |
| 3 | Write validation | `ownerId` is not a field on any inbound DTO, so it cannot be assigned by a client regardless of body content (global `ValidationPipe` with `forbidNonWhitelisted` rejects it with 400); referenced `collectionId` is ownership-checked before use (`bookmark.service.ts`'s `assertOwnsCollection`, called on create and on update when `collectionId` is set) | "ownerId in a request body → 400" case, plus the `POST`/`PATCH /bookmarks` cross-owner `collectionId` cases, in `test/security-matrix.e2e-spec.ts` |
| 4 | Response policy | uniform 404, fixed error strings, no cross-owner values in messages | cross-owner vs nonexistent 404s asserted **byte-identical** in `test/security-matrix.e2e-spec.ts`; the single exception filter of §6 is still pending — current envelopes are Nest defaults with fixed strings |

### What is deliberately *not* defended against

Stating the boundary is part of the contract:

- **Timing side channels.** A cross-owner 404 and a nonexistent-id 404 may differ by a
  measurable margin because one path hits the DB either way (the ownership check itself
  requires a lookup) — acknowledged and out of scope for this exercise.
- Rate limiting and detailed request logging are out of scope for this take-home; noted
  here so the omission reads as a stated boundary rather than an oversight.

### Runnable proof

```bash
cd pbm-service && npm run test:security   # requires the Postgres container up (docker compose up -d)
```

Implemented in `pbm-service/test/security-matrix.e2e-spec.ts`: mints RS256 tokens for two
users against a **local JWKS server** (no live Auth0 dependency), enumerates every route
registered on the Express router at runtime, and asserts: 6 invalid auth states (none,
malformed, expired, wrong signature, ID-token-shaped `aud`, missing `sub`) × every
protected route → 401; cross-owner GET/PATCH/DELETE → 404 **byte-identical** to the
nonexistent-id 404; `ownerId` in a body → 400; list responses never leak the other user's
rows; and, for bookmarks specifically, that a `collectionId` pointing at another owner's
collection is rejected with 404 on both `POST` and `PATCH`. Current count: 11 registered
routes (5 collection + 5 bookmark + `/health`), 25 test cases, 60 sweep assertions. Routes
are enumerated, not listed by hand — a route added later joins the 401 sweep automatically.

The value of a matrix test over hand-written cases is that a route added later is covered
automatically — the endpoint someone forgets to write a test for is exactly the one that leaks.

---

## 9. Where the agent's first attempt was wrong

Three real defects introduced by the coding agent, with how each was caught and what now
prevents a recurrence. **Only include defects that actually occurred and that have a commit.**

**Deferred: no code has been written yet** (`pbm-service/` and `pbm-ui/` are both empty as
of this update). This section stays templated until implementation is underway and real
defects — with commits — exist to report. Do not fill it with hypothetical defects.

### 9.1 `[FILL: title]`

- **What it produced:** `[FILL: the wrong code, quoted]`
- **Why it looked fine:** `[FILL: compiled, passed the happy-path test, matched the surrounding style…]`
- **Impact if shipped:** `[FILL: name the concrete breach]`
- **How it was caught:** `[FILL: which test failed / which review step / the CI gate]`
- **Fix:** `[FILL: commit sha + one line]`
- **Prevented from recurring by:** `[FILL: the rule in CLAUDE.md, the test, the hook — name it]`

### 9.2 `[FILL]`

### 9.3 `[FILL]`

> Candidate defects to look for while building, if you need prompts for what to check:
> a Prisma lookup without `ownerId`; 403 where the policy says 404; `ownerId` accepted from a
> request body on PATCH; `POST /bookmarks` not validating the target collection's owner;
> `GET /collections/:id/bookmarks` scoping the bookmarks but not the parent collection;
> `jwt.decode` in place of `verify`; a missing `aud` check; an unbounded list route.
> Use the ones you actually hit — a fabricated defect is worse than reporting two.

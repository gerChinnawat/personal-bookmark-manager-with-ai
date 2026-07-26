# Decision Log

## ADR-001: Move DECISIONS.md to the project root
Date: 2026-07-26
Status: Accepted
Summary: The decision log now lives at the project root instead of under `.agents/`.

**Context:** The decision log previously lived at `.agents/DECISIONS.md`, but the `.agents/` directory (along with `API_DESIGN.md` and `API_WORKFLOW.md`) was being deleted, and the `log-decision` skill expects `DECISIONS.md` at the project root.

**Decision:** Per explicit user instruction, relocate the decision log to `DECISIONS.md` in the project root, matching where the `log-decision` skill reads and appends entries.

**Consequences:** Decision history is now easier to find alongside other root-level project docs; the old `.agents/DECISIONS.md` path is no longer used and can be removed once its contents are confirmed migrated.

---

## ADR-002: Accept only Auth0 access tokens as the Bearer credential, reject ID tokens
Date: 2026-07-26
Status: Accepted

**Context:** Auth0 issues both an ID token and an access token on login. Both are JWTs signed
the same way, and it's tempting to accept either as `Authorization: Bearer <jwt>` since they
look interchangeable. The discovery document at `https://dev-yg.us.auth0.com/.well-known/openid-configuration`
confirms the issuer and lists `RS256` among supported signing algorithms.

**Decision:** The API validates `aud` against `https://bbl-candidate-test-api` and accepts only
tokens whose `aud` matches. An ID token's `aud` is the Auth0 application's `client_id`, not this
API identifier — so it is rejected, not merely unused. This is standard OIDC semantics: ID
tokens authenticate the end-user *to the client application*; access tokens authorize the
client *to call an API*. Using an ID token to call an API is a common but incorrect pattern
that this design deliberately closes off rather than accommodates.

**Consequences:** Any client (including the take-home's own frontend) must request an access
token scoped to `https://bbl-candidate-test-api` as the `audience` in its Auth0 login/token
call, not just rely on the default ID token. A test asserting that an ID token returns 401 is
required once the auth guard exists (see `API_DESIGN.md` §1).

---

## ADR-003: `SET NULL` on collection delete, not `CASCADE`
Date: 2026-07-26
Status: Accepted

**Context:** `Bookmark.collectionId` is nullable — a bookmark can exist uncategorised. When a
collection is deleted, its bookmarks need a defined fate: cascade-delete them, block the
delete until the collection is empty, or detach them.

**Decision:** `onDelete: SetNull` at the Prisma schema level. Deleting a collection detaches
its bookmarks (`collectionId` becomes `null`); the bookmarks themselves survive.

**Rationale:** The data model already treats "no collection" as a valid, non-exceptional
state, so reusing that state on delete is the smallest change consistent with the model.
Rejected alternatives:
- `CASCADE` — deletes bookmarks the user likely still wants; "delete this folder" reads as
  removing an organizational grouping, not the contents.
- `409 unless empty` — forces the user to manually detach or delete every bookmark first,
  with no safety benefit over `SET NULL` since `SET NULL` already discards no data.

**Consequences:** Enforced declaratively in `schema.prisma` rather than in an application-level
transaction, so the behavior holds regardless of how the delete is issued.

---

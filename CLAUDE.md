# CLAUDE.md

Rules for any agent implementing `pbm-service`/`pbm-ui` in this repo. These are not
suggestions — code that violates one of these is a defect regardless of whether it passes
tests, and should be logged under `API_DESIGN.md` §9 if it ever ships.

The full contract lives in `API_DESIGN.md`. This file exists so the enforcement rules aren't
buried in prose — read `API_DESIGN.md` §8 ("How the privacy invariant is enforced") for the
rationale behind every rule below.

## Non-negotiable rules

1. **All Prisma access goes through a repository layer.** Controllers and services never
   import `PrismaService` directly — it is only provided to repository classes, not exported
   from the Prisma module. If a controller or service needs data, it calls a repository
   method; it does not construct a Prisma query itself.

2. **`ownerId` is never accepted from the client, on any verb.** It is not a field on any
   inbound DTO. It is derived exclusively from the verified JWT's `sub` claim, set once per
   request, and passed down — never read from a request body, query string, or path param.

3. **Every repository method that touches owned data takes `ownerId` as its first
   parameter and includes it in the Prisma `where` clause.** This applies to reads, writes,
   and deletes alike. A lookup by `id` alone (without `ownerId` in the `where`) is a bug.

4. **Cross-owner access returns 404, never 403.** A 403 would leak that the resource exists
   (an existence oracle — see `API_DESIGN.md` §2). This applies uniformly: resource not
   found, and resource found but owned by someone else, must be byte-identical responses.

5. **Two ownership checks on writes that reference another row**, not one: the row being
   modified, *and* any row it points at. E.g. `POST /bookmarks` with a `collectionId` must
   validate that the collection belongs to the caller, not just that the bookmark write
   itself is scoped to the caller.

6. **Error messages never interpolate a value belonging to a resource the caller doesn't
   own** — no ids, names, or field values from another user's data, ever, even in a 500.
   `message` is drawn from a fixed set of strings (`API_DESIGN.md` §6).

7. **Unknown keys on `PUT`/`PATCH` bodies are rejected with 400, not silently dropped.**
   A client typo must never look like a successful write.

8. **List routes always have a bounded default (`limit`, default 25, max 100).** No
   unbounded list route ships, ever — see `API_DESIGN.md` §5.

## Auth specifics

- Only **access tokens** are accepted (`aud: https://bbl-candidate-test-api`). ID tokens
  must fail the `aud` check and return 401 — do not special-case or "helpfully" accept them.
  See `DECISIONS.md` ADR-002.
- Verify signature, `iss`, `aud`, `exp`, `nbf`, and require `sub` — via a verifying JWT
  library against the live JWKS (10 min cache, refetch on unknown `kid`). Never use
  `jwt.decode` (unverified) in place of `jwt.verify`.
- Global guard denies by default. The only public route is `GET /health`, explicitly marked
  `@Public()`.

## Process rules (independent of the above)

- Follow the standing workflow: plan → to-do list → ask before proceeding → surface
  blockers → summarize. Enforced by the `UserPromptSubmit` hook in `.claude/settings.json`.
- When a real implementation defect is found (by a test, a review, or a user catching it),
  log it in `API_DESIGN.md` §9 with the actual commit — do not invent hypothetical defects
  to fill the section, and do not skip logging one that actually happened.
- **Docs move in the same commit as the code that changes their truth.** Any commit that lands
  code in `pbm-service/` or `pbm-ui/` must, in that same commit, update whatever `[FILL]`
  placeholders and status lines it makes fillable or false (`README.md` status/run sections,
  `API_DESIGN.md` proof paths, `AI_WORKFLOW.md` §2 task table). A warn-only `PostToolUse` hook
  (`.claude/hooks/check_invariants.py`) reminds about this and greps for the mechanically
  detectable rule violations above (`jwt.decode`, `PrismaService` outside the repository layer,
  `ownerId` in a DTO) — but a hook warning is a prompt to fix, not the enforcement itself; the
  rule stands even when the hook is silent.
- **The security matrix test is a precondition, not a follow-up.** The first endpoint lands
  together with the matrix harness described in `API_DESIGN.md` §8 ("Runnable proof"); every
  later endpoint must be covered by it in the same commit that adds the route.
- Attribute decisions honestly in `DECISIONS.md`: if a decision was user-instructed, say so;
  don't write it up as if the agent reasoned its way there independently (see
  `AI_WORKFLOW.md` §4.2 for why this matters).

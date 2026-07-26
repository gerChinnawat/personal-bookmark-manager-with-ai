# Personal Bookmark Manager

A personal bookmark manager: users authenticate via Auth0 and manage
private collections of bookmarks. No user can read, list, or infer the existence of another
user's data.

> **Status:** design and process scaffolding only. `pbm-service/` and `pbm-ui/` are empty —
> no backend or frontend code has been written yet. This README documents the intended stack
> and structure; it will be corrected as implementation lands if anything changes.

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

`[FILL: once pbm-service/pbm-ui are scaffolded — install steps, env vars (Auth0 domain/audience/client id), migrate/seed commands, dev server ports.]`

## Auth0 configuration

Requests must carry an **access token** (not an ID token) as `Authorization: Bearer <jwt>`,
requested with `audience: https://bbl-candidate-test-api`. See `API_DESIGN.md` §1 and
`DECISIONS.md` ADR-002 for why ID tokens are rejected rather than merely unused.

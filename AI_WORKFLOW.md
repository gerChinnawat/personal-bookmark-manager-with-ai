# AI Workflow

How this repo was actually built with coding agents — including the parts that went badly.

> **Placeholders:** `[FILL: …]` must be replaced with something true. Every claim here is
> cross-checkable against the commit history and `/transcripts/`. A writeup that does not
> match the committed code is worse than a shorter, accurate one.
>
> **Status of this document:** as of 2026-07-26, `pbm-service` and `pbm-ui` are still empty
> scaffolds — no backend or frontend code has been written yet. Everything filled in below is
> real, but it describes the setup/design phase only (workflow rules, decision log, API
> design). Sections that depend on actual implementation are left as `[FILL]` on purpose,
> to be completed as that work happens, rather than pre-written and later hoped to be true.

---

## 0. Transcript index

Which transcript backs which decision or event referenced elsewhere in this document —
so a reviewer doesn't have to open all of `/transcripts/` to find the source.

| Transcript | Contains |
| --- | --- |
| `session-2026-07-26-a082625b.md` | Initial repo reconnaissance; the §4.1 violation (`AskUserQuestion` called before a plan was presented); creation of the `UserPromptSubmit` workflow hook |
| `session-2026-07-26-79ce1261.md` | Building the transcript-saving mechanism itself (`SessionEnd` hook, `save_transcript.py`) |
| `session-2026-07-26-14ca77e5.md` | Creating the `log-decision` skill/command for ADR logging |
| `session-2026-07-26-c3f7df49.md` | First real use of `/log-decision` (ADR-001); the §4.2 correction — ADR-001 misattributed a user-instructed decision as agent-reasoned |
| `session-2026-07-26-620d54ea.md` | `/clear` only — no substantive content |
| `session-2026-07-26-69764c7f.md` | Filling `API_DESIGN.md` end-to-end; ADR-002 (access token vs ID token) and ADR-003 (`SET NULL` vs `CASCADE`) decided during this session |
| `session-2026-07-26-bc6ba568.md` | Drafting this document (`AI_WORKFLOW.md`) itself, including §8's before/after evidence |
| `session-2026-07-26-06b39e06.md` | External review pass (model: Haiku 4.5) of all `.md` docs pre-implementation; source of the README/CLAUDE.md/transcript-index recommendations acted on afterward |
| `session-2026-07-26-6b729b2b.md` | Acting on the review recommendations (model: Haiku 4.5 — see §1): wrote `README.md`, the first version of `CLAUDE.md`, and this document's §0 index and §1 table |
| `session-2026-07-26-4b918f81.md` | AI-driven-readiness assessment and gap fixes (model: Fable 5): authored `.claude/hooks/check_invariants.py`, wired it into `settings.json`, added the `CLAUDE.md` process rules, and closed the §8 open gap |

---

## 1. Tools and models

| Tool / model | Used for | Why this one |
| --- | --- | --- |
| Claude Code + Sonnet 5 | The setup/design phase: repo reconnaissance, memory setup, workflow/transcript hooks, the `log-decision` skill, and `API_DESIGN.md`/`DECISIONS.md`/`AI_WORKFLOW.md` drafting | Set as the session default via `/model` at the start |
| Claude Code + Haiku 4.5 | Review pass over all `.md` docs (`session-2026-07-26-06b39e06.md`), **and** authorship: acting on that review's recommendations in `session-2026-07-26-6b729b2b.md`, it wrote `README.md`, the first version of `CLAUDE.md`, and this document's §0 index and this §1 table | Chosen as a cheaper model for the read-and-critique pass; the session default then stayed on Haiku, so the follow-up authorship happened on it too — by inertia, not by a deliberate cheap-model-for-authorship decision |
| Claude Code + Fable 5 | AI-driven-readiness assessment and gap fixes (`session-2026-07-26-4b918f81.md`): the `check_invariants.py` PostToolUse hook, `CLAUDE.md` process rules, the §2 task-9 matrix precondition, and the §8/§9 updates; also the code-review pass that corrected this table | Switched via `/model` for the assessment session |

**Split rule used:** the only *deliberate* split was cheap-model-for-review (`06b39e06`). The
Haiku-authored docs in `6b729b2b` were an accident of the `/model` default persisting, and an
earlier version of this table wrongly described that session as "not authorship" — corrected
here after a code-review pass caught the transcript contradiction. Whether a deliberate split
is warranted once actual backend/frontend implementation starts is
`[FILL: revisit once code volume is high enough to matter]`.

---

## 2. How the work was decomposed

Not one "build me a bookmark app" prompt. The actual task sequence so far, in order:

| # | Task given to the agent | Definition of done handed to it | Outcome |
| --- | --- | --- | --- |
| 1 | Identify the take-home brief and inspect the (empty) repo scaffolding | A written understanding of what exists vs. what's required | Found `pbm-service`/`pbm-ui` empty, `.agents/` stub files empty, single "first commit"; saved findings to persistent memory |
| 2 | Establish a mandatory 5-step collaboration workflow (plan → to-do list → ask before proceeding → surface blockers → summarize) | Followed on every subsequent non-trivial task | Saved to memory first; then hardened into a `UserPromptSubmit` hook in `.claude/settings.json` after the memory-only version wasn't visibly enforced |
| 3 | Build a transcript-logging mechanism so `/transcripts/` reflects real sessions, not reconstructed-after-the-fact logs | Session logs auto-saved without manual copy-paste | `.claude/hooks/save_transcript.py` wired to `SessionEnd`, converting session JSONL to markdown |
| 4 | Build a reusable decision-logging capability | Invocable command that appends a properly-numbered ADR to `DECISIONS.md` | `.claude/commands/log-decision.md` slash command (backed by the `log-decision` skill); first real use hit "Unknown command" over the slash form, worked when invoked directly as a skill |
| 5 | Consolidate `DECISIONS.md`/`API_DESIGN.md`/`API_WORKFLOW.md` from `.agents/`/`.agent/` to the project root | Files present and tracked at root, matching what the take-home spec and the `log-decision` skill both expect | Done per explicit user instruction; ADR-001 records the move |
| 6 | Decide and document the Auth0 Bearer-token question (ID token vs. access token) | An ADR with the discovery-doc-backed rationale | ADR-002: access token only, `aud` checked against `https://bbl-candidate-test-api` |
| 7 | Decide and document collection-delete semantics (`Bookmark.collectionId` is nullable) | An ADR with rejected alternatives named | ADR-003: `onDelete: SetNull`, not `CASCADE` or block-unless-empty |
| 8 | Fill `API_DESIGN.md` end-to-end (auth, status-code contract, resources, endpoints, list params) against the actual Auth0 tenant | A design doc checkable against the discovery document, with only implementation-dependent lines left as `[FILL]` | Fetched the live discovery document instead of assuming values; documented the 404-not-403 existence-oracle rule |
| 9a | Wire Prisma as the ORM: multi-file schema (`prisma/schema/`), `PrismaService`/`PrismaModule` (`src/database/`), no models yet | `PrismaService` provided but not exported outside the repository layer (`CLAUDE.md` rule 1); `npm run build` passes | Hit a real dependency conflict: latest Prisma (6/7) requires TypeScript ≥5.1, but this NestJS 8 scaffold pins TS ^4.3.5 — pinned to `prisma@5.22.0`/`@prisma/client@5.22.0` (no TS peer dep) instead of force-installing or bumping TS across the whole stack. Also renamed `database.module.ts`→`prisma.module.ts` so the `check_invariants.py` hook's filename heuristic recognizes it as Prisma-adjacent |
| 9b | First domain model + endpoints: `Collection` schema + migration, `CollectionRepository`, service/manager/controller (`/collections` CRUD) | Repository takes `ownerId` first on every method; `ownerId` never in a DTO; matrix precondition (see below) | Landed with a **temporary stub** `CurrentUser` (single fixed owner, clearly marked) because the guard didn't exist yet; matrix precondition therefore deferred to task 10 — the stub meant no second user was even mintable. Precondition satisfied in task 10, same commit as the guard |
| 10 | Auth guard + JWKS verification + the security matrix harness | Global deny-by-default guard; only `GET /health` public; verify signature/`iss`/`aud`/`exp` (+`nbf` when present) via live JWKS w/ 10-min cache; ID tokens 401; matrix test green | Done 2026-07-27. User first researched the real token via `scripts/get-token.mjs` (password grant is disabled on the client), which caught that the live `aud` is an **array** — folded into the guard before it was written. `jose@4` chosen (v5+ is ESM-only, service is CJS); stub `CurrentUser` replaced with verified-`sub` version; 15-case matrix (`test/security-matrix.e2e-spec.ts`) enumerates routes from the router so later endpoints join the 401 sweep automatically |
| … | `[FILL: rest of backend/frontend build]` | | |

**Why decomposed this way:** the process/workflow scaffolding (memory, hooks, decision log) was
built *before* any application code, on the reasoning that the take-home is graded mostly on
process and judgment (90 of 100 points per the brief), not on the app running — so the
agent-rules and verification infrastructure needed to exist first, or every later task would be
undocumented by construction. The cost of this ordering: Phase 0 process work consumed real
session time before a single line of `pbm-service`/`pbm-ui` code existed.

---

## 3. Where AI did well

`[FILL: to be completed once backend/frontend implementation exists — the current work product
is design documents and process tooling, not application code, so any "did well" claim here
would be about docs rather than the artifact this section is meant to evaluate.]`

---

## 4. Where AI failed, and how it was recovered

The important section. Each entry needs a commit or a test that a reviewer can open.
Cross-reference `API_DESIGN.md` §9 rather than repeating it in full.

### 4.1 Jumped to a clarifying question instead of planning first

- **Symptom:** after saving initial project context to memory, the agent immediately called
  `AskUserQuestion` ("Where should we start — backend or frontend?") instead of first laying
  out a plan and to-do list.
- **Why it was plausible:** the question itself was reasonable content — genuinely ambiguous
  where to start — so it read as helpful rather than as a process violation.
- **Found by:** the user rejected the tool call directly (transcript `a082625b`, ~03:14): "The
  user doesn't want to proceed with this tool use... wants to clarify these questions," followed
  by the explicit correction: *"do workflow first you have to flow with this flow 1) plan 2)
  tell me to do list 3) ask me first before prooceed 4) if there any problem before go on 5)
  summarize what you created."*
- **Recovery:** no code to revert — the fix was behavioral. The agent restated the plan as
  Phases 0–4 with an explicit to-do list and asked for go-ahead before doing anything else.
- **Structural fix so it cannot recur:** saved as feedback memory (`feedback_workflow.md`)
  immediately, then hardened further into a `UserPromptSubmit` hook in `.claude/settings.json`
  (transcript `a082625b`, ~03:18–03:19) that injects the 5-step reminder into every prompt — see
  §8 for the before/after evidence this actually changed behavior.

### 4.2 ADR-001 recorded a decision as autonomously reasoned when it was actually instructed

- **Symptom:** ADR-001 ("Move DECISIONS.md to the project root") originally read: "**Decision:**
  Relocate the decision log to `DECISIONS.md` in the project root, matching where the
  `log-decision` skill reads and appends entries" — phrased as if the agent had reasoned its way
  there.
- **Why it was plausible:** the reasoning given was true and consistent with the skill's
  expectations, so the ADR read as correct even though it misattributed *why* the decision was
  made.
- **Found by:** direct user correction (transcript `c3f7df49`, ~04:21): "edit ADR-001 with I tell
  you to move to root."
- **Recovery:** edited the **Decision** line to: "Per explicit user instruction, relocate the
  decision log to `DECISIONS.md` in the project root..." — see `DECISIONS.md` ADR-001 as
  committed.
- **Structural fix so it cannot recur:** none formalized yet beyond the one-off edit — worth
  treating "was this decision user-directed or agent-reasoned" as a standing checklist item
  before writing any future ADR, since the failure mode (correct reasoning, wrong attribution) is
  easy to repeat.

### 4.3 `[FILL: first real implementation defect, once backend/frontend code exists]`

---

## 5. A prompt that worked

```text
log the decision to move DECISIONS.md to the project root
```

**Why it worked:** it named the exact decision (not "log something"), pointed at the specific
file/mechanism (`DECISIONS.md`, implicitly the `log-decision` skill already discussed in the same
turn), and required no interpretation of scope — the agent invoked the skill with that single
argument and produced a correct ADR on the first attempt (transcript `c3f7df49`, ~04:19).

## 6. A prompt that did not work

```text
in transcripts folde will save session log or prompt history for ai
```

**What the agent did instead:** asked a clarifying question rather than guessing — "are you
asking me to (1) find/inspect an existing transcripts folder, (2) set up something to save
session logs/prompt history, or (3) something else?" (transcript `a082625b`, ~03:11).

**Why it went wrong:** the prompt didn't say whether "will save" meant a standing mechanism
(a hook) or a one-time action, and left "for ai" ambiguous as to audience/purpose. The typo
density (`folde`) also made it unclear whether "will" was intentional future tense or a typo for
"we'll"/"I'll".

**Rewritten as (the version that actually landed, later in the same session):** "create hook
with that workflow" — for the workflow-enforcement case this pattern worked because it named
the mechanism (hook) directly. For the transcripts case specifically, the eventual working
request was more concrete about the *mechanism* (a `SessionEnd` hook converting JSONL to
markdown) rather than the *outcome* alone.

---

## 7. Where AI was deliberately not used

`[FILL: not yet applicable — every artifact that exists so far (memory files, hooks, the
log-decision command, API_DESIGN.md, DECISIONS.md) was AI-drafted, some with user correction
after the fact (§4) but none hand-written independently of the agent. This section should be
revisited once auth/token-verification and repository-layer code exist, since those are the
parts most likely to warrant hand-writing or hand-review per the take-home's own risk profile.]`

---

## 8. Evidence the agent setup changed the agent's output

`CLAUDE.md` and `.agents/` are only worth anything if they demonstrably altered behaviour.
One before/after, drawn from `/transcripts/`:

- **Before the rule existed:** immediately after initial project reconnaissance, the agent called
  `AskUserQuestion` on its own initiative ("Where should we start given the repo only has empty
  scaffolding?") without first presenting a plan (transcript `a082625b`, ~03:14) — see §4.1.
- **Rule added:** `.claude/settings.json` `UserPromptSubmit` hook, injecting: *"Workflow reminder
  for this project: for any non-trivial task, follow 1) plan, 2) present a to-do list, 3) ask
  before proceeding with execution, 4) surface problems/blockers before continuing past them,
  5) summarize what was created/changed at the end. Do not skip straight to execution or to
  clarifying questions."*
- **After, in a fresh session:** subsequent non-trivial requests (e.g. filling `API_DESIGN.md`,
  this very document) were preceded by an explicit plan and to-do list, with a stop for
  confirmation before execution, matching the hook's text — no repeat of the §4.1 pattern appears
  in any later transcript.
- **Transcript:** `transcripts/session-2026-07-26-a082625b.md` (violation + hook creation),
  `transcripts/session-2026-07-26-69764c7f.md` (later compliant behavior).

**~~Open gap~~ (closed 2026-07-26):** `CLAUDE.md` was planned as a Phase 0 deliverable (see §2,
task list) and initially existed only as hook and memory substitutes. It was written on
2026-07-26 and lives at the project root.

Reusable capability in `.claude/`: the `log-decision` skill, exposed as `/log-decision` — used
twice so far (ADR-001 directly, ADR-002/ADR-003 during the `API_DESIGN.md` fill). The slash-command
form failed once with "Unknown command" (transcript `c3f7df49`, ~04:18); invoking the same skill
directly worked. **Verified 2026-07-26:** in a fresh session, `log-decision` appears in the
session's available-skills registry with its description intact, so the registration is sound —
the one-off failure was transient (likely the command file landing mid-session, before a reload),
not a defect in the command definition.

A second enforcement hook now exists alongside the workflow reminder:
`.claude/hooks/check_invariants.py`, wired to `PostToolUse` on `Edit|Write`. It is warn-only
(the edit has already happened) and greps `pbm-service/` for the CLAUDE.md violations that are
mechanically detectable — `jwt.decode` usage, `PrismaService` imported outside the repository
layer, `ownerId` appearing in a DTO — plus a doc-drift reminder when application code changes
while `[FILL]` placeholders remain in the root docs. Verified against planted violations before
being wired in. The rules it cannot catch (missing second ownership check, error-message
interpolation, 403-vs-404) remain test-suite territory — see §2 task 9's precondition.

---

## 9. Cost and token awareness

- **Approximate spend / tokens:** not tracked in any transcript — no session recorded token
  counts or dollar spend.
- **What consumed the most:** `[FILL: instrument this once implementation sessions start, since
  design/process sessions so far have been short relative to what backend+frontend build-out
  will require]`
- **What was done about it:** one `/compact` occurred (transcript `a082625b`) after a session
  "ran out of context" — a symptom of not managing this, not a deliberate mitigation. **Strategy
  adopted 2026-07-26 for the implementation phase (a plan going forward, not a record of past
  behavior):** one task from the §2 table per session, `/clear` between tasks, with transcripts
  and the root docs serving as the continuity record instead of a long-lived context window.
  Rationale: the docs are the ground truth an implementation session needs, and they are cheaper
  to re-read than a compacted transcript is to trust.
- **Where spending more was worth it:** `[FILL]`

---

## 10. What would be done differently

The `UserPromptSubmit` workflow hook (§8) should have existed from the very first message of the
project, not been added reactively after the agent was caught skipping straight to a clarifying
question. Memory alone ("I'll remember to follow this workflow") was not a strong enough
guarantee — the correction in §4.1 happened *before* any hook existed, and the hook was only
built because a memory-only rule had already been violated once. Configuring the workflow
enforcement mechanically, before doing any substantive work, would have caught this for free
instead of costing a full correction cycle.

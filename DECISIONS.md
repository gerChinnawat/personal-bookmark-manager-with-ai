# Decision Log

## ADR-001: Move DECISIONS.md to the project root
Date: 2026-07-26
Status: Accepted
Summary: The decision log now lives at the project root instead of under `.agents/`.

**Context:** The decision log previously lived at `.agents/DECISIONS.md`, but the `.agents/` directory (along with `API_DESIGN.md` and `API_WORKFLOW.md`) was being deleted, and the `log-decision` skill expects `DECISIONS.md` at the project root.

**Decision:** Per explicit user instruction, relocate the decision log to `DECISIONS.md` in the project root, matching where the `log-decision` skill reads and appends entries.

**Consequences:** Decision history is now easier to find alongside other root-level project docs; the old `.agents/DECISIONS.md` path is no longer used and can be removed once its contents are confirmed migrated.

---

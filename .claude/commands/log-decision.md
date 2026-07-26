---
description: Append a new Architecture Decision Record to DECISIONS.md
---

Record a decision just made in this conversation as a new ADR entry appended to `DECISIONS.md` in the project root.

Decision topic (may be empty): $ARGUMENTS

Steps:
1. Read `DECISIONS.md` in the project root. If it doesn't exist, create it with a `# Decision Log` heading.
2. Find the highest existing `ADR-NNN` number in the file and increment it (start at `ADR-001` if none exist).
3. If `$ARGUMENTS` is empty, identify the most recent significant decision from this conversation (a choice between real alternatives — not a typo fix or routine edit).
4. Append a new entry at the end of the file in this exact format:

```
## ADR-NNN: <short title>
Date: <today's date, YYYY-MM-DD>
Status: Accepted
Summary: <one-sentence plain-language summary>

**Context:** <why this decision was needed, 1-3 sentences>

**Decision:** <what was decided, 1-3 sentences>

**Consequences:** <what this enables, what it trades off, or what to watch for, 1-3 sentences>

---
```

5. Keep each section short — this is a log, not a design doc. Do not rewrite or reformat existing entries.
6. After appending, show the user the new entry and the file path.

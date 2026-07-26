#!/usr/bin/env python3
"""PostToolUse hook (Edit|Write): warn-only scan for CLAUDE.md rule violations
that are grep-detectable. Never blocks — the tool has already run; exit 2 only
feeds the warnings back to the agent so it fixes them in the same turn.

Checks (see CLAUDE.md "Non-negotiable rules" and API_DESIGN.md §8):
  - `jwt.decode` used anywhere in pbm-service (rule: never decode-without-verify)
  - `PrismaService` imported outside a repository file or the Prisma module itself
  - `ownerId` appearing in a DTO file (rule 2: never accepted from the client)
  - doc-drift reminder when application code changes while API_DESIGN.md /
    AI_WORKFLOW.md still contain `[FILL` placeholders
"""
import json
import os
import re
import sys

PROJECT_DIR = os.environ.get('CLAUDE_PROJECT_DIR') or os.getcwd()
SERVICE_SRC = os.path.join(PROJECT_DIR, 'pbm-service')
UI_SRC = os.path.join(PROJECT_DIR, 'pbm-ui')

# Files allowed to reference PrismaService: the repository layer and the Prisma
# module that provides it.
PRISMA_ALLOWED = re.compile(r'(repository|repositories|prisma)', re.IGNORECASE)
CODE_EXT = ('.ts', '.js', '.tsx', '.jsx')


def iter_code_files(root):
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in ('node_modules', 'dist', '.git')]
        for name in filenames:
            if name.endswith(CODE_EXT):
                yield os.path.join(dirpath, name)


def rel(path):
    return os.path.relpath(path, PROJECT_DIR)


def scan_service():
    warnings = []
    if not os.path.isdir(SERVICE_SRC):
        return warnings
    for path in iter_code_files(SERVICE_SRC):
        try:
            with open(path, encoding='utf-8', errors='replace') as f:
                text = f.read()
        except OSError:
            continue
        is_test = '.spec.' in path or '.test.' in path or '/test/' in path
        if re.search(r'\bjwt\.decode\s*\(|\bjwtDecode\s*\(', text) and not is_test:
            warnings.append(
                f"{rel(path)}: uses jwt.decode — CLAUDE.md forbids unverified decode; "
                "use a verifying jwt.verify against the JWKS.")
        if 'PrismaService' in text and not is_test and not PRISMA_ALLOWED.search(os.path.basename(path)):
            if re.search(r'import\s+.*PrismaService', text):
                warnings.append(
                    f"{rel(path)}: imports PrismaService outside a repository/prisma-module "
                    "file — CLAUDE.md rule 1: all Prisma access goes through the repository layer.")
        if re.search(r'\.dto\.|/dtos?/', rel(path), re.IGNORECASE) and re.search(r'\bownerId\b', text):
            warnings.append(
                f"{rel(path)}: `ownerId` appears in a DTO — CLAUDE.md rule 2: ownerId is "
                "never accepted from the client; derive it from the JWT `sub` only.")
    return warnings


def doc_drift_reminder(edited_path):
    if not edited_path:
        return None
    ep = os.path.abspath(edited_path)
    if not (ep.startswith(os.path.abspath(SERVICE_SRC)) or ep.startswith(os.path.abspath(UI_SRC))):
        return None
    stale = []
    for doc in ('API_DESIGN.md', 'AI_WORKFLOW.md', 'README.md'):
        full = os.path.join(PROJECT_DIR, doc)
        try:
            with open(full, encoding='utf-8') as f:
                if '[FILL' in f.read():
                    stale.append(doc)
        except OSError:
            continue
    if stale:
        return ("Doc-drift reminder: application code changed while "
                + ', '.join(stale)
                + " still contain [FILL] placeholders — update any the change makes "
                "fillable, in the same commit (CLAUDE.md process rules).")
    return None


def main():
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        payload = {}
    edited_path = (payload.get('tool_input') or {}).get('file_path', '')

    warnings = scan_service()
    reminder = doc_drift_reminder(edited_path)
    if reminder:
        warnings.append(reminder)

    if warnings:
        print('\n'.join(f"[check_invariants] {w}" for w in warnings), file=sys.stderr)
        sys.exit(2)  # PostToolUse: feeds stderr to the agent; does not block (tool already ran)


if __name__ == '__main__':
    main()

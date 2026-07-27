#!/usr/bin/env python3
"""SessionEnd hook: converts the session's .jsonl transcript into a readable
markdown file under transcripts/. Reads hook payload JSON from stdin."""
import json
import os
import re
import sys
from datetime import datetime, timezone

HOME = os.path.expanduser('~')
USERNAME = os.path.basename(HOME)
_HOME_RE = re.compile(re.escape(HOME) + r'(?=/|\b)')
_USER_RE = re.compile(r'\b' + re.escape(USERNAME) + r'\b', re.IGNORECASE) if USERNAME else None


def redact_paths(text):
    text = _HOME_RE.sub('~', text)
    if _USER_RE:
        text = _USER_RE.sub('user', text)
    return text


def text_of_content(content):
    if isinstance(content, str):
        return content
    parts = []
    if isinstance(content, list):
        for block in content:
            if not isinstance(block, dict):
                continue
            btype = block.get('type')
            if btype == 'text':
                parts.append(block.get('text', ''))
            elif btype == 'tool_use':
                name = block.get('name')
                inp = json.dumps(block.get('input', {}), ensure_ascii=False)
                if len(inp) > 300:
                    inp = inp[:300] + '...'
                parts.append(f"[tool_use: {name} {inp}]")
            elif btype == 'tool_result':
                c = block.get('content')
                if isinstance(c, list):
                    c = '\n'.join(
                        b.get('text', '') for b in c
                        if isinstance(b, dict) and b.get('type') == 'text'
                    )
                c = str(c)
                if len(c) > 500:
                    c = c[:500] + '...'
                parts.append(f"[tool_result: {c}]")
    return '\n'.join(parts)


def render(jsonl_path, out_path):
    entries = []
    with open(jsonl_path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                d = json.loads(line)
            except json.JSONDecodeError:
                continue
            if d.get('type') not in ('user', 'assistant') or d.get('isMeta'):
                continue
            msg = d.get('message', {})
            text = redact_paths(text_of_content(msg.get('content', '')))
            if not text.strip():
                continue
            entries.append((d.get('timestamp', ''), msg.get('role', d['type']), text))

    if not entries:
        return False

    with open(out_path, 'w') as f:
        for ts, role, text in entries:
            f.write(f"### {role.upper()} ({ts})\n\n{text}\n\n---\n\n")
    return True


def main():
    payload = json.load(sys.stdin) if not sys.stdin.isatty() else {}
    transcript_path = payload.get('transcript_path')
    session_id = payload.get('session_id', 'unknown')
    project_dir = os.environ.get('CLAUDE_PROJECT_DIR') or payload.get('cwd') or os.getcwd()

    if not transcript_path or not os.path.isfile(transcript_path):
        print(f"save_transcript: no valid transcript_path in payload", file=sys.stderr)
        return

    out_dir = os.path.join(project_dir, 'transcripts')
    os.makedirs(out_dir, exist_ok=True)

    date_str = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    short_id = session_id[:8]
    out_path = os.path.join(out_dir, f'session-{date_str}-{short_id}.md')

    if render(transcript_path, out_path):
        print(f"save_transcript: wrote {out_path}")


if __name__ == '__main__':
    main()

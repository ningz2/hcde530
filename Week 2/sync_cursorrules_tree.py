"""Update the directory tree block inside Week 2/.cursorrules.

Run from the Week 2 folder after adding, removing, or renaming files:

    python sync_cursorrules_tree.py

Or from the repo root:

    python Week\\ 2/sync_cursorrules_tree.py
"""

from __future__ import annotations

import re
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent
RULES = ROOT / ".cursorrules"
BEGIN = "<!-- DIRECTORY_TREE_BEGIN -->"
END = "<!-- DIRECTORY_TREE_END -->"

# Names we never list (generated / OS noise).
SKIP_NAMES = {".DS_Store", "__pycache__"}
# Dotfiles we still show (rules + ignore for this folder).
ALLOW_DOTFILES = {".cursorrules", ".gitignore"}


def _visible(path: Path) -> bool:
    if path.name in SKIP_NAMES:
        return False
    if path.is_dir() and path.name == "__pycache__":
        return False
    if path.name.startswith("."):
        return path.name in ALLOW_DOTFILES
    return True


def build_tree_lines() -> list[str]:
    """Top-level entries under Week 2/, sorted (dirs then files, name)."""
    entries = [p for p in ROOT.iterdir() if _visible(p)]
    dirs = sorted([p for p in entries if p.is_dir()], key=lambda p: p.name.lower())
    files = sorted([p for p in entries if p.is_file()], key=lambda p: p.name.lower())
    ordered = dirs + files

    lines = [f"Last layout sync: {date.today().isoformat()} (UTC)", "", "Week 2/"]
    for i, p in enumerate(ordered):
        is_last = i == len(ordered) - 1
        branch = "└── " if is_last else "├── "
        suffix = "/" if p.is_dir() else ""
        lines.append(f"{branch}{p.name}{suffix}")

        if p.is_dir():
            sub = sorted(
                [c for c in p.iterdir() if _visible(c)],
                key=lambda x: (not x.is_dir(), x.name.lower()),
            )
            for j, c in enumerate(sub):
                sub_last = j == len(sub) - 1
                if is_last:
                    prefix = "    "
                else:
                    prefix = "│   "
                sub_branch = "└── " if sub_last else "├── "
                suf = "/" if c.is_dir() else ""
                lines.append(f"{prefix}{sub_branch}{c.name}{suf}")

    return lines


def main() -> int:
    if not RULES.is_file():
        print(f"Missing {RULES}", file=sys.stderr)
        return 1

    text = RULES.read_text(encoding="utf-8")
    if BEGIN not in text or END not in text:
        print(
            f"{RULES} must contain {BEGIN!r} and {END!r} markers.",
            file=sys.stderr,
        )
        return 1

    block = "\n".join(build_tree_lines())
    pattern = re.escape(BEGIN) + r".*?" + re.escape(END)
    replacement = BEGIN + "\n" + block + "\n" + END
    new_text, n = re.subn(pattern, replacement, text, count=1, flags=re.DOTALL)
    if n != 1:
        print("Could not replace exactly one tree block.", file=sys.stderr)
        return 1

    RULES.write_text(new_text, encoding="utf-8", newline="\n")
    print(f"Updated directory tree in {RULES}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

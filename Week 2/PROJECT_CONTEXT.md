# HCDE 530 — project context (for collaborators & tools)

*This file lives in `Week 2/`. It describes how you work in this course repo, especially this folder.*

This file summarizes how the author works in this repository. It is meant for **human readers** and for **AI assistants** (e.g. Cursor) so suggestions match **human-centered design practice**, not generic software-engineering defaults.

---

## Who you are

- **Background:** Human-centered design practitioner (**UX research** and **UX design**), not a software engineer.
- **Comfort:** Prefer explanations in **plain language**, with **minimal CS jargon**, and **short comments** only where the code would otherwise be hard to follow.

---

## What this project should demonstrate

1. **Effective data-file processing** — load, check, transform, and summarize data in a way that is **clear and trustworthy**.
2. **Visible “important” logic** — a reader should see **which steps matter** (loading, validation, cleaning rules, outputs) without hunting through clever abstractions.
3. **Narrative you want others to take away:** *She can clean messy survey data **responsibly*** — credible, explainable work, not only “the script ran.”

---

## Audience

All of the following matter:

- **Future you** (re-learning)
- **Course staff / grading**
- **Peers / teammates**
- **Portfolio / hiring** viewers

Artifacts should make sense **without you in the room**.

---

## Workflow: Python vs webpage

- **Default stack:** **Python** for processing + **web (HTML)** for visualization when you want to explore or present results.
- **Preferred rhythm (two steps):** Run Python for **logic, checks, and summaries**; **separately** refresh or update the **webpage** when you care about the **view** or presentation. Do not assume every small edit must regenerate HTML.
- **Pragmatism:** If another format is **clearly more efficient** and still **easy to explain** (e.g. a small dependency, another output format), that is acceptable **as long as** the pipeline stays understandable for the audiences above.

---

## Recording changes (non-negotiable habit)

You are **flexible** on strict data rules (e.g. raw vs cleaned filenames), but you need **traceability**.

Use **both**:

1. **In the script:** brief **comments** and, where useful, **`print`** summaries that state what was loaded, what was checked, and what changed (counts, dropped rows, renamed fields, etc.).
2. **In git:** meaningful **commit messages** that record *what* changed and *why* at a high level.

Optional week notes (e.g. markdown) are fine, but the **primary “home”** for the story of changes is **A + C** above.

---

## Research + design (both lenses)

- Work should reflect **UX research** *and* **UX design** — not one at the expense of the other.
- **Default for assistants:** infer emphasis from **what the week is doing** (e.g. survey cleaning → research-heavy rigor; dashboard → clarity and readable presentation). Where it strengthens the story, add **one line of “what we learned”** and **one line of “what that suggests”** next to high-signal steps — keep it short.

---

## Technical defaults (when unstated)

- **Python:** 3.10+ style; prefer readable, small functions; use **`pathlib`** for paths when editing scripts; **validate CSV headers** before relying on columns; clear errors for missing files or bad rows.
- **Web dashboards:** Prefer **dependency-free** HTML/CSS/JS unless you explicitly want a library; keep layout **readable on a laptop**; separate **structure, style, and script** clearly.
- **Data:** Do not change source data files unless you or the assignment explicitly ask to; when computing metrics, **state assumptions** in comments or short printed notes.

---

## Repo notes (this folder)

- Week-level rules and a **directory tree** live in **`.cursorrules`** in this same folder. After adding or renaming files here, run **`python sync_cursorrules_tree.py`** from **`Week 2/`**, or from the repo parent directory: **`python "Week 2/sync_cursorrules_tree.py"`**.
- Cursor often loads **`.cursorrules` from the workspace root**; if nested rules are not picked up, open the **HCDE 530** folder as the workspace root or add a minimal root `.cursorrules` that points to **`Week 2/.cursorrules`** and **`Week 2/PROJECT_CONTEXT.md`**.

---

## How assistants should behave (checklist)

- Prefer **clarity over cleverness**; optimize for **grading, peers, and portfolio**.
- After **filesystem changes** in this folder, refresh the **`.cursorrules`** tree via **`sync_cursorrules_tree.py`** when applicable.
- When suggesting code, align with **plain-language comments**, **print summaries** for transparency, and remind you to **capture intent in git** when the change is meaningful.

---

*Generated from a short interview on 2026-04-24. Update this file if your goals or constraints change.*

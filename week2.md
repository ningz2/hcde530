# Week 2 — Competency C2: Code Literacy and Documentation

## Code literacy (reading and writing scripts)

Tonight I wrote and ran a small Python script (`Week 2/demo_word_count.py`) that loads a CSV with a `response` column, validates headers, counts words per row, and prints each participant’s ID with a short preview plus summary statistics. I used the standard library only (`csv`, `pathlib`) so the flow is easy to follow and reproduce on another machine.

## Documentation (intent, context, and conventions)

I added a project-level `PROJECT_CONTEXT.md` that records goals, audience, and constraints for this coursework repo, and a `.cursorrules` file so tooling and future edits stay aligned with readability-first, no-extra-dependencies habits. Together these document *why* the code is shaped the way it is, not only *what* it does.

## Traceability and sharing (Git and GitHub)

I initialized the `HCDE 530` folder as a Git repository, connected it to my GitHub remote, and resolved a non-fast-forward push by merging the remote `README` history with my local commits. That gives me a clear history of changes and a single place classmates or instructors can review the Week 2 artifacts alongside the code.

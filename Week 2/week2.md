# Week 2 — Competency 2: Code literacy & documentation

Reflection for HCDE 530 — Competency 2 (code literacy & documentation), Week 2.

---

## What “code literacy” meant for me this week

For me in this class, code literacy is not about becoming a software engineer. It is about being able to **work with real data files** in a grounded way: understanding **what a row in a CSV represents**, **spotting when something is wrong** (bad headers, missing fields, odd values), and **using the terminal** confidently enough to run a script and read the output. It also includes **writing inline comments** so my future self and others can follow the intent of each step. Finally, I am learning to **use an AI agent as a partner** to walk through code I do not fully understand yet—asking targeted questions instead of pretending I already know every line.

---

## What “documentation” meant for me this week

Documentation, for me, is partly **inside the code**: **inline comments** in Python that explain the **why** behind a step—not only what the line does, so someone reading the file can follow the reasoning. It is also **outside the editor but still part of the record**: **Git commit messages** (and the rhythm of committing) that capture **what changed and why** at a level a grader or teammate could scan later. I am not relying on a single long README for Week 2; the combination of **readable comments** and **meaningful commits** is how I document this competency.

---

## Concrete examples from my Week 2 artifacts

- **`demo_word_count.py`:** I added **inline comments** that walk a reader through the script in human order: loading the CSV into a list of row dictionaries, defining what “word count” means for an open-ended `response`, then looping participants to print a table and a short summary. The **`count_words` docstring** is the clearest documentation of **why** this metric exists—it states that we split on whitespace to **measure response length across participants**, not just to show off a Python trick. That is the kind of “code literacy + documentation” link I want visible for Competency 2.


---

## What felt hard, surprising, or rewarding

One friction point this week was **confusing, long loading** right after I hit **Commit** to save my changes. I was not sure whether Git was still working, whether the editor was frozen, or whether I should wait or try again. Moments like that remind me that “documentation” is not only about comments in code—it is also about **knowing what the tools are doing** so I do not lose trust in my own workflow while I am trying to record changes responsibly.

---

## What I want to practice or show next time

Next time I want to get more comfortable **reading a traceback** when something fails—staying with the error long enough to see *which line* and *which assumption* broke, instead of guessing. I also want to **ask an AI agent a sharper question first** (what file, what I expected, what I saw) so the answer I get is smaller and easier to verify against my own understanding.

---

## One sentence I’d tell a grader or portfolio reader

I am building toward **“messy survey data, handled responsibly”**: this week that meant **code literacy** (real CSV rows, terminal runs, *why* comments) and **documentation** (those comments plus **Git commits**) so my work is inspectable—not only runnable—and I am practicing tracebacks and sharper agent questions when something breaks.

# Week 4 — Competency 4: APIs & data acquisition

Reflection for HCDE 530 — Competency 4 (APIs and data acquisition), Week 4.

---

## What “API data acquisition” meant for me this week

For me in this class, API data acquisition means more than sending a request and getting JSON back. It means being able to **read endpoint documentation carefully**, choose the endpoint that actually matches the question, and then test whether the returned dataset is complete enough for the assignment goal. This week, I treated API work as a validation process: check the response shape, check record counts, and confirm that fields like rankings and points are truly present before trusting the output CSV.

---

## What “safe authentication” meant for me this week

Safe authentication meant building a repeatable workflow where credentials never live in source code. I stored the key in a local `.env` file, loaded it with `os.environ.get(...)`, and kept secrets out of tracked files. That helped me separate secure setup from data logic, so scripts stay shareable and easier to debug. It also made me more intentional about distinguishing quick tests from production-style habits in coursework.

---

## Concrete examples from my Week 4 artifacts

- **`WTA top players.py` and `ATP top players.py`:** I practiced endpoint validation by checking what singles ranking endpoints actually returned before finalizing extraction logic. This showed me that request success (`200`) does not guarantee complete data.
- **`ATP doubles players.py`:** I corrected field mapping based on live response schema (for example, using `pts` for points). That was a direct example of documentation reading plus response inspection working together.
- **Week 4 CSV outputs:** I exported structured outputs and compared headers/row counts against expectations, which made data quality checks part of the workflow rather than an afterthought.

---

## What felt hard, surprising, or rewarding

The hardest part was discovering that singles ranking endpoints returned far fewer players than expected, even when authentication was correct and calls succeeded. That was surprising because the request itself looked "successful." The rewarding part was learning to diagnose this systematically: test parameters, inspect raw response keys, compare endpoints, and identify likely provider-side limits instead of assuming my script was always wrong.

---

## What I want to practice or show next time

Next time I want to validate endpoint completeness earlier, before writing full extraction pipelines. I also want to add lightweight diagnostics at the start of each script (record counts, required-field checks, and endpoint notes) so I can quickly decide whether to proceed, switch endpoints, or document a provider-side data gap.

---

## One sentence I’d tell a grader or portfolio reader

I am building toward **"API data I can trust"**: this week that meant **secure authentication** (`.env` + `os.environ.get`), **careful endpoint/schema validation**, and **evidence-based debugging** when returned datasets were incomplete.

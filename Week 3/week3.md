# Week 3 report — Competency 3 (C3): Data cleaning and file handling

**C3 (course framing):** Loading, inspecting, and cleaning messy datasets with Python; reading error messages; writing scripts that run repeatably on a dataset.

---

## 1. Summary

This week I worked through a deliberately messy survey CSV and an analysis script. I fixed a runtime failure caused by non-numeric text in a numeric column, improved how experience is aggregated, normalized categorical text for counts, and used clearer file paths. I also reasoned about a separate logic issue in printed output (sort direction vs. labels). Taken together, this is my main Week 3 evidence for C3.

---

## 2. What I did

**Data and script**

- Loaded **`week3_survey_messy.csv`** with Python’s **`csv.DictReader`**, row by row, into a list of dictionaries for downstream use.
- In **`week3_analysis_buggy.py`**, implemented summaries over that data:
  - **Role counts** after **`strip()`** and **`.title()`** so mixed casing (e.g. “ux researcher” vs “UX Researcher”) rolls up to consistent labels.
  - **Average years of experience** using a small **`parse_experience_years`** helper: strip the cell, try **`int()`**, then map spelled-out values (e.g. “fifteen” → 15) via a lookup table; print warnings and skip unparseable rows for the average so the script still finishes.
  - **Satisfaction scores** read as integers where the cell is non-empty (the script also surfaces a “top vs. sort order” mismatch worth fixing next).

**Workflow**

- Pointed the script at the CSV with **`pathlib.Path`** and open the file from the **Week 3** working directory so paths behave the same on repeat runs.
- Left the **source CSV** as the messy teaching file; cleaning and normalization live in code rather than one-off manual edits to the dataset.

**Related practice**

- I also have **`clean_responses.py`** in this week’s folder for a separate “read CSV → validate headers → transform rows → write cleaned CSV” pattern (different input file); that reinforces repeatable file handling beyond the buggy survey exercise.

---

## 3. What I understand

- **Tracebacks are actionable.** A `ValueError` on `int(...)` names the failing value (e.g. `'fifteen'`) and the line of code; that usually means “the data violated an assumption,” not a random interpreter fault.
- **Cleaning is more than types.** Text fields need consistent rules (whitespace, casing) before aggregation so counts match the question you think you are answering.
- **Defensive parsing** means: normalize input, try the strict conversion, then handle known exceptions (here, a bounded map of words to integers), and decide what to do with leftovers (warn + exclude from that statistic).
- **Repeatability** means: stable paths, running from the folder that contains the data (or documenting the intended cwd), and encoding assumptions in the script instead of hidden spreadsheet edits.
- **Output QA is part of data work.** Printed section titles should match sort order and slices (e.g. “highest” requires descending sort or taking the correct end of the list).

---

## 4. What I can do now (that I could not before, or can do more confidently)

- **Use a traceback as a map.** I can start from the error type and line number, open the right part of the script, and treat the message (e.g. the offending string in a `ValueError`) as a clue about messy data instead of freezing or guessing.
- **Parse “almost numeric” survey fields.** I can strip cells, try `int()`, then handle predictable non-digit forms (such as spelled-out small numbers) in a small helper, and decide what to do when a value still fails (warn, skip that row for one metric, keep the rest of the run going).
- **Normalize text before I aggregate.** I can apply consistent rules like `strip()` and casing/title on category columns so counts reflect roles or labels the way I intend, not accidental duplicates from typography.
- **Make file handling more repeatable.** I can use `pathlib` for paths and run the script from the folder that holds the CSV so the same command works on the next run without ad hoc path tweaks.
- **Question my own tables and prints.** I can check that headings (“top,” “average,” “count”) match how the data was sorted and sliced, not only whether the script exited with code zero.

---

## 5. Artifacts (for reviewers)

| Artifact | Role |
|----------|------|
| `week3_survey_messy.csv` | Messy input data |
| `week3_analysis_buggy.py` | Main Week 3 analysis + cleaning patterns discussed above |
| `clean_responses.py` | Separate CSV clean/write example |

---

_Revise phrasing in your own voice before submission._

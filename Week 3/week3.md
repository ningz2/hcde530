# Week 3 — Debugging `week3_analysis_buggy.py`

This note ties the **git history** for the Week 3 survey analysis script to the **debugging steps** we took while cleaning up `week3_survey_messy.csv` handling.

## Git commit history (`Week 3/week3_analysis_buggy.py`)

Commits are listed from oldest to newest.

### 1. `0b53012` — Fix non-numeric `experience_years`

| Field | Value |
|--------|--------|
| **Short hash** | `0b53012` |
| **Full hash** | `0b53012ceebfebcd2bd34bb8f88f430c1963eb39` |
| **Date** | Tue Apr 21 14:32:28 2026 -0700 |

**Subject:** Fix ValueError when parsing non-numeric experience_years

**Summary:** Adds the script and skips `experience_years` values that are not plain integers (e.g. `fifteen`). The average uses only rows that parse successfully.

---

### 2. `c06530b` — Top satisfaction scores and empty roles

| Field | Value |
|--------|--------|
| **Short hash** | `c06530b` |
| **Full hash** | `c06530b7d54011391ce2c1775ec45294cd6e4cfa` |
| **Date** | Tue Apr 21 14:41:24 2026 -0700 |

**Subject:** Fix top-5 satisfaction sort and empty role labels

**Summary:** Sorts satisfaction scores **descending** (`reverse=True`) so the printed “top 5” are the **highest** scores. Blank `role` fields are shown as `(no role)` instead of an empty label.

---

To refresh this log locally:

```bash
cd "/Users/zhangning/Documents/HCDE/HCDE 530"
git log --oneline -- "Week 3/week3_analysis_buggy.py"
git show 0b53012 -- "Week 3/week3_analysis_buggy.py"
git show c06530b -- "Week 3/week3_analysis_buggy.py"
```

## Debugging timeline (what we found and fixed)

Issues are listed in roughly the order they showed up when running the script against the messy CSV.

1. **`ValueError` on `experience_years`**  
   One row (R009) used the word `fifteen` instead of digits. The original `int(row["experience_years"])` crashed the run before averages or “top 5” printed.  
   **Fix in git:** `0b53012` — strip each value, `try`/`except ValueError`, skip bad values, divide by the count of successfully parsed rows.

2. **“Top 5” satisfaction was the five lowest scores**  
   The code sorted ascending and took `[:5]`, which contradicted the comment about **highest** satisfaction.  
   **Fix in git:** `c06530b` — `scored_rows.sort(..., reverse=True)`.

3. **Empty `role` produced a blank label**  
   A response with no role was counted but printed as `  : 1`.  
   **Fix in git:** `c06530b` — `role = row["role"].strip().title() or "(no role)"`.

4. **Off-by-one on the last row**  
   Loops use `for row in rows` over the full list from `csv.DictReader`. There was **no** bug that skipped only the last row; all 35 data rows are included in the role counts.

# MP1 Yellowstone — Competency claims

Short claims for domains demonstrated in `MP1_yellowstone_summer2024.ipynb` (2–4 sentences each).

---

## C3 — Data cleaning and file handling

This project works from a **processed reservation extract** (`data/processed/yellowstone_summer_2024.csv`) scoped to Yellowstone **camping** stays with **summer 2024** start dates, so the notebook starts from an already-filtered file but still **coerces types** that arrive as text: `pd.to_datetime` on `orderdate` and `startdate` with `errors="coerce"`, `pd.to_numeric` on `totalpaid`, and a **regex-based parse** of `nights` (leading integer from strings like `"4 days"`) before aggregations. I documented **grain and join keys** (one row per reservation; `facilityid` links to RIDB) in the data profile and kept **API keys** out of the notebook by loading `RIDB_API_KEY` from `.env` / `yellowstone.env` for live RIDB pulls.

---

## C5 — Data analysis with pandas

I answered **three analysis questions** with explicit **`groupby("park", observed=True)`** workflows: (1) **cancellation proxy rate** (% of rows with `totalpaid == 0`) versus **median booking lead time** in days (`startdate` − `orderdate`), with reservation count for context; (2) **RIDB campsite record counts** per `facilityid` (paginated API) compared to **mean parsed nights** and reservation volume by park; (3) **distribution of lead times** by park using reservation-level rows, not just campground means. The logic separates **constructs** (proxy cancel share vs. true cancel flags; RIDB inventory vs. stay length) instead of collapsing them into a single ambiguous metric.

---

## C6 — Data visualization

Section 3 builds **Plotly Express** charts matched to the data’s structure: a **scatter** for two campground-level rates plus **size** for `n`, a **bar** chart for nonnegative RIDB counts with **color** for mean nights, and **box plots** for reservation-level lead time by park. Section 4 (**Visualization Rationale**) embeds the matching **Week 6 SVG exports** and states, for each figure, **why that chart type** fits and **what a reader should take away**, tying visuals directly to the analysis claims.

---

## C7 — Critical evaluation and professional judgment

I treated **`totalpaid == 0` only as a documented proxy** for “cancellation-like” rows—not as ground truth—and used interpretation text to stress **what the scatter does and does not prove** (e.g., Lewis Lake’s high proxy rate coexisting with long median lead time breaks a naive single-story reading). For RIDB, I framed **campsite record counts** as a **richness / inventory proxy**, then argued cautiously when **inventory and mean stay** did not line up in a simple way. Section 5 states **limits on causality, generalization, and missing fields** (no official cancel flag in this extract, summer-only slice, four campgrounds), which bounds what responsible conclusions can claim.

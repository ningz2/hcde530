# Week 6 — Competency 6 (C6): Data visualization

**C6:** Building charts that make an argument clearly; choosing chart types that match the data structure; publishing analysis as a Jupyter notebook on GitHub.

---

## 1. Building charts that make an argument clearly

The argument I want readers to hold is about **inventory versus behavior**: official RIDB campsite counts describe capacity on paper, while stay length summarizes what reservations actually look like in summer 2024. The bar chart makes that tension visible in one view—**bar height** encodes RIDB-listed campsite records per campground, and **color** encodes mean nights parsed from reservation text—so the graphic is not a single-number story. A reader can ask whether larger inventories line up with longer typical stays, or whether high counts can sit next to shorter means, which keeps “listed sites” and “observed stay” as separate constructs instead of blending them.

---

## 2. Choosing chart types that match the data structure

Q1 and Q2 use **one mark per campground** (aggregated summaries in the scatter and bar charts). Q3 keeps **campground** on the category axis while each box summarizes **many reservation-level** lead times.

Each **scatter** point is one campground in a plane of two derived numerics—cancellation proxy rate on *x* and median lead time on *y*—with marker size carrying reservation count so high-volume facilities don’t look equivalent to low-volume ones. The **bar** chart matches a categorical inventory question: RIDB campsite record counts are nonnegative magnitudes compared across named facilities, and default sort-by-height supports “who has the most listed sites” while color layers in mean parsed nights. The **box** plot is the right structure for reservation-level **lead time in days** grouped by campground, because it summarizes spread, skew, and outliers per category without drawing one point per reservation on the category axis.

---

## 3. Publishing analysis as a Jupyter notebook on GitHub

The MP1 Yellowstone work lives in **`MP1_yellowstone_summer2024.ipynb`** (and the surrounding **`MP1_yellowstone`** project folder). The analysis is **not yet** pushed to GitHub; I am still finishing narrative, checks, and exports. For C6, publication will mean placing that notebook in a repository with a short **README** (what the notebook does, where the processed summer-2024 CSV lives, and how figures were produced), including the **processed data** or documenting how to regenerate it, and keeping **secrets** (for example, a RIDB API key in **`.env`**) out of version control.

For **reproducibility**, I plan a **combined** setup: a stable path to the processed extract (**`MP1_yellowstone/data/processed/yellowstone_summer_2024.csv`**), README notes for anyone rebuilding from source extracts, a **dependency list** (for example **`requirements.txt`** or documented **`pip install`** lines for **pandas**, **plotly**, and **kaleido** for SVG export, plus **certifi** for HTTPS when calling RIDB), and **API key handling** so **`RIDB_API_KEY`** is read from **`.env`** or **`yellowstone.env`** with those files **gitignored**. If static figures are part of the submission, I will note optional SVG regeneration via **`Week 6/export_mp1_yellowstone_charts_svg.py`**.

---

## 4. Week 6 synthesis

This week’s Yellowstone MP1 work demonstrates C6 by aligning **chart types with the data’s grain**, using **visual encodings that carry a clear comparison** (notably inventory versus typical stay length), and treating **GitHub publication** as a reproducible package—README, processed data path, dependencies, and non-committed API keys—even while the notebook is still being finalized for push.

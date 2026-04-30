# Week 5 — Competency 5: Data analysis with pandas

**C5 — Data analysis with pandas:** Using pandas to answer analytical questions: filtering, grouping, summarizing, handling missing data. Choosing the right operation for the question.

Reflection for HCDE 530, Week 5.

---

## What using pandas to answer analytical questions meant for me this week

This week pandas felt less like scrolling a static table and more like a **small query engine** I point at a question. I start by writing the question in **plain English** (“only rows where…,” “per country,” “top players within a group”), then translate that into the right mix of conditions and summaries. That habit made the notebook read as a sequence of intentional answers instead of random tries: each cell was meant to match a stated sub-question, not just to run syntax for its own sake.

---

## Filtering, grouping, and summarizing — what they meant in practice

**Filtering** meant **boolean indexing**—building a True/False mask and writing `df[df["column"] == value]` when I needed to keep all matching rows for a slice of the story (for example, players tied to one country).

**Grouping and summarizing** meant **`groupby` with aggregations**—counts, joins of names into one readable string, or other summaries when the question was about **shared keys** (such as the same country and ranking bucket) rather than about listing every raw match row.

**Summarizing in the broader sense** depended on **what I wanted to see and how the result should be structured**. Sometimes I needed row-level detail after a filter; sometimes I needed a collapsed view after a group. I chose the operation based on that output shape, not by defaulting to one tool for every prompt.

---

## Handling missing data — what it meant for me this week

Missing data was a **measurement step first**, not something I assumed away. I used patterns like **`df.isnull().sum()`** to see how many empty cells appeared **per column**. In my Week 5 doubles example the counts were often zero, but running the check still mattered: it confirms the pipeline is wired correctly and the same code will behave sensibly when a real API or CSV returns incomplete fields later.

---

## Choosing the right operation for the question — how I decided

I still begin from **plain English** and then pick **filter versus groupby** based on whether I need **all qualifying rows** or a **summary keyed by categories**. The hardest part in practice was **after `groupby`**, when I had to stay careful about **index versus columns**—including cases where multiple grouping keys produce a **MultiIndex** and the next step is easier if I know exactly what became an index level versus an ordinary column. Naming that confusion explicitly helped me slow down and inspect the result (`head()`, `index`, `reset_index` when needed) before chaining another operation.

---

## Concrete examples from my Week 5 artifacts

- **`WTA_Doubles.ipynb`:** This is my clearest C5 artifact. I reshaped doubles rows into one row per player and country, used **boolean indexing** to answer country-specific “who belongs in this slice?” questions, used **`groupby` on two columns** (country and ranking) to see how players cluster at the same ranking level, and used **`isnull().sum()`** to report missing values by column. Together those steps show filtering, grouping, summarizing, and missing-data handling in one coherent thread.

---

## What felt hard, surprising, or rewarding

The **stickiest** part was **keeping track of the index versus columns after `groupby`**, especially when the grouped result is not a simple flat frame. The **rewarding** part was when the English question mapped cleanly to a filter or a grouped summary and the printed table matched what I had in mind—evidence that I had chosen the right operation for that question.

---

## What I want to practice or show next time

Next time I want to practice **reading grouped results quickly**: when to **`reset_index`**, how to name index levels, and how to avoid ambiguous chains when the index carries part of the meaning. I also want to keep the habit of **plain-English questions first**, then code second, because it already helps me separate “slice rows” from “collapse by keys.”

---

## One sentence I’d tell a grader or portfolio reader

This week I used pandas as a **question-driven query layer**—**boolean filters**, **`groupby` aggregations**, and **explicit missing-value counts**—with my strongest evidence in **`WTA_Doubles.ipynb`**, while I keep working on **index versus column structure after grouping**.

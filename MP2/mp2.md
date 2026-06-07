# MP2 AffinityFlow — Competency claims

Short claims for domains demonstrated in **AffinityFlow** (`MP2/`) (2–4 sentences each).

**Interview summary (8 questions):** Strongest self-ratings were **C1, C3, C4, C6, C7, C8**; **C2** moderate; **C5** light (no pandas notebook in this project). The three claims below are the strongest and best evidenced in the shipped MP2 work.

---

## C8 — Building and deploying a complete tool

I scoped AffinityFlow for a real HCD use case—helping UX researchers, designers, PMs, and students synthesize qualitative **codes** (not just raw quotes) into an editable affinity board—and shipped it as a guided web app: sign in → add data → privacy check → default AI grouping on a zoomable canvas, with export/share as an optional step from the board. The stack is **Next.js + TypeScript** with an in-memory-to-Prisma-shaped repo for iterative delivery, **cookie-based demo auth** plus **Supabase Google OAuth** wiring, and deployment on **Vercel** (root directory `MP2`). I iterated from live testing (wizard flow, collapsible organize panel, fixed-size hover cards, published styling) and pushed working commits to **GitHub** so the published tool tracks local progress.

---

## C7 — Critical evaluation and professional judgment

I did not treat AI grouping or anonymization as black boxes. When **`[NAME]`** appeared inside short **code labels**, I traced it to over-aggressive name masking and disabled name detection for the `code` field while keeping it for free-text **quote/memo**. I rejected generic one-template **“Why here”** rationales and rewrote grouping logic so explanations use code text, quote/memo context, and cluster keywords; I also enforced **theme count < group count** in both UI sliders and backend logic. For privacy, anonymization stays **default ON** with an explicit post-upload consent step, and API keys live in **`.env.local`** / Vercel env vars—not in the repo—so I can state what the tool proves versus what still needs researcher verification.

---

## C3 — Data cleaning and file handling

MP2’s ingest path has to survive messy researcher exports, so I hardened **`parser.ts`**: strip BOMs, **auto-detect delimiters** (comma, semicolon, tab), parse quoted CSV fields, and **`cleanCode`** to drop leading underscores from code labels. The domain model treats **code** as the unit of analysis with optional **quote** and **memo** on the same row; multi-file upload supports one tab-separated file (all participants) or multiple files (one participant each), with filename fallback for participant identity. When parsing yields zero codes, the API returns a **clear 400** instead of silently continuing, and raw uploads are discarded after structured extraction—matching the privacy-first file-handling policy in `MP2/.cursorrules`.

# MP2 Reflection — AffinityFlow

## What did you build?

AffinityFlow is a web app that turns qualitative research **codes** into an interactive affinity diagram. A collaborator outside this course can think of it as a synthesis workspace: sign in, create a project, upload or paste coded data (CSV/TXT), confirm a privacy check, and open a zoomable board where codes appear as color-coded sticky notes in named groups. Users can rename themes, switch hierarchy (groups → themes → research questions), adjust granularity sliders, and regenerate. Hovering a note shows placement rationale, quote, memo, and source file. Export to CSV, printable HTML, or FigJam CSV is available from the board. Live app: [affinity-flow.vercel.app](https://affinity-flow.vercel.app). Source: [github.com/ningz2/hcde530/tree/main/MP2](https://github.com/ningz2/hcde530/tree/main/MP2).

## What decisions did you make?

I chose **Next.js on Vercel** because MP2 needed a real multi-step product—with routes, server APIs, auth, and deployment—not a one-shot prototype or notebook. I iterated in Cursor on TypeScript to keep control as scope grew.

The core data decision was **code as the unit of analysis**, with quote and memo as row-level context. That matches post-coding researcher workflow and shaped `parser.ts` (delimiter detection, BOM stripping, `cleanCode`) and the board UI (notes show code; quote/memo support grouping and hover detail).

Versus my MP2a declaration, I prioritized **canvas experience**—zoom/pan, a movable organize panel, fixed-size hover cards—over drag-and-drop regrouping. I also dropped the manual strategy step so users land on a default AI board after privacy consent, shortening the wizard but changing the original “define strategy first” plan.

## What would you do differently?

During iteration I already strengthened grouping beyond bare keyword matching: `clusterByKeywords` runs on **combined code + quote + memo** text, Anthropic names clusters with **research-question context** when a key is set, and `rationaleFor` writes **interpretive** per-code explanations using row evidence—not one generic template. The backbone stays deterministic for testability, but the pipeline is richer than keyword-only labeling.

What I would still change: **manual correction or audit of AI grouping**. Users can rename themes, change hierarchy/granularity, and regenerate, but they cannot drag a misplaced sticky note to another group or step through low-confidence assignments before sharing. For real researcher trust, I would add drag-and-drop regrouping or a review mode to accept, move, or reject individual code placements.

I would also replace the **in-memory store with PostgreSQL + Prisma** on Vercel. Grouping improvements matter less if projects disappear across serverless restarts—a limitation that shows up immediately in production.

## What does this work demonstrate?

This project most clearly shows **C7 — critical evaluation and professional judgment**. I did not treat model output as truth. When `[NAME]` appeared in code labels, I disabled name masking for `code` in `anonymization.ts` while keeping it for quote/memo. I rewrote generic rationales in `grouping.ts` to use row context and cluster keywords. I enforced theme count < group count in UI and backend, and kept anonymization default-on with post-upload consent.

It also demonstrates **C8** (scoped HCD tool on Vercel), **C3** (messy CSV handling in `parser.ts`), and **C6** (the board as visual synthesis in `BoardClient.tsx`)—build, clean, visualize, and judge AI before researchers rely on it.

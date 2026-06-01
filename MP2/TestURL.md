# Test URL — verify MP2 locally

The dev server runs here:

## ▶ Open this

http://localhost:3000

If port 3000 is taken, the terminal running `npm run dev` will print a different
port (e.g. `http://localhost:3001`) — use whichever it shows.

## How to start the server (if it isn't running)

```bash
cd "/Users/zhangning/Documents/HCDE/HCDE 530/MP2"
npm install   # first time only
npm run dev
```

## What to click through (current flow)

The flow is a guided wizard; the **Affinity board is the final destination**.
Export & share and Activity are optional, accessed from the board.

1. **Add data** (`/`) — upload one or more CSV/TXT files, paste text, or use the
   sample. You can select one file (all participants) or multiple files (one
   participant each). You can also add **research questions** one by one.
2. **Privacy check** — a modal pops up after upload to mask PII (default ON) and
   shows what was masked. Continuing takes you straight to the board (the old
   "set up grouping" step is gone).
3. **Affinity board** — opens with a **default AI grouping** already generated.
   It's a Miro/FigJam-style canvas: **scroll to zoom**, **drag the background to
   pan**. Codes are colored square sticky notes (code only); each group has an
   AI-suggested name you can rename inline.
   - **Right control panel:** choose the hierarchy (Groups → Themes → By
     research questions) and drag the **granularity sliders** (group level and
     theme level), then click **Apply** to regenerate.
   - Export & share and a link to Activity appear below the board.

> AI naming uses Anthropic when `ANTHROPIC_API_KEY` is set; without a key it
> falls back to keyword-derived names. Clustering itself is deterministic.

## Useful direct links (replace WORKSPACE_ID)

- Board: `http://localhost:3000/workspaces/WORKSPACE_ID/board`
- Add more data: `http://localhost:3000/workspaces/WORKSPACE_ID/ingest`
- Export & share: `http://localhost:3000/workspaces/WORKSPACE_ID/export-share`
- Activity (undo history): `http://localhost:3000/workspaces/WORKSPACE_ID/history`

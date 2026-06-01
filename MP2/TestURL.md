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
   sample. You can select multiple files (e.g. one per participant); a file with
   no `participant` column is grouped under its file name.
2. **Privacy check** — a modal pops up after upload to mask PII (default ON) and
   shows what was masked.
3. **Set up grouping** — pick grouping direction / hierarchy depth (scaffold).
4. **Affinity board** — codes shown as colored square sticky notes grouped into
   themes (note shows the code only; quote/memo stay in the backend). Rename
   themes inline, undo per session. Export & share and a link to Activity appear
   below the board.

## Useful direct links (replace WORKSPACE_ID)

- Board: `http://localhost:3000/workspaces/WORKSPACE_ID/board`
- Add more data: `http://localhost:3000/workspaces/WORKSPACE_ID/ingest`
- Export & share: `http://localhost:3000/workspaces/WORKSPACE_ID/export-share`
- Activity (undo history): `http://localhost:3000/workspaces/WORKSPACE_ID/history`

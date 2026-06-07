# AffinityFlow

**AffinityFlow** is a web app that helps people turn qualitative research **codes** into an interactive affinity diagram. Upload or paste coded data, confirm privacy settings, and the app generates a grouped board you can explore, rename, reorganize, and export.

Built for **HCDE 530 (MP2)** at the University of Washington.

---

## Live app

**https://affinity-flow.vercel.app**

Start at the login page: **https://affinity-flow.vercel.app/login**

Sign in with any email address (demo path) or Google (when Supabase OAuth is configured). Then follow the guided flow: add a project and data → privacy check → affinity board.

> **Note:** The current deployment uses a demo persistence layer. Projects and board data may not survive server restarts on Vercel. For a production deployment, connect PostgreSQL + Prisma and full Supabase Auth.

---

## Who this is for

AffinityFlow is for anyone who synthesizes qualitative user research and wants AI assistance without giving up control:

- **UX researchers** coding interview or usability transcripts
- **Product designers and PMs** grouping feedback themes across participants
- **Students** learning affinity diagramming in user research courses

You do **not** need to be in HCDE 530 to use or evaluate the tool. If you have a CSV or text file where each row is a **code** (with optional quote/memo columns), you can try it immediately.

---

## What it does

1. **Add data** — Create a project, optionally add research questions, then upload one or more CSV/TXT files or paste coded text. The parser accepts comma-, semicolon-, or tab-separated files and treats **code** as the primary unit (quotes and memos add context on the same row).

2. **Privacy check** — After upload, a modal asks permission to mask likely PII (default **on**). Raw uploads are discarded after extraction; only structured, anonymized items are kept for grouping.

3. **Affinity board** — Opens with a **default AI grouping**: named groups/themes on a zoomable canvas. Sticky notes are color-coded by participant. Hover a note for rationale, quote, memo, and source file.

4. **Organize** — Use the floating **Organize the board** panel to switch hierarchy (Groups → Themes → Research questions), adjust granularity sliders, and regenerate.

5. **Export & share** (optional) — From the board, export CSV, printable HTML (PDF), or FigJam-compatible CSV, and create an anonymous view-only share link.

---

## Run it locally

### Prerequisites

- **Node.js** 18+ and **npm**
- Optional: **Anthropic API key** for AI-generated group names (keyword fallback works without it)
- Optional: **Supabase** URL + anon key for Google login (see `GOOGLE_AUTH_SETUP.md`)

### Steps

```bash
git clone https://github.com/ningz2/hcde530.git
cd hcde530/MP2
npm install
cp .env.example .env.local
# Edit .env.local with your keys (never commit real secrets)
npm run dev
```

Open **http://localhost:3000** (or the port shown in the terminal).

### Other commands

```bash
npm test          # unit tests (Vitest)
npm run build     # production build
npm run start     # run production build locally
```

---

## Source code

Repository: **https://github.com/ningz2/hcde530**

MP2 app folder: **https://github.com/ningz2/hcde530/tree/main/MP2**

This is a **Next.js + TypeScript** web application (not a Jupyter notebook). The live Vercel link above is the primary way to try it without running a server.

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Frontend / API | Next.js App Router, TypeScript, React |
| Data (planned) | PostgreSQL + Prisma |
| Auth (planned / partial) | Supabase Auth (Google OAuth wired); demo email login |
| AI naming | Anthropic API (optional); deterministic clustering fallback |
| Deploy | Vercel (root directory: `MP2`) |

---

## Project docs

| File | Purpose |
|------|---------|
| `ARCHITECTURE.md` | System design and API frame |
| `TestURL.md` | Local testing walkthrough |
| `GOOGLE_AUTH_SETUP.md` | Google OAuth via Supabase |
| `mp2.md` | Competency claims for course portfolio |
| `.cursorrules` | Product requirements reference |

---

## Data format (quick reference)

CSV or pasted text with a **code** column (or one code per line for plain text). Optional columns for **quote**, **memo**, and **participant**. Example headers the parser recognizes:

```text
code, quote, memo, participant
```

For multi-participant studies you can upload one combined file or separate files per participant (filename used as participant label when needed).

---

## License / context

Course project (HCDE 530). For questions about the implementation, open an issue on the GitHub repo or contact the author via the course context.

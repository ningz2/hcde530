# MP2 Affinity Diagram Generator (Phase 1 Frame)

Thin architecture scaffold for a privacy-first, collaborative, AI-assisted affinity diagram web app.

## Quick start
1. Install dependencies
   - `npm install`
2. Configure environment
   - copy `.env.example` to `.env`
3. Run app
   - `npm run dev`

## What is scaffolded
- Next.js App Router + TypeScript project skeleton
- Prisma schema for core entities and role/collab model
- API route contracts + Zod validation + standard error shape
- Service interfaces + mock parser/anonymization/grouping/export services
- UI workflow pages from ingest to session history
- Architecture notes in `ARCHITECTURE.md`

## Phase 1 scope
This repository currently provides **architecture frame only**. Core features are intentionally mock-heavy and incomplete by design.

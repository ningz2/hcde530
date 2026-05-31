# MP2 Architecture Frame (Phase 1)

## Goals
- Establish a privacy-first, collaborative architecture for an AI-powered affinity diagram app.
- Keep implementation thin and mock-heavy while defining stable boundaries for v1 evolution.
- Prioritize anonymization defaults, role-safe collaboration, and transparent AI grouping outputs.

## Stack
- **Web app**: Next.js App Router + TypeScript
- **Persistence**: PostgreSQL + Prisma
- **Identity/collaboration**: Supabase Auth + Realtime (scaffolded interfaces)
- **AI provider**: Anthropic (service boundary scaffold)
- **Deployment target**: Vercel

## High-Level Modules
- `src/app`: route-driven UI flow and API handlers.
- `src/domain`: typed domain entities, policies, service contracts, and mock implementations.
- `src/lib`: infrastructure adapters (auth/session, validation, error shape, db client, supabase client).
- `prisma/schema.prisma`: canonical data model for v1 entities and relations.

## Primary User Flow (Scaffolded)
1. Ingest (`/workspaces/[workspaceId]/ingest`)
2. Anonymization consent (`/workspaces/[workspaceId]/anonymization`)
3. Strategy setup (`/workspaces/[workspaceId]/strategy`)
4. Affinity board (`/workspaces/[workspaceId]/board`)
5. Export/share (`/workspaces/[workspaceId]/export-share`)
6. Session history (`/workspaces/[workspaceId]/history`)

## API Contract Frame
All API routes return `{ data }` on success or `{ error }` with standardized shape:

```ts
{
  error: {
    code: "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION_ERROR" | "CONFLICT" | "INTERNAL_ERROR";
    message: string;
    details?: unknown;
    traceId?: string;
  }
}
```

Scaffolded endpoints:
- `POST /api/workspaces`
- `GET /api/auth/providers`
- `POST /api/workspaces/[workspaceId]/members`
- `POST /api/workspaces/[workspaceId]/share-links`
- `POST /api/workspaces/[workspaceId]/ingest`
- `POST /api/workspaces/[workspaceId]/strategy`
- `POST /api/workspaces/[workspaceId]/grouping`
- `POST /api/workspaces/[workspaceId]/exports`
- `GET /api/workspaces/[workspaceId]/history`

Validation uses Zod schemas in `src/lib/validation/workspace.ts`.

## Auth + Collaboration Boundaries
- Providers scaffolded: email/password, Google SSO, Microsoft SSO.
- Role model scaffolded: `OWNER`, `EDITOR`, `VIEWER`.
- Server policy checks via `assertRoleCan(...)` matrix.
- Anonymous links treated as **view-only context** and blocked from mutating/admin actions.
- Exports are role-allowed for owner/editor/viewer, but anonymous links are disallowed from export requests in current scaffold.

## Privacy-by-Default Frame
- Ingestion contract includes consent + opt-out fields with default anonymization ON.
- Service layer applies anonymization before downstream AI usage (mocked).
- Raw uploads are modeled as discarded (`rawRetained: false`) in ingestion response contract.
- Share link APIs return anonymized-safe boundaries (no raw identifier pathways scaffolded).

## AI Workflow Boundaries
Service contracts in `src/domain/contracts/services.ts` enforce:
- parser normalization before AI
- anonymization before grouping when enabled
- strategy generation from research question/goal/context
- grouping output with per-assignment one-sentence rationale
- adjustable hierarchy depth parameter

## Data Model Coverage
Prisma schema includes core entities for:
- users, workspaces, memberships, activity logs
- uploads, participants, quotes
- grouping strategies, boards, themes, quote assignments
- exports, anonymous share links
- user sessions + session snapshots for per-user undo/history
- soft-delete states for quote/theme with restore-capable fields

## Definition of Done: Phase 1 (Frame Complete)
Checklist status:
- ✅ Next.js + TypeScript scaffold with coherent module boundaries
- ✅ Prisma schema for core entities/relations
- ✅ Auth/collab boundary scaffolding (roles, provider placeholders, anonymous view-only guardrails)
- ✅ API contract scaffolding with validation and standardized errors
- ✅ Service interfaces for parser/anonymization/grouping/export
- ✅ End-to-end UI flow page scaffolds
- ✅ Architecture docs + short README

Known intentional gaps (deferred by design for this phase):
- Supabase Auth realtime integration wiring (actual provider/session persistence)
- Real file parsing for CSV/TXT/DOC/DOCX and upload storage pipeline
- Production-grade PII detector/masker implementation
- Anthropic API integration and persisted grouping runs
- Drag/drop board interactions, editable themes UI, participant color system rendering
- Export generation workers and artifact storage
- Session snapshot persistence and undo mechanics implementation
- Automated tests for permission/anonymization/strategy routes

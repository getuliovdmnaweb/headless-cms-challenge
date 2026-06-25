# Headless CMS — Admin Panel

Take-home challenge for The Agile Monkeys frontend role ([brief](https://frontend-challenge-2026.theagilemonkeys.com/)). An admin panel for defining arbitrary content types with typed, editable fields (Contentful's model — there is no fixed set of types), managing content against them through auto-generated forms, real-time sync across clients, and safe schema evolution with impact preview and remediation.

See [PRD.md](PRD.md) for product scope, [design.md](design.md) for architecture and data model, and [tasks.md](tasks.md) for the vertical-slice backlog (each slice maps to one of the brief's 5 required components).

## Stack
- **Backend**: Node.js + Express + TypeScript, Postgres (raw SQL via `pg`, no ORM), Socket.io
- **Frontend**: React + Vite + TypeScript, TanStack Query, React Router, Tailwind CSS
- **Tests**: Jest + Supertest (backend, against a real Postgres instance), Vitest + React Testing Library (frontend)

## Prerequisites
- Node.js 20+
- Docker (for local Postgres)

> **Note on Node version**: this was built and tested against Node 20.10. Some tooling (`vitest`, `jsdom`) is pinned to specific major versions in `frontend/package.json` because their latest releases require Node ≥20.19 — if you're on Node 20.19+ or 22.12+, everything still works with the pinned versions, no changes needed.

## Run it

```bash
# 1. Start Postgres (mapped to host port 5433 to avoid clashing with any local Postgres install on 5432)
docker compose up -d

# 2. Backend
cd backend
npm install
cp .env.example .env
npm run migrate      # applies the content_types + entries schema
npm run dev          # http://localhost:4000

# 3. Frontend (separate terminal)
cd frontend
npm install
npm run dev           # http://localhost:5173
```

Open http://localhost:5173.

## Run the tests

```bash
cd backend && npm test    # 112 tests — needs Postgres running (step 1 above)
cd frontend && npm test   # 71 tests
```

## Exercising each of the brief's 5 requirements

1. **Content type / schema builder** — On the home screen, click "New content type". Name it anything (there's no fixed list — try something not in any example anywhere, e.g. "Podcast episode"), add fields of any type (text/number/boolean/date/reference), mark some required, save. It appears in the list immediately.
2. **Dynamic entry editor** — Click "View entries" on a content type, then "New entry". The form is generated entirely from that type's field list — no code exists per content type. Try a `reference` field: it renders a picker populated from the target type's actual entries.
3. **Real-time updates** — Open the app in two browser tabs (or run `curl -X POST http://localhost:4000/api/content-types -d '{"name":"Test","fields":[]}' -H 'Content-Type: application/json'` while a tab is open on the content type list). The change appears in the open tab with no refresh.
4. **Content type evolution** — Edit an existing content type that already has entries: rename a field, change its type (e.g. text → number), or toggle it required. Saving shows a preview modal classifying entries as auto-migrated or needing attention, with sample current values and a one-shot backfill input per affected field. Confirming applies the migration transactionally; entries left non-compliant (no backfill given) are flagged invalid in the entry list afterward rather than blocking the save.
5. **Read API** — `curl http://localhost:4000/api/content/<slug>` and `curl http://localhost:4000/api/content/<slug>/<id>` (slug is whatever you set when creating the content type, e.g. `podcast-episode`). No auth, returns just `id`/`data`/`createdAt`/`updatedAt` — no internal validation fields.

## Project structure

```
backend/src/
  repositories/   raw Postgres access (content types, entries, evolution transaction)
  routes/         Express routers
  validator/      validateEntry, diffFields, classifyImpact, migrateEntryData — the evolution engine
  realtime/       Socket.io global broadcast
frontend/src/
  screens/        ContentTypeList, ContentTypeBuilder, EntryList, EntryEditor
  components/ui/  domain-agnostic primitives (Button, Input, Select, Checkbox, Badge, Table)
  components/shared/  DynamicField, ContentTypeChangePreview
  hooks/          one hook per domain concern, TanStack Query underneath
  services/       API-agnostic fetch layer
```

## Trade-offs and known limitations
See the "Trade-offs" section of [design.md](design.md) — no auth, no draft/publish states, bulk (not per-entry) backfill remediation, best-effort reference integrity on delete.

# Design — Headless CMS Challenge

## Stack

| Layer | Choice | Rationale |
|---|---|---|
| Backend | Node.js + Express + TypeScript | Lightweight, no framework magic — evaluators can read every line |
| Database | PostgreSQL via Docker | Relational model fits schema-as-data; `docker compose up` is one command for evaluators |
| Real-time | Socket.io | Handles reconnection and fallback out of the box; right-sized for a 4-hour scope |
| Frontend | React + Vite + TypeScript | Fast dev server; no SSR overhead needed for an admin-only tool |
| Server state | TanStack Query | Cache invalidation, background refetch, loading/error states handled automatically |
| Styling | Tailwind CSS | Utility-first; no component library dependency to install or learn |
| Testing | Jest + React Testing Library (frontend) · Jest + Supertest (backend) | Standard, well-documented, TDD-friendly |

---

## Data Model

Three tables. The core insight: entry data is stored as JSONB rather than EAV (one row per field value), because schema evolution then becomes "transform one JSON blob" rather than "update hundreds of rows."

### `content_types`
```sql
CREATE TABLE content_types (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  slug       TEXT        NOT NULL UNIQUE,   -- auto-derived from name; used in public API
  version    INTEGER     NOT NULL DEFAULT 1, -- incremented on every schema save
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `fields`
```sql
CREATE TABLE fields (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type_id  UUID    NOT NULL REFERENCES content_types(id) ON DELETE CASCADE,
  name             TEXT    NOT NULL,
  type             TEXT    NOT NULL CHECK (type IN ('text','number','boolean','date','reference')),
  required         BOOLEAN NOT NULL DEFAULT false,
  position         INTEGER NOT NULL DEFAULT 0,  -- controls display order in the editor
  reference_to     UUID    REFERENCES content_types(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (content_type_id, name)
);
```

`reference_to` is only set when `type = 'reference'`. Changing it is a risky schema evolution — existing entries may hold IDs that no longer point at the right content type.

### `entries`
```sql
CREATE TABLE entries (
  id               UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type_id  UUID  NOT NULL REFERENCES content_types(id) ON DELETE CASCADE,
  data             JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Example data: {"brand": "Honda", "model": "Civic", "year": 2022}
```

### Relationships
- One content type has many fields (cascade delete)
- One content type has many entries (cascade delete)
- A field optionally references another content type (`reference_to`)
- `version` on `content_types` is the optimistic concurrency token: the frontend captures it when the editor opens and sends it back on save; a mismatch means a concurrent edit occurred

---

## API Surface

### Admin API

```
# Content Types
GET    /api/content-types                           list all types
POST   /api/content-types                           create a type
GET    /api/content-types/:id                       get one type + its fields
PATCH  /api/content-types/:id                       rename / reslug only (no field edits)

# Schema Evolution — two-step flow
POST   /api/content-types/:id/preview-change        dry run: classify impact, list affected entries
POST   /api/content-types/:id/commit-change         apply changes + migrate entries

# Entries
GET    /api/content-types/:id/entries               list entries (with valid/invalid status)
POST   /api/content-types/:id/entries               create an entry
GET    /api/content-types/:id/entries/:entryId      get one entry
PATCH  /api/content-types/:id/entries/:entryId      update an entry
DELETE /api/content-types/:id/entries/:entryId      delete an entry
```

### Public Read API (unauthenticated)
```
GET    /api/content/:slug                           all entries for a type (by slug)
GET    /api/content/:slug/:entryId                  one entry
```

Uses `slug` instead of UUID for stable, human-readable consumer URLs.

### Schema Evolution Flow
1. Admin edits fields and clicks "Save changes"
2. Frontend calls `POST /preview-change` with the proposed new fields
3. Server diffs old vs new fields, classifies each change (safe / risky), returns affected entry count and samples
4. Admin reviews the modal; optionally provides a fallback value for entries that can't auto-convert
5. Frontend calls `POST /commit-change` with `{ fields, baseVersion, fallback }`
6. Server checks `baseVersion` against the current `version` in DB — mismatch returns `409 Conflict`
7. On match: saves new fields, migrates all entries, increments `version`

### Real-time (Socket.io)
The server broadcasts to all connected clients on every mutation:
```
content_type:created / updated / deleted   { id, name, slug }
entry:created / updated / deleted          { id, contentTypeId }
```
The frontend invalidates the relevant TanStack Query cache keys on each event, triggering a background refetch — no page reload needed.

---

## Architecture Layers

```
services/   ← data fetching only; API-agnostic functions that return typed data or throw
hooks/      ← consume services; own loading / error / data state for a domain
screens/    ← orchestrate hooks and components; own navigation and screen-level logic
```

- Screens never import services directly
- Hooks never contain JSX
- Services never hold state

---

## Testing Strategy

TDD throughout — every commit pair is a failing test then the implementation.

| Scope | Tool |
|---|---|
| Backend unit + integration | Jest + Supertest against a real test DB |
| Frontend component | Jest + React Testing Library |
| Frontend hooks | Jest + React Testing Library (renderHook) |

Priority order:
1. Schema evolution logic (most evaluated)
2. Entry validation against schema
3. API routes (request/response contracts)
4. UI components

---

## Design System

Tailwind utility-first. No component library.

- Colors: indigo-600 as primary action, red for destructive/invalid, amber for risky/warning, green for valid
- Typography: system font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`)
- Approved screens: see `mockups.html`

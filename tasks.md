# tasks.md — Ticket Backlog

Each ticket is a vertical slice. Branches cut from `develop`, PR back to `develop`. TDD: test commit before implementation commit.

---

### TICKET-01 — Project scaffold
**Branch:** `feature/project-setup` (in progress)
**Depends on:** none

AC:
- [x] Repo initialized with `main`/`develop`
- [ ] `backend/` — Express + TypeScript skeleton, Postgres client, Socket.io wired, `npm run dev` works
- [ ] `frontend/` — React + Vite + TypeScript skeleton, TanStack Query + React Router + Tailwind wired, `npm run dev` works
- [ ] `docker-compose.yml` brings up Postgres with the schema migration applied
- [ ] Root `README.md` stub with run instructions (filled in fully at the end)
- [ ] PRD.md, design.md, tasks.md committed

---

### TICKET-02 — Schema data model + migration
**Branch:** `feature/schema-model`
**Depends on:** TICKET-01

AC:
- [ ] `schemas` and `entries` tables created via migration script run by `docker-compose`/`npm run migrate`
- [ ] Migration is idempotent (safe to re-run)

---

### TICKET-03 — Validator module
**Branch:** `feature/validator`
**Depends on:** TICKET-02

The core shared logic: validate a `data` object against a `fields` array, and diff two `fields` arrays to classify the impact on existing entries. This is the most heavily tested module — it backs both entry validation and schema-change preview/commit.

AC:
- [ ] `validateEntry(fields, data)` → list of field-level errors (required-missing, type-mismatch)
- [ ] `diffFields(oldFields, newFields)` → per-field change classification (`renamed` | `deleted` | `type-changed` | `required-changed` | `unchanged` | `added`), matched by field `id`
- [ ] `classifyImpact(diff, entries)` → per entry: `unaffected` | `auto-migrated` | `needs-attention`, with reason
- [ ] Type coercion rules covered by tests: text→number, text→boolean, text→date, and the reverse

---

### TICKET-04 — Schema CRUD API
**Branch:** `feature/schema-api`
**Depends on:** TICKET-03

AC:
- [ ] `GET /api/schemas` lists all schemas with field/entry counts
- [ ] `POST /api/schemas` creates a schema (name, slug auto-derived + uniqueness enforced, fields)
- [ ] `GET /api/schemas/:id` returns one schema
- [ ] `DELETE /api/schemas/:id` deletes a schema and its entries
- [ ] Non-risky edits (add optional field, reorder) via `PATCH /api/schemas/:id` apply immediately, no preview required
- [ ] Validation errors return 400 with field-level messages (e.g. duplicate slug)

---

### TICKET-05 — Entries CRUD API
**Branch:** `feature/entries-api`
**Depends on:** TICKET-04

AC:
- [ ] `GET /api/schemas/:schemaId/entries` lists entries, each annotated with `isValid`/`errors` computed against the schema's current fields
- [ ] `POST /api/schemas/:schemaId/entries` creates an entry, rejects if required fields missing or types don't match
- [ ] `GET/PATCH/DELETE /api/schemas/:schemaId/entries/:id`
- [ ] Reference fields validated against the existence of the target entry

---

### TICKET-06 — Public read API
**Branch:** `feature/read-api`
**Depends on:** TICKET-05

AC:
- [ ] `GET /api/content/:type` → 200 with entries for schema slug `:type`, 404 if slug unknown
- [ ] `GET /api/content/:type/:id` → 200 with single entry, 404 if missing
- [ ] No admin-only fields (e.g. raw validation internals) leak into the public response

---

### TICKET-07 — Schema change preview + commit
**Branch:** `feature/schema-evolution`
**Depends on:** TICKET-04, TICKET-05

The differentiator. Heaviest test coverage in the project.

AC:
- [ ] `POST /api/schemas/:id/preview-change` returns the classified diff + impact without writing anything
- [ ] `POST /api/schemas/:id/commit-change` re-validates server-side, applies migration transactionally (rename keys / drop keys / apply provided backfill defaults), bumps `version`, never partially applies on error
- [ ] Entries left non-compliant after a forced commit are not blocked — they persist and surface as invalid on next read
- [ ] Commit emits real-time events for the schema and every affected entry

---

### TICKET-08 — Real-time layer (backend)
**Branch:** `feature/realtime-backend`
**Depends on:** TICKET-04, TICKET-05, TICKET-07

AC:
- [ ] Socket.io server with `schema:{id}` rooms
- [ ] Schema create/update/delete and entry create/update/delete emit the corresponding event to the room
- [ ] Schema-change commit emits one `schema:updated` + one `entry:updated` per migrated entry

---

### TICKET-09 — Frontend scaffold + base UI components
**Branch:** `feature/frontend-foundation`
**Depends on:** TICKET-01

AC:
- [ ] Router set up: `/schemas`, `/schemas/new`, `/schemas/:id/edit`, `/schemas/:id/entries`, `/schemas/:id/entries/new`, `/schemas/:id/entries/:entryId`
- [ ] `ui/`: Button, Input, Select, Checkbox, Modal, Badge, Table — props-driven, no domain knowledge
- [ ] `services/socket.ts` — single shared socket connection
- [ ] `hooks/useRealtime.ts` — joins a schema room, invalidates the right query keys on events

---

### TICKET-10 — Schema List + Schema Builder screens
**Branch:** `feature/schema-screens`
**Depends on:** TICKET-04, TICKET-09

AC:
- [ ] Schema List: table of schemas, live-updates on `schema:updated`, "New schema" and "Edit fields" actions
- [ ] Schema Builder: add/remove/reorder fields, set type/required/reference-target per field, create flow saves immediately
- [ ] Editing an existing schema's fields and saving triggers the change-preview flow (TICKET-11) instead of saving directly when a risky change is detected

---

### TICKET-11 — Schema Change Preview UI
**Branch:** `feature/schema-evolution-ui`
**Depends on:** TICKET-07, TICKET-10

AC:
- [ ] Modal lists each change with affected-entry counts, split auto-migrated vs. needs-attention
- [ ] "Needs attention" entries show a sample with the actual values that fail
- [ ] One backfill-default input per affected field, applied to all entries in that bucket on commit
- [ ] "Commit anyway" path works and leaves non-backfilled entries flagged
- [ ] Cancel leaves the schema untouched

---

### TICKET-12 — Dynamic Entry Editor + Entry List screens
**Branch:** `feature/entry-screens`
**Depends on:** TICKET-05, TICKET-09

AC:
- [ ] Entry List: columns derived from schema fields, validity badge per row, live-updates on entry events
- [ ] Entry Editor: form fields generated from the schema's field list, correct input per type, reference fields render a picker sourced from the target schema's entries
- [ ] Create and edit share the same generated form
- [ ] Server-side validation errors surface inline per field

---

### TICKET-13 — README + presentation outline
**Branch:** `feature/docs`
**Depends on:** all above

AC:
- [ ] README: prerequisites, `docker compose up`, install/run for backend + frontend, env vars, how to exercise each of the 5 brief requirements
- [ ] Presentation outline drafted (architecture, data model, real-time, schema evolution, trade-offs) sized for ≤15 slides / <10 min

# tasks.md — Vertical Slice Backlog

Work is sequenced as vertical slices, not horizontal layers — each slice spans DB → API → UI (where the feature has UI at all) and is independently shippable/demoable before the next slice starts. Each slice is its own branch off `develop`, PR'd back once its AC are met and tests are green. TDD throughout: test commit before implementation commit.

The slices map directly onto the brief's 5 required components, plus a docs wrap-up.

---

### SLICE 0 — Project scaffold
**Branch:** `feature/project-setup` (in progress)
**Depends on:** none
**No business logic** — just a runnable skeleton.

AC:
- [x] Repo initialized with `main`/`develop`
- [x] `docker-compose.yml` brings up Postgres
- [ ] `backend/` — Express + TypeScript skeleton, Postgres client, Socket.io wired, `/health` route, `npm run dev` works
- [ ] `content_types` + `entries` migration applies via `npm run migrate`
- [ ] `frontend/` — React + Vite + TypeScript skeleton, TanStack Query + React Router + Tailwind wired, one blank shell route, `npm run dev` works
- [ ] Root `README.md` stub with run instructions (filled in fully in Slice 6)
- [x] PRD.md, design.md, tasks.md committed
- [ ] Both backend and frontend verified running before Slice 1 starts (per the standing "run the app first" rule)

---

### SLICE 1 — Content Types
**Branch:** `feature/content-types`
**Depends on:** Slice 0
**Brief component:** content type builder

The first vertical slice: a user can define an arbitrary content type — any name, any fields — and see it listed and editable. This is the foundation everything else builds on.

AC:
- [ ] `GET /api/content-types` lists all content types with field/entry counts
- [ ] `POST /api/content-types` creates a content type (name, slug auto-derived + uniqueness enforced, fields: name/type/required/reference target)
- [ ] `GET /api/content-types/:id` returns one content type
- [ ] `PATCH /api/content-types/:id` applies field edits directly (risky-change preview arrives in Slice 4 — for now, edits just apply)
- [ ] `DELETE /api/content-types/:id` deletes a content type and its entries
- [ ] Content Type List screen: table of types, "New content type" action, "Edit fields" action per row
- [ ] Content Type Builder screen: name + slug, add/remove/reorder fields, set type/required/reference-target per field, create and edit share the same form
- [ ] Validation errors (e.g. duplicate slug, empty name) return 400 with field-level messages and surface inline in the builder

---

### SLICE 2 — Entries (dynamic CRUD)
**Branch:** `feature/entries`
**Depends on:** Slice 1
**Brief component:** dynamic entry editor

For any content type created in Slice 1, full content management through a form generated entirely from its field list — no hand-coded form per content type.

AC:
- [ ] Validator module: `validateEntry(fields, data)` → field-level errors (required-missing, type-mismatch); covers text/number/boolean/date/reference
- [ ] `GET /api/content-types/:contentTypeId/entries` lists entries, each annotated with `isValid`/`errors` computed against the content type's current fields
- [ ] `POST /api/content-types/:contentTypeId/entries` creates an entry, rejects on required/type validation failure
- [ ] `GET/PATCH/DELETE /api/content-types/:contentTypeId/entries/:id`
- [ ] Reference fields validated against existence of the target entry
- [ ] Entry List screen: columns derived from the content type's fields, validity badge per row, create/edit/delete actions
- [ ] Entry Editor screen: form generated per field type (text/number/boolean/date input, reference picker sourced from the target content type's entries), create and edit share the same form, server validation errors shown inline

---

### SLICE 3 — Real-time sync
**Branch:** `feature/realtime`
**Depends on:** Slices 1, 2
**Brief component:** real-time updates

AC:
- [ ] Socket.io rooms keyed by `contentType:{id}`
- [ ] Content-type create/update/delete (Slice 1 routes) and entry create/update/delete (Slice 2 routes) each emit the corresponding event to the room
- [ ] `useRealtime` hook joins the room for the content type currently being viewed and invalidates the relevant TanStack Query keys on any event
- [ ] Manual check: two browser tabs open on the same content type's entry list (or the content type list) — a change in one appears in the other with no refresh

---

### SLICE 4 — Content Type Evolution
**Branch:** `feature/content-type-evolution`
**Depends on:** Slices 1, 2, 3
**Brief component:** schema evolution — the most heavily weighted part of the evaluation

AC:
- [ ] `diffFields(oldFields, newFields)` → per-field classification (`renamed`/`deleted`/`type-changed`/`required-changed`/`unchanged`/`added`), matched by field `id`
- [ ] `classifyImpact(diff, entries)` → per entry: `unaffected`/`auto-migrated`/`needs-attention`, with reason
- [ ] `POST /api/content-types/:id/preview-change` returns the classified diff + impact without writing anything
- [ ] `POST /api/content-types/:id/commit-change` re-validates server-side, applies migration transactionally (rename keys / drop keys / apply provided backfill defaults), bumps `version`, never partially applies on error
- [ ] Entries left non-compliant after a forced commit are not blocked — they persist and surface as invalid in Slice 2's entry list on next read
- [ ] Commit emits real-time events for the content type and every affected entry
- [ ] Content Type Change Preview UI: modal listing each change with affected-entry counts split auto-migrated vs. needs-attention, sample affected entries, one backfill-default input per affected field, "commit anyway" path, cancel leaves the content type untouched
- [ ] Wired into Content Type Builder's save flow — risky changes (rename/delete/type-change/required-toggle on a type with existing entries) route through preview instead of saving directly

---

### SLICE 5 — Public read API
**Branch:** `feature/read-api`
**Depends on:** Slice 2
**Brief component:** read API. No UI — backend only.

AC:
- [ ] `GET /api/content/:type` → 200 with entries for content type slug `:type`, 404 if slug unknown
- [ ] `GET /api/content/:type/:id` → 200 with single entry, 404 if missing
- [ ] No admin-only fields (e.g. raw validation internals) leak into the public response

---

### SLICE 6 — Docs
**Branch:** `feature/docs`
**Depends on:** all above

AC:
- [ ] README: prerequisites, `docker compose up`, install/run for backend + frontend, env vars, how to exercise each of the 5 brief requirements
- [ ] Presentation outline drafted (architecture, data model, real-time, content type evolution, trade-offs) sized for ≤15 slides / <10 min

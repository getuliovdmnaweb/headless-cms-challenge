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
- [x] `GET /api/content-types` lists all content types with field/entry counts
- [x] `POST /api/content-types` creates a content type (name, slug auto-derived + uniqueness enforced, fields: name/type/required/reference target)
- [x] `GET /api/content-types/:id` returns one content type
- [x] `PATCH /api/content-types/:id` applies field edits directly (risky-change preview arrives in Slice 4 — for now, edits just apply)
- [x] `DELETE /api/content-types/:id` deletes a content type and its entries
- [x] Content Type List screen: table of types, "New content type" action, "Edit fields" action per row
- [x] Content Type Builder screen: name + slug, add/remove/reorder fields, set type/required/reference-target per field, create and edit share the same form
- [x] Validation errors (e.g. duplicate slug, empty name) return 400 with field-level messages and surface inline in the builder

---

### SLICE 2 — Entries (dynamic CRUD)
**Branch:** `feature/entries`
**Depends on:** Slice 1
**Brief component:** dynamic entry editor

For any content type created in Slice 1, full content management through a form generated entirely from its field list — no hand-coded form per content type.

AC:
- [x] Validator module: `validateEntry(fields, data)` → field-level errors (required-missing, type-mismatch); covers text/number/boolean/date/reference
- [x] `GET /api/content-types/:contentTypeId/entries` lists entries, each annotated with `isValid`/`errors` computed against the content type's current fields
- [x] `POST /api/content-types/:contentTypeId/entries` creates an entry, rejects on required/type validation failure
- [x] `GET/PATCH/DELETE /api/content-types/:contentTypeId/entries/:id`
- [x] Reference fields validated against existence of the target entry
- [x] Entry List screen: columns derived from the content type's fields, validity badge per row, create/edit/delete actions
- [x] Entry Editor screen: form generated per field type (text/number/boolean/date input, reference picker sourced from the target content type's entries), create and edit share the same form, server validation errors shown inline

---

### SLICE 3 — Real-time sync
**Branch:** `feature/realtime`
**Depends on:** Slices 1, 2
**Brief component:** real-time updates

AC:
- [x] Socket.io global broadcast (simplified from per-id rooms — no multi-tenancy or scale concerns for this admin tool, so room-scoping added complexity with no benefit; see design.md)
- [x] Content-type create/update/delete (Slice 1 routes) and entry create/update/delete (Slice 2 routes) each emit the corresponding event
- [x] `useRealtime` hook (mounted once at the App root) invalidates the relevant TanStack Query keys on any event
- [x] Manual check: verified live with a standalone socket client (simulating a second tab) plus the running browser tab — a content type created via direct API call (simulating another user) appeared in the open browser tab's list with no manual refresh

---

### SLICE 4 — Content Type Evolution
**Branch:** `feature/content-type-evolution`
**Depends on:** Slices 1, 2, 3
**Brief component:** schema evolution — the most heavily weighted part of the evaluation

AC:
- [x] `diffFields(oldFields, newFields)` → per-field classification (`added`/`deleted`/`renamed`/`type-changed`/`required-changed`, compound changes supported), matched by field `id`
- [x] `classifyImpact(diffs, entries)` → per risky field: `affectedCount`/`autoMigratedCount`/`needsAttention` (entry id + current value)
- [x] `POST /api/content-types/:id/preview-change` returns the classified diff + impact without writing anything
- [x] `POST /api/content-types/:id/commit-change` re-validates server-side, applies migration transactionally (rename keys / drop keys / apply provided backfill defaults, coerced to the field's new type), bumps `version`, never partially applies on error
- [x] Plain `PATCH` now rejects risky changes (409) — only `commit-change` can apply them, closing the bypass
- [x] Entries left non-compliant after a forced commit are not blocked — they persist and surface as invalid in Slice 2's entry list on next read
- [x] Commit emits real-time events for the content type and every migrated entry
- [x] Content Type Change Preview UI: modal listing each change with affected-entry counts split auto-migrated vs. needs-attention, sample affected entries, one backfill-default input per affected field, cancel leaves the content type untouched
- [x] Wired into Content Type Builder's save flow — risky changes route through preview instead of saving directly; verified live in the browser (type change + backfill, including the string→number coercion bug found and fixed during verification)

---

### SLICE 5 — Public read API
**Branch:** `feature/read-api`
**Depends on:** Slice 2
**Brief component:** read API. No UI — backend only.

AC:
- [x] `GET /api/content/:type` → 200 with entries for content type slug `:type`, 404 if slug unknown
- [x] `GET /api/content/:type/:id` → 200 with single entry, 404 if missing
- [x] No admin-only fields (e.g. raw validation internals) leak into the public response

---

### SLICE 6 — Docs
**Branch:** `feature/docs`
**Depends on:** all above

AC:
- [x] README: prerequisites, `docker compose up`, install/run for backend + frontend, env vars, how to exercise each of the 5 brief requirements
- [x] Presentation outline drafted (architecture, data model, real-time, content type evolution, trade-offs) sized for ≤15 slides / <10 min

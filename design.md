# design.md — Technical Decisions

## Stack
- **Backend**: Node.js + Express + TypeScript, Postgres (via `pg`), Socket.io for real-time. Chosen over Supabase/Firebase to demonstrate the real-time and content-type-migration logic ourselves rather than delegating it to a BaaS — that logic is exactly what's being evaluated.
- **Frontend**: React + Vite + TypeScript, TanStack Query (server state), React Router (navigation), Tailwind CSS (styling, applied directly with utility classes — no design-token extraction layer for this time-boxed build).
- **Storage**: Postgres in Docker (`docker-compose.yml`), so evaluators run `docker compose up -d` with zero local Postgres install.
- **Repo shape**: single repo, `backend/` + `frontend/` folders, one root README.
- **Build order**: vertical slices, not horizontal layers. Each slice (content types, entries, real-time, evolution, read API) ships DB→API→UI together and is independently demoable before the next one starts. See `tasks.md`.

## Why not Supabase/Firebase
They'd satisfy the real-time requirement for free, but the brief's emphasis is content-type evolution. Hand-rolling Postgres + Socket.io gives more to talk about in the presentation and avoids hiding the interesting parts behind a BaaS.

## Data model

```sql
-- content_types: a content type definition (e.g. "Car", "Blog post", "Recipe" —
-- there is no fixed set, the name and fields are entirely user-defined).
-- Fields live as JSONB on the row — they're always read/written together with
-- their parent, so a join table buys nothing here and the brief asks for a
-- thin backend.
CREATE TABLE content_types (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  version     INTEGER NOT NULL DEFAULT 1,
  fields      JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- fields (shape of each element in content_types.fields, not a separate table):
-- { id, name, type: 'text'|'number'|'boolean'|'date'|'reference',
--   required: boolean, referenceContentTypeId?: string, order: number }

CREATE TABLE entries (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type_id       UUID NOT NULL REFERENCES content_types(id) ON DELETE CASCADE,
  content_type_version  INTEGER NOT NULL,
  data                  JSONB NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX entries_content_type_id_idx ON entries(content_type_id);
```

`entries.content_type_version` records which content-type version an entry's `data` last conformed to. Validity is **computed on read**, not stored: the same validator that powers the content-type-change impact preview runs against `entries.data` and the content type's *current* `fields` whenever entries are listed. One validator, two call sites — no risk of a stored "is valid" flag drifting from reality.

## Content type evolution — the core design problem

A content-type edit is "risky" when it can invalidate existing entries: **rename**, **delete**, **type change**, or **optional → required**. Everything else (add optional field, reorder, add a brand-new content type) applies immediately, no preview needed.

### Flow
1. Frontend sends the proposed new `fields` array to `POST /api/content-types/:id/preview-change`.
2. Backend diffs old vs. new fields by field `id` (not name — renames are a same-id, new-name diff, which is how a rename is distinguished from a delete+add) and classifies each entry of that content type:
   - **Unaffected** — no relevant change touches data the entry has.
   - **Auto-migrated** — pure rename: `data[oldName]` moves to `data[newName]`, no validation risk.
   - **Needs attention** — delete (data will be dropped), type change where the existing value doesn't coerce (e.g. `"early 2000s"` → `number`), or required-toggle where the value is missing/empty.
3. Response: per-change summary with counts + a sample of affected entry IDs/values for "needs attention" entries. Nothing is written yet.
4. Frontend shows this in the Content Type Change Preview. User may supply one backfill default per "needs attention" field (applied to all entries in that bucket) and/or confirm.
5. `POST /api/content-types/:id/commit-change` re-runs the same diff (server is the source of truth, never trusts a stale client-side preview) inside a transaction: updates `content_types.fields` + bumps `version`, rewrites each affected entry's `data` (rename keys, drop keys, apply backfill defaults where provided), sets `entries.content_type_version` to the new version. Entries that still don't validate after migration are **not blocked** — they're written as-is and simply show up as invalid on next read. This avoids a dead-end where the admin can't evolve a content type because some old entry can't be fixed synchronously.
6. On commit, the server emits `contentType:updated` and `entry:updated` (per affected entry) over the content type's Socket.io room.

### Why "flag and allow" instead of "block until fixed"
Blocking the content-type save until every entry is perfectly valid would mean a single bad legacy entry can permanently lock the content type. Real CMSs (Contentful included) let you evolve a model and surface non-compliant entries afterward rather than gate the edit on fixing all of them upfront. Flagged entries are fixable later through the normal Entry Editor, which surfaces the same validation errors inline.

### Scoping cut (explicit trade-off for the 4-hour budget)
Per-entry inline editing *inside* the preview modal is cut. The preview offers one bulk backfill value per affected field instead of a row-by-row editor. This is called out as a stretch goal in the presentation rather than silently dropped.

## Real-time
Socket.io rooms keyed by `contentType:{contentTypeId}`. Admin clients join the room for whichever content type they're currently viewing (entry list or editor). Server emits on every mutation:
- `contentType:updated` (content type list, builder)
- `entry:created` / `entry:updated` / `entry:deleted` (entry list, editor)

Frontend: a single `useRealtime(contentTypeId)` hook opens/reuses one socket connection and, on any event, calls `queryClient.invalidateQueries` for the relevant TanStack Query key. This means the real-time layer never duplicates state — it just tells the existing data-fetching layer "go refetch," so there's one source of truth for what's on screen.

## API surface

Admin (consumed by the frontend):
- `GET/POST /api/content-types`, `GET/PATCH/DELETE /api/content-types/:id`
- `POST /api/content-types/:id/preview-change`, `POST /api/content-types/:id/commit-change`
- `GET/POST /api/content-types/:contentTypeId/entries`, `GET/PATCH/DELETE /api/content-types/:contentTypeId/entries/:id`

Public read API (deliverable #5, no auth — matches "thin backend" framing, exact path from the brief — not renamed):
- `GET /api/content/:type` → list entries for content type with slug `:type`
- `GET /api/content/:type/:id` → single entry

## Frontend architecture
Same 3-layer convention as other projects, adapted for web (screens instead of RN screens, no Expo Router):
```
src/
  screens/      ContentTypeListScreen, ContentTypeBuilderScreen, EntryListScreen, EntryEditorScreen
  components/
    ui/         Button, Input, Select, Checkbox, Modal, Badge, Table — no domain knowledge
    shared/     DynamicField (renders the right input for a field type), ContentTypeChangePreview
  hooks/        useContentTypes, useContentType, useEntries, useEntry, useContentTypeChangePreview, useRealtime
  services/     contentTypes.ts, entries.ts, socket.ts — fetch only, API-agnostic
  types/
```
State: TanStack Query for all server state (content types, entries); no Zustand — the only client state is "which content type/modal is open," which is local component/router state.

## Trade-offs / explicitly cut for time
- No auth — single-user admin tool.
- No draft/publish distinction — read API serves everything.
- Reference field type is stored (an entry ID + target content type) but reference *integrity* on delete (what happens to entries referencing a deleted entry) is best-effort, not deeply handled.
- Bulk backfill only, not per-entry remediation inside the preview.
- Testing: full TDD per the user's standing convention, but suites are scoped to what's feasible in the time budget — heaviest coverage on the validator/diff/migration logic (the evaluated differentiator), lighter on simple CRUD and UI.

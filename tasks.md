# Tasks — Headless CMS Challenge

Vertical slices ordered by dependency. Each slice is a complete, shippable feature end-to-end (DB → API → UI). Acceptance criteria are expanded during the grooming session before each branch is cut.

---

## Slice 0 — Project scaffold
**Branch:** `feature/project-setup`
**Dependencies:** none

### Acceptance criteria
- [ ] `docker compose up` starts Postgres with no manual steps
- [ ] Backend (Express + TypeScript) starts and responds to `GET /health`
- [ ] Frontend (Vite + React + TypeScript) starts and renders a blank shell
- [ ] Both servers run concurrently without port conflicts
- [ ] Jest is configured and `npm test` runs (no tests yet, just the runner)
- [ ] Tailwind CSS is configured and applies styles

---

## Slice 1 — Content Types (create + list)
**Branch:** `feature/content-types`
**Dependencies:** Slice 0

### What ships
User can create a content type with fields and see it in the list.

### Acceptance criteria

Happy path:
- [ ] User fills in a name — slug auto-derives below the name field (e.g. "Blog Post" → "blog-post")
- [ ] User adds one or more fields (name, type dropdown: text/number/boolean/date/reference, required toggle)
- [ ] User clicks "Create content type" — type + fields saved in one transaction
- [ ] User is redirected to the Content Type list
- [ ] New type appears in the list with correct field count

Error cases:
- [ ] Empty name → "Name is required" (on submit)
- [ ] Duplicate name → "A content type with this name already exists" (API error surfaced inline)
- [ ] No fields added → "Create content type" button is disabled; hint "Add at least one field to continue" shown below the empty fields section
- [ ] Empty field name → "Field name is required" highlighted on the offending row (on submit)
- [ ] Duplicate field name within the same type → "Field names must be unique" (on submit)
- [ ] Cancel → returns to list with no changes saved

---

## Slice 2 — Edit content type
**Branch:** `feature/edit-content-type`
**Dependencies:** Slice 1

### What ships
User can rename the content type, add/rename/remove fields, reorder fields, and delete a content type.

### Design decisions
- Slug is read-only on edit — never re-derived from a renamed name (changing slug would break existing references)
- Field deletion has no data-impact warning in this slice — deferred to Slice 6
- Drag-to-reorder via `⠿` handle (`@dnd-kit/sortable`)
- PUT replaces all fields in a single transaction (delete old, insert new with updated positions)
- Content type deletion requires `window.confirm()` before calling `DELETE /api/content-types/:slug`

### Acceptance criteria

Happy path:
- [ ] "Edit fields" link on the list navigates to `/edit/:slug`
- [ ] Edit screen loads pre-filled: name editable, slug read-only, fields listed in saved order
- [ ] User can rename the content type name
- [ ] User can rename an existing field
- [ ] User can toggle required on any field
- [ ] User can delete a field (row removed immediately, no confirmation for now)
- [ ] User can drag fields to reorder via the `⠿` handle
- [ ] User can add a new empty field row
- [ ] "Save changes" → PUT /api/content-types/:slug, redirects to list on success
- [ ] "Cancel" → navigates to list with no changes saved
- [ ] Delete button on each list row → `window.confirm()` → DELETE /api/content-types/:slug → row removed from list

Error cases:
- [ ] Empty name on submit → `"Name is required"` inline
- [ ] Rename conflicts with another type → API 409 → `"A content type with this name already exists"` inline
- [ ] Slug not found → API 404 → redirect to list (content type was deleted)
- [ ] Empty field name on submit → `"Field name is required"` on the offending row
- [ ] Duplicate field name on submit → `"Field names must be unique"` on the first duplicate row
- [ ] All fields deleted → Save button disabled + `"Add at least one field to continue"` hint
- [ ] User cancels confirm dialog → no DELETE call, row stays in list

---

## Slice 3 — Entries (create + list)
**Branch:** `feature/entries`
**Dependencies:** Slice 1

### What ships
User can view entries for a content type and create a new one. The entry form is generated dynamically from the type's fields.

### Design decisions
- Routes: `/:slug/entries` (list), `/:slug/entries/new` (create)
- Entry data stored as JSONB; `isValid` computed server-side (not stored)
- `isValid`: all required fields of type text/number/date have a non-empty value in `data`; boolean fields are always valid; reference fields are skipped (not implemented in this slice)
- Reference fields render as disabled inputs with "Reference coming soon" label — no validation
- Boolean fields render as checkboxes — always valid regardless of required flag
- Entries list table columns are derived from the content type's fields ordered by position
- Missing values in the list show as "— missing" in gray italic

### Acceptance criteria

Happy path:
- [ ] "View content" on the list navigates to `/:slug/entries`
- [ ] Entries list shows the content type name, entry count, "Edit fields" link, and "+ New entry" button
- [ ] Table columns match the content type's field names (in position order) + Status + Actions
- [ ] Each row shows field values; missing values show "— missing" in gray italic
- [ ] Valid entry row has green "Valid" badge; invalid row has `bg-red-50` background and red "Invalid" badge
- [ ] "New entry" navigates to `/:slug/entries/new`
- [ ] Entry form renders one input per field: text → text input, number → number input, boolean → checkbox, date → date input, reference → disabled with "Reference coming soon"
- [ ] Required fields show `*` next to their label
- [ ] "Save" → POST /api/content-types/:slug/entries → redirects to `/:slug/entries` on success
- [ ] "Cancel" → navigates back to `/:slug/entries` with no changes saved

Error cases:
- [ ] Content type not found (404) when loading entries list → redirect to `/`
- [ ] Network error fetching entries → "Something went wrong" inline
- [ ] Empty entries list → "No entries yet — create your first one."
- [ ] Required field (text/number/date) empty on submit → `"<FieldName> is required"` below that field
- [ ] Network error on save → `"Something went wrong"` below the Save button
- [ ] Cancel → navigates to `/:slug/entries`, no API call made

---

## Slice 4 — Edit and delete entries
**Branch:** `feature/edit-delete-entries`
**Dependencies:** Slice 3

### What ships
User can edit and delete existing entries.

### Acceptance criteria
- [ ] "Edit" on an entry row opens the editor pre-filled with current values
- [ ] User edits values and saves — entry updated in DB
- [ ] "Delete" on an entry row removes it after confirmation
- [ ] Cancelled edit returns to the list with no changes

---

## Slice 5 — Real-time sync
**Branch:** `feature/realtime`
**Dependencies:** Slice 3

### What ships
Changes in one browser tab appear in all other open tabs without a page reload.

### Acceptance criteria
- [ ] Creating a content type in tab A → content type list in tab B updates automatically
- [ ] Creating an entry in tab A → entry list in tab B updates automatically
- [ ] Deleting a content type or entry in tab A → removed from tab B automatically
- [ ] No page reload required in the receiving tab

---

## Slice 6 — Schema evolution
**Branch:** `feature/schema-evolution`
**Dependencies:** Slice 2

### What ships
User can change field types with a preview of the impact before committing. Existing entries are migrated.

### Acceptance criteria

Happy path:
- [ ] Changing a field type flags it as risky (amber highlight + warning message)
- [ ] Clicking "Save changes" with a risky change opens the Review modal (not saves directly)
- [ ] Modal shows: how many entries are affected, which entries can't auto-convert, optional fallback input
- [ ] "Commit changes" applies the migration and navigates to entries list
- [ ] Auto-convertible entries are updated correctly (e.g. "2022" text → 2022 number)
- [ ] Entries that can't convert are flagged Invalid unless a fallback was provided

Error cases:
- [ ] Cancel on the modal → returns to edit screen, nothing saved
- [ ] Concurrent edit (another session saved first) → 409 Conflict surfaced with a "Reload latest version" option

---

## Slice 7 — Public read API
**Branch:** `feature/read-api`
**Dependencies:** Slice 3

### What ships
Unauthenticated REST endpoints for reading content. No UI.

### Acceptance criteria
- [ ] `GET /api/content/:slug` returns all entries for the type as JSON
- [ ] `GET /api/content/:slug/:entryId` returns one entry
- [ ] Returns 404 if the slug does not exist
- [ ] Response is valid JSON with correct Content-Type header

---

## Slice 8 — Docs
**Branch:** `feature/docs`
**Dependencies:** all slices

### What ships
README and presentation outline for the evaluator.

### Acceptance criteria
- [ ] README covers: how to run the project, what was built, technical decisions
- [ ] Presentation outline covers all 5 required features with a demo path

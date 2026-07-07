# Tasks — Headless CMS Challenge

Vertical slices ordered by dependency. Each slice is a complete, shippable feature end-to-end (DB → API → UI). Acceptance criteria are expanded during the grooming session before each branch is cut.

---

## Slice 0 — Project scaffold
**Branch:** `feature/project-setup`
**Dependencies:** none

### Acceptance criteria
- [x] `docker compose up` starts Postgres with no manual steps
- [x] Backend (Express + TypeScript) starts and responds to `GET /health`
- [x] Frontend (Vite + React + TypeScript) starts and renders a blank shell
- [x] Both servers run concurrently without port conflicts
- [x] Jest is configured and `npm test` runs (no tests yet, just the runner)
- [x] Tailwind CSS is configured and applies styles

---

## Slice 1 — Content Types (create + list)
**Branch:** `feature/content-types`
**Dependencies:** Slice 0

### What ships
User can create a content type with fields and see it in the list.

### Acceptance criteria

Happy path:
- [x] User fills in a name — slug auto-derives below the name field (e.g. "Blog Post" → "blog-post")
- [x] User adds one or more fields (name, type dropdown: text/number/boolean/date/reference, required toggle)
- [x] User clicks "Create content type" — type + fields saved in one transaction
- [x] User is redirected to the Content Type list
- [x] New type appears in the list with correct field count

Error cases:
- [x] Empty name → "Name is required" (on submit)
- [x] Duplicate name → "A content type with this name already exists" (API error surfaced inline)
- [x] No fields added → "Create content type" button is disabled; hint "Add at least one field to continue" shown below the empty fields section
- [x] Empty field name → "Field name is required" highlighted on the offending row (on submit)
- [x] Duplicate field name within the same type → "Field names must be unique" (on submit)
- [x] Cancel → returns to list with no changes saved

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
- [x] "Edit fields" link on the list navigates to `/edit/:slug`
- [x] Edit screen loads pre-filled: name editable, slug read-only, fields listed in saved order
- [x] User can rename the content type name
- [x] User can rename an existing field
- [x] User can toggle required on any field
- [x] User can delete a field (row removed immediately, no confirmation for now)
- [x] User can drag fields to reorder via the `⠿` handle
- [x] User can add a new empty field row
- [x] "Save changes" → PUT /api/content-types/:slug, redirects to list on success
- [x] "Cancel" → navigates to list with no changes saved
- [x] Delete button on each list row → `window.confirm()` → DELETE /api/content-types/:slug → row removed from list

Error cases:
- [x] Empty name on submit → `"Name is required"` inline
- [x] Rename conflicts with another type → API 409 → `"A content type with this name already exists"` inline
- [x] Slug not found → API 404 → redirect to list (content type was deleted)
- [x] Empty field name on submit → `"Field name is required"` on the offending row
- [x] Duplicate field name on submit → `"Field names must be unique"` on the first duplicate row
- [x] All fields deleted → Save button disabled + `"Add at least one field to continue"` hint
- [x] User cancels confirm dialog → no DELETE call, row stays in list

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
- [x] "View content" on the list navigates to `/:slug/entries`
- [x] Entries list shows the content type name, entry count, "Edit fields" link, and "+ New entry" button
- [x] Table columns match the content type's field names (in position order) + Status + Actions
- [x] Each row shows field values; missing values show "— missing" in gray italic
- [x] Valid entry row has green "Valid" badge; invalid row has `bg-red-50` background and red "Invalid" badge
- [x] "New entry" navigates to `/:slug/entries/new`
- [x] Entry form renders one input per field: text → text input, number → number input, boolean → checkbox, date → date input, reference → disabled with "Reference coming soon"
- [x] Required fields show `*` next to their label
- [x] "Save" → POST /api/content-types/:slug/entries → redirects to `/:slug/entries` on success
- [x] "Cancel" → navigates back to `/:slug/entries` with no changes saved

Error cases:
- [x] Content type not found (404) when loading entries list → redirect to `/`
- [x] Network error fetching entries → "Something went wrong" inline
- [x] Empty entries list → "No entries yet — create your first one."
- [x] Required field (text/number/date) empty on submit → `"<FieldName> is required"` below that field
- [x] Network error on save → `"Something went wrong"` below the Save button
- [x] Cancel → navigates to `/:slug/entries`, no API call made

---

## Slice 4 — Edit and delete entries + error banner
**Branch:** `feature/edit-delete-entries`
**Dependencies:** Slice 3

### What ships
- "View content" link on the content type list
- Edit entry (`/:slug/entries/:id/edit`) — pre-filled form, PUT on save
- Delete entry — `window.confirm()` → DELETE → row removed
- Shared `ErrorBanner` component replacing all silent redirects across existing screens

### Design decisions
- Edit route: `/:slug/entries/:id/edit` (dedicated page, same pattern as NewEntry)
- Hard delete, no soft delete
- Error state passed via React Router navigate state: `navigate(path, { state: { error: 'message' } })`
- Target pages read `useLocation().state?.error` and render the dismissible banner
- `ErrorBanner` lives in `src/components/shared/` — used across 4+ screens

### Acceptance criteria

Happy path:
- [x] "View content" link on each ContentTypeList row navigates to `/:slug/entries`
- [x] "Edit" on an entry row opens `/:slug/entries/:id/edit` pre-filled with current values
- [x] User edits values and saves → `PUT /api/content-types/:slug/entries/:id` → redirects to `/:slug/entries`
- [x] "Delete" → `window.confirm()` → `DELETE /api/content-types/:slug/entries/:id` → row removed
- [x] Cancel on edit → returns to `/:slug/entries`, no changes saved

Error cases — edit:
- [x] Required field empty on submit → `<FieldName> is required` inline
- [x] Content type 404 on load → redirect to `/` + banner: "Content type not found."
- [x] Entry 404 on load → redirect to `/:slug/entries` + banner: "Entry not found."
- [x] PUT returns 404 → redirect to `/:slug/entries` + banner: "Entry not found."
- [x] API error on save → "Something went wrong" inline below Save

Error cases — delete:
- [x] User cancels confirm → no DELETE, row stays
- [x] DELETE returns 404 → "Entry not found." dismissible banner on list
- [x] DELETE API error → "Something went wrong." dismissible banner on list

Error banner — backfill across existing screens:
- [x] `EditContentType` 404 on load → redirect to `/` + "Content type not found."
- [x] `EntryList` 404 on load → redirect to `/` + "Content type not found."
- [x] `NewEntry` 404 on load → redirect to `/` + "Content type not found."

---

## Slice 5 — Real-time sync
**Branch:** `feature/realtime`
**Dependencies:** Slice 3

### What ships
Changes in one browser tab appear in all other open tabs without a page reload.

### Acceptance criteria
- [x] Creating a content type in tab A → content type list in tab B updates automatically
- [x] Creating an entry in tab A → entry list in tab B updates automatically
- [x] Deleting a content type or entry in tab A → removed from tab B automatically
- [x] No page reload required in the receiving tab

---

## Slice 6 — Schema evolution
**Branch:** `feature/schema-evolution`
**Dependencies:** Slice 2

### What ships
User can change field types with a preview of the impact before committing. Existing entries are migrated.

### Acceptance criteria

Happy path:
- [x] Changing a field type flags it as risky (amber highlight + warning message)
- [x] Clicking "Save changes" with a risky change opens the Review modal (not saves directly)
- [x] Modal shows: how many entries are affected, which entries can't auto-convert, optional fallback input
- [x] "Commit changes" applies the migration and navigates to entries list
- [x] Auto-convertible entries are updated correctly (e.g. "2022" text → 2022 number)
- [x] Entries that can't convert are flagged Invalid unless a fallback was provided

Error cases:
- [x] Cancel on the modal → returns to edit screen, nothing saved
- [x] Concurrent edit (another session saved first) → 409 Conflict surfaced with a "Reload latest version" option

---

## Slice 7 — Public read API
**Branch:** `feature/read-api`
**Dependencies:** Slice 3

### What ships
Unauthenticated REST endpoints for reading content. No UI.

### Acceptance criteria
- [x] `GET /api/content/:slug` returns all entries for the type as JSON
- [x] `GET /api/content/:slug/:entryId` returns one entry
- [x] Returns 404 if the slug does not exist
- [x] Response is valid JSON with correct Content-Type header

---

## Slice 7 — Reference field
**Branch:** `feature/reference-field`
**Dependencies:** Slice 3 (entries), Slice 4 (edit/delete entries)

### What ships
A reference field type that links entries in one content type to entries in another. The builder lets the author pick the target content type; the entry form renders a dropdown populated with entries from that target.

### Design decisions
- Target content type stored as `options.targetSlug` in the existing `options` JSONB column — no migration needed
- Stored value in entry `data` is the referenced entry's numeric ID
- Option label = first text field value of the referenced entry, fallback `Entry #<id>`
- Two-tier `isValid`: list view checks presence only (fast); edit view checks existence (full DB lookup)
- Changing a reference field's target type = risky schema change (existing IDs become meaningless)
- A content type cannot reference itself

### Acceptance criteria

Happy path — builder:
- [x] Selecting type `reference` reveals a second dropdown: "→" + all existing content type names
- [x] Selecting a target saves `{ targetSlug: "slug" }` into `options`
- [x] Field row shows a "references [TypeName]" badge
- [x] If no other content types exist, target dropdown shows "No types available" (disabled)
- [x] A content type cannot reference itself — self is excluded from the target list

Happy path — entry form:
- [x] Reference field renders a `<select>` with entries from the target content type
- [x] Each option label is the first text field value, falling back to `Entry #<id>`
- [x] Selected value stored in entry `data` as the numeric entry ID
- [x] On edit, the current value is pre-selected
- [x] If target has no entries, shows empty state with a link to add entries to it

Validation:
- [x] `required = true` + no selection → `<FieldName> is required` inline error on submit
- [x] List view: reference field present if value is non-null (no existence check)
- [x] Edit view: if referenced entry was deleted → "Referenced [TypeName] entry no longer exists" inline, field treated as invalid

Schema evolution:
- [x] Changing a reference field's target type is classified as a risky change in the review modal
- [x] Entries whose reference value becomes orphaned (target CT deleted) remain but surface as invalid on edit load

---

## Slice 8 — Docs
**Branch:** `feature/docs`
**Dependencies:** all slices

### What ships
README and presentation outline for the evaluator.

### Acceptance criteria
- [x] README covers: how to run the project, what was built, technical decisions
- [x] Presentation outline covers all 5 required features with a demo path

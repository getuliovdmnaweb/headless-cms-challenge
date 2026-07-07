# PRD — Headless CMS Challenge

## Problem statement

A headless CMS lets users define their own content structure (content types) and manage the actual data (entries) separately from any front-end. Think Contentful: you define a "Car" type with fields Brand, Model, Year — then create as many Car entries as you want. A public read API lets any consumer (web app, mobile app) fetch that content.

This project implements the core of that model as a take-home challenge, targeting the five required features from the brief.

---

## Who uses it

A single admin user operating the tool directly in the browser. No multi-tenancy, no roles, no authentication.

---

## Core features

### 1. Content type builder
The admin can define content types — named schemas with one or more typed fields.

- Create a content type with a name and slug (slug auto-derived from name)
- Add, rename, reorder, and delete fields on a type
- Supported field types: `text`, `number`, `boolean`, `date`, `reference`
- Required flag per field

### 2. Dynamic entry editor
The admin can create and edit entries for any content type. The form is generated dynamically from the type's field definitions.

- List all entries for a content type, showing field values and a valid/invalid status badge
- Create a new entry (form generated from the type's fields)
- Edit an existing entry
- Delete an entry
- Entries are validated against the current schema on load and on save; required-field violations surface inline

### 3. Real-time sync
Any schema or entry change is broadcast to all open browser sessions without a page reload.

- Changing a content type in one tab reflects immediately in all other tabs
- Creating, editing, or deleting an entry reflects immediately in all other open entry lists
- Transport: WebSockets

### 4. Content type evolution (schema migration)
The admin can change the schema of an existing content type, even after entries exist. The system classifies the impact and gives the admin a chance to review before committing.

- Safe changes (rename field, add optional field, change required → optional) apply immediately
- Risky changes (change field type, delete field, change optional → required) trigger a "Review changes" modal before saving
- The modal shows how many entries are affected, which entries cannot auto-convert, and offers an optional fallback value
- After commit, all affected entries are migrated in place; entries that cannot convert remain invalid until manually fixed
- Optimistic concurrency: if another session commits a conflicting schema change between when the admin opened the editor and when they save, the system surfaces a conflict notice

### 5. Public read API
A public, unauthenticated REST API for reading content. No write access.

- `GET /api/content/:type` — returns all entries for a content type as JSON
- `GET /api/content/:type/:id` — returns a single entry
- Entries are returned with their field values; invalid entries (schema violations) are included but flagged

---

## Screens

| Screen | What the admin can do |
|---|---|
| Content type list | See all content types; click "View content" to open entries, "Edit fields" to open schema builder; create a new type |
| New content type | Name the type, add fields, save |
| Edit content type | Rename, add/remove/reorder fields, save (risky changes trigger the review modal) |
| Entries (per type) | See all entries with valid/invalid status; create, edit, delete |
| Entry editor | Fill in or correct field values for one entry; inline validation errors |

The "Review content type change" dialog is a modal that appears over the Edit content type screen — not a standalone page.

---

## Access rules

- No authentication, no login screen, no roles
- The admin UI is open to anyone who has the URL
- The public read API is unauthenticated and read-only

---

## Out of scope

- Authentication and user accounts
- Media / file uploads
- Webhooks or API tokens
- Localisation / multiple languages
- Content versioning / publish-draft workflow
- Pagination on the entries list
- Field-level access control
- Content type deletion (entries would be orphaned — deferred)

---

## Success criteria

The evaluator can:

1. Open the admin UI, create a content type with at least 2 fields, and save it — the type appears in the list
2. Create 3 entries for that type, including one that violates a required field — the invalid entry is visibly marked
3. Change a field type on the content type, see the review modal listing affected entries, commit the change, and observe the entries list reflecting the migration
4. Open the same admin UI in a second browser tab — a change made in tab A appears in tab B without a page reload
5. Call `GET /api/content/:type` from a terminal and receive the entries as JSON

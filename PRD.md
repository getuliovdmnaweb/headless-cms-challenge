# PRD — Headless CMS Admin Panel

## Context
Take-home challenge for The Agile Monkeys frontend role (brief: https://frontend-challenge-2026.theagilemonkeys.com/). Target effort per the brief is ~4 hours. Scope is deliberately narrow — quality and depth on schema evolution over breadth of features.

## What it does
An admin panel where a user defines custom content types ("schemas") with typed fields, manages content entries against those schemas through auto-generated forms, sees changes sync live across open clients, and can safely evolve a schema (rename/delete/retype/require a field) with a preview of impact on existing data and a way to fix what breaks. A thin public API serves published entries as JSON.

## Users
Single-user admin tool. No auth, no roles, no multi-tenant concerns — out of scope.

## Screens

### 1. Schema List
- Table of all schemas (name, slug, field count, entry count, last updated)
- "New schema" action → Schema Builder
- Click a row → Entry List for that schema
- "Edit fields" action → Schema Builder (edit mode)

### 2. Schema Builder
- Name + slug (slug auto-derived from name, editable)
- Field list editor: add/remove/reorder fields
- Each field: name, type (`text` | `number` | `boolean` | `date` | `reference`), required toggle, and (if `reference`) which schema it points to
- "Save" on a brand-new schema applies immediately
- "Save" on an existing schema with field changes that affect stored data triggers the **Schema Change Preview** (see Schema Evolution below) before anything is committed

### 3. Entry List (per schema)
- Table of entries for the schema, columns derived from field names (primitives inline, references shown as a label)
- Each row shows a validity badge: entries that no longer satisfy the current schema (because of a past forced change) are flagged
- Create / edit / delete entry actions
- Live updates: edits from other open tabs/clients appear without refresh

### 4. Entry Editor (dynamic form)
- Form generated entirely from the schema's field list — no hand-coded form per content type
- Field-appropriate inputs: text input, number input, checkbox, date picker, reference picker (select from target schema's entries)
- Client-side required-field check for UX; server is the source of truth for validation
- Create and edit use the same generated form

### 5. Schema Change Preview (modal/screen, triggered from Schema Builder)
- Shown when saving a schema edit that could break existing entries: field rename, delete, type change, or optional→required
- Lists each change and how many entries are affected, split into:
  - **Auto-migrated** (e.g., rename — data carries over automatically, nothing to decide)
  - **Needs attention** (type coercion fails, or a required field is empty) — shown with a sample of affected entries
- For "needs attention" entries, the user can set one backfill default value applied to all of them, or skip and commit anyway (affected entries are flagged invalid afterward, fixable later from the Entry Editor)
- Nothing is written until the user confirms

## Out of scope
- Auth/roles/multi-tenancy
- Publishing workflows (draft vs published states) — the read API serves all entries
- Per-entry inline editing inside the preview modal (stretch goal only if time remains)
- Pagination/search/filtering beyond what's trivially needed to demo
- Rich text / media / file upload field types

## Deliverables (per the brief)
1. Working, runnable app (`docker compose up` for Postgres + documented run steps for backend/frontend)
2. README with install + run instructions
3. Async presentation (deck ≤15 slides or video <10 min) covering architecture, data model, real-time approach, schema-evolution handling, trade-offs
4. AI session documentation — this repo's PRD.md/design.md/tasks.md plus commit history doubles as the record of how Claude was used and what was reviewed/decided by the candidate

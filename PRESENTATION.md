# Presentation outline

Sized for a ≤15-slide deck, or read aloud as a <10-min video script. ~30-45s per slide.

---

**1. What this is**
A headless CMS admin panel: define arbitrary content types with typed fields (no fixed list — Contentful's model), manage content against them through auto-generated forms, real-time sync, safe schema evolution, and a thin public read API.

**2. The 5 requirements → 5 vertical slices**
Content type builder, dynamic entry editor, real-time updates, schema evolution, read API — built and shipped one complete vertical slice (DB→API→UI) at a time, not layer by layer. Each slice independently demoable before the next started.

**3. Stack**
Node/Express/TypeScript + Postgres (raw SQL, no ORM) + Socket.io. React/Vite/TypeScript + TanStack Query + React Router + Tailwind. Chose to hand-roll real-time and migration logic over a BaaS (Supabase/Firebase) — that logic is exactly what's being evaluated, so it shouldn't be hidden behind someone else's platform.

**4. Data model**
`content_types` (id, name, slug, version, fields as JSONB) + `entries` (id, content_type_id, content_type_version, data as JSONB). Fields live as JSONB on the type row — always read/written together with their parent, a join table would buy nothing. *[show the ERD / table from design.md]*

**5. Dynamic entry editor**
One generated form, not N hand-coded ones. `DynamicField` renders the right input per field type; reference fields get a picker sourced from the target type's real entries. *[live demo: create a type, create an entry]*

**6. Validity is computed, not stored**
`isValid`/`errors` on an entry are computed on every read by validating `data` against the content type's *current* fields — same validator powers entry creation, listing, and the evolution impact preview. No risk of a stored flag drifting from reality.

**7. Real-time — the simplification**
Socket.io global broadcast, not per-id rooms. No multi-tenancy, no scale concern for a single-user admin tool — room-scoping would've added complexity with zero benefit. *[live demo or mention: verified with a second standalone client during dev, not just two browser tabs]*

**8. Schema evolution — the core problem**
A field edit is risky when it can invalidate existing data: rename, delete, type change, or optional→required. Everything else applies immediately.

**9. The flow**
Preview (diff + classify impact, write nothing) → user reviews auto-migrated vs. needs-attention entries with sample values → optional one-shot backfill per field → commit (transactional: migrate all entries, bump version, never partial).

**10. Flag-and-allow, not block-until-fixed**
Entries left invalid after a forced commit aren't blocked — they persist, flagged, fixable later via the normal entry editor. A single bad legacy entry can't permanently lock a content type from evolving. This is how real CMSs (Contentful included) handle it.

**11. Live demo**
Rename a field on a type with existing entries → preview shows the diff → toggle a field required → see auto-migrated/needs-attention split → backfill → commit → show the now-valid entry in the list.

**12. A bug I caught during testing**
Backfill values from a text input arrive as strings; without coercion, a "fixed" entry could still fail validation (string `"1999"` ≠ number `1999`). Added type coercion in `migrateEntryData`, caught by re-verifying against the real running app, not just unit tests.

**13. Read API**
`GET /api/content/:type`, `GET /api/content/:type/:id` — exact paths from the brief. Public response strips `isValid`/`errors`/version — admin internals never leak.

**14. Trade-offs cut for time**
No auth (single-user tool), no draft/publish states, bulk backfill only (not per-entry remediation in the preview), reference integrity on delete is best-effort. All explicit in design.md, not silent gaps.

**15. Testing**
183 tests (112 backend, 71 frontend), TDD throughout — test commit before implementation commit, visible in the git history. Heaviest coverage on the validator/diff/migration logic (the evaluated differentiator); lighter on simple CRUD/UI by design.

---

## Notes for whoever presents this
- Slides 11-12 are the ones worth slowing down on — that's the differentiator and the most concrete proof of "I tested this for real."
- If recording video instead of slides: skip reading 14-15 verbatim, just say it and show the test run (`npm test`) on screen.

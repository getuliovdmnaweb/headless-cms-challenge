## Product Context
See PRD.md, design.md, and tasks.md for requirements, architecture, and backlog.

This is a time-boxed take-home challenge (target ~4 hours). Testing is full TDD per standing convention, but suite depth is weighted toward the validator/content-type-evolution logic over simple CRUD/UI — see the "Trade-offs" section of design.md.

Work is built as vertical slices (DB→API→UI per feature), not horizontal layers — see tasks.md. "Content Type" is the entity name throughout (Contentful's vocabulary), never "Schema" — there is no fixed set of types, name and fields are entirely user-defined.

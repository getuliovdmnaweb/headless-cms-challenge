CREATE TABLE IF NOT EXISTS content_types (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  version    INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fields (
  id               SERIAL PRIMARY KEY,
  content_type_id  INTEGER NOT NULL REFERENCES content_types(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  type             TEXT NOT NULL CHECK (type IN ('text','number','boolean','date','reference')),
  required         BOOLEAN NOT NULL DEFAULT FALSE,
  position         INTEGER NOT NULL DEFAULT 0,
  options          JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (content_type_id, name)
);

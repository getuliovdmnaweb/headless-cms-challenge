# Headless CMS Challenge

A headless CMS with a dynamic content builder, entry management, real-time sync across browser tabs, schema evolution with data migration, a public read API, and a reference field type.

---

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | ≥ 20 |
| Docker & Docker Compose | any recent version |
| npm | ≥ 10 |

---

## Getting started

### 1. Start the database

```bash
docker compose up -d
```

This starts a Postgres 16 instance on **port 5433** (not the default 5432, to avoid collisions with any local Postgres).

### 2. Install dependencies and apply migrations

```bash
cd backend
npm install
npm run db:migrate   # runs Prisma migrate deploy
```

### 3. Start the backend

```bash
# still in /backend
npm run dev
```

The API is now running at **http://localhost:4000**.

### 4. Start the frontend

```bash
cd ../frontend
npm install
npm run dev
```

The app is now running at **http://localhost:5173**.

---

## Running the tests

### Backend (Jest + Supertest, real DB)

```bash
cd backend
npm test
```

Tests run against the live Docker database. Run with `--runInBand` if you see flaky failures (a slug-collision race between parallel suites):

```bash
npm test -- --runInBand
```

### Frontend (Vitest + React Testing Library)

```bash
cd frontend
npm test
```

All service calls are mocked — no running server needed.

---

## Project structure

```
.
├── docker-compose.yml          ← Postgres 16 on port 5433
├── backend/
│   ├── src/
│   │   ├── routes/             ← thin HTTP wiring
│   │   ├── controllers/        ← req/res handling, input validation
│   │   ├── services/           ← business logic
│   │   ├── repositories/       ← Prisma DB calls
│   │   └── constants/errors.ts ← all AppErrors (status + message)
│   └── prisma/schema.prisma
└── frontend/
    └── src/
        ├── screens/            ← page-level components
        ├── services/           ← fetch wrappers (typed)
        ├── components/shared/  ← domain-aware reusable components
        └── types/              ← TypeScript interfaces
```

---

## API reference

All endpoints are under `http://localhost:4000/api`.

### Health

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Returns `{ status: "ok" }` |

### Content types

| Method | Path | Description |
|---|---|---|
| GET | `/content-types` | List all content types (with field count) |
| POST | `/content-types` | Create a content type with fields |
| GET | `/content-types/:slug` | Get a content type with its fields |
| PUT | `/content-types/:slug` | Replace name and all fields |
| DELETE | `/content-types/:slug` | Delete content type and all its entries |

### Entries

| Method | Path | Description |
|---|---|---|
| GET | `/content-types/:slug/entries` | List entries for a content type |
| POST | `/content-types/:slug/entries` | Create an entry |
| GET | `/content-types/:slug/entries/:id` | Get one entry |
| PUT | `/content-types/:slug/entries/:id` | Update one entry |
| DELETE | `/content-types/:slug/entries/:id` | Delete one entry |

### Schema evolution

| Method | Path | Description |
|---|---|---|
| POST | `/content-types/:slug/preview` | Preview impact of a field schema change |
| POST | `/content-types/:slug/commit` | Commit the migration (atomic, with version check) |

### Public read API (unauthenticated)

| Method | Path | Description |
|---|---|---|
| GET | `/content/:slug` | All entries for a content type |
| GET | `/content/:slug/:entryId` | One entry |

---

## Feature walkthrough

The steps below cover every feature in the brief. Follow them in order to see the full system end to end.

### 1. Create a content type

1. Open **http://localhost:5173**.
2. Click **"+ New content type"**.
3. Enter a name, e.g. `Car`.
4. Add fields:
   - `Brand` — type `text`, required ✓
   - `Year` — type `number`, optional
   - `Electric` — type `boolean`, optional
5. Click **"Create content type"**.
6. `Car` appears in the list with field count 3.

**Error paths to verify:**
- Submit with an empty name → "Name is required"
- Submit with no fields → button disabled, "Add at least one field to continue"
- Submit with an empty field name → "Field name is required" on the row
- Submit with two fields named the same → "Field names must be unique"

---

### 2. Create entries

1. Click **"View content"** next to `Car`.
2. Click **"+ New entry"**.
3. Fill in Brand (`Toyota`), Year (`2022`), Electric (unchecked).
4. Click **"Save"** — entry appears in the list with a green **Valid** badge.
5. Create a second entry, leave Brand empty — it shows a red **Invalid** badge.

---

### 3. Edit and delete

1. Click **"Edit"** on any entry row → form loads pre-filled.
2. Change a value, click **"Save"** → row updates.
3. Click **"Delete"** → confirm dialog → row removed.
4. Back on the content type list, click **"Edit fields"** next to `Car`.
5. Rename a field, drag the `⠿` handle to reorder, add a new field.
6. Click **"Save changes"** → redirects to list.
7. On the list, click the **trash icon** next to a content type → confirm → removed.

---

### 4. Real-time sync

1. Open **http://localhost:5173** in two browser tabs side by side.
2. In tab A, navigate to the `Car` entries list.
3. Keep tab B on the content type list.
4. In tab A, create a new entry → tab B's count updates without a reload.
5. In tab B, create a new content type → tab A's list updates automatically.

All changes (create, update, delete — for both content types and entries) broadcast via Socket.IO and update every connected tab.

---

### 5. Schema evolution

1. Open the `Car` content type in **"Edit fields"**.
2. Change the `Year` field type from `number` to `text`.
   - The row turns **amber** immediately (risky change highlight).
3. Click **"Save changes"** → a **Review modal** opens:
   - Shows which entries are affected and how many can/can't auto-convert.
   - If any entries have a numeric Year that can't parse as text, a fallback input appears.
4. Click **"Apply changes"** → entries are migrated, redirected to the list.

**Conflict detection (optimistic concurrency):**
- Open the same content type in two tabs.
- Save in tab A first.
- Try to save in tab B → "Content type was modified by another session. Reload and try again."

---

### 6. Reference field

1. Create a second content type, e.g. `Driver` with a `Name` (text, required) field.
2. Add a couple of Driver entries.
3. Go back to `Car` → **"Edit fields"** → add a new field:
   - Name: `Owner`, type: `reference`, target: `Driver`.
4. Go to a Car entry → **"Edit"** → the `Owner` field renders a dropdown listing Driver entries by name.
5. Select a driver, save → the entry stores the Driver entry ID.

---

### 7. Public read API

No UI. Hit these endpoints directly (e.g. with curl or a browser):

```bash
# All Car entries
curl http://localhost:4000/api/content/car

# One specific entry (replace 1 with a real ID from the list above)
curl http://localhost:4000/api/content/car/1

# Non-existent slug → 404
curl -i http://localhost:4000/api/content/nonexistent
```

---

## Technical decisions

| Decision | Rationale |
|---|---|
| **Prisma v7 + driver adapter** | Decouples ORM from pg connection string; connection pooling via `pg.Pool` |
| **Optimistic concurrency (`version` column)** | Detects mid-edit conflicts without table locks; atomic commit inside `prisma.$transaction` |
| **Entry data as JSONB** | Schema-less by nature — any field set can be stored without migrations per type |
| **Socket.IO** | Bidirectional event bus; client auto-reconnects on disconnect |
| **`diffFields` pure function** | Schema comparison is testable in isolation, no DB dependency |
| **4-layer backend** | Routes → Controllers → Services → Repositories; changing the DB only touches the repository layer |

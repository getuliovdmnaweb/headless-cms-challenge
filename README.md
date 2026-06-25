# Headless CMS — Admin Panel

Take-home challenge for The Agile Monkeys frontend role. See [PRD.md](PRD.md) for product scope, [design.md](design.md) for architecture, and [tasks.md](tasks.md) for the vertical-slice backlog.

## Prerequisites
- Node.js 20+
- Docker (for local Postgres)

## Run it

```bash
# 1. Start Postgres
docker compose up -d

# 2. Backend
cd backend
npm install
cp .env.example .env
npm run migrate
npm run dev    # http://localhost:4000

# 3. Frontend (separate terminal)
cd frontend
npm install
npm run dev    # http://localhost:5173
```

Full run-through of each of the brief's 5 requirements lands here in Slice 6, once all slices are built.

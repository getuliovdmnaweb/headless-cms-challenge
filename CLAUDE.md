@~/.claude/skills/backend-architecture/SKILL.md

## Product Context

See [PRD.md](PRD.md), [design.md](design.md), and [tasks.md](tasks.md) for requirements, architecture, and backlog.

---

## Stack

| Layer | Choice |
|---|---|
| Backend runtime | Node.js + TypeScript |
| HTTP framework | Express |
| ORM | Prisma v7 (driver adapter mode) |
| Database | PostgreSQL (Docker, port 5433) |
| Real-time | Socket.IO |
| Frontend | React + Vite + React Router v7 |
| Styling | Tailwind v4 |
| Backend tests | Jest + Supertest |
| Frontend tests | Vitest + React Testing Library |

---

## Prisma v7 Pattern

Prisma v7 requires a driver adapter — connection URL is **not** set in `schema.prisma`.

```typescript
// backend/src/db.ts
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './generated/prisma'

export const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
export const prisma = new PrismaClient({ adapter })
```

Connection URL lives in `backend/prisma.config.ts` (auto-generated) and `backend/.env` (gitignored).
The `datasource` block in `schema.prisma` has **no `url` field**.

Shadow database requires `CREATEDB` privilege on the Postgres user:
```sql
ALTER USER cms CREATEDB;
```

---

## Local Dev

```bash
# Start DB
docker compose up -d

# Backend (port 4000)
cd backend && npm run dev

# Frontend (port 5173)
cd frontend && npm run dev
```

---

## Test Isolation

Repository tests share the live DB. Run with `--forceExit` to handle lingering pg pool connections. Flaky parallel failures (unique slug collision between test suites) are expected occasionally — re-run to confirm.

```bash
cd backend && npm test
cd frontend && npm test
```

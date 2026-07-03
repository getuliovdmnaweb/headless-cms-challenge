import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './generated/prisma'

export const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? 'postgresql://cms:cms@localhost:5433/cms' })
const adapter = new PrismaPg(pool)

export const prisma = new PrismaClient({ adapter })

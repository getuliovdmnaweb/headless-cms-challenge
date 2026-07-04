import { prisma } from '../db'
import type { EntryData } from '../types/entries'

export async function createEntry(contentTypeId: number, data: EntryData) {
  return prisma.entry.create({
    data: { contentTypeId, data },
  })
}

export async function listByContentTypeId(contentTypeId: number) {
  return prisma.entry.findMany({
    where: { contentTypeId },
    orderBy: { createdAt: 'asc' },
  })
}

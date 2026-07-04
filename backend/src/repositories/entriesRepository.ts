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

export async function findById(id: number) {
  return prisma.entry.findUnique({ where: { id } })
}

export async function updateById(id: number, data: EntryData) {
  return prisma.entry.update({ where: { id }, data: { data } })
}

export async function deleteById(id: number) {
  return prisma.entry.delete({ where: { id } })
}

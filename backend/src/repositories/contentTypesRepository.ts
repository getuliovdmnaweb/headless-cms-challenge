import { prisma } from '../db'
import type { FieldInput } from '../types/contentTypes'

export async function findBySlug(slug: string) {
  return prisma.contentType.findUnique({ where: { slug } })
}

export async function createWithFields(data: {
  name: string
  slug: string
  fields: FieldInput[]
}) {
  return prisma.contentType.create({
    data: {
      name: data.name,
      slug: data.slug,
      fields: {
        create: data.fields.map(f => ({
          name: f.name,
          type: f.type,
          required: f.required,
          position: f.position,
          options: { ...(f.options ?? {}) },
        })),
      },
    },
    include: { fields: { orderBy: { position: 'asc' } } },
  })
}

export async function findBySlugWithFields(slug: string) {
  return prisma.contentType.findUnique({
    where: { slug },
    include: { fields: { orderBy: { position: 'asc' } } },
  })
}

export async function updateWithFields(slug: string, data: { name: string; fields: FieldInput[] }) {
  return prisma.$transaction(async (tx) => {
    await tx.field.deleteMany({ where: { contentType: { slug } } })
    return tx.contentType.update({
      where: { slug },
      data: {
        name: data.name,
        fields: {
          create: data.fields.map(f => ({
            name: f.name,
            type: f.type,
            required: f.required,
            position: f.position,
            options: { ...(f.options ?? {}) },
          })),
        },
      },
      include: { fields: { orderBy: { position: 'asc' } } },
    })
  })
}

export async function deleteBySlug(slug: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const ct = await tx.contentType.findUnique({ where: { slug }, select: { id: true } })
    if (!ct) return
    await tx.field.deleteMany({ where: { contentTypeId: ct.id } })
    await tx.contentType.delete({ where: { slug } })
  })
}

export async function commitSchemaEvolution(
  slug: string,
  data: { name: string; fields: FieldInput[] },
  expectedVersion: number,
  entryUpdates: Array<{ id: number; data: Record<string, unknown> }>
) {
  return prisma.$transaction(async (tx) => {
    const ct = await tx.contentType.findUnique({ where: { slug }, select: { id: true, version: true } })
    if (!ct) throw new Error(`Content type not found: ${slug}`)
    if (ct.version !== expectedVersion) throw new Error('Conflict: content type was modified by another session')

    for (const { id, data: entryData } of entryUpdates) {
      await tx.entry.update({ where: { id }, data: { data: entryData as any } })
    }

    await tx.field.deleteMany({ where: { contentType: { slug } } })
    return tx.contentType.update({
      where: { slug },
      data: {
        name: data.name,
        version: { increment: 1 },
        fields: {
          create: data.fields.map(f => ({
            name: f.name,
            type: f.type,
            required: f.required,
            position: f.position,
            options: { ...(f.options ?? {}) },
          })),
        },
      },
      include: { fields: { orderBy: { position: 'asc' } } },
    })
  })
}

export async function listWithFieldCount() {
  return prisma.contentType.findMany({
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { fields: true } } },
  })
}

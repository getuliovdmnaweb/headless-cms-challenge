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
  _slug: string,
  _data: { name: string; fields: FieldInput[] },
  _expectedVersion: number,
  _entryUpdates: Array<{ id: number; data: Record<string, unknown> }>
): Promise<unknown> {
  throw new Error('not implemented')
}

export async function listWithFieldCount() {
  return prisma.contentType.findMany({
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { fields: true } } },
  })
}

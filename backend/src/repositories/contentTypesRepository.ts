import { prisma } from '../db'
import type { FieldInput } from '../services/contentTypesService'

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
        })),
      },
    },
    include: { fields: { orderBy: { position: 'asc' } } },
  })
}

export async function listWithFieldCount() {
  return prisma.contentType.findMany({
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { fields: true } } },
  })
}

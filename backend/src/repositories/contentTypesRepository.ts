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

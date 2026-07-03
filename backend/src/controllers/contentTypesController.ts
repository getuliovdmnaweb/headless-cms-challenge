import { Request, Response } from 'express'
import * as service from '../services/contentTypesService'

export async function listContentTypes(_req: Request, res: Response): Promise<void> {
  const types = await service.listContentTypes()
  res.json(types)
}

export async function createContentType(req: Request, res: Response): Promise<void> {
  const { name, fields } = req.body

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'Name is required' })
    return
  }

  if (!Array.isArray(fields) || fields.length === 0) {
    res.status(400).json({ error: 'Add at least one field to continue' })
    return
  }

  try {
    const contentType = await service.createContentType({ name: name.trim(), fields })
    res.status(201).json(contentType)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    if (message.includes('already exists')) {
      res.status(409).json({ error: message })
      return
    }
    res.status(500).json({ error: message })
  }
}

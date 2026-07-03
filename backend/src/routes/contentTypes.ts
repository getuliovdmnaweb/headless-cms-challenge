import { Router, Request, Response } from 'express'
import { createContentType, listContentTypes } from '../services/contentTypes'

export const contentTypesRouter = Router()

contentTypesRouter.get('/', async (_req: Request, res: Response) => {
  const types = await listContentTypes()
  res.json(types)
})

contentTypesRouter.post('/', async (req: Request, res: Response) => {
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
    const contentType = await createContentType({ name: name.trim(), fields })
    res.status(201).json(contentType)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    if (message.includes('already exists')) {
      res.status(409).json({ error: message })
      return
    }
    res.status(500).json({ error: message })
  }
})

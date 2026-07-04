import { Request, Response } from 'express'
import * as EntriesService from '../services/entriesService'
import { AppErrors } from '../constants/errors'

export async function listEntries(req: Request, res: Response): Promise<void> {
  try {
    const result = await EntriesService.listEntries(req.params.slug)
    res.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : AppErrors.INTERNAL_SERVER_ERROR.error
    if (message.includes('not found')) {
      res.status(AppErrors.CONTENT_TYPE_NOT_FOUND.status).json({ error: AppErrors.CONTENT_TYPE_NOT_FOUND.error })
      return
    }
    res.status(AppErrors.INTERNAL_SERVER_ERROR.status).json({ error: message })
  }
}

export async function createEntry(req: Request, res: Response): Promise<void> {
  const { data } = req.body

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    res.status(AppErrors.ENTRY_DATA_REQUIRED.status).json({ error: AppErrors.ENTRY_DATA_REQUIRED.error })
    return
  }

  try {
    const entry = await EntriesService.createEntry(req.params.slug, data)
    res.status(201).json(entry)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : AppErrors.INTERNAL_SERVER_ERROR.error
    if (message.includes('not found')) {
      res.status(AppErrors.CONTENT_TYPE_NOT_FOUND.status).json({ error: AppErrors.CONTENT_TYPE_NOT_FOUND.error })
      return
    }
    res.status(AppErrors.INTERNAL_SERVER_ERROR.status).json({ error: message })
  }
}

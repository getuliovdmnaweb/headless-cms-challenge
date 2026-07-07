import { Request, Response } from 'express'
import * as EntriesService from '../services/entriesService'
import { AppErrors } from '../constants/errors'

export async function listEntries(req: Request, res: Response): Promise<void> {
  try {
    const result = await EntriesService.listEntries(req.params.slug)
    res.json(result.entries)
  } catch (err) {
    const message = err instanceof Error ? err.message : AppErrors.INTERNAL_SERVER_ERROR.error
    if (message.includes('not found')) {
      res.status(AppErrors.CONTENT_TYPE_NOT_FOUND.status).json({ error: AppErrors.CONTENT_TYPE_NOT_FOUND.error })
      return
    }
    res.status(AppErrors.INTERNAL_SERVER_ERROR.status).json({ error: message })
  }
}

export async function getEntry(req: Request, res: Response): Promise<void> {
  try {
    const entry = await EntriesService.getEntry(req.params.slug, Number(req.params.id))
    res.json(entry)
  } catch (err) {
    const message = err instanceof Error ? err.message : AppErrors.INTERNAL_SERVER_ERROR.error
    if (message.includes('Entry not found')) {
      res.status(AppErrors.ENTRY_NOT_FOUND.status).json({ error: AppErrors.ENTRY_NOT_FOUND.error })
      return
    }
    if (message.includes('not found')) {
      res.status(AppErrors.CONTENT_TYPE_NOT_FOUND.status).json({ error: AppErrors.CONTENT_TYPE_NOT_FOUND.error })
      return
    }
    res.status(AppErrors.INTERNAL_SERVER_ERROR.status).json({ error: message })
  }
}

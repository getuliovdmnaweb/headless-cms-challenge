import { Request, Response } from 'express'
import * as EntriesService from '../services/entriesService'
import { AppErrors } from '../constants/errors'

export async function listEntries(req: Request, res: Response): Promise<void> {
  try {
    const result = await EntriesService.listEntries(req.params.slug)
    res.json(result)
  } catch (err) {
    mapError(err, res)
  }
}

function mapError(err: unknown, res: Response): void {
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

export async function getEntry(req: Request, res: Response): Promise<void> {
  try {
    const entry = await EntriesService.getEntry(req.params.slug, Number(req.params.id))
    res.json(entry)
  } catch (err) {
    mapError(err, res)
  }
}

export async function updateEntry(req: Request, res: Response): Promise<void> {
  const { data } = req.body
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    res.status(AppErrors.ENTRY_DATA_REQUIRED.status).json({ error: AppErrors.ENTRY_DATA_REQUIRED.error })
    return
  }
  try {
    const entry = await EntriesService.updateEntry(req.params.slug, Number(req.params.id), data)
    res.json(entry)
  } catch (err) {
    mapError(err, res)
  }
}

export async function deleteEntry(req: Request, res: Response): Promise<void> {
  try {
    await EntriesService.deleteEntry(req.params.slug, Number(req.params.id))
    res.status(204).send()
  } catch (err) {
    mapError(err, res)
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
  } catch (err) {
    mapError(err, res)
  }
}

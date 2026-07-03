import { Request, Response } from 'express'
import * as ContentTypesService from '../services/contentTypesService'
import { AppErrors } from '../constants/errors'

export async function listContentTypes(_req: Request, res: Response): Promise<void> {
  const types = await ContentTypesService.listContentTypes()
  res.json(types)
}

export async function getContentType(req: Request, res: Response): Promise<void> {
  const ct = await ContentTypesService.getContentType(req.params.slug)
  if (!ct) {
    res.status(AppErrors.CONTENT_TYPE_NOT_FOUND.status).json({ error: AppErrors.CONTENT_TYPE_NOT_FOUND.error })
    return
  }
  res.json(ct)
}

export async function updateContentType(req: Request, res: Response): Promise<void> {
  const { name, fields } = req.body

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(AppErrors.NAME_REQUIRED.status).json({ error: AppErrors.NAME_REQUIRED.error })
    return
  }

  if (!Array.isArray(fields) || fields.length === 0) {
    res.status(AppErrors.FIELDS_REQUIRED.status).json({ error: AppErrors.FIELDS_REQUIRED.error })
    return
  }

  try {
    const contentType = await ContentTypesService.updateContentType(req.params.slug, { name: name.trim(), fields })
    res.json(contentType)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : AppErrors.INTERNAL_SERVER_ERROR.error
    if (message.includes('not found')) {
      res.status(AppErrors.CONTENT_TYPE_NOT_FOUND.status).json({ error: AppErrors.CONTENT_TYPE_NOT_FOUND.error })
      return
    }
    if (message.includes('already exists')) {
      res.status(AppErrors.CONTENT_TYPE_EXISTS.status).json({ error: message })
      return
    }
    res.status(AppErrors.INTERNAL_SERVER_ERROR.status).json({ error: message })
  }
}

export async function createContentType(req: Request, res: Response): Promise<void> {
  const { name, fields } = req.body

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(AppErrors.NAME_REQUIRED.status).json({ error: AppErrors.NAME_REQUIRED.error })
    return
  }

  if (!Array.isArray(fields) || fields.length === 0) {
    res.status(AppErrors.FIELDS_REQUIRED.status).json({ error: AppErrors.FIELDS_REQUIRED.error })
    return
  }

  try {
    const contentType = await ContentTypesService.createContentType({ name: name.trim(), fields })
    res.status(201).json(contentType)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : AppErrors.INTERNAL_SERVER_ERROR.error
    if (message.includes('already exists')) {
      res.status(AppErrors.CONTENT_TYPE_EXISTS.status).json({ error: message })
      return
    }
    res.status(AppErrors.INTERNAL_SERVER_ERROR.status).json({ error: message })
  }
}

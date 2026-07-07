import { Request, Response } from 'express'
import * as SchemaEvolutionService from '../services/schemaEvolutionService'
import { AppErrors } from '../constants/errors'

export async function previewChanges(req: Request, res: Response): Promise<void> {
  if (!Array.isArray(req.body.fields)) {
    res.status(AppErrors.SCHEMA_FIELDS_REQUIRED.status).json({ error: AppErrors.SCHEMA_FIELDS_REQUIRED.error })
    return
  }
  try {
    const impact = await SchemaEvolutionService.analyzeImpact(req.params.slug, req.body.fields)
    res.json(impact)
  } catch (err) {
    const message = err instanceof Error ? err.message : AppErrors.INTERNAL_SERVER_ERROR.error
    if (message.includes('not found')) {
      res.status(AppErrors.CONTENT_TYPE_NOT_FOUND.status).json({ error: AppErrors.CONTENT_TYPE_NOT_FOUND.error })
      return
    }
    res.status(AppErrors.INTERNAL_SERVER_ERROR.status).json({ error: message })
  }
}

export async function commitChanges(req: Request, res: Response): Promise<void> {
  if (!Array.isArray(req.body.fields)) {
    res.status(AppErrors.SCHEMA_FIELDS_REQUIRED.status).json({ error: AppErrors.SCHEMA_FIELDS_REQUIRED.error })
    return
  }
  if (req.body.version === undefined || req.body.version === null) {
    res.status(AppErrors.SCHEMA_VERSION_REQUIRED.status).json({ error: AppErrors.SCHEMA_VERSION_REQUIRED.error })
    return
  }
  try {
    const updated = await SchemaEvolutionService.commitSchemaChange(
      req.params.slug,
      req.body.fields,
      req.body.version,
      req.body.fallback ?? {}
    )
    res.json(updated)
  } catch (err) {
    const message = err instanceof Error ? err.message : AppErrors.INTERNAL_SERVER_ERROR.error
    if (message.includes('Conflict')) {
      res.status(AppErrors.SCHEMA_CONFLICT.status).json({ error: AppErrors.SCHEMA_CONFLICT.error })
      return
    }
    if (message.includes('not found')) {
      res.status(AppErrors.CONTENT_TYPE_NOT_FOUND.status).json({ error: AppErrors.CONTENT_TYPE_NOT_FOUND.error })
      return
    }
    res.status(AppErrors.INTERNAL_SERVER_ERROR.status).json({ error: message })
  }
}

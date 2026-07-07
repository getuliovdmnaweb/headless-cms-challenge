import { Router } from 'express'
import * as ContentTypesController from '../controllers/contentTypesController'
import * as SchemaEvolutionController from '../controllers/schemaEvolutionController'

export const contentTypesRouter = Router()

contentTypesRouter.get('/', ContentTypesController.listContentTypes)
contentTypesRouter.post('/', ContentTypesController.createContentType)
contentTypesRouter.get('/:slug', ContentTypesController.getContentType)
contentTypesRouter.put('/:slug', ContentTypesController.updateContentType)
contentTypesRouter.delete('/:slug', ContentTypesController.deleteContentType)
contentTypesRouter.post('/:slug/preview', SchemaEvolutionController.previewChanges)
contentTypesRouter.post('/:slug/commit', SchemaEvolutionController.commitChanges)

import { Router } from 'express'
import * as ContentTypesController from '../controllers/contentTypesController'

export const contentTypesRouter = Router()

contentTypesRouter.get('/', ContentTypesController.listContentTypes)
contentTypesRouter.post('/', ContentTypesController.createContentType)

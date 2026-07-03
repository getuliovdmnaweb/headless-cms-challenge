import { Router } from 'express'
import * as controller from '../controllers/contentTypesController'

export const contentTypesRouter = Router()

contentTypesRouter.get('/', controller.listContentTypes)
contentTypesRouter.post('/', controller.createContentType)

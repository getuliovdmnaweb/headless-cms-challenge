import { Router } from 'express'
import * as ContentController from '../controllers/contentController'

export const contentRouter = Router()

contentRouter.get('/:slug', ContentController.listEntries)
contentRouter.get('/:slug/:id', ContentController.getEntry)

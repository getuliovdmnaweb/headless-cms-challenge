import { Router } from 'express'
import * as EntriesController from '../controllers/entriesController'

export const entriesRouter = Router({ mergeParams: true })

entriesRouter.get('/', EntriesController.listEntries)
entriesRouter.post('/', EntriesController.createEntry)

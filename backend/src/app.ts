import express from 'express'
import cors from 'cors'
import { contentTypesRouter } from './routes/contentTypes'
import { entriesRouter } from './routes/entries'
import { contentRouter } from './routes/content'

export const app = express()

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/content-types', contentTypesRouter)
app.use('/api/content-types/:slug/entries', entriesRouter)
app.use('/api/content', contentRouter)

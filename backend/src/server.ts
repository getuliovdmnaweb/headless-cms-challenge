import { createServer } from 'http'
import { Server } from 'socket.io'
import { app } from './app'

const httpServer = createServer(app)

export const io = new Server(httpServer, {
  cors: { origin: '*' },
})

const PORT = process.env.PORT ?? 4000

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

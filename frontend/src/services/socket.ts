import { io, type Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'
    socket = io(API_URL)
  }
  return socket
}

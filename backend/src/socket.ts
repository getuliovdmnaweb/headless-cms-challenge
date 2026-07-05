import { Server } from 'socket.io'

let _io: Server | null = null

export function initIo(instance: Server): void {
  _io = instance
}

export function getIo(): Server {
  if (!_io) throw new Error('Socket.IO not initialized')
  return _io
}

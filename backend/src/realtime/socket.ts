import type { Server as HTTPServer } from 'http';
import { Server as IOServer } from 'socket.io';
import { bus, type RealtimeEvent } from './bus';

const EVENTS: RealtimeEvent[] = [
  'contentType:updated',
  'contentType:deleted',
  'entry:created',
  'entry:updated',
  'entry:deleted',
];

export function attachRealtime(httpServer: HTTPServer, corsOrigin: string) {
  const io = new IOServer(httpServer, { cors: { origin: corsOrigin } });

  io.on('connection', (socket) => {
    socket.on('join', (contentTypeId: string) => socket.join(`contentType:${contentTypeId}`));
    socket.on('leave', (contentTypeId: string) => socket.leave(`contentType:${contentTypeId}`));
  });

  for (const event of EVENTS) {
    bus.on(event, (payload: { contentTypeId: string }) => {
      io.to(`contentType:${payload.contentTypeId}`).emit(event, payload);
    });
  }

  return io;
}

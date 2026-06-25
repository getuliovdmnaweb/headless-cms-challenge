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

  for (const event of EVENTS) {
    bus.on(event, (payload) => {
      io.emit(event, payload);
    });
  }

  return io;
}

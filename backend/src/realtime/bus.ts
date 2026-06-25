import { EventEmitter } from 'events';

export type RealtimeEvent =
  | 'contentType:updated'
  | 'contentType:deleted'
  | 'entry:created'
  | 'entry:updated'
  | 'entry:deleted';

export const bus = new EventEmitter();

export function emit(event: RealtimeEvent, payload: { contentTypeId: string } & Record<string, unknown>) {
  bus.emit(event, payload);
}

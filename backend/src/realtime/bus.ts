import { EventEmitter } from 'events';

export type RealtimeEvent =
  | 'contentType:updated'
  | 'contentType:deleted'
  | 'entry:created'
  | 'entry:updated'
  | 'entry:deleted';

export interface RealtimePayload {
  contentTypeId: string;
  entryId?: string;
}

export const bus = new EventEmitter();

export function emit(event: RealtimeEvent, payload: RealtimePayload) {
  bus.emit(event, payload);
}

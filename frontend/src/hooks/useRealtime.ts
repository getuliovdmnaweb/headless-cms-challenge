import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getSocket } from '../services/socket'

const EVENTS = [
  'contentType:updated',
  'contentType:deleted',
  'entry:created',
  'entry:updated',
  'entry:deleted',
] as const

interface RealtimePayload {
  contentTypeId?: string
  entryId?: string
}

export function useRealtime() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const socket = getSocket()

    function handle(payload: RealtimePayload) {
      queryClient.invalidateQueries({ queryKey: ['contentTypes'] })
      if (payload.contentTypeId) {
        queryClient.invalidateQueries({ queryKey: ['contentTypes', payload.contentTypeId] })
        queryClient.invalidateQueries({ queryKey: ['entries', payload.contentTypeId] })
        if (payload.entryId) {
          queryClient.invalidateQueries({ queryKey: ['entries', payload.contentTypeId, payload.entryId] })
        }
      }
    }

    for (const event of EVENTS) {
      socket.on(event, handle)
    }

    return () => {
      for (const event of EVENTS) {
        socket.off(event, handle)
      }
    }
  }, [queryClient])
}

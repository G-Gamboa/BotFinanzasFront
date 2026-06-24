import { useCallback, useEffect, useRef } from 'react'

const WS_BASE = (() => {
  const base = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || ''
  return base.replace(/^https/, 'wss').replace(/^http/, 'ws')
})()

const MIN_RECONNECT_MS = 2000
const MAX_RECONNECT_MS = 30000

export function useWebSocket(userId, initData, onMessage) {
  const wsRef = useRef(null)
  const timerRef = useRef(null)
  const delayRef = useRef(MIN_RECONNECT_MS)
  const unmountedRef = useRef(false)
  const onMessageRef = useRef(onMessage)

  // Keep callback ref fresh without re-triggering connect
  useEffect(() => { onMessageRef.current = onMessage }, [onMessage])

  const connect = useCallback(() => {
    if (!userId || !initData || unmountedRef.current || !WS_BASE) return

    const url = `${WS_BASE}/ws/${userId}?initData=${encodeURIComponent(initData)}`
    let ws

    try {
      ws = new WebSocket(url)
    } catch {
      return
    }

    wsRef.current = ws

    ws.onopen = () => {
      delayRef.current = MIN_RECONNECT_MS
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        onMessageRef.current?.(msg)
      } catch {
        // ignore malformed messages
      }
    }

    ws.onclose = () => {
      if (unmountedRef.current) return
      const delay = delayRef.current
      delayRef.current = Math.min(delay * 2, MAX_RECONNECT_MS)
      timerRef.current = setTimeout(connect, delay)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [userId, initData])

  useEffect(() => {
    unmountedRef.current = false
    connect()
    return () => {
      unmountedRef.current = true
      clearTimeout(timerRef.current)
      wsRef.current?.close()
    }
  }, [connect])
}

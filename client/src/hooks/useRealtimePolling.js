import { useState, useEffect, useRef, useCallback } from 'react';
import { socket } from '../services/socket';

/**
 * useRealtimePolling — Universal hook for live-updating data.
 * Combines Socket.IO event listening with polling fallback.
 * 
 * @param {Function} fetchFn — Async function that returns fresh data
 * @param {number} intervalMs — Polling interval in ms (default 4000)
 * @param {string[]} socketEvents — Socket.IO event names to listen for
 * @param {any[]} deps — Dependency array for re-triggering
 */
export default function useRealtimePolling(fetchFn, intervalMs = 4000, socketEvents = [], deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [realtimePulse, setRealtimePulse] = useState(false);
  const mountedRef = useRef(true);

  const doFetch = useCallback(async (showPulse = false) => {
    try {
      const result = await fetchFn();
      if (mountedRef.current) {
        setData(result);
        setLoading(false);
        setLastUpdated(new Date());
        if (showPulse) {
          setRealtimePulse(true);
          setTimeout(() => {
            if (mountedRef.current) setRealtimePulse(false);
          }, 1200);
        }
      }
    } catch (err) {
      console.warn('[useRealtimePolling] Fetch error:', err.message);
      if (mountedRef.current) setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    mountedRef.current = true;

    // Initial fetch
    doFetch(false);

    // Socket.IO listeners
    const handleSocketUpdate = () => doFetch(true);
    socketEvents.forEach(event => socket.on(event, handleSocketUpdate));

    // Polling fallback
    const interval = setInterval(() => doFetch(false), intervalMs);

    return () => {
      mountedRef.current = false;
      socketEvents.forEach(event => socket.off(event, handleSocketUpdate));
      clearInterval(interval);
    };
  }, [...deps, intervalMs]);

  const refresh = useCallback(() => doFetch(true), [doFetch]);

  return { data, loading, lastUpdated, realtimePulse, refresh };
}

// hooks/useWebSocketDetection.js
import { useCallback, useEffect, useRef, useState } from 'react';

export function useWebSocketDetection({
  wsUrl,              // e.g., 'ws://localhost:8000/ws/detect'
  enabled,
  cameraId,
  captureFrameBlob,
  onResult,
  onError,
  onLog,
}) {
  const wsRef = useRef(null);
  const pendingResolve = useRef(null);
  const pendingReject = useRef(null);
  const timeoutRef = useRef(null);
  const loopActiveRef = useRef(false);

  const [detectState, setDetectState] = useState('idle');
  
  // Keep latest values in refs to avoid stale closures inside WS handlers
  const enabledRef = useRef(enabled);
  const callbacksRef = useRef({ captureFrameBlob, onResult, onError, onLog });
  const nextCycleTimerRef = useRef(null);

  useEffect(() => { enabledRef.current = enabled; }, [enabled]);
  useEffect(() => {
    callbacksRef.current = { captureFrameBlob, onResult, onError, onLog };
  }, [captureFrameBlob, onResult, onError, onLog]);

  // Sequential detection cycle (send → wait → process → repeat)
  const runCycle = useCallback(async () => {
    if (!enabledRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    loopActiveRef.current = true;

    try {
      setDetectState('detecting');
      const { captureFrameBlob, onResult, onError, onLog } = callbacksRef.current;

      const blob = await captureFrameBlob();
      if (!blob) {
        setDetectState('idle');
        window.clearTimeout(nextCycleTimerRef.current);
        nextCycleTimerRef.current = window.setTimeout(() => {
          if (enabledRef.current && loopActiveRef.current) runCycle();
        }, 80);
        return;
      }

      wsRef.current.send(await blob.arrayBuffer());

      // Wait for exactly one response from the backend
      const result = await new Promise((resolve, reject) => {
        pendingResolve.current = resolve;
        pendingReject.current = reject;
        timeoutRef.current = setTimeout(() => reject(new Error('Detection timeout')), 5000);
      });

      if (!enabledRef.current || !loopActiveRef.current) return;

      setDetectState('success');
      onResult(result);
    } catch (error) {
      setDetectState('error');
      callbacksRef.current.onError(error);
      callbacksRef.current.onLog(`Detection error: ${error.message}`);
    }

    // Yield to event loop, then continue if still enabled
    window.clearTimeout(nextCycleTimerRef.current);
    nextCycleTimerRef.current = window.setTimeout(() => {
      if (enabledRef.current && loopActiveRef.current) runCycle();
    }, 80);
  }, []);

  const stopCycle = useCallback(() => {
    loopActiveRef.current = false;
    clearTimeout(timeoutRef.current);
    setDetectState('idle');
  }, []);

  // WebSocket connection lifecycle
  useEffect(() => {
    if (!enabled) {
      stopCycle();
      return;
    }

    const url = `${wsUrl}?camera_id=${encodeURIComponent(cameraId || 'default')}&timestamp=${encodeURIComponent(new Date().toISOString())}`;
    const ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onopen = () => {
      setDetectState('connected');
      runCycle();
    };

    ws.onmessage = (event) => {
      clearTimeout(timeoutRef.current);
      if (pendingResolve.current) {
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          pendingResolve.current(data);
        } catch (e) {
          pendingReject.current?.(e);
        }
        pendingResolve.current = null;
        pendingReject.current = null;
      }
    };

    ws.onerror = () => {
      setDetectState('error');
      callbacksRef.current.onLog('WebSocket connection error.');
      cleanup();
    };

    ws.onclose = () => {
      if (enabledRef.current) {
        setDetectState('idle');
      }
      cleanup();
    };

    function cleanup() {
      stopCycle();
      if (wsRef.current) {
        wsRef.current.onclose = null; // Prevent recursive cleanup
        wsRef.current.close();
        wsRef.current = null;
      }
    }

    return cleanup;
  }, [enabled, wsUrl, cameraId, runCycle, stopCycle]);

  // Manual trigger (compatible with old API)
  const scanNow = useCallback(async () => {
    if (!enabled || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    
    stopCycle(); // Pause auto-loop temporarily
    try {
      setDetectState('detecting');
      const blob = await callbacksRef.current.captureFrameBlob();
      if (!blob) return;

      wsRef.current.send(await blob.arrayBuffer());
      const result = await new Promise((resolve, reject) => {
        pendingResolve.current = resolve;
        pendingReject.current = reject;
        timeoutRef.current = setTimeout(() => reject(new Error('Detection timeout')), 5000);
      });

      setDetectState('success');
      callbacksRef.current.onResult(result);
    } catch (error) {
      setDetectState('error');
      callbacksRef.current.onError(error);
    } finally {
      if (enabledRef.current) runCycle(); // Resume auto-loop
    }
  }, [enabled, runCycle, stopCycle]);

  return { detectState, scanNow };
}
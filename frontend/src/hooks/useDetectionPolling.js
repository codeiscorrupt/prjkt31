import { useCallback, useEffect, useRef, useState } from 'react';
import { sendDetectionFrame } from '../services/recognitionApi.js';

export function useDetectionPolling({
  detectUrl,
  intervalMs,
  enabled,
  cameraId,
  captureFrameBlob,
  onResult,
  onError,
  onLog,
}) {
  const timerRef = useRef(null);
  const busyRef = useRef(false);
  const [detectState, setDetectState] = useState('idle');

  const scanNow = useCallback(async () => {
    if (!enabled || busyRef.current) return;

    try {
      busyRef.current = true;
      setDetectState('detecting');

      const blob = await captureFrameBlob();
      if (!blob) {
        setDetectState('idle');
        return;
      }

      const result = await sendDetectionFrame({
        detectUrl,
        blob,
        timestamp: new Date().toISOString(),
        cameraId,
      });

      setDetectState('success');
      onResult(result);
    } catch (error) {
      setDetectState('error');
      onError(error);
      onLog(`Detection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      busyRef.current = false;
    }
  }, [cameraId, captureFrameBlob, detectUrl, enabled, onError, onLog, onResult]);

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (enabled) {
      timerRef.current = setInterval(scanNow, Math.max(300, intervalMs));
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [enabled, intervalMs, scanNow]);

  return {
    detectState,
    scanNow,
  };
}

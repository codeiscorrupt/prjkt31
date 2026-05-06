import { useCallback, useRef, useState } from 'react';
import { sendAuthorizationFrame } from '../services/recognitionApi.js';

export function useAuthorizationFlow({ authorizeUrl, cameraId, captureFrameBlob, onLog }) {
  const activeTargetKeyRef = useRef(null);
  const busyRef = useRef(false);
  const [authState, setAuthState] = useState('idle');
  const [authResult, setAuthResult] = useState(null);

  const resetAuthorization = useCallback(() => {
    activeTargetKeyRef.current = null;
    busyRef.current = false;
    setAuthState('idle');
    setAuthResult(null);
  }, []);

  const requestAuthorization = useCallback(async ({ targetKey, targetId }) => {
    if (!targetKey) return;
    if (busyRef.current && activeTargetKeyRef.current === targetKey) return;
    if (authResult && activeTargetKeyRef.current === targetKey && authState !== 'error') return;

    busyRef.current = true;
    activeTargetKeyRef.current = targetKey;
    setAuthState('loading');
    setAuthResult(null);
    onLog(`Authorizing ${targetId || targetKey}...`);

    try {
      const blob = await captureFrameBlob();
      if (!blob) {
        setAuthState('idle');
        busyRef.current = false;
        return;
      }

      const result = await sendAuthorizationFrame({
        authorizeUrl,
        blob,
        timestamp: new Date().toISOString(),
        cameraId,
        targetId,
      });

      setAuthResult(result);
      setAuthState(result.authorized ? 'success' : 'denied');
      onLog(result.message || 'Authorization finished.');
    } catch (error) {
      setAuthState('error');
      setAuthResult({
        ok: false,
        authorized: false,
        message: error instanceof Error ? error.message : 'Authorization failed',
      });
      onLog(`Authorization error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      busyRef.current = false;
    }
  }, [authResult, authState, authorizeUrl, cameraId, captureFrameBlob, onLog]);

  return {
    authState,
    authResult,
    requestAuthorization,
    resetAuthorization,
  };
}

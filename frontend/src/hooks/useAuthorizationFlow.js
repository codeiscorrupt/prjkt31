import { use, useCallback, useRef, useState } from 'react';
import { sendAuthorizationFrame } from '../services/recognitionApi.js';

export const AUTH_STATUS = {
  PENDING: 0,
  AUTHORIZED: 1,
  UNAUTHORIZED: 2,
};

function normalizeAuthorized(value) {
  const numeric = Number(value);
  if (numeric === AUTH_STATUS.AUTHORIZED) return AUTH_STATUS.AUTHORIZED;
  if (numeric === AUTH_STATUS.UNAUTHORIZED) return AUTH_STATUS.UNAUTHORIZED;
  return AUTH_STATUS.PENDING;
}

export function useAuthorizationFlow({ authorizeUrl, cameraId, captureFrameBlob, onLog }) {
  const activeTargetKeyRef = useRef(null);
  const busyRef = useRef(false);
  const lastAttemptAtRef = useRef(0);
  const [token, setToken] = useState(null);
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

    const now = Date.now();

    // Avoid sending a heavy DeepFace request too often.
    if (now - lastAttemptAtRef.current < 1200) return;

    // Do not re-authorize the same stable target while it is already being processed.
    if (busyRef.current) return;

    // If same target already reached a final state, do not spam backend.
    if (
      activeTargetKeyRef.current === targetKey &&
      (authState === 'success' || authState === 'denied')
    ) {
      return;
    }

    busyRef.current = true;
    lastAttemptAtRef.current = now;
    activeTargetKeyRef.current = targetKey;

    setAuthState('loading');
    setAuthResult(null);
    onLog?.(`Authorizing ${targetId || targetKey}...`);

    try {
      const blob = await captureFrameBlob();
      if (!blob) {
        setAuthState('idle');
        return;
      }

      const result = await sendAuthorizationFrame({
        authorizeUrl,
        blob,
        timestamp: new Date().toISOString(),
        cameraId,
        targetId,
      });

      const authorized = normalizeAuthorized(result.authorized);
      if (result.token){
        setToken(result.token)
      }
      const normalizedResult = {
        ...result,
        authorized,
      };

      setAuthResult(normalizedResult);

      if (authorized === AUTH_STATUS.AUTHORIZED) {
        setAuthState('success');
      } else if (authorized === AUTH_STATUS.UNAUTHORIZED) {
        setAuthState('denied');
      } else {
        setAuthState('pending');
      }
        // ... rest of function
    
      onLog?.(result.message || 'Authorization updated.');
    } catch (error) {
      setAuthState('error');
      setAuthResult({
        ok: false,
        authorized: AUTH_STATUS.UNAUTHORIZED,
        message: error instanceof Error ? error.message : 'Authorization failed',
      });
      onLog?.(`Authorization error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      busyRef.current = false;
    }
  }, [authState, authorizeUrl, cameraId, captureFrameBlob, onLog]);

  return {
    authState,
    authResult,
    token,
    requestAuthorization,
    resetAuthorization,
  };
}
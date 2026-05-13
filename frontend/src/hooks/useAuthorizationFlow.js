import { use, useEffect,useCallback, useRef, useState } from 'react';
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

export function useAuthorizationFlow({
  authorizeUrl,
  cameraId,
  captureFrameBlob,
  onLog,
}) {
  const activeTargetKeyRef = useRef(null);
  const busyRef = useRef(false);
  const lastAttemptAtRef = useRef(0);
  const [token, setToken] = useState(null);
  const authStateRef = useRef('idle');

  const [authState, setAuthState] = useState('idle');
  const [authResult, setAuthResult] = useState(null);

  useEffect(() => {
    authStateRef.current = authState;
  }, [authState]);

  const setAuthStateSafe = useCallback((nextState) => {
    authStateRef.current = nextState;
    setAuthState(nextState);
  }, []);

  const resetAuthorization = useCallback(() => {
    console.log('[AUTH] resetAuthorization');

    activeTargetKeyRef.current = null;
    busyRef.current = false;
    lastAttemptAtRef.current = 0;

    setAuthStateSafe('idle');
    setAuthResult(null);
  }, [setAuthStateSafe]);

  const requestAuthorization = useCallback(
    async ({ targetKey, targetId }) => {
      console.log('[AUTH] requestAuthorization called', {
        targetKey,
        targetId,
        authState: authStateRef.current,
        activeTargetKey: activeTargetKeyRef.current,
        busy: busyRef.current,
      });

      if (!targetKey) {
        console.log('[AUTH] skipped: missing targetKey');
        return;
      }

      const now = Date.now();

      // const normalizedResult = {
      //   ...result,
      //   authorized,
      // };

      // setAuthResult(normalizedResult);

      // if (authorized === AUTH_STATUS.AUTHORIZED) {
      //   setAuthState('success');
      // } else if (authorized === AUTH_STATUS.UNAUTHORIZED) {
      //   setAuthState('denied');
      // } else {
      //   setAuthState('pending');
      if (now - lastAttemptAtRef.current < 1200) {
        console.log('[AUTH] skipped: throttle');
        return;
      }

      if (busyRef.current) {
        console.log('[AUTH] skipped: busy');
        return;
      }

      const currentAuthState = authStateRef.current;

      if (
        activeTargetKeyRef.current === targetKey &&
        (currentAuthState === 'success' || currentAuthState === 'denied')
      ) {
        console.log('[AUTH] skipped: same target already final', {
          targetKey,
          currentAuthState,
        });
        return;
      }

      busyRef.current = true;
      lastAttemptAtRef.current = now;
      activeTargetKeyRef.current = targetKey;

      setAuthStateSafe('loading');
      setAuthResult(null);

      onLog?.(`Authorizing ${targetId || targetKey}...`);

      try {
        const blob = await captureFrameBlob();

        if (!blob) {
          console.log('[AUTH] skipped: no frame blob');
          setAuthState('idle');
          activeTargetKeyRef.current = null;
          busyRef.current = false;
          setAuthStateSafe('idle');

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

        console.log('[AUTH] backend result', normalizedResult);

        setAuthResult(normalizedResult);

        if (authorized === AUTH_STATUS.AUTHORIZED) {
          setAuthStateSafe('success');
          onLog?.(result.message || 'Face authorized.');
          return;
        }

        if (authorized === AUTH_STATUS.UNAUTHORIZED) {
          setAuthStateSafe('denied');
          onLog?.(result.message || 'Face denied.');
          return;
        }

        setAuthStateSafe('pending');
        onLog?.(result.message || 'Authorization pending. Retrying...');
      } catch (error) {
        console.error('[AUTH] authorization error', error);

        setAuthStateSafe('error');

        setAuthResult({
          ok: false,
          authorized: AUTH_STATUS.UNAUTHORIZED,
          message:
            error instanceof Error ? error.message : 'Authorization failed',
        });

        onLog?.(
          `Authorization error: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      } finally {
        busyRef.current = false;
      }
    },
    [
      authorizeUrl,
      cameraId,
      captureFrameBlob,
      onLog,
      setAuthStateSafe,
    ]
  );

  return {
    authState,
    authResult,
    token,
    requestAuthorization,
    resetAuthorization,
  };
}
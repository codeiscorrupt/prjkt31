import { useCallback, useEffect, useRef, useState } from 'react';

const AUTH_STATUS = {
  PENDING: 0,
  AUTHORIZED: 1,
  UNAUTHORIZED: 2,
};

function getStudentId(student) {
  const rawId = student?.id_etudiant ?? student?.id;
  if (rawId === undefined || rawId === null || rawId === '' || rawId === 'UNKNOWN') {
    return null;
  }

  const numericId = Number(rawId);
  return Number.isFinite(numericId) ? numericId : null;
}

export function useAuthToPinFlow({
  authResult,
  authState,
  pinVerifyEndpoint,
  onLog,
}) {
  const [currentView, setCurrentView] = useState('camera');
  const [pin, setPin] = useState('');
  const [pinBusy, setPinBusy] = useState(false);
  const [pinError, setPinError] = useState('');
  const [sensitiveToken, setSensitiveToken] = useState('');

  const studentRef = useRef(null);
  const normalTokenRef = useRef('');
  const previousAuthorizedIdRef = useRef(null);
  const authHandledKeyRef = useRef('');
  const transitionTimerRef = useRef(null);
  const dashboardTimerRef = useRef(null);

  useEffect(() => {
    window.clearTimeout(transitionTimerRef.current);

    const isFaceAuthorized =
      authState === 'success' &&
      Number(authResult?.authorized) === AUTH_STATUS.AUTHORIZED;

    if (!isFaceAuthorized) {
      if (Number(authResult?.authorized) === AUTH_STATUS.UNAUTHORIZED) {
        studentRef.current = null;
        normalTokenRef.current = '';
      }
      return;
    }

    const nextStudent = authResult?.person;
    const nextId = getStudentId(nextStudent);
    const normalToken = authResult?.token || authResult?.access_token || '';

    if (!nextId || !normalToken) {
      onLog?.('❌ Authorized face response is missing student ID or normal token.');
      setCurrentView('camera');
      return;
    }

    const handledKey = `${nextId}:${normalToken}`;
    if (authHandledKeyRef.current === handledKey) return;
    authHandledKeyRef.current = handledKey;

    const pastId = previousAuthorizedIdRef.current;

    setPin('');
    setPinError('');
    setSensitiveToken('');
    setCurrentView('authorized-pause');

    studentRef.current = nextStudent;
    normalTokenRef.current = normalToken;

    onLog?.('✅ Face authorized. Holding camera check for 5 seconds...');

    transitionTimerRef.current = window.setTimeout(() => {
      const idStillValid = getStudentId(studentRef.current);

      if (!idStillValid) {
        onLog?.('❌ Student ID disappeared. Returning to camera.');
        setCurrentView('camera');
        return;
      }

      if (pastId !== null && pastId !== idStillValid) {
        onLog?.('⚠️ Different student detected after authorization. Returning to camera.');
        studentRef.current = null;
        normalTokenRef.current = '';
        previousAuthorizedIdRef.current = null;
        authHandledKeyRef.current = '';
        setCurrentView('camera');
        return;
      }

      previousAuthorizedIdRef.current = idStillValid;
      setCurrentView('pin-verification');
    }, 5000);

    return () => window.clearTimeout(transitionTimerRef.current);
  }, [authResult, authState, onLog]);

  const handlePinSubmit = useCallback(async (pinOverride) => {
    const pinToVerify = String(pinOverride ?? pin).trim();

    if (pinBusy) return;

    if (!/^\d{4}$/.test(pinToVerify)) {
      setPinError('Enter a valid 4-digit PIN.');
      return;
    }

    const studentId = getStudentId(studentRef.current);
    const normalToken = normalTokenRef.current;

    if (!studentId) {
      setPinError('Missing student ID. Please retry face authorization.');
      setCurrentView('camera');
      return;
    }

    if (!normalToken) {
      setPinError('Missing face authorization token. Please retry.');
      setCurrentView('camera');
      return;
    }

    setPinBusy(true);
    setPinError('');

    try {
      const response = await fetch(pinVerifyEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: normalToken,
          id_etudiant: studentId,
          pin: pinToVerify,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || errData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const token = data.access_token_sensible || data.token;

      if (!token) {
        throw new Error('Sensitive access token missing from server response.');
      }

      setSensitiveToken(token);
      setCurrentView('success');
      onLog?.('✅ PIN verified. Opening protected space...');

      window.clearTimeout(dashboardTimerRef.current);
      dashboardTimerRef.current = window.setTimeout(() => {
        setCurrentView((view) => (view === 'success' ? 'data-dashboard' : view));
      }, 700);
    } catch (err) {
      setPinError(err.message || 'PIN verification failed.');
      onLog?.(`❌ PIN error: ${err.message}`);
      setPin('');
    } finally {
      setPinBusy(false);
    }
  }, [pin, pinBusy, pinVerifyEndpoint, onLog]);

  const resetFlow = useCallback(() => {
    window.clearTimeout(transitionTimerRef.current);
    window.clearTimeout(dashboardTimerRef.current);

    setCurrentView('camera');
    setPin('');
    setPinBusy(false);
    setPinError('');
    setSensitiveToken('');

    studentRef.current = null;
    normalTokenRef.current = '';
    previousAuthorizedIdRef.current = null;
    authHandledKeyRef.current = '';
  }, []);

  const handleBackToCamera = useCallback(() => {
    resetFlow();
  }, [resetFlow]);

  return {
    currentView,
    pin,
    pinBusy,
    pinError,
    sensitiveToken,
    student: studentRef.current,
    setPin,
    handlePinSubmit,
    handleBackToCamera,
    resetFlow,
  };
}
import { useCallback, useEffect, useRef, useState } from 'react';

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
  const authHandledRef = useRef(false);
  const transitionTimerRef = useRef(null);

  useEffect(() => {
    if (authResult?.person) {
      studentRef.current = authResult.person;
    }
  }, [authResult]);

  useEffect(() => {
    window.clearTimeout(transitionTimerRef.current);

    if (authResult?.authorized && authState === 'success' && !authHandledRef.current) {
      authHandledRef.current = true;
      setPin('');
      setPinError('');
      setCurrentView('authorized-pause');
      onLog?.('✅ Face authorized. Gesture PIN will open.');

      transitionTimerRef.current = window.setTimeout(() => {
        setCurrentView('pin-verification');
      }, 850);
    }

    if (!authResult?.authorized) {
      authHandledRef.current = false;
      window.clearTimeout(transitionTimerRef.current);
    }

    return () => window.clearTimeout(transitionTimerRef.current);
  }, [authResult, authState, onLog]);

  const handlePinSubmit = useCallback(async (pinOverride) => {
    const pinToVerify = String(pinOverride ?? pin).trim();
    if (!pinToVerify || pinBusy || !studentRef.current) return;

    setPinBusy(true);
    setPinError('');

    try {
      const studentId = studentRef.current.id_etudiant || studentRef.current.id;
      if (!studentId) {
        throw new Error('Missing student ID for PIN verification');
      }

      const response = await fetch(pinVerifyEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_etudiant: Number(studentId),
          pin: pinToVerify,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || errData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const token = data.access_token_sensible || data.token || data;

      setSensitiveToken(token);
      setCurrentView('success');
      onLog?.('✅ PIN verified. Preparing secure data space...');

      window.setTimeout(() => {
        setCurrentView((view) => view === 'success' ? 'data-dashboard' : view);
      }, 900);
    } catch (err) {
      setPinError(err.message || 'Verification failed');
      onLog?.(`❌ PIN error: ${err.message}`);
      setPin('');
    } finally {
      setPinBusy(false);
    }
  }, [pin, pinBusy, pinVerifyEndpoint, onLog]);

  const resetFlow = useCallback(() => {
    setCurrentView('camera');
    setPin('');
    setPinBusy(false);
    setPinError('');
    setSensitiveToken('');
    studentRef.current = null;
    authHandledRef.current = false;
    window.clearTimeout(transitionTimerRef.current);
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
// hooks/useAuthToPinFlow.js
import { useCallback, useEffect, useRef, useState } from 'react';

export function useAuthToPinFlow({
  authResult,
  authState,
  pinVerifyEndpoint,
  onLog,
}) {
  const [currentView, setCurrentView] = useState('camera'); // 'camera' | 'pin-verification' | 'success'
  const [pin, setPin] = useState('');
  const [pinBusy, setPinBusy] = useState(false);
  const [pinError, setPinError] = useState('');
  const [sensitiveToken, setSensitiveToken] = useState('');

  const studentRef = useRef(null);
  const authHandledRef = useRef(false);

  // Keep latest values in refs to avoid stale closures
  useEffect(() => {
    if (authResult?.person) {
      studentRef.current = authResult.person;
    }
  }, [authResult]);

  useEffect(() => {
    if (authResult?.authorized && authState === 'success' && !authHandledRef.current) {
      authHandledRef.current = true;
      setCurrentView('pin-verification');
      onLog?.('✅ Face authorized. Please enter your PIN.');
    }
    // Reset flag when auth result changes
    if (!authResult?.authorized) {
      authHandledRef.current = false;
    }
  }, [authResult, authState, onLog]);

  const handlePinSubmit = useCallback(async () => {
    if (!pin.trim() || pinBusy || !studentRef.current) return;

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
          pin: pin.trim(),
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || errData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const token = data.access_token_sensible || data.token || data;
      
      setSensitiveToken(token);
      setCurrentView('dashboard'); // ✅ Changed from 'success' to 'dashboard'
      onLog?.('✅ PIN verified. Loading dashboard...');

    } catch (err) {
      setPinError(err.message || 'Verification failed');
      onLog?.(`❌ PIN error: ${err.message}`);
      setPin(''); // Clear for retry
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
  }, []);

  const handleBackToCamera = useCallback(() => {
    resetFlow();
  }, [resetFlow]);

  return {
    // State
    currentView,
    pin,
    pinBusy,
    pinError,
    sensitiveToken,
    student: studentRef.current,
    
    // Actions
    setPin,
    handlePinSubmit,
    handleBackToCamera,
    resetFlow,
  };
}
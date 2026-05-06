import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CameraPanel } from './components/CameraPanel.jsx';
import { TargetSnapshotCard } from './components/TargetSnapshotCard.jsx';
import { LogsPanel } from './components/LogsPanel.jsx';
import { JsonPanel } from './components/JsonPanel.jsx';
import { APP_CONFIG } from './config/appConfig.js';
import { useCameraStream } from './hooks/useCameraStream.js';
import { useWebSocketDetection } from './hooks/useWebSocketDetection.js';
import { useAuthorizationFlow } from './hooks/useAuthorizationFlow.js';
import { drawDetectionScene } from './utils/drawDetectionScene.js';
import { fetchBackendHealth } from './services/recognitionApi.js';

// Import PIN flow hook and components (MOVED TO TOP)
import { useAuthToPinFlow } from './hooks/useAuthToPinFlow.js';
import { PinVerificationView, PinSuccessView } from './components/PinVerificationView.jsx';

// Dashboard import (ADD THIS LINE)
import { StudentDashboard } from './components/StudentDashboard.jsx';

function buildTargetKey(detection) {
  if (!detection) return '';
  if (detection.target_id) return detection.target_id;
  const bbox = detection.bbox || {};
  return `bbox:${Math.round(bbox.x || 0)}:${Math.round(bbox.y || 0)}:${Math.round(
    bbox.width || 0
  )}:${Math.round(bbox.height || 0)}`;
}

export default function App() {
  const [intervalMs, setIntervalMs] = useState(APP_CONFIG.intervalMs);
  const [detectionEnabled, setDetectionEnabled] = useState(true);
  const [detections, setDetections] = useState([]);
  const [lastDetectResponse, setLastDetectResponse] = useState(null);
  const [logs, setLogs] = useState([]);
  const [health, setHealth] = useState(null);
  const [healthError, setHealthError] = useState('');
  const overlayRef = useRef(null);

  const pushLog = useCallback((message) => {
    setLogs((previous) => [
      `${new Date().toLocaleTimeString()} — ${message}`,
      ...previous,
    ].slice(0, 12));
  }, []);

  const {
    videoRef,
    captureCanvasRef,
    cameraState,
    startCamera,
    stopCamera,
    captureFrameBlob,
  } = useCameraStream({
    idealWidth: APP_CONFIG.idealWidth,
    idealHeight: APP_CONFIG.idealHeight,
    imageType: APP_CONFIG.imageType,
    jpegQuality: APP_CONFIG.jpegQuality,
    onLog: pushLog,
  });

  const {
    authState,
    authResult,
    requestAuthorization,
    resetAuthorization,
  } = useAuthorizationFlow({
    authorizeUrl: APP_CONFIG.authorizeUrl,
    cameraId: APP_CONFIG.cameraId,
    captureFrameBlob,
    onLog: pushLog,
  });

  // ✅ NEW: Initialize PIN flow hook (INSIDE component, before return)
  const {
    currentView,
    pin,
    pinBusy,
    pinError,
    sensitiveToken,
    student,
    setPin,
    handlePinSubmit,
    handleBackToCamera,
    resetFlow,
  } = useAuthToPinFlow({
    authResult,
    authState,
    pinVerifyEndpoint: APP_CONFIG.pinVerifyUrl,
    onLog: pushLog,
  });

  const handleDetectionResult = useCallback(
    (result) => {
      const nextDetections = Array.isArray(result.detections) ? result.detections : [];
      setDetections(nextDetections);
      setLastDetectResponse(result);
      if (nextDetections.length > 0) {
        pushLog(`Tracking ${nextDetections.length} target(s).`);
      }
    },
    [pushLog]
  );

  const handleDetectionError = useCallback(
    (error) => {
      setDetections([]);
      pushLog(`Detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
    [pushLog]
  );

  const { detectState, scanNow } = useWebSocketDetection({
    wsUrl: APP_CONFIG.wsDetectUrl,
    enabled: detectionEnabled && cameraState === 'streaming',
    cameraId: APP_CONFIG.cameraId,
    captureFrameBlob,
    onResult: handleDetectionResult,
    onError: handleDetectionError,
    onLog: pushLog,
  });

  const primaryDetection = detections[0] || null;
  const currentTargetKey = buildTargetKey(primaryDetection);

  useEffect(() => {
    if (!primaryDetection) {
      resetAuthorization();
      return;
    }
    // Don't re-trigger auth if already on PIN screen
    if (currentView === 'pin-verification') return;
    
    requestAuthorization({
      targetKey: currentTargetKey,
      targetId: primaryDetection.target_id,
    });
  }, [currentTargetKey, primaryDetection, requestAuthorization, resetAuthorization, currentView]);

  useEffect(() => {
    let active = true;
    async function loadHealth() {
      try {
        const result = await fetchBackendHealth(APP_CONFIG.healthUrl);
        if (!active) return;
        setHealth(result);
        setHealthError('');
      } catch (error) {
        if (!active) return;
        setHealth(null);
        setHealthError(error instanceof Error ? error.message : 'Health check failed');
      }
    }
    loadHealth();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let frameHandle = 0;
    
    const render = (now) => {

      if (cameraState !== 'streaming' || !videoRef.current?.videoWidth) {
        if (overlayRef.current) {
          const ctx = overlayRef.current.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
          }
        }
        frameHandle = window.requestAnimationFrame(render);
        return;
      }
      
      drawDetectionScene({
        canvas: overlayRef.current,
        video: videoRef.current,
        detections,
        authState,
        authResult,
        nowMs: now,
      });
      
      frameHandle = window.requestAnimationFrame(render);
    };
    
    frameHandle = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(frameHandle);
  }, [authResult, authState, detections, videoRef, cameraState]);


  useEffect(() => {
    // Auto-stop camera when dashboard is shown (privacy + resource cleanup)
    if (currentView === 'dashboard') {
      stopCamera();
    }
  }, [currentView, stopCamera]);


  const layoutStyle = useMemo(
    () => ({
      minHeight: '100vh',
      background: 'radial-gradient(circle at top, #0f172a 0%, #020617 55%)',
      padding: 24,
    }),
    []
  );

  
// ✅ SINGLE, COMBINED RETURN STATEMENT
  return (
    <div style={layoutStyle}>
      
      {/* 🔹 EARLY RETURN: If on dashboard, render ONLY the dashboard */}
      {currentView === 'dashboard' && sensitiveToken && student ? (
        <StudentDashboard
          token={sensitiveToken}
          studentId={student.id_etudiant || student.id}
          apiBaseUrl={APP_CONFIG.apiBaseUrl || '/api'}
          onLogout={() => {
            resetFlow(); // Clear auth state
            // No need to setCurrentView here since early return handles navigation
          }}
        />
      ) : (
        /* 🔹 Otherwise, render the camera dashboard + overlays */
        <>
          {/* 👇 Main camera dashboard */}
          <div style={gridStyle}>
            <div>
              <CameraPanel
                videoRef={videoRef}
                overlayRef={overlayRef}
                cameraState={cameraState}
                detectState={detectState}
                authState={authState}
                authResult={authResult}
                hasDetection={detections.length > 0}
                onStartCamera={startCamera}
                onStopCamera={stopCamera}
                onToggleDetection={() => setDetectionEnabled((previous) => !previous)}
                detectionEnabled={detectionEnabled}
                onScanNow={scanNow}
              />
              <canvas ref={captureCanvasRef} style={{ display: 'none' }} />
            </div>

            {/* <div style={{ display: 'grid', gap: 16 }}>
              <TargetSnapshotCard detection={primaryDetection} authResult={authResult} />
              <JsonPanel title="Last detection response" data={lastDetectResponse} emptyText="No detection response yet." />
              <JsonPanel title="Last authorization response" data={authResult} emptyText="No authorization response yet." />
              <JsonPanel
                title="Client settings"
                data={{
                  detectUrl: APP_CONFIG.detectUrl,
                  authorizeUrl: APP_CONFIG.authorizeUrl,
                  healthUrl: APP_CONFIG.healthUrl,
                  intervalMs,
                }}
                emptyText="No settings."
              />
              <LogsPanel logs={logs} />
            </div> */}
          </div>

          {/* 👇 PIN Verification Overlay - ONLY renders when currentView matches */}
          {currentView === 'pin-verification' && (
            <PinVerificationView
              student={student}
              pin={pin}
              pinBusy={pinBusy}
              pinError={pinError}
              onPinChange={setPin}
              onPinSubmit={handlePinSubmit}
              onBack={handleBackToCamera}
            />
          )}

          {currentView === 'success' && (
            <PinSuccessView onContinue={resetFlow} />
          )}

          {/* Optional debug: show token */}
          {sensitiveToken && currentView !== 'dashboard' && (
            <JsonPanel title="Sensitive Token" data={{ token: `${sensitiveToken.slice(0, 24)}...` }} />
          )}
        </>
      )}
    </div>
  );
}

// ✅ Module-level constant (OK outside component)
const gridStyle = {
  maxWidth: 1480,
  margin: '0 auto',
  display: 'grid',
  gridTemplateColumns: '1.45fr 0.8fr',
  gap: 24,
};

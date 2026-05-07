import { useCallback, useEffect, useRef, useState } from 'react';
import { CameraPanel } from './components/CameraPanel.jsx';
import { GesturePinStage } from './components/GesturePinStage.jsx';
import { SecureAccessView } from './components/SecureAccessView.jsx';
import { APP_CONFIG } from './config/appConfig.js';
import { useCameraStream } from './hooks/useCameraStream.js';
import { useWebSocketDetection } from './hooks/useWebSocketDetection.js';
import { useAuthorizationFlow } from './hooks/useAuthorizationFlow.js';
import { useAuthToPinFlow } from './hooks/useAuthToPinFlow.js';
import { useGesturePinWebSocket } from './hooks/useGesturePinWebSocket.js';
import { drawDetectionScene } from './utils/drawDetectionScene.js';
import { fetchBackendHealth } from './services/recognitionApi.js';
import './styles/accessCamera.css';

function buildTargetKey(detection) {
  if (!detection) return '';
  if (detection.target_id) return detection.target_id;

  const bbox = detection.bbox || {};
  return `bbox:${Math.round(bbox.x || 0)}:${Math.round(bbox.y || 0)}:${Math.round(bbox.width || 0)}:${Math.round(bbox.height || 0)}`;
}

export default function App() {
  const [detectionEnabled, setDetectionEnabled] = useState(true);
  const [detections, setDetections] = useState([]);
  const [lastDetectResponse, setLastDetectResponse] = useState(null);
  const [logs, setLogs] = useState([]);
  const [health, setHealth] = useState(null);
  const [healthError, setHealthError] = useState('');
  const [accessFlash, setAccessFlash] = useState('');

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
    pinVerifyEndpoint: APP_CONFIG.pinVerifyUrl || '/auth/pin/verify',
    onLog: pushLog,
  });

  const handleDetectionResult = useCallback((result) => {
    const nextDetections = Array.isArray(result.detections) ? result.detections : [];
    setDetections(nextDetections);
    setLastDetectResponse(result);

    if (nextDetections.length > 0) {
      pushLog(`Pursuing ${nextDetections.length} detected target(s).`);
    }
  }, [pushLog]);

  const handleDetectionError = useCallback(
    (error) => {
      setDetections([]);
      pushLog(`Detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
    [pushLog]
  );

  const detectEnabledForView =
    detectionEnabled &&
    cameraState === 'streaming' &&
    currentView !== 'data-dashboard';

  const { detectState, scanNow } = useWebSocketDetection({
    wsUrl: APP_CONFIG.wsDetectUrl,
    enabled: detectEnabledForView,
    cameraId: APP_CONFIG.cameraId,
    captureFrameBlob,
    onResult: handleDetectionResult,
    onError: handleDetectionError,
    onLog: pushLog,
  });

  const { gestureState, gestureResult } = useGesturePinWebSocket({
    wsUrl: APP_CONFIG.gesturePinWsUrl,
    enabled: currentView === 'pin-verification' && cameraState === 'streaming',
    videoRef,
    frameWidth: APP_CONFIG.gesturePinFrameWidth,
    frameHeight: APP_CONFIG.gesturePinFrameHeight,
    imageType: APP_CONFIG.imageType,
    jpegQuality: APP_CONFIG.gesturePinJpegQuality,
    fps: APP_CONFIG.gesturePinFps,
    onLog: pushLog,
  });

  const primaryDetection = detections[0] || null;
  const currentTargetKey = buildTargetKey(primaryDetection);

  useEffect(() => {
    if (cameraState === 'idle' || cameraState === 'stopped') {
      startCamera();
    }
  }, [cameraState, startCamera]);

useEffect(() => {
  if (currentView !== 'camera') return;
  if (authState === 'pending') return;
  if (authState === 'denied') return;
  if (accessFlash === 'denied') return;
  if (!primaryDetection) {
    resetAuthorization();
    return;
  }

    requestAuthorization({
      targetKey: `${currentTargetKey}:${Date.now()}`,
      targetId: primaryDetection.target_id,
    });
}, [
  accessFlash,
  authState,
  currentTargetKey,
  currentView,
  primaryDetection,
  requestAuthorization,
  resetAuthorization,
]);

  useEffect(() => {
    if (authState === 'denied') {
      setAccessFlash('denied');
      setDetectionEnabled(false);

      const timer = window.setTimeout(() => {
        setAccessFlash('');
        setDetections([]);
        setLastDetectResponse(null);
        resetAuthorization();
        setDetectionEnabled(true);
      }, 2000);

      return () => window.clearTimeout(timer);
    }

    if (authState === 'success' && authResult?.authorized) {
      setAccessFlash('authorized');

      const timer = window.setTimeout(() => {
        setAccessFlash('');
      }, 1000);

      return () => window.clearTimeout(timer);
    }
  }, [authResult, authState, resetAuthorization]);

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
  }, [authResult, authState, cameraState, detections, videoRef]);

  const inPinFlow =
    currentView === 'authorized-pause' ||
    currentView === 'pin-verification' ||
    currentView === 'success';

  const inSecureData =
    currentView === 'data-dashboard' &&
    sensitiveToken &&
    student;

  return (
    <div className={`access-app view-${currentView}`}>
      <div className="background-grid" aria-hidden="true" />

      <div className={`camera-anchor ${inSecureData ? 'mini-anchor' : ''}`}>
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
          mode={inSecureData ? 'mini' : 'full'}
          accessFlash={accessFlash}
        >
          {inPinFlow && (
            <GesturePinStage
              active={currentView === 'pin-verification'}
              student={student}
              authResult={authResult}
              pin={pin}
              pinBusy={pinBusy}
              pinError={pinError}
              gestureState={gestureState}
              gestureResult={gestureResult}
              onPinChange={setPin}
              onPinSubmit={handlePinSubmit}
              onBack={handleBackToCamera}
            />
          )}
        </CameraPanel>

        <canvas ref={captureCanvasRef} style={{ display: 'none' }} />
      </div>

      {inSecureData && (
        <SecureAccessView
          token={sensitiveToken}
          student={student}
          pin={pin}
          authResult={authResult}
          apiBaseUrl={APP_CONFIG.apiBaseUrl || '/api'}
          onLogout={() => {
            resetFlow();
            resetAuthorization();
            setDetections([]);
          }}
        />
      )}
    </div>
  );
}

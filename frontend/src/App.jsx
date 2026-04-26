import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CameraPanel } from './components/CameraPanel.jsx';
import { TargetSnapshotCard } from './components/TargetSnapshotCard.jsx';
import { LogsPanel } from './components/LogsPanel.jsx';
import { JsonPanel } from './components/JsonPanel.jsx';
import { APP_CONFIG } from './config/appConfig.js';
import { useCameraStream } from './hooks/useCameraStream.js';
import { useDetectionPolling } from './hooks/useDetectionPolling.js';
import { useAuthorizationFlow } from './hooks/useAuthorizationFlow.js';
import { drawDetectionScene } from './utils/drawDetectionScene.js';
import { fetchBackendHealth } from './services/recognitionApi.js';

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

  const { detectState, scanNow } = useDetectionPolling({
    detectUrl: APP_CONFIG.detectUrl,
    intervalMs,
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

    requestAuthorization({
      targetKey: currentTargetKey,
      targetId: primaryDetection.target_id,
    });
  }, [currentTargetKey, primaryDetection, requestAuthorization, resetAuthorization]);

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
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let frameHandle = 0;

    const render = (now) => {
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
  }, [authResult, authState, detections, videoRef]);

  const layoutStyle = useMemo(
    () => ({
      minHeight: '100vh',
      background: 'radial-gradient(circle at top, #0f172a 0%, #020617 55%)',
      padding: 24,
    }),
    []
  );

  return (
    <div style={layoutStyle}>
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

         <div style={{ display: 'grid', gap: 16 }}>
          <TargetSnapshotCard detection={primaryDetection} authResult={authResult} />
          {/*<JsonPanel
            title="Backend health"
            data={health || (healthError ? { error: healthError } : null)}
            emptyText="No health response yet."
          />*/}
          <JsonPanel
            title="Last detection response"
            data={lastDetectResponse}
            emptyText="No detection response yet."
          />
          <JsonPanel
            title="Last authorization response"
            data={authResult}
            emptyText="No authorization response yet."
          />
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
        </div>
      </div>
    </div>
  );
}

const gridStyle = {
  maxWidth: 1480,
  margin: '0 auto',
  display: 'grid',
  gridTemplateColumns: '1.45fr 0.8fr',
  gap: 24,
};
import { AuthStatusBanner } from './AuthStatusBanner.jsx';
import { ControlButton } from './ControlButton.jsx';
import { StatusBadge } from './StatusBadge.jsx';

export function CameraPanel({
  videoRef,
  overlayRef,
  cameraState,
  detectState,
  authState,
  hasDetection,
  authResult,
  onStartCamera,
  onStopCamera,
  onToggleDetection,
  detectionEnabled,
  onScanNow,
}) {
  return (
    <section style={panelStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28 }}>Target tracking + authorization</h1>
          <p style={{ margin: '8px 0 0', color: '#94a3b8' }}>
            First request tracks the target. Second request decides authorized or denied.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <StatusBadge label="Camera" value={cameraState} />
          {/* <StatusBadge label="Detect" value={detectState} /> */}
          <StatusBadge label="Auth" value={authState} />
        </div>
      </div>

      <div style={cameraShellStyle}>
        <video ref={videoRef} autoPlay playsInline muted style={videoStyle} />
        <canvas ref={overlayRef} style={canvasStyle} />
        <AuthStatusBanner authState={authState} authResult={authResult} hasDetection={hasDetection} />
      </div>

      <div style={actionsStyle}>
        <ControlButton primary onClick={onStartCamera}>Start camera</ControlButton>
        <ControlButton onClick={onStopCamera}>Stop camera</ControlButton>
        <ControlButton onClick={onToggleDetection}>
          {detectionEnabled ? 'Pause detection' : 'Resume detection'}
        </ControlButton>
        <ControlButton onClick={onScanNow}>Detect now</ControlButton>
      </div>
    </section>
  );
}

const panelStyle = {
  background: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: 24,
  padding: 20,
  boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
};
const headerStyle = { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 16 };
const cameraShellStyle = {
  position: 'relative',
  width: '100%',
  aspectRatio: '16 / 9',
  background: '#000',
  borderRadius: 24,
  border: '1px solid #1e293b',
};
const videoStyle = { width: '100%', height: '100%', objectFit: 'contain', display: 'block' };
const canvasStyle = { position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' };
const actionsStyle = { display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginTop: 16 };

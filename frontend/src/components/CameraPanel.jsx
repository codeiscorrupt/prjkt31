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
  mode = 'full',
  accessFlash = '',
  children,
}) {
  return (
    <section className={`camera-panel camera-panel-${mode} ${accessFlash ? `access-${accessFlash}` : ''}`}>
      <div className="camera-stage">
        <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
        <canvas ref={overlayRef} className="camera-overlay" />

        {accessFlash === 'denied' && (
          <div className="access-flash-message denied">Access denied</div>
        )}
        {accessFlash === 'authorized' && (
          <div className="access-flash-message authorized">Authorized access</div>
        )}

        {children}
      </div>
    </section>
  );
}

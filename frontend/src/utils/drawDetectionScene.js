// utils/drawDetectionScene.js

function getContainRect(videoElement) {
  const containerWidth = videoElement.clientWidth;
  const containerHeight = videoElement.clientHeight;
  const sourceWidth = videoElement.videoWidth || containerWidth;
  const sourceHeight = videoElement.videoHeight || containerHeight;

  if (!containerWidth || !containerHeight || !sourceWidth || !sourceHeight) return null;

  const sourceAspect = sourceWidth / sourceHeight;
  const containerAspect = containerWidth / containerHeight;

  let renderedWidth, renderedHeight, offsetX = 0, offsetY = 0;

  if (sourceAspect > containerAspect) {
    renderedWidth = containerWidth;
    renderedHeight = containerWidth / sourceAspect;
    offsetY = (containerHeight - renderedHeight) / 2;
  } else {
    renderedHeight = containerHeight;
    renderedWidth = containerHeight * sourceAspect;
    offsetX = (containerWidth - renderedWidth) / 2;
  }

  return { offsetX, offsetY, renderedWidth, renderedHeight, sourceWidth, sourceHeight };
}

function getVisualState(authState, authResult) {
  if (authState === 'success' && authResult?.authorized) {
    return { stroke: '#22c55e', fill: 'rgba(34, 197, 94, 0.12)', label: 'TARGET RECOGNIZED', labelBackground: '#22c55e', scan: false };
  }
  if (authState === 'denied' || (authState === 'error' && authResult)) {
    return { stroke: '#ef4444', fill: 'rgba(239, 68, 68, 0.12)', label: 'ACCESS DENIED', labelBackground: '#ef4444', scan: false };
  }
  if (authState === 'loading') {
    return { stroke: '#f59e0b', fill: 'rgba(245, 158, 11, 0.12)', label: 'AUTHORIZING...', labelBackground: '#f59e0b', scan: true };
  }
  return { stroke: '#38bdf8', fill: 'rgba(56, 189, 248, 0.10)', label: 'TRACKING TARGET', labelBackground: '#38bdf8', scan: true };
}

function drawTargetBox(ctx, x, y, width, height, visualState) {
  const corner = 28;
  ctx.strokeStyle = visualState.stroke;
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.moveTo(x, y + corner); ctx.lineTo(x, y); ctx.lineTo(x + corner, y);
  ctx.moveTo(x + width - corner, y); ctx.lineTo(x + width, y); ctx.lineTo(x + width, y + corner);
  ctx.moveTo(x, y + height - corner); ctx.lineTo(x, y + height); ctx.lineTo(x + corner, y + height);
  ctx.moveTo(x + width - corner, y + height); ctx.lineTo(x + width, y + height); ctx.lineTo(x + width, y + height - corner);
  ctx.stroke();

  ctx.strokeRect(x, y, width, height);
  ctx.fillStyle = visualState.fill;
  ctx.fillRect(x, y, width, height);
}

function drawScanBar(ctx, x, y, width, height, nowMs, color) {
  const cycle = 1800;
  const progress = (nowMs % cycle) / cycle;
  const pingPong = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
  const barY = y + pingPong * height;

  const gradient = ctx.createLinearGradient(x, barY - 12, x, barY + 12);
  gradient.addColorStop(0, 'rgba(255,255,255,0)');
  gradient.addColorStop(0.5, color);
  gradient.addColorStop(1, 'rgba(255,255,255,0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(x + 4, barY - 12, Math.max(0, width - 8), 24);
}

export function drawDetectionScene({
  canvas,
  video,
  detections = [],
  authState = 'idle',
  authResult = null,
  mode = 'full',
  nowMs = performance.now(),
}) {
  if (!canvas || !video) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = video.clientWidth;
  const height = video.clientHeight;
  if (!width || !height) return;

  if (mode === 'mini') {
    ctx.clearRect(0, 0, width, height); // Clear any previous drawings whan camera panel mode is mini
    return;
  }

  // 🖼️ High-DPI support & resize guard (prevents flicker & CPU thrashing)
  const dpr = window.devicePixelRatio || 1;
  const targetW = Math.round(width * dpr);
  const targetH = Math.round(height * dpr);

  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const rect = getContainRect(video);
  if (!rect) return;

  const scaleX = rect.renderedWidth / rect.sourceWidth;
  const scaleY = rect.renderedHeight / rect.sourceHeight;

  const primary = detections[0];
  if (!primary) return;

  const bbox = primary.bbox || {};
  const x = rect.offsetX + Number(bbox.x || 0) * scaleX;
  const y = rect.offsetY + Number(bbox.y || 0) * scaleY;
  const boxWidth = Number(bbox.width || 0) * scaleX;
  const boxHeight = Number(bbox.height || 0) * scaleY;

  const visualState = getVisualState(authState, authResult);
  drawTargetBox(ctx, x, y, boxWidth, boxHeight, visualState);

  if (visualState.scan) {
    drawScanBar(ctx, x, y, boxWidth, boxHeight, nowMs, visualState.stroke);
  }

  // 🏷️ Labels
  const label = visualState.label;
  ctx.font = '700 14px Arial';
  const labelWidth = ctx.measureText(label).width + 22;
  const labelHeight = 30;
  const labelX = x;
  const labelY = Math.max(10, y - 40);

  ctx.fillStyle = visualState.labelBackground;
  ctx.fillRect(labelX, labelY, labelWidth, labelHeight);
  ctx.fillStyle = '#020617';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, labelX + 11, labelY + labelHeight / 2);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '12px Arial';
  ctx.fillText('Tracking person', x, Math.min(rect.offsetY + rect.renderedHeight - 12, y + boxHeight + 18));
}
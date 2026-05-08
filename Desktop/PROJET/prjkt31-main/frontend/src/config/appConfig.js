const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  '/api';

const WS_PROTOCOL =
  window.location.protocol === 'https:' ? 'wss' : 'ws';

const WS_BASE =
  import.meta.env.VITE_WS_BASE_URL ||
  `${WS_PROTOCOL}://${window.location.host}/api`;

export const APP_CONFIG = {
  detectUrl: `${API_BASE}/detect`,
  authorizeUrl: `${API_BASE}/authorize`,
  healthUrl: `${API_BASE}/health`,
  pinVerifyUrl: `${API_BASE}/auth/pin/verify`,

  intervalMs: 700,
  jpegQuality: 0.82,
  imageType: 'image/jpeg',
  cameraId: 'webcam-1',
  idealWidth: 1280,
  idealHeight: 720,

  wsDetectUrl: `${WS_BASE}/ws/detect`,
  gesturePinWsUrl: `${WS_BASE}/ws/gesture-pin`,

  gesturePinFrameWidth: 416,
  gesturePinFrameHeight: 312,
  gesturePinJpegQuality: 0.62,
  gesturePinFps: 18,
};
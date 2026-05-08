const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  '/api';

<<<<<<< HEAD
const WS_PROTOCOL =
  window.location.protocol === 'https:' ? 'wss' : 'ws';

const WS_BASE =
  import.meta.env.VITE_WS_BASE_URL ||
  `${WS_PROTOCOL}://${window.location.host}/api`;

=======
>>>>>>> bcc8c0c454eee9ac371939774e96b642ec9f5247
export const APP_CONFIG = {
  detectUrl: `${API_BASE}/detect`,
  authorizeUrl: `${API_BASE}/authorize`,
  healthUrl: `${API_BASE}/health`,
  pinVerifyUrl: `${API_BASE}/auth/pin/verify`,
<<<<<<< HEAD

=======
>>>>>>> bcc8c0c454eee9ac371939774e96b642ec9f5247
  intervalMs: 700,
  jpegQuality: 0.82,
  imageType: 'image/jpeg',
  cameraId: 'webcam-1',
  idealWidth: 1280,
  idealHeight: 720,
<<<<<<< HEAD

  wsDetectUrl: `${WS_BASE}/ws/detect`,
  gesturePinWsUrl: `${WS_BASE}/ws/gesture-pin`,

  gesturePinFrameWidth: 416,
  gesturePinFrameHeight: 312,
  gesturePinJpegQuality: 0.62,
  gesturePinFps: 18,
=======
  wsDetectUrl : 'ws://localhost:8000/ws/detect',
  gesturePinWsUrl: 'ws://localhost:8000/ws/gesture-pin',
  gesturePinFrameWidth: 416,
  gesturePinFrameHeight: 312,
  gesturePinJpegQuality: 0.62,
  gesturePinFps: 18
  
>>>>>>> bcc8c0c454eee9ac371939774e96b642ec9f5247
};
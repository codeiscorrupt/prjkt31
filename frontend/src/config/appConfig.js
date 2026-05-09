// frontend/src/config/appConfig.js

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "/api";

// Derive WebSocket base from current page location
// Works on localhost (ws://) and production HTTPS (wss://) automatically
const WS_BASE = (() => {
  if (import.meta.env.VITE_WS_BASE_URL) return import.meta.env.VITE_WS_BASE_URL;
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.host}`;
})();

export const APP_CONFIG = {
  detectUrl:    `${API_BASE}/detect`,
  authorizeUrl: `${API_BASE}/authorize`,
  healthUrl:    `${API_BASE}/health`,
  pinVerifyUrl: `${API_BASE}/auth/pin/verify`,
  apiBaseUrl:   API_BASE,

  // WebSocket URLs — derived from current host, not hardcoded
  wsDetectUrl:    `${WS_BASE}/ws/detect`,
  gesturePinWsUrl:`${WS_BASE}/ws/gesture-pin`,

  intervalMs:   700,
  jpegQuality:  0.82,
  imageType:    "image/jpeg",
  cameraId:     "webcam-1",

  idealWidth:   960,
  idealHeight:  540,

  gesturePinFps:         10,   // was duplicated as 18 then 10 — keeping 10
  gesturePinFrameWidth:  320,
  gesturePinFrameHeight: 240,
  gesturePinJpegQuality: 0.5,
};
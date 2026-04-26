const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  '/api';

export const APP_CONFIG = {
  detectUrl: `${API_BASE}/detect`,
  authorizeUrl: `${API_BASE}/authorize`,
  healthUrl: `${API_BASE}/health`,
  intervalMs: 700,
  jpegQuality: 0.82,
  imageType: 'image/jpeg',
  cameraId: 'webcam-1',
  idealWidth: 1280,
  idealHeight: 720,
};
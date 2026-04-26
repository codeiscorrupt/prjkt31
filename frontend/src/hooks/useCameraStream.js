import { useCallback, useEffect, useRef, useState } from 'react';

function blobFromCanvas(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to create image blob from canvas.'));
      }
    }, type, quality);
  });
}

export function useCameraStream({ idealWidth, idealHeight, imageType, jpegQuality, onLog }) {
  const videoRef = useRef(null);
  const captureCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraState, setCameraState] = useState('idle');
  const [videoReady, setVideoReady] = useState(false);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraState('stopped');
    setVideoReady(false);
  }, []);

const startCamera = useCallback(async () => {
  try {
    stopCamera();
    setCameraState('requesting');

    const hasMediaDevices =
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function';

    const isSecure =
      window.isSecureContext ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    if (!isSecure) {
      throw new Error('Camera is blocked because this page is not HTTPS.');
    }

    if (!hasMediaDevices) {
      throw new Error('This browser cannot access camera APIs here.');
    }

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: idealWidth },
          height: { ideal: idealHeight },
        },
        audio: false,
      });
    } catch {
      stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
    }

    streamRef.current = stream;
    const video = videoRef.current;
    if (!video) throw new Error('Video element is missing.');

    video.srcObject = stream;
    await video.play();

    setCameraState('streaming');
    setVideoReady(true);
    onLog('Camera started successfully.');
  } catch (error) {
    setCameraState('error');
    setVideoReady(false);
    onLog(error instanceof Error ? error.message : 'Unknown camera error');
  }
}, [idealWidth, idealHeight, onLog, stopCamera]);

  const captureFrameBlob = useCallback(async () => {
    const video = videoRef.current;
    const canvas = captureCanvasRef.current;

    if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
      return null;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas context is unavailable.');
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return blobFromCanvas(canvas, imageType, jpegQuality);
  }, [imageType, jpegQuality]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  return {
    videoRef,
    captureCanvasRef,
    cameraState,
    videoReady,
    startCamera,
    stopCamera,
    captureFrameBlob,
  };
}

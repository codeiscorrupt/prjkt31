import { useCallback, useEffect, useRef, useState } from 'react';

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

export function useGesturePinWebSocket({
  wsUrl,
  enabled,
  videoRef,
  frameWidth = 416,
  frameHeight = 312,
  imageType = 'image/jpeg',
  jpegQuality = 0.62,
  fps = 18,
  onLog,
}) {
  const wsRef = useRef(null);
  const timerRef = useRef(null);
  const canvasRef = useRef(null);
  const enabledRef = useRef(enabled);
  const [gestureState, setGestureState] = useState('idle');
  const [gestureResult, setGestureResult] = useState({
    hand_detected: false,
    gesture: 'unknown',
    cursor: null,
    click: false,
    confidence: 0,
  });

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const captureGestureFrame = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return null;

    if (!canvasRef.current) canvasRef.current = document.createElement('canvas');
    const canvas = canvasRef.current;
    canvas.width = frameWidth;
    canvas.height = frameHeight;

    const context = canvas.getContext('2d', { willReadFrequently: false });
    if (!context) return null;

    context.drawImage(video, 0, 0, frameWidth, frameHeight);
    return canvasToBlob(canvas, imageType, jpegQuality);
  }, [frameHeight, frameWidth, imageType, jpegQuality, videoRef]);

  const sendOneFrame = useCallback(async () => {
    if (!enabledRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    try {
      const blob = await captureGestureFrame();
      if (blob) wsRef.current.send(await blob.arrayBuffer());
    } catch (error) {
      onLog?.(`Gesture frame error: ${error.message}`);
    }
  }, [captureGestureFrame, onLog]);

  const scheduleNextFrame = useCallback(() => {
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(async () => {
      await sendOneFrame();
      scheduleNextFrame();
    }, Math.max(16, Math.round(1000 / fps)));
  }, [fps, sendOneFrame]);

  useEffect(() => {
    if (!enabled || !wsUrl) {
      window.clearTimeout(timerRef.current);
      setGestureState('idle');
      return;
    }

    const ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;
    setGestureState('connecting');

    ws.onopen = () => {
      setGestureState('connected');
      onLog?.('Gesture PIN websocket connected.');
      sendOneFrame();
      scheduleNextFrame();
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const fallbackCursor =
          payload.cursor ||
          (payload.cursor_x !== undefined && payload.cursor_y !== undefined
            ? { x: payload.cursor_x, y: payload.cursor_y }
            : null);

        setGestureResult({
          hand_detected: Boolean(payload.hand_detected || payload.hand_present),
          gesture: payload.gesture || (payload.is_closed ? 'closed' : 'unknown'),
          cursor: fallbackCursor,
          click: Boolean(payload.click),
          confidence: Number(payload.confidence || 0),
          error: payload.error || '',
        });
        setGestureState('tracking');
      } catch (error) {
        onLog?.(`Gesture result parse error: ${error.message}`);
      }
    };

    ws.onerror = () => {
      setGestureState('error');
      onLog?.('Gesture PIN websocket error.');
    };

    ws.onclose = () => {
      window.clearTimeout(timerRef.current);
      setGestureState('idle');
    };

    return () => {
      window.clearTimeout(timerRef.current);
      ws.close();
      if (wsRef.current === ws) wsRef.current = null;
    };
  }, [enabled, onLog, scheduleNextFrame, sendOneFrame, wsUrl]);

  return { gestureState, gestureResult };
}
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
  frameWidth = 320,
  frameHeight = 240,
  imageType = 'image/jpeg',
  jpegQuality = 0.5,
  fps = 12,
  onLog,
}) {
  const wsRef = useRef(null);
  const canvasRef = useRef(null);
  const stoppedRef = useRef(false);
  const enabledRef = useRef(enabled);
  const inFlightRef = useRef(false);
  const nextTimerRef = useRef(null);

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

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }

    const canvas = canvasRef.current;

    if (canvas.width !== frameWidth) canvas.width = frameWidth;
    if (canvas.height !== frameHeight) canvas.height = frameHeight;

    const context = canvas.getContext('2d', { alpha: false });
    if (!context) return null;

    context.drawImage(video, 0, 0, frameWidth, frameHeight);

    return canvasToBlob(canvas, imageType, jpegQuality);
  }, [frameHeight, frameWidth, imageType, jpegQuality, videoRef]);

  const scheduleNextFrame = useCallback((delayMs) => {
    window.clearTimeout(nextTimerRef.current);

    nextTimerRef.current = window.setTimeout(async () => {
      if (
        stoppedRef.current ||
        !enabledRef.current ||
        !wsRef.current ||
        wsRef.current.readyState !== WebSocket.OPEN ||
        inFlightRef.current
      ) {
        return;
      }

      try {
        inFlightRef.current = true;

        const blob = await captureGestureFrame();
        if (!blob) {
          inFlightRef.current = false;
          scheduleNextFrame(120);
          return;
        }

        wsRef.current.send(await blob.arrayBuffer());
      } catch (error) {
        inFlightRef.current = false;
        onLog?.(`Gesture frame error: ${error.message}`);
        scheduleNextFrame(250);
      }
    }, delayMs);
  }, [captureGestureFrame, onLog]);

  useEffect(() => {
    if (!enabled || !wsUrl) {
      stoppedRef.current = true;
      window.clearTimeout(nextTimerRef.current);
      setGestureState('idle');
      return;
    }

    stoppedRef.current = false;
    inFlightRef.current = false;

    const ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;
    setGestureState('connecting');

    const frameDelay = Math.max(50, Math.round(1000 / fps));

    ws.onopen = () => {
      setGestureState('connected');
      onLog?.('Gesture PIN websocket connected.');
      scheduleNextFrame(0);
    };

    ws.onmessage = (event) => {
      inFlightRef.current = false;

      try {
        const payload = JSON.parse(event.data);

        if (payload.type === 'gesture_status') {
          setGestureState(payload.error ? 'error' : 'connected');
          scheduleNextFrame(frameDelay);
          return;
        }

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

        setGestureState(payload.error ? 'error' : 'tracking');
      } catch (error) {
        onLog?.(`Gesture result parse error: ${error.message}`);
      } finally {
        scheduleNextFrame(frameDelay);
      }
    };

    ws.onerror = () => {
      inFlightRef.current = false;
      setGestureState('error');
      onLog?.('Gesture PIN websocket error.');
      scheduleNextFrame(500);
    };

    ws.onclose = () => {
      stoppedRef.current = true;
      inFlightRef.current = false;
      window.clearTimeout(nextTimerRef.current);
      setGestureState('idle');
    };

    return () => {
      stoppedRef.current = true;
      inFlightRef.current = false;
      window.clearTimeout(nextTimerRef.current);
      ws.close();
      if (wsRef.current === ws) wsRef.current = null;
    };
  }, [enabled, fps, onLog, scheduleNextFrame, wsUrl]);

  return { gestureState, gestureResult };
}
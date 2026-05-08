import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessDetailsPanel } from './AccessDetailsPanel.jsx';
import { GestureGuidePanel } from './GestureGuidePanel.jsx';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

function clamp01(value) {
  return Math.min(1, Math.max(0, Number(value) || 0));
}

export function GesturePinStage({
  active,
  student,
  authResult,
  pin,
  pinBusy,
  pinError,
  gestureState,
  gestureResult,
  onPinChange,
  onPinSubmit,
  onBack,
}) {
  const buttonRefs = useRef({});
  const lastGestureClickRef = useRef(0);
  const [cursor, setCursor] = useState({ x: 0.5, y: 0.55, visible: false });
  const [pressedKey, setPressedKey] = useState('');

  const cursorActive =
    active &&
    gestureResult?.hand_detected &&
    gestureResult?.cursor &&
    !['unknown', 'unavailable', 'error'].includes(gestureResult?.gesture);

  useEffect(() => {
    if (!cursorActive) {
      setCursor((previous) => ({ ...previous, visible: false }));
      return;
    }

    const nextX = clamp01(gestureResult.cursor.x);
    const nextY = clamp01(gestureResult.cursor.y);

    setCursor((previous) => ({
      x: previous.x + (nextX - previous.x) * 0.4,
      y: previous.y + (nextY - previous.y) * 0.4,
      visible: true,
    }));
  }, [cursorActive, gestureResult]);

  const readKeyUnderCursor = useCallback(() => {
    const stage = document.querySelector('.camera-stage');
    if (!stage) return null;

    const rect = stage.getBoundingClientRect();
    const cursorX = rect.left + cursor.x * rect.width;
    const cursorY = rect.top + cursor.y * rect.height;

    for (const [key, element] of Object.entries(buttonRefs.current)) {
      if (!element) continue;

      const box = element.getBoundingClientRect();
      const inside =
        cursorX >= box.left &&
        cursorX <= box.right &&
        cursorY >= box.top &&
        cursorY <= box.bottom;

      if (inside) return key;
    }

    return null;
  }, [cursor.x, cursor.y]);

  const clickKey = useCallback((key) => {
    if (!key || pinBusy) return;

    setPressedKey(key);
    window.setTimeout(() => setPressedKey(''), 160);

    if (key === 'clear') {
      onPinChange(pin.slice(0, -1));
      return;
    }

    if (key === 'ok') {
      onPinSubmit(pin);
      return;
    }

    if (pin.length >= 4) return;
    onPinChange(`${pin}${key}`);
  }, [onPinChange, onPinSubmit, pin, pinBusy]);

  useEffect(() => {
    if (!active || !gestureResult?.click) return;

    const now = Date.now();
    if (now - lastGestureClickRef.current < 520) return;
    lastGestureClickRef.current = now;

    const key = readKeyUnderCursor();
    if (key) clickKey(key);
  }, [active, clickKey, gestureResult?.click, readKeyUnderCursor]);

  if (!active) return null;

  return (
    <div className="gesture-pin-stage">
      <div className="side-blur-panel left-panel">
        <AccessDetailsPanel student={student} authResult={authResult} />
      </div>

      <div className="clear-camera-window" aria-hidden="true" />

      <div className="side-blur-panel right-panel">
        <GestureGuidePanel active={active} />
      </div>

      <div
        className={`stage-cursor ${cursor.visible ? 'visible' : ''} ${gestureResult?.click ? 'clicking' : ''}`}
        style={{ left: `${cursor.x * 100}%`, top: `${cursor.y * 100}%` }}
        aria-hidden="true"
      />

      <section className="phone-keyboard" aria-label="Gesture PIN keyboard">
        <div className="pin-header">
          <button type="button" onClick={onBack}>←</button>
          <div>
            <strong>Enter your PIN</strong>
            <span>
              {gestureState === 'tracking'
                ? cursorActive
                  ? 'MediaPipe cursor active'
                  : 'Show a closed hand to display cursor'
                : gestureState}
            </span>
          </div>
        </div>

        <div className="pin-dots" aria-label="PIN length">
          {Array.from({ length: Math.max(4, pin.length || 0) }).map((_, index) => (
            <span key={index} className={index < pin.length ? 'filled' : ''} />
          ))}
        </div>

        <div className="phone-key-grid">
          {KEYS.map((key) => (
            <button
              key={key}
              type="button"
              ref={(node) => { buttonRefs.current[key] = node; }}
              className={`phone-key ${pressedKey === key ? 'pressed' : ''}`}
              onClick={() => clickKey(key)}
              disabled={pinBusy}
            >
              {key}
            </button>
          ))}

          <button
            ref={(node) => { buttonRefs.current.clear = node; }}
            type="button"
            className="phone-key utility"
            onClick={() => clickKey('clear')}
            disabled={pinBusy}
          >
            ⌫
          </button>

          <button
            ref={(node) => { buttonRefs.current[0] = node; }}
            type="button"
            className="phone-key"
            onClick={() => clickKey('0')}
            disabled={pinBusy}
          >
            0
          </button>

          <button
            ref={(node) => { buttonRefs.current.ok = node; }}
            type="button"
            className="phone-key ok"
            onClick={() => clickKey('ok')}
            disabled={pinBusy || !pin}
          >
            OK
          </button>
        </div>

        <p className="pin-hint">
          {pinBusy
            ? 'Checking PIN…'
            : cursorActive
              ? 'Move closed hand. Open to click.'
              : 'Waiting for MediaPipe hand detection…'}
        </p>

        {pinError && <p className="pin-error">{pinError}</p>}
      </section>
    </div>
  );
}
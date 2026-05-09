import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessDetailsPanel } from './AccessDetailsPanel.jsx';
import { GestureGuidePanel } from './GestureGuidePanel.jsx';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

function clamp01(value) {
  return Math.min(1, Math.max(0, Number(value) || 0));
}

function getPinStatusText({ gestureState, cursorActive, pinBusy }) {
  if (pinBusy) return 'Vérification du PIN...';
  if (gestureState === 'tracking' && cursorActive) return 'Main détectée. Fermez la main pour bouger, ouvrez pour cliquer.';
  if (gestureState === 'tracking') return 'Montrez une main fermée devant la caméra.';
  if (gestureState === 'connecting') return 'Connexion au suivi de la main...';
  if (gestureState === 'error') return 'Suivi de la main indisponible. Utilisez le clavier.';
  return 'Préparation du contrôle gestuel...';
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
  const stageRef = useRef(null);
  const buttonRefs = useRef({});
  const lastGestureClickRef = useRef(0);
  const rafRef = useRef(0);
  const latestGestureRef = useRef(null);

  const [cursor, setCursor] = useState({ x: 0.5, y: 0.55, visible: false });
  const cursorRef = useRef(cursor);
  const cursorSpeedRef = useRef(0);

  const [pressedKey, setPressedKey] = useState('');

  const cursorActive =
    active &&
    gestureResult?.hand_detected &&
    gestureResult?.cursor &&
    gestureResult?.gesture === 'closed';

  useEffect(() => {
    latestGestureRef.current = gestureResult;
  }, [gestureResult]);

  useEffect(() => {
    if (!active) return;

    const animate = () => {
      const latest = latestGestureRef.current;

      const isActive =
        latest?.hand_detected &&
        latest?.cursor &&
        latest?.gesture === 'closed';

      if (!isActive) {
        if (cursorRef.current.visible) {
          const next = { ...cursorRef.current, visible: false };
          cursorRef.current = next;
          setCursor(next);
        }

        rafRef.current = window.requestAnimationFrame(animate);
        return;
      }

      const targetX = clamp01(latest.cursor.x);
      const targetY = clamp01(latest.cursor.y);

      const previous = cursorRef.current;

      const dx = targetX - previous.x;
      const dy = targetY - previous.y;
      const distance = Math.hypot(dx, dy);

      cursorSpeedRef.current = distance;

      // Ignore tiny jitter.
      if (distance < 0.012) {
        rafRef.current = window.requestAnimationFrame(animate);
        return;
      }

      // Limit max movement per frame to avoid jumps.
      const maxStep = 0.045;
      const limitedDx = distance > maxStep ? (dx / distance) * maxStep : dx;
      const limitedDy = distance > maxStep ? (dy / distance) * maxStep : dy;

      const smoothing =
        distance > 0.18 ? 0.30 :
        distance > 0.08 ? 0.22 :
        0.14;

      const next = {
        x: previous.x + limitedDx * smoothing,
        y: previous.y + limitedDy * smoothing,
        visible: true,
      };

      cursorRef.current = next;
      setCursor(next);

      rafRef.current = window.requestAnimationFrame(animate);
    };

    rafRef.current = window.requestAnimationFrame(animate);

    return () => window.cancelAnimationFrame(rafRef.current);
  }, [active]);

  const readKeyUnderCursor = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return null;

    const rect = stage.getBoundingClientRect();
    const cursorX = rect.left + cursorRef.current.x * rect.width;
    const cursorY = rect.top + cursorRef.current.y * rect.height;

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
  }, []);

  const clickKey = useCallback((key) => {
    if (!key || pinBusy) return;

    setPressedKey(key);
    window.setTimeout(() => setPressedKey(''), 120);

    if (key === 'clear') {
      onPinChange(pin.slice(0, -1));
      return;
    }

    if (key === 'ok') {
      if (pin.length === 4) onPinSubmit(pin);
      return;
    }

    if (pin.length >= 4) return;
    onPinChange(`${pin}${key}`);
  }, [onPinChange, onPinSubmit, pin, pinBusy]);

  useEffect(() => {
    if (!active || !gestureResult?.click) return;

    const now = Date.now();

    // Prevent accidental double-clicks caused by noisy open/closed transitions.
    if (now - lastGestureClickRef.current < 650) return;
    if (cursorSpeedRef.current > 0.08) return;

    lastGestureClickRef.current = now;

    const key = readKeyUnderCursor();
    if (key) clickKey(key);
  }, [active, clickKey, gestureResult?.click, readKeyUnderCursor]);

  const statusText = useMemo(
    () => getPinStatusText({ gestureState, cursorActive, pinBusy }),
    [gestureState, cursorActive, pinBusy]
  );

  if (!active) return null;

  return (
    <div className="gesture-pin-stage" ref={stageRef}>
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
          <button type="button" onClick={onBack} aria-label="Back to camera">←</button>
          <div>
            <strong>Entrer le PIN</strong>
            <span>{statusText}</span>
          </div>
        </div>

        <div className="pin-dots" aria-label={`PIN contains ${pin.length} digits`}>
          {Array.from({ length: 4 }).map((_, index) => (
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
            disabled={pinBusy || pin.length === 0}
            aria-label="Delete last digit"
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
            disabled={pinBusy || pin.length !== 4}
          >
            OK
          </button>
        </div>

        <p className="pin-hint">{statusText}</p>
        {pinError && <p className="pin-error">{pinError}</p>}
      </section>
    </div>
  );
}
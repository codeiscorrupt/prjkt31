# Camera-first gesture PIN update

This update uses the existing frontend project as the initiator. The existing backend routes are kept, and the new gesture backend is added without replacing the current detection/authorization/PIN verification logic.

## Main behavior

1. The app opens with a full-screen camera view that occupies the available space.
2. The existing `/ws/detect` WebSocket keeps sending frames and pursuing detected targets in a sequential send/wait/repeat loop.
3. If authorization is denied, the camera border becomes red for 1 second and an `Access denied` message appears inside the camera frame. After that, detection resumes.
4. If authorization succeeds, the camera border becomes green and shows `Authorized access` for 1 second.
5. After the 1-second authorized state, the screen transitions into gesture PIN mode:
   - left side becomes a blurred panel with details from the backend authorization result
   - middle stays clear camera view
   - phone-style PIN keyboard appears in the middle
   - right side becomes a blurred panel with SVG gesture guide animations
6. The user enters the PIN with hand gestures:
   - open hand then close hand: cursor appears
   - moving closed hand: cursor moves
   - closed hand then open hand: click
   - click `OK` to verify the PIN
7. After PIN verification succeeds, the camera shrinks into the left corner and is visually cropped to show only a small live part of the frame.
8. Protected backend data is displayed in the remaining free space using the backend student endpoints.

## Existing routes unchanged

The feature keeps these existing routes:

```text
/ws/detect
/api/detect
/api/authorize
/api/auth/pin/verify
/api/etudiant/{id}
/api/etudiant/{id}/sensible/notes
/api/etudiant/{id}/sensible/identite
/api/etudiant/{id}/sensible/absences
```

## New backend addition

```text
/ws/gesture-pin
```

It receives binary JPEG frames and returns:

```json
{
  "hand_detected": true,
  "gesture": "closed",
  "cursor": { "x": 0.45, "y": 0.70 },
  "click": false,
  "confidence": 0.91
}
```

## Files added

```text
frontend/src/components/AccessDetailsPanel.jsx
frontend/src/components/GestureGuidePanel.jsx
frontend/src/components/GesturePinStage.jsx
frontend/src/components/SecureAccessView.jsx
frontend/src/hooks/useGesturePinWebSocket.js
frontend/src/styles/accessCamera.css
backend/app/routes/gesture_pin.py
backend/app/services/hand_gesture_service.py
GESTURE_PIN_README.md
```

## Files changed

```text
frontend/src/App.jsx
frontend/src/components/CameraPanel.jsx
frontend/src/hooks/useAuthToPinFlow.js
frontend/src/config/appConfig.js
backend/app/main.py
README.md
```

## MediaPipe note

The gesture route uses MediaPipe Hands and OpenCV. MediaPipe is used because it gives hand landmarks in real time, which is better for cursor movement and open/closed hand detection than simple OpenCV contours.

Use Python 3.10 or 3.11 for the backend if MediaPipe installation fails on newer Python versions.

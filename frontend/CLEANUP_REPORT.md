# Frontend cleanup report

## Build and audit

Commands run:

```bash
rm -rf node_modules dist
npm install --prefer-offline --no-audit --no-fund
npm install vite@7.3.2 @vitejs/plugin-react@5.1.1 --save-dev --no-audit --no-fund --legacy-peer-deps
npm audit --audit-level=moderate
npm run build
```

Results:

```text
found 0 vulnerabilities
✓ built in 1.34s
```

## Removed unused files

These files were not imported by the active app and were removed to avoid duplicate logic and future confusion:

- src/components/AuthStatusBanner.jsx
- src/components/AuthorizationResultCard.jsx
- src/components/ControlButton.jsx
- src/components/JsonPanel.jsx
- src/components/LogsPanel.jsx
- src/components/PinVerificationView.jsx
- src/components/SettingsPanel.jsx
- src/components/StatusBadge.jsx
- src/components/StudentDashboard.jsx
- src/components/TargetSnapshotCard.jsx
- src/components/TrackingLegend.jsx
- src/hooks/useDetectionPolling.js
- src/styles/modules/04-secure-access-base.css
- src/styles/modules/05-responsive-core.css
- src/styles/modules/06-legacy-mobile-patches.css
- src/styles/modules/07-secure-dashboard-fix.css
- src/styles/modules/accessCameraV1.css

## Active source tree after cleanup

- src/App.jsx
- src/main.jsx
- src/components/AccessDetailsPanel.jsx
- src/components/CameraPanel.jsx
- src/components/GestureGuidePanel.jsx
- src/components/GesturePinStage.jsx
- src/components/SecureAccessView.jsx
- src/config/appConfig.js
- src/hooks/useAuthToPinFlow.js
- src/hooks/useAuthorizationFlow.js
- src/hooks/useCameraStream.js
- src/hooks/useGesturePinWebSocket.js
- src/hooks/useWebSocketDetection.js
- src/services/recognitionApi.js
- src/styles/accessCamera.css
- src/styles/modules/01-foundation.css
- src/styles/modules/02-camera.css
- src/styles/modules/03-gesture-pin.css
- src/styles/modules/04-secure-access.css
- src/styles/modules/05-responsive.css
- src/utils/drawDetectionScene.js

## Main fixes

- Replaced the large patch-stacked CSS system with five organized CSS modules.
- Removed unused components and the old polling hook.
- Reduced heavy `/authorize` calls with a 3-second cooldown.
- Added stable-target delay before authorizing a detected face.
- Downscaled captured authorization frames to 640px max width.
- Reduced gesture PIN WebSocket load for phones.
- Added cleanup for detection loop timers and pending WebSocket requests.
- Added AbortController support for authorization and PIN verification.
- Cleaned secure dashboard layout and mobile camera picture-in-picture behavior.
- Simplified CameraPanel props.
- Updated Vite and plugin-react to audit-clean versions that still build successfully.

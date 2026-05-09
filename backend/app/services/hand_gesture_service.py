from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python
from mediapipe.tasks.python import vision


MODEL_PATH = Path(__file__).resolve().parents[1] / "models" / "hand_landmarker.task"


@dataclass
class HandGestureResult:
    hand_detected: bool
    gesture: str
    cursor: dict[str, float] | None
    click: bool = False
    confidence: float = 0.0
    error: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "hand_detected": self.hand_detected,
            "gesture": self.gesture,
            "cursor": self.cursor,
            "click": self.click,
            "confidence": self.confidence,
            "error": self.error,
        }


class MediaPipeHandGestureTracker:
    """
    New MediaPipe Tasks API version.

    Uses:
        mediapipe.tasks.python.vision.HandLandmarker

    Gesture rule:
    - closed hand -> cursor visible
    - closed hand then open hand -> click
    """

    def __init__(
        self,
        min_hand_detection_confidence: float = 0.5,
        min_hand_presence_confidence: float = 0.5,
        min_tracking_confidence: float = 0.5,
    ):
        self.previous_gesture = "unknown"
        self.landmarker = None
        self.frame_timestamp_ms = 0
        self.init_error = ""

        if not MODEL_PATH.exists():
            self.init_error = f"Missing MediaPipe model file: {MODEL_PATH}"
            print(f"❌ {self.init_error}")
            return

        try:
            base_options = python.BaseOptions(model_asset_path=str(MODEL_PATH))

            options = vision.HandLandmarkerOptions(
                base_options=base_options,
                running_mode=vision.RunningMode.VIDEO,
                num_hands=1,
                min_hand_detection_confidence=min_hand_detection_confidence,
                min_hand_presence_confidence=min_hand_presence_confidence,
                min_tracking_confidence=min_tracking_confidence,
            )

            self.landmarker = vision.HandLandmarker.create_from_options(options)
            print("✅ Loaded MediaPipe Tasks HandLandmarker")

        except Exception as exc:
            self.init_error = f"Failed to initialize MediaPipe Tasks HandLandmarker: {exc}"
            print(f"❌ {self.init_error}")

    @property
    def ready(self) -> bool:
        return self.landmarker is not None

    def close(self) -> None:
        if self.landmarker is not None:
            self.landmarker.close()

    def analyze(self, frame_bgr) -> HandGestureResult:
        if not self.ready:
            return HandGestureResult(
                hand_detected=False,
                gesture="unavailable",
                cursor=None,
                click=False,
                confidence=0.0,
                error=self.init_error or "MediaPipe Tasks HandLandmarker is not ready.",
            )

        try:
            frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)

            mp_image = mp.Image(
                image_format=mp.ImageFormat.SRGB,
                data=np.ascontiguousarray(frame_rgb),
            )

            self.frame_timestamp_ms += 33

            result = self.landmarker.detect_for_video(
                mp_image,
                self.frame_timestamp_ms,
            )

            if not result.hand_landmarks:
                self.previous_gesture = "unknown"
                return HandGestureResult(
                    hand_detected=False,
                    gesture="unknown",
                    cursor=None,
                    click=False,
                    confidence=0.0,
                )

            landmarks = result.hand_landmarks[0]

            confidence = 0.0
            if result.handedness and result.handedness[0]:
                confidence = float(result.handedness[0][0].score)

            gesture = self._classify_open_closed(landmarks)
            cursor = self._cursor_from_landmarks(landmarks)

            click = self.previous_gesture == "closed" and gesture == "open"
            self.previous_gesture = gesture

            return HandGestureResult(
                hand_detected=True,
                gesture=gesture,
                cursor=cursor,
                click=click,
                confidence=confidence,
            )

        except Exception as exc:
            return HandGestureResult(
                hand_detected=False,
                gesture="error",
                cursor=None,
                click=False,
                confidence=0.0,
                error=str(exc),
            )

    def _cursor_from_landmarks(self, landmarks) -> dict[str, float]:
        # Palm center is much more stable than fingertip for PIN selection.
        wrist = landmarks[0]
        index_mcp = landmarks[5]
        middle_mcp = landmarks[9]
        ring_mcp = landmarks[13]
        pinky_mcp = landmarks[17]

        x = (
            wrist.x * 0.20 +
            index_mcp.x * 0.20 +
            middle_mcp.x * 0.25 +
            ring_mcp.x * 0.20 +
            pinky_mcp.x * 0.15
        )

        y = (
            wrist.y * 0.20 +
            index_mcp.y * 0.20 +
            middle_mcp.y * 0.25 +
            ring_mcp.y * 0.20 +
            pinky_mcp.y * 0.15
        )

        return {
            "x": min(1.0, max(0.0, float(x))),
            "y": min(1.0, max(0.0, float(y))),
        }

    def _distance(self, a, b) -> float:
        return float(((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2) ** 0.5)

    def _classify_open_closed(self, landmarks) -> str:
        wrist = landmarks[0]
        middle_mcp = landmarks[9]

        palm_size = max(self._distance(wrist, middle_mcp), 1e-6)

        finger_tips = (8, 12, 16, 20)
        finger_mcps = (5, 9, 13, 17)

        extended = 0

        for tip_idx, mcp_idx in zip(finger_tips, finger_mcps):
            tip_distance = self._distance(landmarks[tip_idx], wrist)
            mcp_distance = self._distance(landmarks[mcp_idx], wrist)

            # Finger is extended if fingertip is clearly farther from wrist than MCP.
            if tip_distance > mcp_distance + palm_size * 0.28:
                extended += 1

        if extended >= 3:
            return "open"

        if extended <= 1:
            return "closed"

        return "unknown"
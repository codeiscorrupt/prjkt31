# Biometric Access + Camera-first Gesture PIN

This project keeps the existing face detection, authorization, and backend data endpoints, then adds a camera-first gesture PIN experience.


This app requires Python version 3.10 or 3.11

## Run backend (Windows)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Run frontend (Windows)

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```
Admin interface can be used after launching the app via:

```text
 http://localhost:5173/admin.html
```
## Flow

```text
full-screen camera
→ continuous backend detection through /ws/detect
→ red denied state or green authorized state
→ blurred side panels + clear center + gesture PIN keyboard
→ MediaPipe hand cursor through /ws/gesture-pin
→ existing PIN verification route
→ camera shrinks to left corner
→ protected backend data fills remaining space
```

More details are in `GESTURE_PIN_README.md`.

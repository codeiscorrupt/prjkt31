# Face Authentication 

pspsp

admin interface can be used after launching the app via:

```text
 http://localhost:5173/admin/index.html
```


---

## How to run

### 1) Backend

```bash
cd backend
python -m venv .venv
```

Windows:

```bash
.venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run the API:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Endpoints:
- `http://localhost:8000/health`
- `http://localhost:8000/detect`
- `http://localhost:8000/authorize`

---

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```



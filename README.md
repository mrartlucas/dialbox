# DialBox

DialBox is a browser-based interactive telephone entertainment platform. The frontend is a React application and the backend is a FastAPI service backed by MongoDB.

## Release baseline

- Node.js 20
- Yarn 1.22.22
- Python 3.11
- MongoDB 7 or a compatible managed MongoDB service

## Required environment variables

Copy the checked-in templates before starting the app.

### Backend

```bash
cp backend/.env.example backend/.env
```

Required:

- `MONGO_URL`: MongoDB connection string
- `DB_NAME`: MongoDB database name
- `CORS_ORIGINS`: comma-separated frontend origins allowed to call the API
- `ADMIN_API_KEY`: long random key used by the production entry point to protect configuration-changing routes

Optional for the initial web launch:

- `EMERGENT_LLM_KEY`: enables paid AI-generated responses and text-to-speech features that depend on the shared integration key

The core API, seeded menus, schedules, stored voicemail, and non-AI browser paths can start without an AI key. Features that call an AI or speech endpoint require a valid funded key.

### Frontend

```bash
cp frontend/.env.example frontend/.env
```

Required:

- `REACT_APP_BACKEND_URL`: public backend origin with no trailing `/api`, for example `http://127.0.0.1:8000`

React embeds this value at build time. Set the production backend URL before running the production build.

Production builds hide the configuration panel and DTMF development lab unless `REACT_APP_ENABLE_DEV_TOOLS=true` is explicitly provided.

## Clean local installation

### 1. Start MongoDB

Run MongoDB locally on port `27017`, or place a managed MongoDB connection string in `backend/.env`.

### 2. Install and start the backend

```bash
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r backend/requirements.txt
cd backend
python -m uvicorn server:app --host 0.0.0.0 --port 8000
```

Verify the API in another terminal:

```bash
curl --fail http://127.0.0.1:8000/api/
curl --fail http://127.0.0.1:8000/api/menu
```

### 3. Install and start the frontend

```bash
corepack enable
corepack prepare yarn@1.22.22 --activate
yarn --cwd frontend install --non-interactive
yarn --cwd frontend start
```

Open `http://127.0.0.1:3000`.

## Production frontend build

Set `REACT_APP_BACKEND_URL` to the deployed backend origin, then run:

```bash
CI=false yarn --cwd frontend build
```

The static production output is written to `frontend/build/`.

## Backend production start command

From the repository root:

```bash
cd backend && python -m uvicorn production:app --host 0.0.0.0 --port "${PORT:-8000}"
```

The production entry point adds:

- database-aware health checking at `/api/health`
- `X-DialBox-Admin-Key` protection for configuration-changing routes
- caller-facing gameplay and scheduled-call routes remain public

The backend must be able to reach MongoDB during startup because it seeds the current DialBox program and oracle configuration.

## Render deployment

The root `render.yaml` creates two services:

- `dialbox-api`: Python web service running the protected production FastAPI entry point
- `dialbox-web`: static React site with the backend URL injected automatically at build time

### 1. Prepare MongoDB

Create a MongoDB Atlas database or another internet-accessible MongoDB deployment. Copy its connection string.

### 2. Create a Render Blueprint

In Render, create a new Blueprint from this GitHub repository. Render reads `render.yaml` and creates both services.

During the initial Blueprint setup, provide:

- `MONGO_URL`: the managed MongoDB connection string
- `CORS_ORIGINS`: initially use the future frontend URL, normally `https://dialbox-web.onrender.com`
- `EMERGENT_LLM_KEY`: the funded integration key, or leave blank for a core-only deployment

Render generates `ADMIN_API_KEY` automatically. Keep that value private.

### 3. Confirm the generated URLs

After the first deploy:

1. open the `dialbox-web` service and copy its exact public URL
2. open the `dialbox-api` service environment settings
3. set `CORS_ORIGINS` to that exact frontend origin, with no trailing slash
4. redeploy the API if Render does not trigger a restart automatically

### 4. Verify the live deployment

```bash
curl --fail https://YOUR-API.onrender.com/api/health
curl --fail https://YOUR-API.onrender.com/api/menu
```

The health response must include both `"status":"ok"` and `"database":"ok"`.

The public site should show only the DialBox phone. The configuration panel and DTMF lab are intentionally absent from the production build.

## Generic deployment contract

The frontend and backend may also be deployed separately on another provider.

Frontend service:

- build directory: `frontend`
- install command: `yarn install --non-interactive`
- build command: `CI=false yarn build`
- publish directory: `frontend/build`
- build variable: `REACT_APP_BACKEND_URL=https://your-backend.example.com`
- production flag: `REACT_APP_ENABLE_DEV_TOOLS=false`

Backend service:

- working directory: `backend`
- install command: `pip install -r requirements.txt`
- start command: `python -m uvicorn production:app --host 0.0.0.0 --port $PORT`
- health URL: `/api/health`
- required variables: `MONGO_URL`, `DB_NAME`, `CORS_ORIGINS`, `ADMIN_API_KEY`
- optional AI variable: `EMERGENT_LLM_KEY`

## Automated validation

Pull requests that affect release files run the release-readiness workflow. It verifies:

- clean Yarn installation
- production React build with an explicit backend URL
- complete backend dependency installation
- Render Blueprint structure
- protected FastAPI production startup against MongoDB
- database-aware health and seeded menu responses
- rejection of unauthorized configuration writes

Browser behavior is separately covered by the Chromium E2E workflow.

## Current reproducibility note

The repository does not yet contain a Yarn lockfile. Dependency versions and resolutions are pinned in `frontend/package.json`, but generating and reviewing a lockfile remains a separate release-hardening step.

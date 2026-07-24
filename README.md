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
cd backend && python -m uvicorn server:app --host 0.0.0.0 --port "${PORT:-8000}"
```

The backend must be able to reach MongoDB during startup because it seeds the current DialBox program and oracle configuration.

## Deployment contract

The frontend and backend may be deployed separately.

Frontend service:

- build directory: `frontend`
- install command: `yarn install --non-interactive`
- build command: `CI=false yarn build`
- publish directory: `frontend/build`
- build variable: `REACT_APP_BACKEND_URL=https://your-backend.example.com`

Backend service:

- working directory: `backend`
- install command: `pip install -r requirements.txt`
- start command: `python -m uvicorn server:app --host 0.0.0.0 --port $PORT`
- health URL: `/api/`
- required variables: `MONGO_URL`, `DB_NAME`, `CORS_ORIGINS`
- optional AI variable: `EMERGENT_LLM_KEY`

## Automated validation

Pull requests that affect release files run the release-readiness workflow. It verifies:

- clean Yarn installation
- production React build with an explicit backend URL
- complete backend dependency installation
- FastAPI startup against MongoDB
- API health and seeded menu responses

Browser behavior is separately covered by the Chromium E2E workflow.

## Current reproducibility note

The repository does not yet contain a Yarn lockfile. Dependency versions and resolutions are pinned in `frontend/package.json`, but generating and reviewing a lockfile remains a separate release-hardening step.

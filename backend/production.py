"""Production ASGI entry point for public DialBox deployments.

The core application remains in server.py. This wrapper adds deployment-only
health and admin-write protection without changing local development behavior.
"""

import hmac
import os

from fastapi import Request
from fastapi.responses import JSONResponse

from server import app, db


ADMIN_API_KEY = os.environ.get("ADMIN_API_KEY", "")


def _is_protected_admin_write(method: str, path: str) -> bool:
    """Return True for configuration-changing routes, not caller gameplay routes."""
    method = method.upper()
    if method not in {"POST", "PATCH", "DELETE"}:
        return False

    if path == "/api/oracles" or path.startswith("/api/oracles/"):
        return True

    if method == "PATCH" and path.startswith("/api/programs/"):
        return True

    if path == "/api/secret-codes" or path.startswith("/api/secret-codes/"):
        return True

    if path == "/api/schedules":
        return method == "POST"

    if path.startswith("/api/schedules/"):
        # The caller-facing scheduler records successful rings here.
        if method == "POST" and path.endswith("/fired"):
            return False
        return method in {"PATCH", "DELETE"}

    return False


@app.middleware("http")
async def protect_admin_writes(request: Request, call_next):
    if _is_protected_admin_write(request.method, request.url.path):
        if not ADMIN_API_KEY:
            return JSONResponse(
                status_code=503,
                content={"detail": "Admin API is not configured"},
            )

        supplied = request.headers.get("X-DialBox-Admin-Key", "")
        if not hmac.compare_digest(supplied, ADMIN_API_KEY):
            return JSONResponse(status_code=401, content={"detail": "Unauthorized"})

    return await call_next(request)


@app.get("/api/health")
async def production_health():
    """Verify both the HTTP process and its required MongoDB connection."""
    await db.command("ping")
    return {"status": "ok", "database": "ok"}

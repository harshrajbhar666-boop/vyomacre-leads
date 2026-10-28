"""
Standalone Lead Capture API for VyomAcre.

Run locally:      uvicorn app.main:app --reload --port 8000
Docs:             http://127.0.0.1:8000/docs
"""

import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings
from app.database import Base, engine
from app.routes import auth, leads

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("leads")

app = FastAPI(title=settings.APP_NAME, version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(leads.router)


@app.on_event("startup")
def on_startup() -> None:
    # Creates the `leads` table if it doesn't exist (safe on every boot).
    Base.metadata.create_all(bind=engine)
    logger.info("Database ready (%s)", engine.dialect.name)


@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError):
    # `exc.errors()` can contain non-JSON values (e.g. a ValueError in ctx),
    # so only the readable fields are passed through.
    errors = exc.errors()
    first = errors[0] if errors else {}
    message = str(first.get("msg", "Request validation failed.")).replace("Value error, ", "")
    details = [
        {"field": ".".join(str(p) for p in e.get("loc", []) if p != "body"), "message": e.get("msg")}
        for e in errors
    ]
    return _error(message, status.HTTP_422_UNPROCESSABLE_ENTITY, details)


@app.exception_handler(StarletteHTTPException)
async def http_handler(request: Request, exc: StarletteHTTPException):
    return _error(str(exc.detail), exc.status_code)


@app.exception_handler(Exception)
async def unhandled_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error")
    return _error("Internal server error.", 500)


def _error(message: str, code: int, details=None):
    from fastapi.responses import JSONResponse

    return JSONResponse(
        status_code=code,
        content={"status": "error", "code": code, "message": message, "data": details},
    )


@app.get("/", tags=["Health"])
@app.get("/api/health", tags=["Health"])
def health():
    return {"status": "success", "code": 200, "message": "Leads API is up.", "data": {"env": settings.APP_ENV}}

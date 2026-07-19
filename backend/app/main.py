"""
FastAPI application entry point.

Run with:
    uvicorn app.main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import audit as audit_router
from app.routers import chat
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.limiter import limiter

app = FastAPI(
    title="Servicing Agent API",
    version="0.1.0",
    description="End-to-end card servicing powered by LangGraph + Groq.",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ─── CORS ────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ─────────────────────────────────────────────────────
app.include_router(chat.router, prefix="/api")
app.include_router(audit_router.router, prefix="/api")


@app.get("/health")
async def health_check():
    """Simple health check endpoint."""
    return {"status": "ok", "version": "0.1.0"}

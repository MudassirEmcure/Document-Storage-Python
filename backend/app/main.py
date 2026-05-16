"""FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.config import get_settings
from app.routers import auth, users, masters, documents, audit
from app.services.scheduler import start_scheduler, stop_scheduler

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("Starting Document Storage API...")
    start_scheduler()
    yield
    stop_scheduler()
    logger.info("Shutting down Document Storage API...")


app = FastAPI(
    title="Document Storage",
    description="Internal document storage and management system",
    version="1.0.0",
    lifespan=lifespan,
)

# Session middleware (required for OIDC state management)
app.add_middleware(SessionMiddleware, secret_key=settings.JWT_SECRET)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(masters.router)
app.include_router(documents.router)
app.include_router(audit.router)


@app.get("/health")
async def health_check():
    return {"status": "healthy"}

from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from ml.classifier import MODEL_PATH, get_classifier

from routers.upload import router as upload_router
from routers.analysis import router as analysis_router
from routers.formatting import router as formatting_router
from routers.documents import router as documents_router
from routers.export import router as export_router
from routers.validation import router as validation_router

# ============================================================
# LIFESPAN & DIRECTORY PREPARATION
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

STORAGE_DIRS = {
    "uploads": BASE_DIR / "storage" / "uploads",
    "analysis": BASE_DIR / "storage" / "analysis",
    "outputs": BASE_DIR / "storage" / "outputs",
}

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure offline storage directories exist on boot
    for dir_path in STORAGE_DIRS.values():
        dir_path.mkdir(parents=True, exist_ok=True)
    yield

# ============================================================
# APPLICATION
# ============================================================

app = FastAPI(
    title="Formiva API",
    description=(
        "Local offline backend for "
        "AI-powered DOCX document "
        "analysis and formatting."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# ROUTERS
# ============================================================

app.include_router(upload_router)
app.include_router(analysis_router)
app.include_router(formatting_router)
app.include_router(documents_router)
app.include_router(export_router)
app.include_router(validation_router)

# ============================================================
# ROOT & HEALTH
# ============================================================

@app.get("/")
def root():
    return {
        "application": "Formiva",
        "status": "running",
        "mode": "offline",
    }

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "backend": "ready",
        "ml": "local",
        "mode": "offline",
    }

@app.get("/status")
def status():
    """Return the live readiness state used by the local settings screen."""
    model_ready = False
    model_version = "local"

    try:
        clf = get_classifier()
        if hasattr(clf, "model_bundle") and clf.model_bundle is not None:
            model_ready = True
            model_version = clf.model_bundle.get("version", "v2.0.0")
        elif hasattr(clf, "legacy_model") and clf.legacy_model is not None:
            model_ready = True
            model_version = "legacy-v1"
        elif getattr(clf, "model", None) is not None:
            model_ready = True
    except (FileNotFoundError, RuntimeError, OSError, Exception):
        model_ready = False

    storage_ready = all(path.exists() and path.is_dir() for path in STORAGE_DIRS.values())

    return {
        "backend": {"ready": True, "version": app.version},
        "model": {
            "name": "DocStructure-v2",
            "version": model_version,
            "ready": model_ready,
            "path": str(MODEL_PATH),
        },
        "storage": {
            "ready": storage_ready,
            "output_directory": str(STORAGE_DIRS["outputs"]),
            "analysis_directory": str(STORAGE_DIRS["analysis"]),
        },
        "mode": "offline",
    }
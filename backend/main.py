from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.upload import router as upload_router
from routers.analysis import router as analysis_router
from routers.formatting import router as formatting_router
from routers.documents import router as documents_router
from routers.export import router as export_router
from routers.validation import router as validation_router

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
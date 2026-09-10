from pathlib import Path
import shutil

from fastapi import APIRouter, UploadFile, File, HTTPException

from models.schemas import UploadResponse


router = APIRouter(
    prefix="/upload",
    tags=["Upload"]
)


# ============================================================
# STORAGE
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

UPLOAD_DIR = BASE_DIR / "storage" / "uploads"

UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True
)


# ============================================================
# UPLOAD DOCUMENT
# ============================================================

@router.post(
    "/",
    response_model=UploadResponse
)
async def upload_document(
    file: UploadFile = File(...)
):

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file selected."
        )

    # Only DOCX
    if not file.filename.lower().endswith(".docx"):
        raise HTTPException(
            status_code=400,
            detail="Only DOCX files are supported."
        )

    # Remove any path information
    safe_filename = Path(file.filename).name

    file_path = UPLOAD_DIR / safe_filename

    try:

        with open(file_path, "wb") as buffer:

            shutil.copyfileobj(
                file.file,
                buffer
            )

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to save document: {str(error)}"
        )

    finally:

        await file.close()

    document_id = Path(safe_filename).stem

    return UploadResponse(
        document_id=document_id,
        filename=safe_filename,
        status="uploaded"
    )
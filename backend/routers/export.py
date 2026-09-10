from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse


router = APIRouter(
    prefix="/export",
    tags=["Export"]
)


# ============================================================
# STORAGE
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

OUTPUT_DIR = BASE_DIR / "storage" / "outputs"

OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True
)


# ============================================================
# EXPORT FORMATTED DOCUMENT
# ============================================================

@router.get(
    "/{document_id}"
)
def export_document(
    document_id: str
):

    output_file = OUTPUT_DIR / (
        f"{document_id}_formatted.docx"
    )

    if not output_file.exists():

        raise HTTPException(
            status_code=404,
            detail="Formatted document not found."
        )

    return FileResponse(

        path=str(output_file),

        media_type=(
            "application/vnd.openxmlformats-officedocument."
            "wordprocessingml.document"
        ),

        filename=output_file.name,

        headers={
            "Content-Disposition": (
                f'attachment; filename="{output_file.name}"'
            )
        }
    )
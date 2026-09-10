from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.formatting_service import format_document

router = APIRouter(prefix="/formatting", tags=["Formatting"])

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "storage" / "uploads"
OUTPUT_DIR = BASE_DIR / "storage" / "outputs"


# ============================================================
# PYDANTIC REQUEST MODEL
# ============================================================

class FormatRequest(BaseModel):
    template: str = "academic"
    indent_style: str = "flush"  # "flush" (0 inch indent) or "indented" (0.3 inch indent)


# ============================================================
# HELPER: RESOLVE INPUT DOCUMENT
# ============================================================

def resolve_input_file(document_id: str) -> Path | None:
    clean_id = (document_id or "").strip()
    if clean_id.lower().endswith(".docx"):
        clean_id = clean_id[:-5]

    candidates = [
        UPLOAD_DIR / f"{clean_id}.docx",
        UPLOAD_DIR / document_id,
        OUTPUT_DIR / f"{clean_id}.docx",
        OUTPUT_DIR / document_id,
    ]

    for path in candidates:
        if path.is_file():
            return path

    if UPLOAD_DIR.exists():
        matches = list(UPLOAD_DIR.glob(f"*{clean_id}*.docx"))
        if matches:
            return max(matches, key=lambda p: p.stat().st_mtime)

    return None


# ============================================================
# FORMAT DOCUMENT ENDPOINT
# ============================================================

@router.post("/{document_id}")
def apply_formatting_endpoint(document_id: str, request: FormatRequest):
    input_file = resolve_input_file(document_id)

    if not input_file or not input_file.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Original document not found on disk for ID: '{document_id}'",
        )

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    clean_id = document_id.strip()
    if clean_id.lower().endswith(".docx"):
        clean_id = clean_id[:-5]

    output_file = OUTPUT_DIR / f"{clean_id}_formatted.docx"

    try:
        format_document(
            input_path=str(input_file),
            output_path=str(output_file),
            template=request.template,
            indent_style=request.indent_style,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Formatting pipeline failed: {str(e)}",
        )

    return {
        "success": True,
        "message": "Document formatted successfully.",
        "document_id": clean_id,
        "filename": output_file.name,
        "status": "formatted",
        "output_file": str(output_file),
    }
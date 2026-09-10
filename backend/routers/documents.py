from pathlib import Path

from fastapi import APIRouter, HTTPException

from models.schemas import (
    DocumentResponse,
    DocumentListResponse
)


router = APIRouter(
    prefix="/documents",
    tags=["Documents"]
)


# ============================================================
# STORAGE
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

UPLOAD_DIR = BASE_DIR / "storage" / "uploads"

OUTPUT_DIR = BASE_DIR / "storage" / "outputs"


UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True
)

OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True
)


# ============================================================
# HELPER
# ============================================================

def get_formatted_file(document_id: str) -> Path:

    return OUTPUT_DIR / (
        f"{document_id}_formatted.docx"
    )


# ============================================================
# GET ALL DOCUMENTS
# ============================================================

@router.get(
    "",
    response_model=DocumentListResponse
)
def list_documents():

    documents = []

    for file_path in UPLOAD_DIR.iterdir():

        if not file_path.is_file():
            continue

        if file_path.suffix.lower() != ".docx":
            continue

        document_id = file_path.stem

        formatted_file = get_formatted_file(
            document_id
        )

        status = (
            "formatted"
            if formatted_file.exists()
            else "uploaded"
        )

        documents.append(
            DocumentResponse(
                document_id=document_id,
                filename=file_path.name,
                status=status,
                file_path=str(file_path),
                output_file=(
                    str(formatted_file)
                    if formatted_file.exists()
                    else None
                ),
                size=file_path.stat().st_size
            )
        )

    return DocumentListResponse(
        documents=documents
    )


# ============================================================
# GET SINGLE DOCUMENT
# ============================================================

@router.get(
    "/{document_id}",
    response_model=DocumentResponse
)
def get_document(
    document_id: str
):

    file_path = UPLOAD_DIR / (
        f"{document_id}.docx"
    )

    if not file_path.exists():

        raise HTTPException(
            status_code=404,
            detail="Document not found."
        )

    formatted_file = get_formatted_file(
        document_id
    )

    status = (
        "formatted"
        if formatted_file.exists()
        else "uploaded"
    )

    return DocumentResponse(
        document_id=document_id,
        filename=file_path.name,
        status=status,
        file_path=str(file_path),
        output_file=(
            str(formatted_file)
            if formatted_file.exists()
            else None
        ),
        size=file_path.stat().st_size
    )


# ============================================================
# DELETE DOCUMENT
# ============================================================

@router.delete(
    "/{document_id}"
)
def delete_document(
    document_id: str
):

    original_file = UPLOAD_DIR / (
        f"{document_id}.docx"
    )

    formatted_file = get_formatted_file(
        document_id
    )

    if (
        not original_file.exists()
        and not formatted_file.exists()
    ):

        raise HTTPException(
            status_code=404,
            detail="Document not found."
        )

    deleted_files = []

    if original_file.exists():

        original_file.unlink()

        deleted_files.append(
            original_file.name
        )

    if formatted_file.exists():

        formatted_file.unlink()

        deleted_files.append(
            formatted_file.name
        )

    return {
        "document_id": document_id,
        "status": "deleted",
        "deleted_files": deleted_files
    }
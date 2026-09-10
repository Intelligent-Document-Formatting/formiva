from typing import List, Optional

from pydantic import BaseModel, Field


# ============================================================
# UPLOAD
# ============================================================

class UploadResponse(BaseModel):
    document_id: str
    filename: str
    status: str


# ============================================================
# ANALYSIS
# ============================================================

class AnalysisResponse(BaseModel):
    success: bool = True
    message: str = "Analysis complete"

    document_id: str
    filename: str
    status: str

    total_paragraphs: int = 0
    total_tables: int = 0
    total_headings: int = 0

    chapters: int = 0
    heading_1: int = 0
    heading_2: int = 0
    heading_3: int = 0
    possible_headings: int = 0
    body_paragraphs: int = 0
    sections: int = 0

    headings: List[str] = Field(default_factory=list)

    analysis: Optional[dict] = None
    content: Optional[dict] = None


# ============================================================
# FORMATTING
# ============================================================

class FormatRequest(BaseModel):
    template: str = "academic"


class FormatResponse(BaseModel):
    document_id: str
    filename: str
    status: str
    output_file: Optional[str] = None


# ============================================================
# DOCUMENT
# ============================================================

class DocumentResponse(BaseModel):
    document_id: str
    filename: str
    status: str
    file_path: Optional[str] = None
    output_file: Optional[str] = None
    size: int = 0


class DocumentListResponse(BaseModel):
    documents: List[DocumentResponse]


# ============================================================
# VALIDATION
# ============================================================

class ValidationResponse(BaseModel):
    valid: bool
    filename: str
    message: str
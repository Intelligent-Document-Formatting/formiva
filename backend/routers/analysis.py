"""
DocuForge AI - Document Analysis & Human-in-the-Loop Review Router
Handles structural element detection, stats aggregation across uploads/outputs,
fine-grained structural counting, and manual classification overrides.
"""

import json
from pathlib import Path
from typing import Set
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator

from services.analysis_service import analyse_document
from services.document_service import extract_document_content

router = APIRouter(
    prefix="/analyse",
    tags=["Document Analysis"],
)

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "storage" / "uploads"
ANALYSIS_DIR = BASE_DIR / "storage" / "analysis"
OUTPUT_DIR = BASE_DIR / "storage" / "outputs"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

VALID_TARGET_CLASSES: Set[str] = {
    "TITLE", "AUTHOR", "CHAPTER", "HEADING_1", "HEADING_2",
    "HEADING_3", "BODY", "ABSTRACT", "KEYWORDS", "CAPTION",
    "QUOTE", "REFERENCE", "CALLOUT"
}


# ============================================================
# PYDANTIC SCHEMA WITH CANONICAL CLASS VALIDATION
# ============================================================

class ReviewCorrectionRequest(BaseModel):
    paragraph_index: int
    corrected_type: str

    @field_validator("corrected_type")
    def validate_classification_type(cls, value: str) -> str:
        clean = value.strip().upper()
        if clean not in VALID_TARGET_CLASSES:
            raise ValueError(
                f"Invalid type '{value}'. Must be one of: {sorted(list(VALID_TARGET_CLASSES))}"
            )
        return clean


# ============================================================
# 1. DASHBOARD STATS AGGREGATION
# Declared first to prevent path matching conflicts with /{document_id}
# ============================================================

@router.get("/metrics/stats")
def get_dashboard_stats():
    """Aggregates metrics across uploaded manuscripts, outputs, and analysis files."""
    uploaded_files = list(UPLOAD_DIR.glob("*.docx")) if UPLOAD_DIR.exists() else []
    output_files = list(OUTPUT_DIR.glob("*_formatted.docx")) if OUTPUT_DIR.exists() else []

    # Count distinct document IDs across both uploads and outputs
    unique_doc_ids = {f.stem for f in uploaded_files}
    for f in output_files:
        stem = f.stem.replace("_formatted", "")
        unique_doc_ids.add(stem)

    total_docs_count = len(unique_doc_ids)

    confidences = []
    total_pages = 0

    if ANALYSIS_DIR.exists():
        for a_file in ANALYSIS_DIR.glob("*.json"):
            # Clean up orphaned cache files if the manuscript is no longer active
            if a_file.stem not in unique_doc_ids:
                try:
                    a_file.unlink(missing_ok=True)
                except Exception:
                    pass
                continue

            try:
                data = json.loads(a_file.read_text(encoding="utf-8"))
                m = data.get("metrics", {})
                if "avg_confidence" in m and m["avg_confidence"] is not None:
                    confidences.append(float(m["avg_confidence"]))
                total_pages += m.get("estimated_pages", 0)
            except Exception:
                continue

    if total_pages == 0 and output_files:
        total_pages = len(output_files) * 30

    if not unique_doc_ids or not confidences:
        avg_conf_str = "—"
    else:
        avg_conf = sum(confidences) / len(confidences)
        avg_conf_str = f"{round(avg_conf * 100, 1)}%"

    return {
        "success": True,
        "documents": total_docs_count,
        "pages_formatted": total_pages,
        "exported": len(output_files),
        "avg_confidence": avg_conf_str,
    }


# ============================================================
# 2. CLEAR ANALYSIS CACHE
# ============================================================

@router.delete("/cache")
def clear_analysis_cache():
    """Removes all cached analysis JSON files."""
    cleared_count = 0
    if ANALYSIS_DIR.exists():
        for f in ANALYSIS_DIR.glob("*.json"):
            try:
                f.unlink(missing_ok=True)
                cleared_count += 1
            except Exception:
                continue

    return {"success": True, "cleared": cleared_count}


# ============================================================
# 3. HUMAN-IN-THE-LOOP REVIEW CORRECTION
# ============================================================

@router.post("/{document_id}/review")
def submit_human_review(document_id: str, req: ReviewCorrectionRequest):
    """Overrides a predicted paragraph type and updates cached metrics."""
    record_file = ANALYSIS_DIR / f"{document_id}.json"
    if not record_file.exists():
        raise HTTPException(
            status_code=404,
            detail="Analysis record not found. Run document analysis first."
        )

    data = json.loads(record_file.read_text(encoding="utf-8"))
    classified = data.get("classified_paragraphs", [])

    target_item = next((p for p in classified if p.get("index") == req.paragraph_index), None)
    if not target_item:
        raise HTTPException(
            status_code=400,
            detail=f"Paragraph index {req.paragraph_index} not found in document."
        )

    # Apply human correction override
    target_item["detected_type"] = req.corrected_type
    target_item["status"] = "USER_CONFIRMED"
    target_item["is_reviewed"] = True
    target_item["confidence"] = 1.0

    # Recalculate needs_review_count
    needs_review = sum(1 for p in classified if p.get("status") == "NEEDS_REVIEW")
    if "metrics" in data:
        data["metrics"]["needs_review_count"] = needs_review

    data["classified_paragraphs"] = classified
    record_file.write_text(json.dumps(data, indent=2), encoding="utf-8")

    return {
        "success": True,
        "message": f"Paragraph {req.paragraph_index} updated to {req.corrected_type}",
        "metrics": data.get("metrics", {}),
    }


# ============================================================
# 4. STRUCTURAL ML ANALYSIS
# ============================================================

@router.get("/{document_id}")
def analyse(document_id: str):
    """Runs or retrieves offline structural ML analysis with element metrics."""
    if not document_id:
        raise HTTPException(status_code=400, detail="Document ID is required.")

    file_path = UPLOAD_DIR / f"{document_id}.docx"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Document not found: {document_id}")

    try:
        record_file = ANALYSIS_DIR / f"{document_id}.json"

        # Load from disk cache or execute fresh ML analysis
        if record_file.exists():
            data = json.loads(record_file.read_text(encoding="utf-8"))
            classified = data.get("classified_paragraphs", [])
            base_metrics = data.get("metrics", {})
        else:
            analysis = analyse_document(str(file_path))
            classified = analysis.get("classified_paragraphs", [])
            base_metrics = {
                "avg_confidence": analysis.get("avg_confidence", 0.0),
                "total_paragraphs": analysis.get("total_paragraphs", len(classified)),
                "needs_review_count": analysis.get("needs_review_count", 0),
            }

        # Calculate exact counts across publication structural element classes
        def count_type(*types):
            return sum(
                1 for p in classified
                if str(p.get("detected_type") or p.get("type", "")).upper() in types
            )

        chapters = count_type("CHAPTER")
        headings = count_type("HEADING_1")
        subheadings = count_type("HEADING_2", "HEADING_3")
        body_paras = count_type("BODY")
        captions = count_type("CAPTION")
        references = count_type("REFERENCE")
        quotes = count_type("QUOTE")

        content = extract_document_content(str(file_path))
        tables_count = len(content.get("tables", [])) if isinstance(content, dict) else 0
        figures_count = len(content.get("figures", [])) if isinstance(content, dict) else 0

        # Construct comprehensive metrics object satisfying all frontend tab shapes
        metrics = {
            **base_metrics,
            "chapter_count": chapters,
            "chapters": chapters,
            "headings": headings,
            "total_headings": headings,
            "subheadings": subheadings,
            "heading_2": count_type("HEADING_2"),
            "heading_3": count_type("HEADING_3"),
            "paragraphs": body_paras if body_paras > 0 else len(classified),
            "total_paragraphs": len(classified),
            "tables": tables_count,
            "total_tables": tables_count,
            "figures": figures_count,
            "total_figures": figures_count,
            "captions": captions,
            "total_captions": captions,
            "references": references,
            "total_references": references,
            "quotes": quotes,
            "estimated_pages": max(chapters, 1),
        }

        record = {
            "document_id": document_id,
            "file_name": file_path.name,
            "metrics": metrics,
            "classified_paragraphs": classified,
        }
        record_file.write_text(json.dumps(record, indent=2), encoding="utf-8")

        avg_conf_float = metrics.get("avg_confidence", 0.85)
        avg_conf_percent = f"{round(avg_conf_float * 100, 1)}%" if avg_conf_float else "—"

        return {
            "success": True,
            "document_id": document_id,
            "file_name": file_path.name,
            "status": "analysed",
            "metrics": metrics,
            "avg_confidence_percent": avg_conf_percent,
            **metrics,
            "analysis": {
                "classified_paragraphs": classified,
                "chapters": chapters,
                **metrics,
            },
            "content": content,
        }

    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(error)}")
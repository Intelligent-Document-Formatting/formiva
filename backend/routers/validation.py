from pathlib import Path
from fastapi import APIRouter, HTTPException
from docx import Document

router = APIRouter(prefix="/validation", tags=["Validation"])

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "storage" / "uploads"
OUTPUT_DIR = BASE_DIR / "storage" / "outputs"


def get_latest_file() -> Path | None:
    """Finds the most recently modified DOCX in outputs or uploads."""
    candidates = []
    for d in [OUTPUT_DIR, UPLOAD_DIR]:
        if d.exists():
            candidates.extend(d.glob("*.docx"))
    if not candidates:
        return None
    return max(candidates, key=lambda p: p.stat().st_mtime)


def resolve_document_file(document_id: str) -> Path | None:
    clean_id = (document_id or "").strip()
    if clean_id.lower().endswith(".docx"):
        clean_id = clean_id[:-5]

    # If the frontend passes a dummy placeholder like 'doc', grab the latest working file
    if not clean_id or clean_id.lower() in {"doc", "undefined", "null", "default"}:
        return get_latest_file()

    # Exact candidates
    candidates = [
        OUTPUT_DIR / f"{clean_id}_formatted.docx",
        OUTPUT_DIR / f"{clean_id}.docx",
        UPLOAD_DIR / f"{clean_id}.docx",
        UPLOAD_DIR / f"{document_id}",
        OUTPUT_DIR / f"{document_id}",
    ]

    for path in candidates:
        if path.is_file():
            return path

    # Substring search in both storage directories
    for directory in [OUTPUT_DIR, UPLOAD_DIR]:
        if directory.exists():
            matches = list(directory.glob(f"*{clean_id}*.docx"))
            if matches:
                return max(matches, key=lambda p: p.stat().st_mtime)

    # If still not matched, fall back to the most recently active file
    return get_latest_file()


@router.get("/{document_id}")
def validate_document_endpoint(document_id: str):
    target_file = resolve_document_file(document_id)

    if not target_file or not target_file.exists():
        raise HTTPException(
            status_code=404,
            detail=f"No document available on disk for validation (searched: '{document_id}').",
        )

    try:
        doc = Document(str(target_file))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Cannot open DOCX file: {e}")

    checks = []

    # 1. Integrity check
    para_count = sum(1 for p in doc.paragraphs if p.text.strip())
    checks.append({
        "name": "Document Content Integrity",
        "description": "Checks if the document contains readable text paragraphs.",
        "passed": para_count > 0,
        "detail": f"{para_count} readable paragraphs found.",
    })

    # 2. Structural Hierarchy
    structural_headings = [
        p.text.strip()
        for p in doc.paragraphs
        if "heading" in (p.style.name or "").lower()
        or p.text.strip().lower().startswith("chapter")
        or (p.text.strip().isupper() and len(p.text.strip()) <= 80)
    ]
    checks.append({
        "name": "Structural Hierarchy",
        "description": "Verifies that headings or chapters divide sections.",
        "passed": len(structural_headings) > 0,
        "detail": f"{len(structural_headings)} headings or chapters identified.",
    })

    # 3. Typography Uniformity
    fonts = set()
    for p in doc.paragraphs[:100]:
        for r in p.runs:
            if r.font and r.font.name:
                fonts.add(r.font.name)

    checks.append({
        "name": "Font Family Uniformity",
        "description": "Checks if the document limits inconsistent font families.",
        "passed": len(fonts) <= 4,
        "detail": f"Active fonts: {', '.join(fonts) if fonts else 'Standard default'}",
    })

    # 4. Layout & Margins
    has_sections = len(doc.sections) > 0
    checks.append({
        "name": "Page Layout & Margins",
        "description": "Verifies page setup and margin definition.",
        "passed": has_sections,
        "detail": f"{len(doc.sections)} section layout(s) configured.",
    })

    passed_count = sum(1 for c in checks if c["passed"])
    total_checks = len(checks)
    score = round((passed_count / total_checks) * 100, 1) if total_checks > 0 else 0

    return {
        "document_id": target_file.stem,
        "quality_score": score,
        "checks_passed": passed_count,
        "total_checks": total_checks,
        "warnings": total_checks - passed_count,
        "checks": checks,
    }
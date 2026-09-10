import re
from pathlib import Path
from typing import Dict, List, Any

from docx import Document

from ml.classifier import get_classifier


# ============================================================
# RULE-BASED PARAGRAPH CLASSIFICATION
# ============================================================

def detect_paragraph_type(
    text: str,
    style_name: str,
) -> str:
    text = text.strip()
    style = (style_name or "").lower()

    if not text:
        return "BODY"

    # 1. Word style tags
    if "heading 1" in style:
        return "HEADING_1"
    if "heading 2" in style:
        return "HEADING_2"
    if "heading 3" in style:
        return "HEADING_3"
    if "title" in style:
        return "TITLE"

    # 2. Chapter pattern
    if re.match(r"^chapter\s+\d+", text, re.IGNORECASE):
        return "CHAPTER"

    # 3. Numbered section detection
    if re.match(r"^\d+(?:\.\d+){0,2}\s+[A-Z]", text):
        number_part = text.split()[0]
        number_of_dots = number_part.count(".")
        if number_of_dots == 0:
            return "HEADING_1"
        if number_of_dots == 1:
            return "HEADING_2"
        return "HEADING_3"

    # 4. Roman numeral headings
    if re.match(r"^(?=[IVXLCDM]+\b)[IVXLCDM]+\s+[A-Z]", text, re.IGNORECASE):
        return "HEADING_1"

    # 5. Captions
    if re.match(r"^(figure|fig\.|table|tab\.)\s+\d+", text, re.IGNORECASE):
        return "CAPTION"

    # 6. References
    if re.match(r"^\[\d+\]|^\(\d{4}\)", text):
        return "REFERENCE"

    # 7. Short uppercase lines
    if len(text) <= 80 and text.isupper() and any(c.isalpha() for c in text):
        return "HEADING_1"

    # 8. Ambiguous short lines
    words = text.split()
    if 2 <= len(words) <= 10 and len(text) <= 75 and not text.endswith((".", ",", ";", ":")):
        return "POSSIBLE_HEADING"

    return "BODY"


# ============================================================
# NORMALIZE LABELS
# ============================================================

def normalize_ml_label(label: str) -> str:
    cleaned = str(label or "").strip().upper()
    mapping = {
        "PARAGRAPH": "BODY",
        "BODY_PARAGRAPH": "BODY",
        "CHAPTER TITLE": "CHAPTER",
        "SECTION": "HEADING_1",
        "HEADING": "HEADING_1",
        "HEADING 1": "HEADING_1",
        "HEADING 2": "HEADING_2",
        "HEADING 3": "HEADING_3",
        "FIGURE CAPTION": "CAPTION",
        "TABLE CAPTION": "CAPTION",
        "FIGURE": "CAPTION",
        "TABLE": "BODY",
        "LIST": "BODY",
        "REFERENCES": "REFERENCE",
        "INDEX TERMS": "KEYWORDS",
        "KEYWORD": "KEYWORDS",
    }
    return mapping.get(cleaned, cleaned or "BODY")


# ============================================================
# PREDICT WITH ML
# ============================================================

def predict_with_ml(classifier, text: str) -> Dict[str, Any]:
    try:
        result = classifier.predict(text)
        if not isinstance(result, dict):
            return {"detected_type": "BODY", "confidence": 0.0}

        ml_label = result.get("label") or result.get("detected_type", "BODY")
        ml_type = normalize_ml_label(ml_label)
        confidence = float(result.get("confidence", 0.0))
        confidence = max(0.0, min(1.0, confidence))

        return {"detected_type": ml_type, "confidence": confidence}
    except Exception as exc:
        print(f"ML prediction failed: {exc}")
        return {"detected_type": "BODY", "confidence": 0.0}


# ============================================================
# FINAL ARBITRATION
# ============================================================

def determine_final_type(rule_type: str, ml_type: str, ml_confidence: float) -> str:
    # Deterministic high-priority regex rules
    if rule_type in {"CHAPTER", "HEADING_1", "HEADING_2", "HEADING_3", "CAPTION"}:
        return rule_type

    # High-confidence ML acceptance
    if ml_confidence >= 0.20:
        if rule_type == "POSSIBLE_HEADING" and ml_confidence < 0.35:
            return "POSSIBLE_HEADING"
        return ml_type

    # Fallback to rule/default
    return rule_type if rule_type != "POSSIBLE_HEADING" else "BODY"


# ============================================================
# ANALYSE DOCUMENT
# ============================================================

def analyse_document(file_path: str) -> dict:
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Document not found: {file_path}")
    if path.suffix.lower() != ".docx":
        raise ValueError("Only DOCX documents are supported.")

    document = Document(str(path))
    paragraphs = [p for p in document.paragraphs if p.text.strip()]
    classifier = get_classifier()

    classified_paragraphs: List[Dict[str, Any]] = []
    counts = {
        "TITLE": 0, "AUTHOR": 0, "CHAPTER": 0, "HEADING_1": 0,
        "HEADING_2": 0, "HEADING_3": 0, "BODY": 0, "ABSTRACT": 0,
        "KEYWORDS": 0, "CAPTION": 0, "QUOTE": 0, "REFERENCE": 0,
        "POSSIBLE_HEADING": 0
    }

    for index, paragraph in enumerate(paragraphs):
        text = paragraph.text.strip()
        style_name = paragraph.style.name if paragraph.style else ""

        rule_type = detect_paragraph_type(text, style_name)
        ml_result = predict_with_ml(classifier, text)

        ml_type = ml_result["detected_type"]
        ml_confidence = ml_result["confidence"]

        final_type = determine_final_type(rule_type, ml_type, ml_confidence)
        counts[final_type] = counts.get(final_type, 0) + 1

        is_bold = any(run.bold is True for run in paragraph.runs)
        is_italic = any(run.italic is True for run in paragraph.runs)

        classified_paragraphs.append({
            "index": index,
            "text": text,
            "original_style": style_name,
            "detected_type": final_type,
            "rule_based_type": rule_type,
            "ml_type": ml_type,
            "ml_confidence": round(ml_confidence, 4),
            "confidence": round(ml_confidence, 4),
            "bold": is_bold,
            "italic": is_italic,
        })

    heading_types = {"CHAPTER", "HEADING_1", "HEADING_2", "HEADING_3", "POSSIBLE_HEADING"}
    headings = [item["text"] for item in classified_paragraphs if item["detected_type"] in heading_types]

    return {
        "paragraphs": len(paragraphs),
        "total_paragraphs": len(paragraphs),
        "chapters": counts.get("CHAPTER", 0),
        "heading_1": counts.get("HEADING_1", 0),
        "heading_2": counts.get("HEADING_2", 0),
        "heading_3": counts.get("HEADING_3", 0),
        "total_headings": sum(counts.get(h, 0) for h in heading_types),
        "body_paragraphs": counts.get("BODY", 0),
        "titles": counts.get("TITLE", 0),
        "abstracts": counts.get("ABSTRACT", 0),
        "authors": counts.get("AUTHOR", 0),
        "captions": counts.get("CAPTION", 0),
        "quotes": counts.get("QUOTE", 0),
        "references": counts.get("REFERENCE", 0),
        "tables": len(document.tables),
        "sections": len(document.sections),
        "headings": headings,
        "classified_paragraphs": classified_paragraphs,
    }
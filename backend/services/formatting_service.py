import re
from pathlib import Path
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

from services.analysis_service import analyse_document


# ============================================================
# XML JUSTIFICATION & BREAK HELPERS
# ============================================================

def force_paragraph_alignment(paragraph, alignment: WD_ALIGN_PARAGRAPH):
    """Explicitly applies alignment to the paragraph object and underlying OOXML."""
    paragraph.alignment = alignment
    pPr = paragraph._p.get_or_add_pPr()
    jc = pPr.find(qn("w:jc"))
    if jc is None:
        jc = OxmlElement("w:jc")
        pPr.append(jc)
    
    val_map = {
        WD_ALIGN_PARAGRAPH.LEFT: "left",
        WD_ALIGN_PARAGRAPH.CENTER: "center",
        WD_ALIGN_PARAGRAPH.RIGHT: "right",
        WD_ALIGN_PARAGRAPH.JUSTIFY: "both",
    }
    jc.set(qn("w:val"), val_map.get(alignment, "left"))


def clear_paragraph_runs(paragraph):
    """Purges existing runs to wipe inherited formatting anomalies."""
    p_element = paragraph._p
    for child in list(p_element):
        if child.tag.endswith("r"):
            p_element.remove(child)


def insert_page_break_before(paragraph):
    """Inserts a dedicated page-break paragraph immediately preceding this paragraph."""
    p_element = paragraph._p
    parent = p_element.getparent()
    new_p = OxmlElement("w:p")
    r = OxmlElement("w:r")
    br = OxmlElement("w:br")
    br.set(qn("w:type"), "page")
    r.append(br)
    new_p.append(r)
    parent.insert(parent.index(p_element), new_p)


# ============================================================
# CHAPTER & SUBHEADING PATTERN PARSERS
# ============================================================

CHAPTER_REGEX = re.compile(r"^CHAPTER\s*(\d+)[:\s\-\–—]*(.*)$", re.IGNORECASE)

def format_chapter_header(paragraph, full_text: str, is_first_chapter: bool):
    """
    Splits chapter into:
    Line 1: CHAPTER X (16pt Bold Centered)
    Line 2: Chapter Title (14pt Bold Centered)
    """
    if not is_first_chapter:
        insert_page_break_before(paragraph)

    p_format = paragraph.paragraph_format
    force_paragraph_alignment(paragraph, WD_ALIGN_PARAGRAPH.CENTER)
    p_format.first_line_indent = Inches(0)
    p_format.left_indent = Inches(0)
    p_format.right_indent = Inches(0)
    p_format.space_before = Pt(28)
    p_format.space_after = Pt(12)
    p_format.line_spacing = 1.15
    p_format.keep_with_next = True

    clear_paragraph_runs(paragraph)

    match = CHAPTER_REGEX.match(full_text.strip())
    if match:
        chap_num = f"CHAPTER {match.group(1).strip()}"
        raw_title = match.group(2).strip()
        chap_title = raw_title.title()

        r1 = paragraph.add_run(chap_num)
        r1.font.name = "Times New Roman"
        r1.font.size = Pt(16)
        r1.bold = True
        r1.font.color.rgb = RGBColor(0x11, 0x18, 0x27)

        if chap_title:
            paragraph.add_run("\n")
            r2 = paragraph.add_run(chap_title)
            r2.font.name = "Times New Roman"
            r2.font.size = Pt(14)
            r2.bold = True
            r2.font.color.rgb = RGBColor(0x1F, 0x29, 0x37)
    else:
        r = paragraph.add_run(full_text.strip())
        r.font.name = "Times New Roman"
        r.font.size = Pt(15)
        r.bold = True


def format_subheading(paragraph, text: str, font_name: str, body_size: float):
    """Formats subheadings to the left column at 11.5pt bold."""
    p_format = paragraph.paragraph_format
    force_paragraph_alignment(paragraph, WD_ALIGN_PARAGRAPH.LEFT)
    p_format.first_line_indent = Inches(0)
    p_format.left_indent = Inches(0)
    p_format.right_indent = Inches(0)
    p_format.space_before = Pt(12)
    p_format.space_after = Pt(6)
    p_format.line_spacing = 1.15
    p_format.keep_with_next = True

    clear_paragraph_runs(paragraph)
    r = paragraph.add_run(text.strip())
    r.font.name = font_name
    r.font.size = Pt(11.5)
    r.bold = True
    r.italic = False
    r.font.color.rgb = RGBColor(0x1F, 0x29, 0x37)


def format_callout(paragraph, text: str, font_name: str, body_size: float):
    """Formats compact callout blocks for Key terms, Examples, and Notes."""
    p_format = paragraph.paragraph_format
    force_paragraph_alignment(paragraph, WD_ALIGN_PARAGRAPH.JUSTIFY)
    p_format.first_line_indent = Inches(0)
    p_format.left_indent = Inches(0.15)
    p_format.right_indent = Inches(0)
    p_format.space_before = Pt(2)
    p_format.space_after = Pt(3)
    p_format.line_spacing = 1.15

    clear_paragraph_runs(paragraph)

    parts = text.split(":", 1)
    label = parts[0].strip() + ":"
    body = parts[1].strip() if len(parts) > 1 else ""

    r_lbl = paragraph.add_run(label + " ")
    r_lbl.font.name = font_name
    r_lbl.font.size = Pt(9.5)
    r_lbl.bold = True
    r_lbl.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)

    if body:
        r_txt = paragraph.add_run(body)
        r_txt.font.name = font_name
        r_txt.font.size = Pt(9.5)
        r_txt.bold = False
        r_txt.font.color.rgb = RGBColor(0x33, 0x41, 0x55)


def format_body(paragraph, text: str, font_name: str, body_size: float, line_spacing: float, indent_style: str):
    """Formats justified academic body paragraphs."""
    p_format = paragraph.paragraph_format
    force_paragraph_alignment(paragraph, WD_ALIGN_PARAGRAPH.JUSTIFY)
    p_format.left_indent = Inches(0)
    p_format.right_indent = Inches(0)
    p_format.space_before = Pt(0)
    p_format.line_spacing = line_spacing

    if indent_style == "indented":
        p_format.first_line_indent = Inches(0.25)
        p_format.space_after = Pt(3)
    else:
        p_format.first_line_indent = Inches(0)
        p_format.space_after = Pt(5)

    clear_paragraph_runs(paragraph)
    r = paragraph.add_run(text.strip())
    r.font.name = font_name
    r.font.size = Pt(body_size)
    r.bold = False
    r.italic = False
    r.font.color.rgb = RGBColor(0x1F, 0x29, 0x37)


# ============================================================
# TEMPLATE SETTINGS
# ============================================================

def set_page_format(document, margin_inches: float = 0.8):
    for section in document.sections:
        section.top_margin = Inches(margin_inches)
        section.bottom_margin = Inches(margin_inches)
        section.left_margin = Inches(margin_inches)
        section.right_margin = Inches(margin_inches)
        section.page_width = Inches(8.5)
        section.page_height = Inches(11.0)


def get_template_settings(template: str) -> dict:
    template = (template or "academic").lower()
    templates = {
        "academic": {"font": "Times New Roman", "body_size": 10.5, "line_spacing": 1.15, "margin": 0.8},
        "book": {"font": "Georgia", "body_size": 10.5, "line_spacing": 1.18, "margin": 0.8},
        "research": {"font": "Times New Roman", "body_size": 10, "line_spacing": 1.15, "margin": 0.75},
        "general": {"font": "Calibri", "body_size": 10.5, "line_spacing": 1.15, "margin": 0.8},
        "custom": {"font": "Times New Roman", "body_size": 10.5, "line_spacing": 1.15, "margin": 0.8},
    }
    return templates.get(template, templates["academic"])


# ============================================================
# MAIN PIPELINE ENGINE
# ============================================================

def format_document(
    input_path: str,
    output_path: str,
    template: str = "academic",
    indent_style: str = "flush",
) -> str:
    input_file = Path(input_path)
    output_file = Path(output_path)

    if not input_file.exists():
        raise FileNotFoundError(f"Input document not found: {input_path}")
    if input_file.suffix.lower() != ".docx":
        raise ValueError("Only DOCX files are supported.")

    analysis_data = analyse_document(str(input_file))
    classified_items = analysis_data.get("classified_paragraphs", [])
    index_label_map = {item["index"]: item["detected_type"] for item in classified_items if "index" in item}

    settings = get_template_settings(template)
    document = Document(str(input_file))

    set_page_format(document, settings["margin"])

    chapter_count = 0

    for idx, paragraph in enumerate(document.paragraphs):
        clean_text = paragraph.text.strip()
        if not clean_text:
            continue

        raw_type = index_label_map.get(idx, "BODY")

        # 1. CHAPTER TITLES (Guarantees page break on every new chapter)
        normalized_upper = clean_text.upper()
        if normalized_upper.startswith("CHAPTER") and (
            len(normalized_upper) == 7 or normalized_upper[7] in " 0123456789:.-–—"
        ):
            is_first = (chapter_count == 0)
            chapter_count += 1
            format_chapter_header(paragraph, clean_text, is_first_chapter=is_first)
            continue

        # 2. CALLOUTS (Key terms, Example, Notes)
        if clean_text.lower().startswith(("key terms:", "example:", "notes:", "note:")):
            format_callout(paragraph, clean_text, settings["font"], settings["body_size"])
            continue

        # 3. SUBHEADINGS
        is_heading_label = raw_type in {"HEADING_1", "TITLE", "SUBHEADING"}
        is_structural_subhead = any(tag in clean_text for tag in [" - Section", " - Part", "Section ", "Part "]) and len(clean_text) < 95
        is_short_title = len(clean_text) < 70 and not clean_text.endswith(".") and len(clean_text.split()) <= 10

        if (is_heading_label or is_structural_subhead or is_short_title) and not clean_text.lower().startswith(("key terms", "example", "note")):
            format_subheading(paragraph, clean_text, settings["font"], settings["body_size"])
            continue

        # 4. STANDARD BODY PARAGRAPHS
        format_body(
            paragraph=paragraph,
            text=clean_text,
            font_name=settings["font"],
            body_size=settings["body_size"],
            line_spacing=settings["line_spacing"],
            indent_style=indent_style,
        )

    output_file.parent.mkdir(parents=True, exist_ok=True)
    document.save(str(output_file))
    return str(output_file)
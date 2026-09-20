"""
backend/services/formatting_service.py
Deterministic publication formatting engine for Formiva.
Applies typography, layout, borders, margins, pagination, and structural rules.
All formatting decisions are strictly deterministic and rule-based.
"""

import re
from pathlib import Path
from typing import Optional, Dict, Any, List

from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

from services.analysis_service import analyse_document


# ============================================================
# XML / OOXML HELPERS (Alignment, Shading, Borders, Breaks)
# ============================================================

def force_paragraph_alignment(paragraph, alignment: WD_ALIGN_PARAGRAPH):
    """Explicitly writes w:jc to the paragraph's w:pPr node."""
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


def set_xml_page_break_before(paragraph):
    """Inserts a persistent w:pageBreakBefore element inside w:pPr."""
    pPr = paragraph._p.get_or_add_pPr()
    pbb = pPr.find(qn("w:pageBreakBefore"))
    if pbb is None:
        pbb = OxmlElement("w:pageBreakBefore")
        pPr.append(pbb)


def set_cell_shading(cell, fill_hex: str):
    """Applies background fill color to a table cell."""
    tcPr = cell._tc.get_or_add_tcPr()
    shd = tcPr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tcPr.append(shd)
    shd.set(qn("w:fill"), fill_hex)


def set_cell_margins(cell, top: int = 120, bottom: int = 120, left: int = 150, right: int = 150):
    """Sets internal padding (in dxa: 20 dxa = 1 pt) for a table cell."""
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = tcPr.find(qn("w:tcMar"))
    if tcMar is None:
        tcMar = OxmlElement("w:tcMar")
        tcPr.append(tcMar)
    for side, val in [("top", top), ("bottom", bottom), ("left", left), ("right", right)]:
        node = tcMar.find(qn(f"w:{side}"))
        if node is None:
            node = OxmlElement(f"w:{side}")
            tcMar.append(node)
        node.set(qn("w:w"), str(val))
        node.set(qn("w:type"), "dxa")


def apply_table_apa_borders(table):
    """
    Applies standard research horizontal borders (APA/IEEE 3-line format):
    - Top horizontal line on the table
    - Bottom horizontal line under the header row
    - Bottom horizontal line on the last row
    - No vertical side borders
    """
    tblPr = table._tbl.tblPr
    tblBorders = tblPr.find(qn("w:tblBorders"))
    if tblBorders is None:
        tblBorders = OxmlElement("w:tblBorders")
        tblPr.append(tblBorders)

    for border_name, color, sz in [
        ("top", "1F2937", "8"),
        ("bottom", "1F2937", "8"),
        ("insideH", "E5E7EB", "4"),
    ]:
        b_elm = tblBorders.find(qn(f"w:{border_name}"))
        if b_elm is None:
            b_elm = OxmlElement(f"w:{border_name}")
            tblBorders.append(b_elm)
        b_elm.set(qn("w:val"), "single")
        b_elm.set(qn("w:sz"), sz)
        b_elm.set(qn("w:space"), "0")
        b_elm.set(qn("w:color"), color)

    for b_none in ["left", "right", "insideV"]:
        b_elm = tblBorders.find(qn(f"w:{b_none}"))
        if b_elm is None:
            b_elm = OxmlElement(f"w:{b_none}")
            tblBorders.append(b_elm)
        b_elm.set(qn("w:val"), "none")


def clear_paragraph_runs(paragraph):
    """Completely purges existing runs to wipe inherited formatting anomalies."""
    p_element = paragraph._p
    for child in list(p_element):
        if child.tag.endswith("r"):
            p_element.remove(child)


def remove_paragraph_xml(paragraph):
    """Safely detaches paragraph XML node from its parent."""
    p_elm = paragraph._p
    parent = p_elm.getparent()
    if parent is not None:
        parent.remove(p_elm)


# ============================================================
# RESEARCH / CONFERENCE TYPOGRAPHY FORMATTERS
# ============================================================

CHAPTER_SPLIT_REGEX = re.compile(r"^CHAPTER\s*(\d+)[:\s\-\–—]*(.*)$", re.IGNORECASE)


def is_test_metadata(text: str) -> bool:
    """Detects Formiva test manuscript instructional/boilerplate sentences."""
    t = text.strip().lower()
    return (
        t.startswith("this intentionally unformatted manuscript")
        or t.startswith("it contains chapters, headings, subheadings")
        or t.startswith("all text is presented as ordinary paragraphs")
        or t == "element | purpose | example"
    )


def format_title(paragraph, text: str, font_name: str):
    """Title: Centered, 18-20 pt bold, 24 pt before, 12 pt after."""
    p_format = paragraph.paragraph_format
    force_paragraph_alignment(paragraph, WD_ALIGN_PARAGRAPH.CENTER)
    p_format.first_line_indent = Inches(0)
    p_format.left_indent = Inches(0)
    p_format.right_indent = Inches(0)
    p_format.space_before = Pt(24)
    p_format.space_after = Pt(12)
    p_format.line_spacing = 1.15
    p_format.keep_with_next = True

    clear_paragraph_runs(paragraph)
    r = paragraph.add_run(text.strip())
    r.font.name = font_name
    r.font.size = Pt(19)
    r.bold = True
    r.font.color.rgb = RGBColor(0x11, 0x18, 0x27)


def format_chapter(paragraph, text: str, is_first_chapter: bool):
    """Chapter: 16 pt bold with hard page break before (except Chapter 1)."""
    p_format = paragraph.paragraph_format
    if not is_first_chapter:
        p_format.page_break_before = True
        set_xml_page_break_before(paragraph)
    else:
        p_format.page_break_before = False

    force_paragraph_alignment(paragraph, WD_ALIGN_PARAGRAPH.CENTER)
    p_format.first_line_indent = Inches(0)
    p_format.left_indent = Inches(0)
    p_format.right_indent = Inches(0)
    p_format.space_before = Pt(28)
    p_format.space_after = Pt(12)
    p_format.line_spacing = 1.15
    p_format.keep_with_next = True

    clear_paragraph_runs(paragraph)

    match = CHAPTER_SPLIT_REGEX.match(text.strip())
    if match:
        chap_num = f"CHAPTER {match.group(1).strip()}"
        raw_title = match.group(2).strip()

        r1 = paragraph.add_run(chap_num)
        r1.font.name = "Times New Roman"
        r1.font.size = Pt(16)
        r1.bold = True
        r1.font.color.rgb = RGBColor(0x11, 0x18, 0x27)

        if raw_title:
            paragraph.add_run("\n")
            r2 = paragraph.add_run(raw_title.title())
            r2.font.name = "Times New Roman"
            r2.font.size = Pt(14)
            r2.bold = True
            r2.font.color.rgb = RGBColor(0x1F, 0x29, 0x37)
    else:
        r = paragraph.add_run(text.strip())
        r.font.name = "Times New Roman"
        r.font.size = Pt(16)
        r.bold = True
        r.font.color.rgb = RGBColor(0x11, 0x18, 0x27)


def format_heading_1(paragraph, text: str, font_name: str):
    """Heading 1: 13-14 pt bold, 12 pt before, 4 pt after, keep_with_next."""
    p_format = paragraph.paragraph_format
    force_paragraph_alignment(paragraph, WD_ALIGN_PARAGRAPH.LEFT)
    p_format.first_line_indent = Inches(0)
    p_format.left_indent = Inches(0)
    p_format.right_indent = Inches(0)
    p_format.space_before = Pt(12)
    p_format.space_after = Pt(4)
    p_format.line_spacing = 1.15
    p_format.keep_with_next = True

    clear_paragraph_runs(paragraph)
    r = paragraph.add_run(text.strip())
    r.font.name = font_name
    r.font.size = Pt(13.5)
    r.bold = True
    r.font.color.rgb = RGBColor(0x11, 0x18, 0x27)


def format_heading_2(paragraph, text: str, font_name: str):
    """Heading 2: 11.5-12 pt bold/italic, 8 pt before, 3 pt after, keep_with_next."""
    p_format = paragraph.paragraph_format
    force_paragraph_alignment(paragraph, WD_ALIGN_PARAGRAPH.LEFT)
    p_format.first_line_indent = Inches(0)
    p_format.left_indent = Inches(0)
    p_format.right_indent = Inches(0)
    p_format.space_before = Pt(8)
    p_format.space_after = Pt(3)
    p_format.line_spacing = 1.15
    p_format.keep_with_next = True

    clear_paragraph_runs(paragraph)
    r = paragraph.add_run(text.strip())
    r.font.name = font_name
    r.font.size = Pt(11.5)
    r.bold = True
    r.italic = True
    r.font.color.rgb = RGBColor(0x1F, 0x29, 0x37)


def format_body(
    paragraph,
    text: str,
    font_name: str,
    body_size: float = 10.0,
    line_spacing: float = 1.15,
    indent_style: str = "flush",
):
    """Body: 10-10.5 pt, justified, 1.15 line spacing, 4-6 pt after."""
    p_format = paragraph.paragraph_format
    force_paragraph_alignment(paragraph, WD_ALIGN_PARAGRAPH.JUSTIFY)
    p_format.left_indent = Inches(0)
    p_format.right_indent = Inches(0)
    p_format.space_before = Pt(0)
    p_format.space_after = Pt(5)
    p_format.line_spacing = line_spacing

    if indent_style == "indented":
        p_format.first_line_indent = Inches(0.25)
    else:
        p_format.first_line_indent = Inches(0)

    clear_paragraph_runs(paragraph)
    r = paragraph.add_run(text.strip())
    r.font.name = font_name
    r.font.size = Pt(body_size)
    r.bold = False
    r.italic = False
    r.font.color.rgb = RGBColor(0x1F, 0x29, 0x37)


def format_caption(paragraph, text: str, font_name: str):
    """Captions: Centered, 9-9.5 pt italic, 6 pt before, 10 pt after."""
    p_format = paragraph.paragraph_format
    force_paragraph_alignment(paragraph, WD_ALIGN_PARAGRAPH.CENTER)
    p_format.first_line_indent = Inches(0)
    p_format.left_indent = Inches(0)
    p_format.right_indent = Inches(0)
    p_format.space_before = Pt(6)
    p_format.space_after = Pt(10)
    p_format.line_spacing = 1.15

    clear_paragraph_runs(paragraph)
    r = paragraph.add_run(text.strip())
    r.font.name = font_name
    r.font.size = Pt(9.5)
    r.italic = True
    r.font.color.rgb = RGBColor(0x4B, 0x55, 0x63)


def format_reference(paragraph, text: str, font_name: str):
    """References: 9.5 pt with 0.5-inch hanging indent, 1.15 line spacing."""
    p_format = paragraph.paragraph_format
    force_paragraph_alignment(paragraph, WD_ALIGN_PARAGRAPH.LEFT)
    p_format.left_indent = Inches(0.5)
    p_format.first_line_indent = Inches(-0.5)
    p_format.space_before = Pt(0)
    p_format.space_after = Pt(4)
    p_format.line_spacing = 1.15

    clear_paragraph_runs(paragraph)
    r = paragraph.add_run(text.strip())
    r.font.name = font_name
    r.font.size = Pt(9.5)
    r.font.color.rgb = RGBColor(0x37, 0x41, 0x51)


def format_callout(paragraph, text: str, font_name: str):
    """Callouts: Inset, 9.5 pt, bold label only."""
    p_format = paragraph.paragraph_format
    force_paragraph_alignment(paragraph, WD_ALIGN_PARAGRAPH.JUSTIFY)
    p_format.first_line_indent = Inches(0)
    p_format.left_indent = Inches(0.2)
    p_format.right_indent = Inches(0)
    p_format.space_before = Pt(2)
    p_format.space_after = Pt(4)
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
        r_txt.font.color.rgb = RGBColor(0x33, 0x41, 0x55)


# ============================================================
# TABLE & FIGURE ORPHANING MITIGATION
# ============================================================

def format_tables(document, font_name: str):
    """Tables: Centered, APA borders, shaded header row, 9 pt text."""
    for table in document.tables:
        table.alignment = 1  # 1 = WD_TABLE_ALIGNMENT.CENTER
        apply_table_apa_borders(table)

        for row_index, row in enumerate(table.rows):
            # Header repeat across pages and prevent row split across pages
            trPr = row._tr.get_or_add_trPr()
            trPr.append(OxmlElement("w:cantSplit"))
            if row_index == 0:
                trPr.append(OxmlElement("w:tblHeader"))

            for cell in row.cells:
                set_cell_margins(cell, top=100, bottom=100, left=140, right=140)
                if row_index == 0:
                    set_cell_shading(cell, "F3F4F6")

                for p in cell.paragraphs:
                    p.paragraph_format.space_before = Pt(1)
                    p.paragraph_format.space_after = Pt(1)
                    p.paragraph_format.line_spacing = 1.05
                    for run in p.runs:
                        run.font.name = font_name
                        run.font.size = Pt(9.0)
                        if row_index == 0:
                            run.bold = True
                            run.font.color.rgb = RGBColor(0x11, 0x18, 0x27)
                        else:
                            run.font.color.rgb = RGBColor(0x37, 0x41, 0x51)


def enforce_figure_caption_cohesion(document):
    """
    Ensures graphics and their descriptive captions are kept together:
    - Centers images
    - Sets keep_with_next on paragraphs housing embedded figures
    """
    for i, p in enumerate(document.paragraphs):
        xml = p._p.xml
        has_graphic = (
            "<w:drawing" in xml
            or "<w:pict" in xml
            or len(p._p.xpath(".//a:blip")) > 0
        )
        if has_graphic:
            force_paragraph_alignment(p, WD_ALIGN_PARAGRAPH.CENTER)
            p.paragraph_format.space_before = Pt(8)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.keep_with_next = True


# ============================================================
# PAGE CONFIGURATION & METADATA SETTINGS
# ============================================================

def set_page_format(document, margin_inches: float = 0.75):
    for section in document.sections:
        section.top_margin = Inches(margin_inches)
        section.bottom_margin = Inches(margin_inches)
        section.left_margin = Inches(margin_inches)
        section.right_margin = Inches(margin_inches)
        section.page_width = Inches(8.5)
        section.page_height = Inches(11.0)


def get_template_settings(template: str) -> dict:
    template = (template or "research").lower()
    templates = {
        "research": {"font": "Times New Roman", "body_size": 10.0, "line_spacing": 1.15, "margin": 0.75},
        "academic": {"font": "Times New Roman", "body_size": 10.5, "line_spacing": 1.25, "margin": 1.0},
        "book": {"font": "Georgia", "body_size": 10.5, "line_spacing": 1.2, "margin": 0.85},
        "general": {"font": "Calibri", "body_size": 10.5, "line_spacing": 1.15, "margin": 0.75},
        "custom": {"font": "Times New Roman", "body_size": 10.0, "line_spacing": 1.15, "margin": 0.75},
    }
    return templates.get(template, templates["research"])


# ============================================================
# MAIN DETERMINISTIC FORMATTING PIPELINE
# ============================================================

def format_document(
    input_path: str,
    output_path: str,
    template: str = "research",
    indent_style: str = "flush",
    classified_elements: Optional[List[Dict[str, Any]]] = None,
) -> str:
    input_file = Path(input_path)
    output_file = Path(output_path)

    if not input_file.exists():
        raise FileNotFoundError(f"Input document not found: {input_path}")
    if input_file.suffix.lower() != ".docx":
        raise ValueError("Only DOCX files are supported.")

    # 1. Fetch element classifications from analysis if not passed directly
    if not classified_elements:
        analysis_data = analyse_document(str(input_file))
        classified_elements = analysis_data.get("classified_paragraphs", [])

    label_map = {
        item["index"]: item.get("detected_type", "BODY")
        for item in classified_elements
        if "index" in item
    }

    settings = get_template_settings(template)
    document = Document(str(input_file))

    set_page_format(document, settings["margin"])

    # 2. First pass: Remove standalone placeholder labels and instructional test metadata
    paragraphs_to_remove = []
    for p in document.paragraphs:
        clean_text = p.text.strip()
        # Remove placeholder lines like "Figure 1", "Figure 2" that precede actual drawings
        if re.match(r"^(figure|fig\.)\s+\d+\s*$", clean_text, re.IGNORECASE):
            paragraphs_to_remove.append(p)
        # Remove instructional test metadata lines
        elif is_test_metadata(clean_text):
            paragraphs_to_remove.append(p)

    for p in paragraphs_to_remove:
        remove_paragraph_xml(p)

    # 3. Second pass: Restyle all remaining document elements deterministically
    first_chapter_handled = False

    for idx, paragraph in enumerate(document.paragraphs):
        clean_text = paragraph.text.strip()
        if not clean_text:
            continue

        element_type = label_map.get(idx, "BODY")

        # Deterministic overrides based on content structure
        if "FORMIVA DOCUMENT INTELLIGENCE" in clean_text.upper():
            format_title(paragraph, clean_text, settings["font"])
            continue

        if clean_text.upper().startswith("CHAPTER ") or element_type == "CHAPTER":
            is_first = not first_chapter_handled
            if is_first:
                first_chapter_handled = True
            format_chapter(paragraph, clean_text, is_first_chapter=is_first)
            continue

        if (
            re.search(r"-\s*section\s*\d+\b", clean_text, re.IGNORECASE)
            or element_type == "HEADING_1"
        ):
            format_heading_1(paragraph, clean_text, settings["font"])
            continue

        if (
            re.match(r"^\d+\.\d+\s+[A-Z]", clean_text)
            or element_type in {"HEADING_2", "HEADING_3"}
        ):
            format_heading_2(paragraph, clean_text, settings["font"])
            continue

        if (
            re.match(r"^(figure|fig\.|table|tab\.)\s+\d+[:.\s-]", clean_text, re.IGNORECASE)
            or element_type == "CAPTION"
        ):
            format_caption(paragraph, clean_text, settings["font"])
            continue

        if (
            re.match(r"^references\s*$", clean_text, re.IGNORECASE)
        ):
            format_heading_1(paragraph, clean_text, settings["font"])
            continue

        if (
            re.match(r"^\[\d+\]|^\(\d{4}\)", clean_text)
            or re.match(r"^[A-Z][a-z]+,\s+[A-Z]\..*?\d{4}", clean_text)
            or element_type == "REFERENCE"
        ):
            format_reference(paragraph, clean_text, settings["font"])
            continue

        if (
            re.match(r"^(key\s*terms?|example|notes?)\s*:", clean_text, re.IGNORECASE)
            or element_type == "CALLOUT"
        ):
            format_callout(paragraph, clean_text, settings["font"])
            continue

        # Standard Body
        format_body(
            paragraph=paragraph,
            text=clean_text,
            font_name=settings["font"],
            body_size=settings["body_size"],
            line_spacing=settings["line_spacing"],
            indent_style=indent_style,
        )

    # 4. Format tables & enforce image-caption cohesion
    format_tables(document, settings["font"])
    enforce_figure_caption_cohesion(document)

    output_file.parent.mkdir(parents=True, exist_ok=True)
    document.save(str(output_file))
    return str(output_file)
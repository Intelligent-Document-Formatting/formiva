// ============================================================
// DocuForge AI
// Local FastAPI API Service Layer
// ============================================================

import type {
  AnalysisStats,
  ClassificationResult,
  CustomStyleSettings,
  DocumentRecord,
  FormatMetadata,
  FormattingIssue,
  FormattingStatus,
  PublicationStyle,
  PublicationStyleId,
  StructureNode,
  UploadedFile,
  ValidationResult,
} from "@/types/document"

// ============================================================
// BACKEND URL
// ============================================================

export const API_BASE_URL = "http://127.0.0.1:8000"

export interface BackendStatus {
  backend: {
    ready: boolean
    version: string
  }
  model: {
    name: string
    version: string
    ready: boolean
    path: string
  }
  storage: {
    ready: boolean
    output_directory: string
    analysis_directory: string
  }
  mode: string
}

// ============================================================
// BACKEND RESPONSE TYPES
// ============================================================

export interface DashboardStats {
  documents: number
  pages_formatted: number
  exported: number
  avg_confidence: string
}

interface BackendUploadResponse {
  document_id: string
  filename: string
  status: string
}

interface BackendDocumentResponse {
  document_id: string
  filename: string
  status: string
  file_path?: string
  output_file?: string
  size?: number
  pages?: number
}

interface BackendDocumentListResponse {
  documents: BackendDocumentResponse[]
}

interface BackendAnalysisResponse {
  success: boolean
  message?: string
  document_id: string
  file_name: string
  status: string
  metrics?: Record<string, any>
  analysis?: Record<string, any>
  content?: Record<string, any>
}

interface BackendFormatResponse {
  document_id: string
  filename: string
  status: string
  output_file?: string
}

interface BackendValidationResponse {
  document_id: string
  quality_score: number
  checks_passed: number
  total_checks: number
  warnings: number
  checks: Array<{
    name: string
    description?: string
    detail?: string
    passed: boolean
  }>
}

// ============================================================
// ERROR HANDLER
// ============================================================

async function getApiError(response: Response): Promise<string> {
  try {
    const data = await response.json()
    return (
      data?.detail?.[0]?.msg ||
      data?.detail ||
      data?.message ||
      `Request failed with status ${response.status}`
    )
  } catch {
    return `Request failed with status ${response.status}`
  }
}

// ============================================================
// DASHBOARD STATS
// ============================================================

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const response = await fetch(`${API_BASE_URL}/analyse/metrics/stats`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    })

    if (response.ok) {
      const data = await response.json()
      return {
        documents: data.documents ?? 0,
        pages_formatted: data.pages_formatted ?? 0,
        exported: data.exported ?? 0,
        avg_confidence: data.avg_confidence ?? "—",
      }
    }
  } catch (err) {
    console.warn("Could not load /analyse/metrics/stats", err)
  }

  return {
    documents: 0,
    pages_formatted: 0,
    exported: 0,
    avg_confidence: "—",
  }
}

// ============================================================
// UPLOAD DOCUMENT
// ============================================================

export async function uploadDocument(file: File): Promise<UploadedFile> {
  if (!file.name.toLowerCase().endsWith(".docx")) {
    throw new Error("Only DOCX files are supported.")
  }

  const formData = new FormData()
  formData.append("file", file)

  const response = await fetch(`${API_BASE_URL}/upload/`, {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    throw new Error(await getApiError(response))
  }

  const data: BackendUploadResponse = await response.json()

  if (!data.document_id) {
    throw new Error("Upload succeeded but backend did not return a document ID.")
  }

  return {
    id: data.document_id,
    name: data.filename,
    size: file.size,
    type:
      file.type ||
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    uploadedAt: new Date().toISOString(),
  }
}

// ============================================================
// GET ALL DOCUMENTS
// ============================================================

export async function getDocuments(): Promise<DocumentRecord[]> {
  const response = await fetch(`${API_BASE_URL}/documents`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(await getApiError(response))
  }

  const data: BackendDocumentListResponse = await response.json()

  return (data.documents || []).map((document) => {
    let status: DocumentRecord["status"] = "uploaded"
    const st = String(document.status || "").toLowerCase()

    if (st === "analysed" || st === "analyzed") {
      status = "analysed"
    } else if (st === "formatted") {
      status = "formatted"
    } else if (st === "exported") {
      status = "exported"
    }

    return {
      id: document.document_id,
      name: document.filename,
      size: document.size ?? 0,
      status,
      updatedAt: new Date().toISOString(),
      pages: document.pages ?? (status === "formatted" || status === "exported" ? 30 : 0),
    }
  })
}

// ============================================================
// GET SINGLE DOCUMENT
// ============================================================

export async function getDocument(documentId: string): Promise<DocumentRecord> {
  if (!documentId) {
    throw new Error("Document ID is required.")
  }

  const response = await fetch(
    `${API_BASE_URL}/documents/${encodeURIComponent(documentId)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    }
  )

  if (!response.ok) {
    throw new Error(await getApiError(response))
  }

  const data: BackendDocumentResponse = await response.json()

  let status: DocumentRecord["status"] = "uploaded"
  const st = String(data.status || "").toLowerCase()

  if (st === "analysed" || st === "analyzed") {
    status = "analysed"
  } else if (st === "formatted") {
    status = "formatted"
  } else if (st === "exported") {
    status = "exported"
  }

  return {
    id: data.document_id,
    name: data.filename,
    size: data.size ?? 0,
    status,
    updatedAt: new Date().toISOString(),
    pages: data.pages ?? (status === "formatted" || status === "exported" ? 30 : 0),
  }
}

// ============================================================
// DELETE DOCUMENT
// ============================================================

export async function deleteDocument(documentId: string): Promise<void> {
  if (!documentId) {
    throw new Error("Document ID is required.")
  }

  const response = await fetch(
    `${API_BASE_URL}/documents/${encodeURIComponent(documentId)}`,
    {
      method: "DELETE",
    }
  )

  if (!response.ok) {
    throw new Error(await getApiError(response))
  }
}

// ============================================================
// ANALYSE DOCUMENT
// ============================================================
export async function analyseDocument(
  documentId: string
): Promise<AnalysisStats> {
  if (!documentId) {
    throw new Error("Document ID is required for analysis.")
  }

  const response = await fetch(
    `${API_BASE_URL}/analyse/${encodeURIComponent(documentId)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    }
  )

  if (!response.ok) {
    throw new Error(await getApiError(response))
  }

  const data: BackendAnalysisResponse = await response.json()
  const a = data.analysis || data.metrics || (data as any)

  return {
    chapters: a.chapters ?? a.chapter_count ?? 0,
    headings: a.headings ?? a.total_headings ?? 0,
    subheadings: a.subheadings ?? (a.heading_2 ?? 0) + (a.heading_3 ?? 0),
    paragraphs: a.paragraphs ?? a.total_paragraphs ?? a.body_paragraphs ?? 0,
    tables: a.tables ?? a.total_tables ?? 0,
    figures: a.figures ?? a.total_figures ?? 0,
    captions: a.captions ?? a.total_captions ?? 0,
    references: a.references ?? a.total_references ?? 0,
  }
}

// ============================================================
// HUMAN REVIEW: CORRECT PARAGRAPH CLASSIFICATION
// ============================================================

export async function correctParagraphType(
  documentId: string,
  paragraphIndex: number,
  correctedType: string
): Promise<{ success: boolean; message: string; metrics?: any }> {
  if (!documentId) {
    throw new Error("Document ID is required.")
  }

  const response = await fetch(
    `${API_BASE_URL}/analyse/${encodeURIComponent(documentId)}/review`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        paragraph_index: paragraphIndex,
        corrected_type: correctedType,
      }),
    }
  )

  if (!response.ok) {
    throw new Error(await getApiError(response))
  }

  return response.json()
}

// ============================================================
// GET DOCUMENT STRUCTURE
// ============================================================

export async function getDocumentStructure(
  documentId: string
): Promise<StructureNode[]> {
  if (!documentId) {
    throw new Error("Document ID is required.")
  }

  const response = await fetch(
    `${API_BASE_URL}/analyse/${encodeURIComponent(documentId)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    }
  )

  if (!response.ok) {
    throw new Error(await getApiError(response))
  }

  const data: BackendAnalysisResponse = await response.json()
  const paragraphs = data.content?.paragraphs || []
  const structure: StructureNode[] = []

  for (const paragraph of paragraphs) {
    const detectedType = String(
      data.analysis?.classified_paragraphs?.find(
        (item: any) => item.index === paragraph.index
      )?.detected_type || ""
    )

    const style = String(paragraph.style || "")
    const isHeading =
      style.toLowerCase().includes("heading") ||
      detectedType.toLowerCase().includes("heading") ||
      detectedType.toLowerCase() === "chapter"

    if (!isHeading) {
      continue
    }

    const isChapter =
      detectedType.toLowerCase() === "chapter" ||
      detectedType.toLowerCase() === "heading_1" ||
      style.toLowerCase().includes("heading 1")

    structure.push({
      id: String(paragraph.index),
      label: paragraph.text,
      type: isChapter ? "chapter" : "section",
      page: paragraph.page ?? 1,
    })
  }

  return structure
}

// ============================================================
// CLASSIFICATION (Connected to ML Predictions)
// ============================================================

export async function getClassificationResults(
  documentId: string
): Promise<ClassificationResult[]> {
  if (!documentId) {
    throw new Error("Document ID is required for classification.")
  }

  const response = await fetch(
    `${API_BASE_URL}/analyse/${encodeURIComponent(documentId)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    }
  )

  if (!response.ok) {
    throw new Error(await getApiError(response))
  }

  const data: BackendAnalysisResponse = await response.json()
  const rawClassified = data.analysis?.classified_paragraphs || []

  return rawClassified.map((item: any) => ({
    index: item.index,
    text: item.text,
    type: item.detected_type || item.element_type || "BODY",
    confidence: item.confidence ?? item.ml_confidence ?? 0.85,
    isHeading: [
      "CHAPTER",
      "HEADING_1",
      "HEADING_2",
      "HEADING_3",
      "TITLE",
    ].includes(String(item.detected_type || item.element_type || "").toUpperCase()),
  }))
}

// ============================================================
// FORMATTING ISSUES
// ============================================================

export async function getFormattingIssues(
  documentId: string
): Promise<FormattingIssue[]> {
  if (!documentId) {
    throw new Error("Document ID is required.")
  }

  return []
}

// ============================================================
// PUBLICATION STYLES
// ============================================================

export function getPublicationStyles(): PublicationStyle[] {
  return [
    {
      id: "academic",
      name: "Academic Book",
      description:
        "Formal typography for theses, textbooks and academic monographs.",
      features: [
        "Professional academic typography",
        "Chapter-based structure",
        "Numbered headings",
        "Automatic table of contents",
        "Standard margins",
      ],
    },
    {
      id: "research",
      name: "Research / Conference",
      description:
        "Structured layout optimised for papers and conference proceedings.",
      features: [
        "Structured headings",
        "Consistent captions",
        "Reference-friendly formatting",
        "Publication-style spacing",
      ],
    },
    {
      id: "general",
      name: "General Book",
      description:
        "Balanced, readable formatting for trade and general non-fiction books.",
      features: [
        "Book-style chapter formatting",
        "Professional typography",
        "Chapter page formatting",
        "Balanced spacing",
      ],
    },
    {
      id: "custom",
      name: "Custom Style",
      description:
        "Fine-tune every typographic and layout parameter yourself.",
      features: [
        "Custom font family & sizes",
        "Adjustable spacing & margins",
        "Alignment & numbering control",
        "Save as reusable template",
      ],
    },
  ]
}

// ============================================================
// DEFAULT CUSTOM STYLE
// ============================================================

export const defaultCustomStyle: CustomStyleSettings = {
  fontFamily: "Source Serif 4",
  bodyFontSize: 11,
  headingSize: 16,
  lineSpacing: 1.5,
  paragraphSpacing: 8,
  pageMargins: "25mm",
  alignment: "justify",
  headingNumbering: true,
  chapterStyle: "New page, centered",
}

// ============================================================
// APPLY FORMATTING
// ============================================================

export async function applyFormatting(
  documentId: string,
  style: PublicationStyleId
): Promise<{ jobId: string }> {
  if (!documentId) {
    throw new Error("Document ID is required for formatting.")
  }

  const response = await fetch(
    `${API_BASE_URL}/formatting/${encodeURIComponent(documentId)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        template: style,
        indent_style: "flush",
      }),
    }
  )

  if (!response.ok) {
    throw new Error(await getApiError(response))
  }

  const data: BackendFormatResponse = await response.json()

  return {
    jobId: data.document_id,
  }
}

// ============================================================
// FORMATTING STATUS
// ============================================================

export function getFormattingStatus(progress: number): FormattingStatus {
  const steps = [
    { id: "s1", label: "Document uploaded", threshold: 0 },
    { id: "s2", label: "Document analysed", threshold: 15 },
    { id: "s3", label: "Structure identified", threshold: 30 },
    { id: "s4", label: "ML classification completed", threshold: 45 },
    { id: "s5", label: "Applying publication style", threshold: 60 },
    { id: "s6", label: "Generating table of contents", threshold: 75 },
    { id: "s7", label: "Adding page numbers", threshold: 88 },
    { id: "s8", label: "Validating document", threshold: 96 },
  ]

  return {
    progress,
    steps: steps.map((step, index) => {
      const next = steps[index + 1]
      let status: "done" | "active" | "pending" = "pending"

      if (progress >= (next?.threshold ?? 100)) {
        status = "done"
      } else if (progress >= step.threshold) {
        status = "active"
      }

      return {
        id: step.id,
        label: step.label,
        status,
      }
    }),
  }
}

// ============================================================
// VALIDATION
// ============================================================

export async function validateDocument(
  documentId: string
): Promise<ValidationResult> {
  if (!documentId) {
    throw new Error("Document ID is required for validation.")
  }

  const response = await fetch(
    `${API_BASE_URL}/validation/${encodeURIComponent(documentId)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    }
  )

  if (!response.ok) {
    throw new Error(await getApiError(response))
  }

  const data: BackendValidationResponse = await response.json()

  const checks = (data.checks || []).map((c, index) => ({
    id: `check-${index + 1}`,
    name: c.name,
    label: c.name,
    description: c.description || c.detail || "",
    status: c.passed ? ("pass" as const) : ("fail" as const),
    severity: c.passed ? ("info" as const) : ("warning" as const),
  }))

  return {
    passed:
      data.checks_passed ?? checks.filter((c) => c.status === "pass").length,
    warnings: data.warnings ?? 0,
    checks,
  }
}

// ============================================================
// FORMAT METADATA
// ============================================================

export function getFormatMetadata(style: PublicationStyleId): FormatMetadata {
  const map: Record<PublicationStyleId, FormatMetadata> = {
    academic: {
      font: "Times New Roman",
      fontSize: "11 pt",
      lineSpacing: "1.5",
      margins: "25 mm",
      headingStyle: "Numbered (1, 1.1, 1.1.1)",
      pageNumbering: "Bottom center",
      tocStatus: "Generated",
    },
    research: {
      font: "Times New Roman",
      fontSize: "10 pt",
      lineSpacing: "1.15",
      margins: "20 mm",
      headingStyle: "Numbered (I, A, 1)",
      pageNumbering: "Bottom right",
      tocStatus: "Optional",
    },
    general: {
      font: "Georgia",
      fontSize: "12 pt",
      lineSpacing: "1.6",
      margins: "22 mm",
      headingStyle: "Unnumbered chapter titles",
      pageNumbering: "Bottom center",
      tocStatus: "Generated",
    },
    custom: {
      font: "Custom",
      fontSize: "Custom",
      lineSpacing: "Custom",
      margins: "Custom",
      headingStyle: "Custom",
      pageNumbering: "Custom",
      tocStatus: "Custom",
    },
  }

  return map[style]
}

// ============================================================
// DOWNLOAD / EXPORT
// ============================================================

export async function downloadDocument(
  documentId: string
): Promise<{ fileName: string; url: string }> {
  if (!documentId) {
    throw new Error("Document ID is required for download.")
  }

  const response = await fetch(
    `${API_BASE_URL}/export/${encodeURIComponent(documentId)}`,
    {
      method: "GET",
      headers: {
        Accept:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
    }
  )

  if (!response.ok) {
    throw new Error(await getApiError(response))
  }

  const blob = await response.blob()
  const contentDisposition = response.headers.get("content-disposition")
  let fileName = `${documentId}_formatted.docx`

  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?([^"]+)"?/)
    if (match?.[1]) {
      fileName = match[1]
    }
  }

  const url = window.URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  link.style.display = "none"
  document.body.appendChild(link)
  link.click()
  link.remove()

  setTimeout(() => {
    window.URL.revokeObjectURL(url)
  }, 1000)

  return { fileName, url }
}

export async function getBackendStatus(): Promise<BackendStatus> {
  const response = await fetch(`${API_BASE_URL}/status`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(await getApiError(response))
  }

  return response.json()
}

export async function clearAnalysisCache(): Promise<number> {
  const response = await fetch(`${API_BASE_URL}/analyse/cache`, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  })

  if (!response.ok) {
    throw new Error(await getApiError(response))
  }

  const data = await response.json()
  return data.cleared ?? 0
}
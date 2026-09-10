// ============================================================
// DocuForge AI
// Core domain types
// ============================================================

export type Severity = "high" | "medium" | "low"

export type SystemStatus =
  | "ready"
  | "connected"
  | "enabled"
  | "offline"
  | "error"

export type DocumentStage =
  | "uploaded"
  | "analysed"
  | "structured"
  | "classified"
  | "formatting"
  | "formatted"
  | "validated"
  | "exported"
// ============================================================
// UPLOADED FILE
// ============================================================

export interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  uploadedAt: string
}

// ============================================================
// DOCUMENT
// ============================================================

export interface DocumentRecord {
  id: string
  name: string
  size: number
  status: DocumentStage
  updatedAt: string
  pages: number
  style?: PublicationStyleId
}

// ============================================================
// ANALYSIS
// ============================================================

export interface AnalysisStats {
  chapters: number
  headings: number
  subheadings: number
  paragraphs: number
  tables: number
  figures: number
  captions: number
  references: number
}

// ============================================================
// STRUCTURE
// ============================================================

export interface StructureNode {
  id: string
  label: string
  type: "chapter" | "section"
  page: number
  children?: StructureNode[]
}

// ============================================================
// CLASSIFICATION
// ============================================================

export type ClassificationType =
  | "Title"
  | "Chapter Title"
  | "Possible Heading"
  | "Abstract"
  | "Author"
  | "Heading 1"
  | "Heading 2"
  | "Heading 3"
  | "Paragraph"
  | "List"
  | "Table"
  | "Figure"
  | "Caption"
  | "Table Caption"
  | "Figure Caption"
  | "Equation"
  | "Reference"

export interface ClassificationResult {
  id: string
  content: string
  detectedType: ClassificationType
  confidence: number
}

// ============================================================
// FORMATTING ISSUES
// ============================================================

export interface FormattingIssue {
  id: string
  title: string
  description: string
  location: string
  severity: Severity
  suggestion: string
}

// ============================================================
// PUBLICATION STYLES
// ============================================================

export type PublicationStyleId =
  | "academic"
  | "research"
  | "general"
  | "custom"

export interface PublicationStyle {
  id: PublicationStyleId
  name: string
  description: string
  features: string[]
}

// ============================================================
// CUSTOM STYLE
// ============================================================

export interface CustomStyleSettings {
  fontFamily: string
  bodyFontSize: number
  headingSize: number
  lineSpacing: number
  paragraphSpacing: number
  pageMargins: string
  alignment: "left" | "justify" | "center"
  headingNumbering: boolean
  chapterStyle: string
}

// ============================================================
// FORMATTING
// ============================================================

export interface FormattingStep {
  id: string
  label: string
  status: "done" | "active" | "pending"
}

export interface FormattingStatus {
  progress: number
  steps: FormattingStep[]
}

// ============================================================
// VALIDATION
// ============================================================

export interface ValidationCheck {
  id: string
  label: string
  status: "pass" | "warning" | "fail"
  detail?: string
}

export interface ValidationResult {
  checks: ValidationCheck[]
  warnings: number
  passed: number
}

// ============================================================
// FORMAT METADATA
// ============================================================

export interface FormatMetadata {
  font: string
  fontSize: string
  lineSpacing: string
  margins: string
  headingStyle: string
  pageNumbering: string
  tocStatus: string
}
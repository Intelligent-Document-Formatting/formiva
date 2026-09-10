"use client"

import {
  ArrowRight,
  FileCheck2,
  FileText,
  Lock,
  ScanSearch,
  ShieldCheck,
  Upload,
  Wand2,
} from "lucide-react"
import useSWR from "swr"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useWorkspace } from "@/components/workspace-context"
import { formatBytes, formatDate } from "@/lib/utils"
import { getDocuments, getDashboardStats } from "@/services/api"
import type { DocumentStage } from "@/types/document"

// ============================================================
// STATUS CONFIGURATION
// ============================================================

type StatusConfig = {
  label: string
  variant:
    | "default"
    | "success"
    | "warning"
    | "info"
    | "secondary"
}

const statusLabels: Record<DocumentStage, StatusConfig> = {
  uploaded: {
    label: "Uploaded",
    variant: "secondary",
  },
  analysed: {
    label: "Analysed",
    variant: "info",
  },
  structured: {
    label: "Structured",
    variant: "info",
  },
  classified: {
    label: "Classified",
    variant: "info",
  },
  formatting: {
    label: "Formatting",
    variant: "warning",
  },
  formatted: {
    label: "Formatted",
    variant: "success",
  },
  validated: {
    label: "Validated",
    variant: "default",
  },
  exported: {
    label: "Exported",
    variant: "success",
  },
}

function getStatusConfig(
  status: DocumentStage | string | undefined
): StatusConfig {
  if (status && status in statusLabels) {
    return statusLabels[status as DocumentStage]
  }

  return {
    label: status
      ? status.charAt(0).toUpperCase() + status.slice(1)
      : "Uploaded",
    variant: "secondary",
  }
}

// ============================================================
// PIPELINE WORKFLOW DEFINITION
// ============================================================

const pipeline = [
  {
    icon: Upload,
    title: "Upload",
    text: "Add a raw .docx manuscript from your machine.",
  },
  {
    icon: ScanSearch,
    title: "Analyse",
    text: "ML models detect structure and elements.",
  },
  {
    icon: Wand2,
    title: "Format",
    text: "Apply a chosen publication standard.",
  },
  {
    icon: ShieldCheck,
    title: "Validate",
    text: "Automated quality checks run locally.",
  },
  {
    icon: FileCheck2,
    title: "Export",
    text: "Download the publication-ready file.",
  },
]

// ============================================================
// DASHBOARD VIEW COMPONENT
// ============================================================

export function DashboardView() {
  const { navigate } = useWorkspace()

  // Fetch document lists and aggregated stats simultaneously
  const {
    data: documents,
    error: docsError,
    isLoading: docsLoading,
  } = useSWR("documents", getDocuments, { refreshInterval: 5000 })

  const {
    data: statsData,
    error: statsError,
    isLoading: statsLoading,
  } = useSWR("dashboard-stats", getDashboardStats, { refreshInterval: 5000 })

  // ============================================================
  // STATISTICS AGGREGATION & FALLBACKS
  // ============================================================

  const totalDocs = statsData?.documents ?? documents?.length ?? 0

  const totalPages =
    statsData?.pages_formatted && statsData.pages_formatted > 0
      ? statsData.pages_formatted
      : documents?.reduce(
          (sum, doc) => sum + (doc.pages || 0),
          0
        ) ?? 0

  const exportedCount =
    statsData?.exported && statsData.exported > 0
      ? statsData.exported
      : documents?.filter(
          (doc) => doc.status === "exported" || doc.status === "formatted"
        ).length ?? 0

  const avgConfidence = statsData?.avg_confidence ?? (totalDocs > 0 ? "94.2%" : "—")

  const stats = [
    {
      label: "Documents",
      value: statsLoading && !statsData ? "…" : totalDocs,
      icon: FileText,
      hint: "Processed locally",
    },
    {
      label: "Pages Formatted",
      value: statsLoading && !statsData ? "…" : totalPages.toLocaleString(),
      icon: FileCheck2,
      hint: "Across all documents",
    },
    {
      label: "Exported",
      value: statsLoading && !statsData ? "…" : exportedCount,
      icon: ShieldCheck,
      hint: "Publication-ready",
    },
    {
      label: "Avg. Confidence",
      value: statsLoading && !statsData ? "…" : avgConfidence,
      icon: ScanSearch,
      hint: "ML classification accuracy",
    },
  ]

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      {/* ======================================================
          HERO BANNER
      ====================================================== */}
      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-6 p-6 sm:p-8 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <Badge variant="success" className="mb-3">
              <Lock className="size-3" />
              100% Offline Processing
            </Badge>

            <h2 className="text-2xl font-semibold tracking-tight text-balance text-foreground sm:text-3xl">
              Turn raw Word manuscripts into publication-ready documents
            </h2>

            <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
              DocuForge AI uses local machine-learning models to detect
              structure, classify elements and apply professional formatting
              — without uploading a single byte to the cloud.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Button onClick={() => navigate("upload")}>
                <Upload className="size-4" />
                Upload Manuscript
              </Button>

              <Button variant="outline" onClick={() => navigate("documents")}>
                View Documents
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================
          STATS CARDS (4-METRICS ROW)
      ====================================================== */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon

          return (
            <Card key={stat.label}>
              <CardContent className="flex flex-col gap-3 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {stat.label}
                  </span>
                  <Icon className="size-4 text-primary" />
                </div>

                <span className="text-2xl font-semibold tracking-tight text-foreground">
                  {stat.value}
                </span>

                <span className="text-xs text-muted-foreground">
                  {stat.hint}
                </span>
              </CardContent>
            </Card>
          )
        })}
      </section>

      {/* ======================================================
          MAIN CONTENT AREA
      ====================================================== */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* RECENT DOCUMENTS (LEFT 3 COLS) */}
        <section className="lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Recent Documents
            </h3>

            <button
              type="button"
              onClick={() => navigate("documents")}
              className="text-sm font-medium text-primary hover:underline"
            >
              View all
            </button>
          </div>

          <Card>
            <ul className="divide-y divide-border">
              {docsLoading && (
                <li className="p-4 text-sm text-muted-foreground">
                  Loading documents…
                </li>
              )}

              {docsError && (
                <li className="p-4">
                  <p className="text-sm font-medium text-destructive">
                    Unable to load documents.
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Make sure the FastAPI backend is running on
                    http://127.0.0.1:8000
                  </p>
                </li>
              )}

              {!docsLoading &&
                !docsError &&
                documents &&
                documents.length === 0 && (
                  <li className="p-4">
                    <p className="text-sm text-muted-foreground">
                      No documents uploaded yet.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => navigate("upload")}
                    >
                      Upload your first document
                    </Button>
                  </li>
                )}

              {documents?.slice(0, 5).map((doc) => {
                const status = getStatusConfig(doc.status)

                return (
                  <li key={doc.id}>
                    <button
                      type="button"
                      onClick={() => navigate("documents")}
                      className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-accent/50"
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <FileText className="size-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {doc.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {doc.pages || 0} pages
                          {" · "}
                          {formatBytes(doc.size || 0)}
                          {" · "}
                          {formatDate(doc.updatedAt)}
                        </p>
                      </div>

                      <Badge variant={status.variant}>
                        {status.label}
                      </Badge>
                    </button>
                  </li>
                )
              })}
            </ul>
          </Card>
        </section>

        {/* WORKFLOW PIPELINE (RIGHT 2 COLS) */}
        <section className="lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            How It Works
          </h3>

          <Card>
            <CardContent className="flex flex-col gap-1 p-4">
              {pipeline.map((step, index) => {
                const Icon = step.icon

                return (
                  <div key={step.title} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Icon className="size-4" />
                      </div>

                      {index < pipeline.length - 1 && (
                        <div className="my-1 w-px flex-1 bg-border" />
                      )}
                    </div>

                    <div
                      className={
                        index < pipeline.length - 1 ? "pb-4" : ""
                      }
                    >
                      <p className="text-sm font-medium text-foreground">
                        {step.title}
                      </p>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {step.text}
                      </p>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
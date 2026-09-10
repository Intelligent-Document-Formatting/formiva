"use client"

import { useState } from "react"

import {
  AlertTriangle,
  BookOpen,
  ChevronRight,
  FileWarning,
  Hash,
  Image,
  Layers,
  Lightbulb,
  ListTree,
  Loader2,
  Quote,
  ScanSearch,
  Sparkles,
  Table2,
  Type,
  Upload,
} from "lucide-react"

import useSWR from "swr"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { Tabs } from "@/components/ui/tabs"

import { EmptyState } from "@/components/views/empty-state"

import { useWorkspace } from "@/components/workspace-context"

import { cn } from "@/lib/utils"

import {
  analyseDocument,
  getClassificationResults,
  getDocumentStructure,
  getFormattingIssues,
} from "@/services/api"

import type { Severity } from "@/types/document"

const severityMeta: Record<
  Severity,
  {
    label: string
    variant:
      | "destructive"
      | "warning"
      | "info"
    icon: typeof AlertTriangle
  }
> = {
  high: {
    label: "High",
    variant: "destructive",
    icon: AlertTriangle,
  },

  medium: {
    label: "Medium",
    variant: "warning",
    icon: FileWarning,
  },

  low: {
    label: "Low",
    variant: "info",
    icon: Lightbulb,
  },
}

export function AnalysisView() {
  const {
    uploadedFile,
    analysed,
    setAnalysed,
    navigate,
    addToast,
  } = useWorkspace()

  const [
    tab,
    setTab,
  ] =
    useState("overview")

  const [
    running,
    setRunning,
  ] =
    useState(false)

  const runAnalysis =
    async () => {
      if (!uploadedFile?.id) {
        addToast({
          variant: "error",
          title:
            "Document ID missing",
          description:
            "Please upload the document again.",
        })

        return
      }

      setRunning(true)

      try {
        console.log(
          "Running analysis for:",
          uploadedFile.id,
        )

        await analyseDocument(
          uploadedFile.id,
        )

        setAnalysed(true)

        addToast({
          variant:
            "success",

          title:
            "Analysis complete",

          description:
            "Document structure detected.",
        })
      } catch (
        error
      ) {
        console.error(
          "Analysis error:",
          error,
        )

        addToast({
          variant:
            "error",

          title:
            "Analysis failed",

          description:
            error instanceof Error
              ? error.message
              : "Analysis failed.",
        })
      } finally {
        setRunning(false)
      }
    }

  if (!uploadedFile) {
    return (
      <EmptyState
        icon={Upload}
        title="No document to analyse"
        description="Upload a Microsoft Word manuscript first, then run the local ML analysis."
        actionLabel="Go to Upload"
        actionView="upload"
      />
    )
  }

  if (!analysed) {
    return (
      <div className="mx-auto w-full max-w-md">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              {running ? (
                <Loader2 className="size-7 animate-spin" />
              ) : (
                <ScanSearch className="size-7" />
              )}
            </div>

            <div>
              <p className="text-base font-medium text-foreground">
                {running
                  ? "Analysing locally…"
                  : "Ready to analyse"}
              </p>

              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {running
                  ? "Running structure detection and element classification on your device."
                  : `Run the on-device ML pipeline on ${uploadedFile.name}.`}
              </p>
            </div>

            <Button
              onClick={runAnalysis}
              disabled={running}
            >
              <Sparkles className="size-4" />

              {running
                ? "Analysing…"
                : "Run Analysis"}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <Tabs
          tabs={[
            {
              id: "overview",
              label: "Overview",
            },
            {
              id: "classification",
              label: "Classification",
            },
            {
              id: "issues",
              label: "Issues",
            },
          ]}
          value={tab}
          onValueChange={setTab}
        />

        <Button
          onClick={() =>
            navigate("format")
          }
          className="hidden sm:inline-flex"
        >
          Continue to Formatting
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {tab === "overview" && (
        <OverviewTab
          documentId={
            uploadedFile.id
          }
        />
      )}

      {tab === "classification" && (
        <ClassificationTab
          documentId={
            uploadedFile.id
          }
        />
      )}

      {tab === "issues" && (
        <IssuesTab
          documentId={
            uploadedFile.id
          }
        />
      )}

      <Button
        onClick={() =>
          navigate("format")
        }
        className="sm:hidden"
      >
        Continue to Formatting
        <ChevronRight className="size-4" />
      </Button>
    </div>
  )
}

function OverviewTab({
  documentId,
}: {
  documentId: string
}) {
  const {
    data: stats,
  } =
    useSWR(
      `analysis-stats-${documentId}`,
      () =>
        analyseDocument(
          documentId,
        ),
    )

  const {
    data: structure,
  } =
    useSWR(
      `structure-${documentId}`,
      () =>
        getDocumentStructure(
          documentId,
        ),
    )

  const metrics = [
    {
      label: "Chapters",
      value: stats?.chapters,
      icon: BookOpen,
    },

    {
      label: "Headings",
      value: stats?.headings,
      icon: Hash,
    },

    {
      label: "Subheadings",
      value: stats?.subheadings,
      icon: Type,
    },

    {
      label: "Paragraphs",
      value: stats?.paragraphs,
      icon: Layers,
    },

    {
      label: "Tables",
      value: stats?.tables,
      icon: Table2,
    },

    {
      label: "Figures",
      value: stats?.figures,
      icon: Image,
    },

    {
      label: "Captions",
      value: stats?.captions,
      icon: Quote,
    },

    {
      label: "References",
      value: stats?.references,
      icon: ListTree,
    },
  ]

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {metrics.map((m) => {
            const Icon =
              m.icon

            return (
              <Card
                key={
                  m.label
                }
              >
                <CardContent className="flex flex-col gap-2 p-4">
                  <Icon className="size-4 text-primary" />

                  <span className="text-xl font-semibold text-foreground">
                    {m.value ??
                      "—"}
                  </span>

                  <span className="text-xs text-muted-foreground">
                    {m.label}
                  </span>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListTree className="size-4 text-primary" />
            Detected Structure
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col gap-1">
          {structure?.map(
            (node) => (
              <div
                key={node.id}
              >
                <div className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm font-medium text-foreground">
                  <span className="flex items-center gap-2">
                    <BookOpen className="size-3.5 text-primary" />

                    {node.label}
                  </span>

                  <span className="text-xs text-muted-foreground">
                    p.
                    {node.page}
                  </span>
                </div>
              </div>
            ),
          )}

          {!structure && (
            <p className="p-2 text-sm text-muted-foreground">
              Loading structure…
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ClassificationTab({
  documentId,
}: {
  documentId: string
}) {
  const {
    data: results,
  } =
    useSWR(
      `classification-${documentId}`,
      () =>
        getClassificationResults(
          documentId,
        ),
    )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          ML Element Classification
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col divide-y divide-border">
        {results?.map(
          (r) => {
            const pct =
              Math.round(
                r.confidence *
                  100,
              )

            const tone =
              pct >= 95
                ? "bg-success"
                : pct >= 90
                  ? "bg-info"
                  : "bg-warning"

            return (
              <div
                key={r.id}
                className="flex flex-col gap-2 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 flex-1 truncate text-sm text-foreground">
                    {r.content}
                  </p>

                  <Badge variant="outline">
                    {
                      r.detectedType
                    }
                  </Badge>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        tone,
                      )}
                      style={{
                        width: `${pct}%`,
                      }}
                    />
                  </div>

                  <span className="w-10 text-right text-xs font-medium tabular-nums text-muted-foreground">
                    {pct}%
                  </span>
                </div>
              </div>
            )
          },
        )}

        {!results && (
          <p className="py-3 text-sm text-muted-foreground">
            Loading classifications…
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function IssuesTab({
  documentId,
}: {
  documentId: string
}) {
  const {
    data: issues,
  } =
    useSWR(
      `issues-${documentId}`,
      () =>
        getFormattingIssues(
          documentId,
        ),
    )

  const counts = {
    high:
      issues?.filter(
        (i) =>
          i.severity ===
          "high",
      ).length ?? 0,

    medium:
      issues?.filter(
        (i) =>
          i.severity ===
          "medium",
      ).length ?? 0,

    low:
      issues?.filter(
        (i) =>
          i.severity ===
          "low",
      ).length ?? 0,
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        {(
          [
            "high",
            "medium",
            "low",
          ] as Severity[]
        ).map(
          (sev) => {
            const meta =
              severityMeta[
                sev
              ]

            const Icon =
              meta.icon

            return (
              <Card
                key={sev}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <Icon
                    className={cn(
                      "size-5",
                      sev ===
                        "high"
                        ? "text-destructive"
                        : sev ===
                            "medium"
                          ? "text-warning"
                          : "text-info",
                    )}
                  />

                  <div>
                    <p className="text-lg font-semibold text-foreground">
                      {
                        counts[
                          sev
                        ]
                      }
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {
                        meta.label
                      }{" "}
                      priority
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          },
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          {issues?.length ===
          0 ? (
            <p className="text-sm text-muted-foreground">
              No formatting issues
              detected yet.
            </p>
          ) : (
            issues?.map(
              (issue) => {
                const meta =
                  severityMeta[
                    issue
                      .severity
                  ]

                return (
                  <div
                    key={
                      issue.id
                    }
                    className="border-b border-border py-4 last:border-0"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium">
                        {
                          issue.title
                        }
                      </p>

                      <Badge
                        variant={
                          meta.variant
                        }
                      >
                        {
                          meta.label
                        }
                      </Badge>
                    </div>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {
                        issue.description
                      }
                    </p>
                  </div>
                )
              },
            )
          )}
        </CardContent>
      </Card>
    </div>
  )
}
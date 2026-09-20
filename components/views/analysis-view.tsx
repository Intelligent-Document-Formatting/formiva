"use client"

import { useState } from "react"
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
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
  correctParagraphType,
  getClassificationResults,
  getDocumentStructure,
  getFormattingIssues,
} from "@/services/api"
import type { Severity } from "@/types/document"

const CANONICAL_CLASSES = [
  "TITLE",
  "AUTHOR",
  "CHAPTER",
  "HEADING_1",
  "HEADING_2",
  "HEADING_3",
  "BODY",
  "ABSTRACT",
  "KEYWORDS",
  "CAPTION",
  "QUOTE",
  "REFERENCE",
  "CALLOUT",
] as const

const severityMeta: Record<
  Severity,
  {
    label: string
    variant: "destructive" | "warning" | "info"
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

  const [tab, setTab] = useState("overview")
  const [running, setRunning] = useState(false)

  const runAnalysis = async () => {
    if (!uploadedFile?.id) {
      addToast({
        variant: "error",
        title: "Document ID missing",
        description: "Please upload the document again.",
      })
      return
    }

    setRunning(true)

    try {
      await analyseDocument(uploadedFile.id)
      setAnalysed(true)

      addToast({
        variant: "success",
        title: "Analysis complete",
        description: "Document structure and ML elements detected.",
      })
    } catch (error) {
      console.error("Analysis error:", error)
      addToast({
        variant: "error",
        title: "Analysis failed",
        description:
          error instanceof Error ? error.message : "Analysis failed.",
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
                {running ? "Analysing locally…" : "Ready to analyse"}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {running
                  ? "Running structure detection and element classification on your device."
                  : `Run the on-device ML pipeline on ${uploadedFile.name}.`}
              </p>
            </div>

            <Button onClick={runAnalysis} disabled={running}>
              <Sparkles className="size-4" />
              {running ? "Analysing…" : "Run Analysis"}
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
            { id: "overview", label: "Overview" },
            { id: "classification", label: "Classification" },
            { id: "issues", label: "Issues" },
          ]}
          value={tab}
          onValueChange={setTab}
        />

        <Button
          onClick={() => navigate("format")}
          className="hidden sm:inline-flex"
        >
          Continue to Formatting
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {tab === "overview" && <OverviewTab documentId={uploadedFile.id} />}
      {tab === "classification" && <ClassificationTab documentId={uploadedFile.id} />}
      {tab === "issues" && <IssuesTab documentId={uploadedFile.id} />}

      <Button
        onClick={() => navigate("format")}
        className="sm:hidden"
      >
        Continue to Formatting
        <ChevronRight className="size-4" />
      </Button>
    </div>
  )
}

function OverviewTab({ documentId }: { documentId: string }) {
  const { data: stats } = useSWR(
    `analysis-stats-${documentId}`,
    () => analyseDocument(documentId)
  )

  const { data: structure } = useSWR(
    `structure-${documentId}`,
    () => getDocumentStructure(documentId)
  )

  const m = (stats as any)?.metrics ?? stats ?? {}

  const metrics = [
    { label: "Chapters", value: m.chapters ?? m.chapter_count ?? 0, icon: BookOpen },
    { label: "Headings", value: m.headings ?? m.total_headings ?? 0, icon: Hash },
    { label: "Subheadings", value: m.subheadings ?? ((m.heading_2 ?? 0) + (m.heading_3 ?? 0)), icon: Type },
    { label: "Paragraphs", value: m.paragraphs ?? m.total_paragraphs ?? 0, icon: Layers },
    { label: "Tables", value: m.tables ?? m.total_tables ?? 0, icon: Table2 },
    { label: "Figures", value: m.figures ?? m.total_figures ?? 0, icon: Image },
    { label: "Captions", value: m.captions ?? m.total_captions ?? 0, icon: Quote },
    { label: "References", value: m.references ?? m.total_references ?? 0, icon: ListTree },
  ]

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {metrics.map((item) => {
            const Icon = item.icon
            return (
              <Card key={item.label}>
                <CardContent className="flex flex-col gap-2 p-4">
                  <Icon className="size-4 text-primary" />
                  <span className="text-xl font-semibold text-foreground">
                    {item.value ?? 0}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {item.label}
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

        <CardContent className="flex flex-col gap-1 max-h-[380px] overflow-y-auto">
          {structure?.map((node: any) => (
            <div key={node.id}>
              <div className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm font-medium text-foreground hover:bg-accent/30">
                <span className="flex items-center gap-2 truncate">
                  <BookOpen className="size-3.5 text-primary shrink-0" />
                  <span className="truncate">{node.label}</span>
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  p. {node.page ?? 1}
                </span>
              </div>
            </div>
          ))}

          {(!structure || structure.length === 0) && (
            <p className="p-2 text-sm text-muted-foreground">
              Loading structure…
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ClassificationTab({ documentId }: { documentId: string }) {
  const [updatingIndex, setUpdatingIndex] = useState<number | null>(null)

  const {
    data: results,
    isLoading,
    mutate,
  } = useSWR(
    `classification-${documentId}`,
    () => getClassificationResults(documentId)
  )

  const handleClassChange = async (index: number, newType: string) => {
    setUpdatingIndex(index)
    try {
      await correctParagraphType(documentId, index, newType)
      await mutate()
    } catch (err) {
      console.error("Failed to correct classification:", err)
    } finally {
      setUpdatingIndex(null)
    }
  }

  const items = results ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          ML Element Classification
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col divide-y divide-border p-0">
        {isLoading && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Loading classifications…
          </div>
        )}

        {!isLoading && items.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No element classifications found.
          </div>
        )}

        {items.map((r: any) => {
          const confidenceVal = r.confidence ?? 0.85
          const pct = Math.round(confidenceVal * 100)
          const isLowConf = pct < 80
          const tone =
            pct >= 95
              ? "bg-success"
              : pct >= 90
              ? "bg-info"
              : "bg-warning"

          return (
            <div
              key={r.id || r.index}
              className={`flex flex-col gap-3 p-4 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                isLowConf ? "bg-amber-500/5" : "hover:bg-accent/30"
              }`}
            >
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    #{r.index != null ? r.index + 1 : 1}
                  </span>

                  {isLowConf ? (
                    <Badge variant="warning" className="gap-1 text-[10px]">
                      <AlertCircle className="size-3" />
                      Needs Review
                    </Badge>
                  ) : (
                    <Badge variant="success" className="gap-1 text-[10px]">
                      <CheckCircle2 className="size-3" />
                      Auto
                    </Badge>
                  )}

                  <span className="text-xs font-semibold tabular-nums text-foreground">
                    {pct}%
                  </span>
                </div>

                <p className="line-clamp-2 text-sm leading-relaxed text-foreground">
                  {r.content || r.text}
                </p>

                <div className="flex items-center gap-3">
                  <div className="h-1.5 w-48 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full", tone)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                <select
                  value={String(r.detectedType || r.type || "BODY").toUpperCase()}
                  onChange={(e) => handleClassChange(r.index ?? 0, e.target.value)}
                  disabled={updatingIndex === r.index}
                  className="h-9 w-[160px] rounded-md border border-input bg-background px-3 py-1 font-mono text-xs font-medium text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {CANONICAL_CLASSES.map((type) => (
                    <option key={type} value={type} className="bg-popover text-popover-foreground">
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

function IssuesTab({ documentId }: { documentId: string }) {
  const { data: issues } = useSWR(
    `issues-${documentId}`,
    () => getFormattingIssues(documentId)
  )

  const counts = {
    high: issues?.filter((i: any) => i.severity === "high").length ?? 0,
    medium: issues?.filter((i: any) => i.severity === "medium").length ?? 0,
    low: issues?.filter((i: any) => i.severity === "low").length ?? 0,
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        {(["high", "medium", "low"] as Severity[]).map((sev) => {
          const meta = severityMeta[sev]
          const Icon = meta.icon

          return (
            <Card key={sev}>
              <CardContent className="flex items-center gap-3 p-4">
                <Icon
                  className={cn(
                    "size-5",
                    sev === "high"
                      ? "text-destructive"
                      : sev === "medium"
                      ? "text-warning"
                      : "text-info"
                  )}
                />
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    {counts[sev]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {meta.label} priority
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardContent className="p-4">
          {issues?.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No formatting issues detected yet.
            </p>
          ) : (
            issues?.map((issue: any) => {
              const meta = severityMeta[issue.severity as Severity] || severityMeta.low
              return (
                <div
                  key={issue.id}
                  className="border-b border-border py-4 last:border-0"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{issue.title}</p>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {issue.description}
                  </p>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
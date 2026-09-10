"use client"

import { useState } from "react"
import { AlertTriangle, CheckCircle2, FileDown, Loader2, ShieldCheck, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/views/empty-state"
import { useWorkspace } from "@/components/workspace-context"
import { cn } from "@/lib/utils"
import { validateDocument } from "@/services/api"
import type { ValidationResult } from "@/types/document"

export function ValidationView() {
  const { formatted, navigate, addToast } = useWorkspace()
  const [result, setResult] = useState<ValidationResult | null>(null)
  const [running, setRunning] = useState(false)

  if (!formatted) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="No formatted document"
        description="Apply a publication format before running quality validation."
        actionLabel="Go to Formatting"
        actionView="format"
      />
    )
  }

  const runValidation = async () => {
    setRunning(true)
    const res = await validateDocument("doc")
    setResult(res)
    setRunning(false)
    addToast({
      variant: res.warnings > 0 ? "info" : "success",
      title: "Validation complete",
      description: `${res.passed} checks passed, ${res.warnings} warnings.`,
    })
  }

  if (!result) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-6 rounded-xl border border-border bg-card px-6 py-14 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ShieldCheck className="size-7" />
        </div>
        <div className="flex flex-col gap-1.5">
          <h2 className="text-lg font-semibold text-foreground">Run Quality Validation</h2>
          <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
            Check the formatted manuscript against the selected publication standard — heading hierarchy,
            typography, spacing, captions and page numbering.
          </p>
        </div>
        <Button size="lg" onClick={runValidation} disabled={running}>
          {running ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
          {running ? "Validating…" : "Start Validation"}
        </Button>
      </div>
    )
  }

  const total = result.checks.length
  const score = Math.round((result.passed / total) * 100)

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <ScoreCard label="Quality Score" value={`${score}%`} icon={ShieldCheck} tone="primary" />
        <ScoreCard label="Checks Passed" value={`${result.passed}/${total}`} icon={CheckCircle2} tone="success" />
        <ScoreCard label="Warnings" value={String(result.warnings)} icon={AlertTriangle} tone="warning" />
      </div>

      <Card>
        <CardContent className="flex flex-col divide-y divide-border p-0">
          {result.checks.map((check) => (
            <div key={check.id} className="flex items-start gap-3 px-5 py-3.5">
              {check.status === "pass" ? (
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
              ) : check.status === "warning" ? (
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
              ) : (
                <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
              )}
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">{check.label}</span>
                {check.detail && <span className="text-sm text-muted-foreground">{check.detail}</span>}
              </div>
              <Badge
                variant={
                  check.status === "pass" ? "success" : check.status === "warning" ? "warning" : "destructive"
                }
              >
                {check.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="outline" onClick={runValidation} disabled={running}>
          {running ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
          Re-run Validation
        </Button>
        <Button onClick={() => navigate("output")}>
          <FileDown className="size-4" />
          Continue to Export
        </Button>
      </div>
    </div>
  )
}

function ScoreCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  icon: typeof ShieldCheck
  tone: "primary" | "success" | "warning"
}) {
  const toneClass = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
  }[tone]
  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-5">
        <div className={cn("flex size-11 items-center justify-center rounded-xl", toneClass)}>
          <Icon className="size-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-2xl font-semibold tabular-nums text-foreground">{value}</span>
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
      </CardContent>
    </Card>
  )
}

"use client"

import { useState } from "react"
import { Columns2, Eye, FileText, ShieldCheck, Sparkles, Wand2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/views/empty-state"
import { useWorkspace } from "@/components/workspace-context"
import { cn } from "@/lib/utils"
import { getFormatMetadata } from "@/services/api"

type Mode = "split" | "original" | "formatted"

export function PreviewView() {
  const { formatted, selectedStyle, navigate } = useWorkspace()
  const [mode, setMode] = useState<Mode>("split")
  const meta = getFormatMetadata(selectedStyle)

  if (!formatted) {
    return (
      <EmptyState
        icon={Eye}
        title="Nothing to preview yet"
        description="Apply a publication format to compare the original and formatted manuscript."
        actionLabel="Go to Formatting"
        actionView="format"
      />
    )
  }

  const modes: { id: Mode; label: string; icon: typeof Columns2 }[] = [
    { id: "split", label: "Split", icon: Columns2 },
    { id: "original", label: "Original", icon: FileText },
    { id: "formatted", label: "Formatted", icon: Sparkles },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-border bg-card p-1">
          {modes.map((m) => {
            const Icon = m.icon
            const active = mode === m.id
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {m.label}
              </button>
            )
          })}
        </div>
        <Button variant="outline" onClick={() => navigate("validation")}>
          <ShieldCheck className="size-4" />
          Validate Document
        </Button>
      </div>

      <div
        className={cn(
          "grid gap-6",
          mode === "split" ? "lg:grid-cols-2" : "grid-cols-1 mx-auto w-full max-w-3xl",
        )}
      >
        {(mode === "split" || mode === "original") && (
          <PagePane variant="original" title="Original" badge="Unformatted" />
        )}
        {(mode === "split" || mode === "formatted") && (
          <PagePane variant="formatted" title="Formatted" badge={`${meta.font} · ${meta.margins}`} />
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wand2 className="size-4 text-primary" />
            Applied Format Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetaItem label="Font" value={meta.font} />
            <MetaItem label="Font size" value={meta.fontSize} />
            <MetaItem label="Line spacing" value={meta.lineSpacing} />
            <MetaItem label="Margins" value={meta.margins} />
            <MetaItem label="Headings" value={meta.headingStyle} />
            <MetaItem label="Page numbers" value={meta.pageNumbering} />
            <MetaItem label="Table of contents" value={meta.tocStatus} />
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  )
}

function PagePane({
  variant,
  title,
  badge,
}: {
  variant: "original" | "formatted"
  title: string
  badge: string
}) {
  const isFormatted = variant === "formatted"
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <Badge variant={isFormatted ? "success" : "secondary"}>{badge}</Badge>
      </div>
      <div className="rounded-xl border border-border bg-muted/40 p-4 shadow-sm">
        <div
          className={cn(
            "mx-auto aspect-[1/1.294] w-full max-w-md overflow-hidden bg-[--paper] px-8 py-10 shadow-md ring-1 ring-black/5",
            isFormatted ? "font-serif" : "font-sans",
          )}
          style={{ ["--paper" as string]: "var(--card)" }}
        >
          {isFormatted ? <FormattedPage /> : <OriginalPage />}
        </div>
      </div>
    </div>
  )
}

function OriginalPage() {
  return (
    <div className="flex flex-col gap-3 text-foreground">
      <p className="text-lg font-bold">Introduction</p>
      <div className="flex flex-col gap-2 text-[11px] leading-relaxed text-muted-foreground">
        <p>
          This chapter discusses the motivation and background behind the study. The text uses manual bold
          formatting and inconsistent spacing.
        </p>
        <p className="font-bold">1.1 Background</p>
        <p>
          The paragraphs below have uneven indentation and mixed line spacing. Margins are the Word defaults
          and no heading styles have been applied.
        </p>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore
          et dolore magna aliqua.
        </p>
        <p className="font-bold">Table 1: Results</p>
        <p>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip.</p>
      </div>
    </div>
  )
}

function FormattedPage() {
  return (
    <div className="flex flex-col gap-3 text-foreground">
      <p className="text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Chapter One</p>
      <h3 className="text-center text-xl font-semibold">Introduction</h3>
      <div className="mt-1 flex flex-col gap-2 text-[11px] leading-relaxed">
        <p className="text-justify">
          <span className="float-left mr-1 mt-0.5 font-serif text-3xl font-semibold leading-none">T</span>
          his chapter discusses the motivation and background behind the study, formatted to the selected
          publication standard with consistent typography throughout.
        </p>
        <p className="mt-2 text-sm font-semibold">1.1 Background</p>
        <p className="text-justify">
          Paragraphs use justified alignment, uniform 1.5 line spacing and 25&nbsp;mm margins. Heading styles
          are applied automatically from the detected structure.
        </p>
        <p className="text-center text-[10px] italic text-muted-foreground">Table 1. Summary of results</p>
      </div>
      <p className="mt-auto pt-4 text-center text-[10px] text-muted-foreground tabular-nums">1</p>
    </div>
  )
}

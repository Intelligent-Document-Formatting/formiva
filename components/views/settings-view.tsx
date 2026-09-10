"use client"

import { useState } from "react"
import { Cpu, HardDrive, MonitorSmartphone, Server, WifiOff } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"
import { API_BASE_URL } from "@/services/api"
import { cn } from "@/lib/utils"

interface ToggleRow {
  id: string
  label: string
  description: string
  defaultOn: boolean
}

const processingToggles: ToggleRow[] = [
  {
    id: "gpu",
    label: "GPU acceleration",
    description: "Use the local GPU for ML classification when available.",
    defaultOn: true,
  },
  {
    id: "cache",
    label: "Cache analysis results",
    description: "Reuse structure detection between runs on the same file.",
    defaultOn: true,
  },
  {
    id: "autosave",
    label: "Auto-save formatted output",
    description: "Write the DOCX to the output folder as soon as formatting finishes.",
    defaultOn: false,
  },
]

export function SettingsView() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <WifiOff className="size-4 text-primary" />
            Offline Processing
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <InfoRow icon={Server} label="Local backend" value={API_BASE_URL}>
            <Badge variant="success">Connected</Badge>
          </InfoRow>
          <InfoRow icon={Cpu} label="ML model" value="DocStructure-v2 (local)">
            <Badge variant="success">Loaded</Badge>
          </InfoRow>
          <InfoRow icon={HardDrive} label="Output directory" value="~/Documents/DocuForge">
            <Badge variant="secondary">Local</Badge>
          </InfoRow>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Processing Preferences</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col divide-y divide-border">
          {processingToggles.map((toggle) => (
            <Switch key={toggle.id} {...toggle} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MonitorSmartphone className="size-4 text-primary" />
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground">Theme</span>
            <span className="text-sm text-muted-foreground">Switch between light and dark mode.</span>
          </div>
          <ThemeToggle />
        </CardContent>
      </Card>
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
  children,
}: {
  icon: typeof Server
  label: string
  value: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="truncate font-mono text-xs text-muted-foreground">{value}</span>
      </div>
      {children}
    </div>
  )
}

function Switch({ label, description, defaultOn }: ToggleRow) {
  const [on, setOn] = useState(defaultOn)
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-sm text-muted-foreground">{description}</span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => setOn((v) => !v)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
          on ? "bg-primary" : "bg-muted-foreground/30",
        )}
      >
        <span
          className={cn(
            "inline-block size-5 transform rounded-full bg-background shadow transition-transform",
            on ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  )
}

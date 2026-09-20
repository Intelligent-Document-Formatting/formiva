"use client"

import { useState } from "react"
import {
  Check,
  ChevronDown,
  Cpu,
  Database,
  FolderOpen,
  HardDrive,
  MonitorSmartphone,
  RefreshCw,
  Server,
  ShieldCheck,
  SlidersHorizontal,
  WifiOff,
} from "lucide-react"
import { useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { API_BASE_URL, clearAnalysisCache, getBackendStatus, type BackendStatus } from "@/services/api"
import { useWorkspace } from "@/components/workspace-context"
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

const preferenceKey = "formiva.processing-preferences"
const defaultPreferences = Object.fromEntries(
  processingToggles.map(({ id, defaultOn }) => [id, defaultOn]),
) as Record<string, boolean>

export function SettingsView() {
  const { addToast } = useWorkspace()
  const [preferences, setPreferences] = useState(defaultPreferences)
  const [status, setStatus] = useState<BackendStatus | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isClearingCache, setIsClearingCache] = useState(false)
  const [lastChecked, setLastChecked] = useState<string | null>(null)

  const refreshStatus = async () => {
    setIsRefreshing(true)
    setStatusError(null)
    try {
      setStatus(await getBackendStatus())
    } catch (error) {
      setStatus(null)
      setStatusError(error instanceof Error ? error.message : "Backend unavailable")
    } finally {
      setIsRefreshing(false)
      setLastChecked("Just now")
    }
  }

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(preferenceKey)
      if (saved) {
        setPreferences({ ...defaultPreferences, ...JSON.parse(saved) })
      }
    } catch {
      // Ignore malformed or unavailable local preference data.
    }
    void refreshStatus()
  }, [])

  const updatePreference = (id: string, value: boolean) => {
    setPreferences((current) => {
      const next = { ...current, [id]: value }
      window.localStorage.setItem(preferenceKey, JSON.stringify(next))
      return next
    })
  }

  const handleClearCache = async () => {
    setIsClearingCache(true)
    try {
      const cleared = await clearAnalysisCache()
      addToast({
        title: "Analysis cache cleared",
        description: cleared ? `${cleared} cached result${cleared === 1 ? "" : "s"} removed.` : "There were no cached results to remove.",
        variant: "success",
      })
    } catch (error) {
      addToast({
        title: "Could not clear analysis cache",
        description: error instanceof Error ? error.message : "The local backend is unavailable.",
        variant: "error",
      })
    } finally {
      setIsClearingCache(false)
    }
  }

  const backendReady = status?.backend.ready ?? false
  const modelReady = status?.model.ready ?? false
  const storageReady = status?.storage.ready ?? false

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <section className="relative overflow-hidden rounded-xl border border-primary/20 bg-primary/4.5 px-5 py-4 sm:px-7 sm:py-5">
        <div className="absolute -right-10 -top-16 size-44 rounded-full border-24 border-primary/6" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary">Private by default</p>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">Your workspace stays on this device.</h2>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Documents are processed locally. Nothing is uploaded unless you choose to export it.
              </p>
            </div>
          </div>
          <Badge variant="success" className="self-start px-2.5 py-1 sm:self-center">
            <span className="size-1.5 rounded-full bg-success" />
            Offline mode active
          </Badge>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="border-b border-border bg-muted/25">
              <CardTitle className="flex items-center gap-2 text-base">
                <SlidersHorizontal className="size-4 text-primary" />
                Processing preferences
              </CardTitle>
              <CardDescription>Choose how Formiva handles analysis and output.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col divide-y divide-border">
              {processingToggles.map((toggle) => (
                <Switch key={toggle.id} {...toggle} on={preferences[toggle.id]} onChange={updatePreference} />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-border bg-muted/25">
              <CardTitle className="flex items-center gap-2 text-base">
                <MonitorSmartphone className="size-4 text-primary" />
                Appearance
              </CardTitle>
              <CardDescription>Adjust the workspace to suit your environment.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4 py-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">Color theme</span>
                <span className="text-sm text-muted-foreground">Switch between light and dark mode.</span>
              </div>
              <ThemeToggle />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-border bg-muted/25">
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="size-4 text-primary" />
                Storage &amp; Data
              </CardTitle>
              <CardDescription>Manage where local files and analysis results are kept.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 py-3.5">
              <div className="flex items-center gap-3">
                <FolderOpen className="mt-0.5 size-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">Output directory</p>
                  <p className="text-xs text-muted-foreground">Stored locally on this device.</p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-border pt-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Analysis cache</p>
                  <p className="text-xs text-muted-foreground">Remove generated analysis results.</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleClearCache} disabled={isClearingCache}>
                  {isClearingCache && <RefreshCw className="animate-spin" />}
                  Clear Analysis Cache
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader className="border-b border-border bg-muted/25">
            <CardTitle className="flex items-center gap-2 text-base">
              <WifiOff className="size-4 text-primary" />
              Local system
            </CardTitle>
            <CardDescription>Services and files available on this device.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 p-3">
            <InfoRow icon={Server} label="Local backend" value="Local API service">
              <StatusMark ready={backendReady} label={backendReady ? "Ready" : statusError ? "Unavailable" : "Checking"} />
            </InfoRow>
            <InfoRow icon={Cpu} label="ML model" value={status ? `${status.model.name} (${status.model.version})` : "Local model"}>
              <StatusMark ready={modelReady} label={modelReady ? "Ready" : statusError ? "Unavailable" : "Checking"} />
            </InfoRow>
            <InfoRow icon={HardDrive} label="Storage" value="Local output storage">
              <StatusMark ready={storageReady} label={storageReady ? "Ready" : statusError ? "Unavailable" : "Checking"} />
            </InfoRow>
            <div className="mt-2 flex items-center justify-between gap-3 border-t border-border px-2 pt-3">
              <span className="text-xs text-muted-foreground">
                {statusError ? "Unable to reach local backend." : `Last checked: ${lastChecked ?? "Checking..."}`}
              </span>
              <Button variant="outline" size="sm" onClick={() => void refreshStatus()} disabled={isRefreshing}>
                <RefreshCw className={cn(isRefreshing && "animate-spin")} />
                Refresh
              </Button>
            </div>
            <TechnicalDetails status={status} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatusMark({ label, ready }: { label: string; ready: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", ready ? "text-success" : "text-muted-foreground")}>
      <span className={cn("flex size-4 items-center justify-center rounded-full", ready ? "bg-success/12" : "bg-muted")}>
        {ready && <Check className="size-2.5" />}
      </span>
      {label}
    </span>
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
    <div className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/60">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="size-4" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="truncate font-mono text-xs text-muted-foreground">{value}</span>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function Switch({ id, label, description, on, onChange }: ToggleRow & { on: boolean; onChange: (id: string, value: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 first:pt-1 last:pb-1">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="max-w-xl text-sm leading-relaxed text-muted-foreground">{description}</span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(id, !on)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-transparent transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
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

function TechnicalDetails({ status }: { status: BackendStatus | null }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-3 border-t border-border pt-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-left text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        Technical details
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <dl className="mt-3 grid gap-2 text-xs">
          <Detail label="Backend URL" value={API_BASE_URL} />
          <Detail label="Backend version" value={status?.backend.version ?? "Unavailable"} />
          <Detail label="ML model" value={status ? `${status.model.name} · ${status.model.version}` : "Unavailable"} />
          <Detail label="Model path" value={status?.model.path ?? "Unavailable"} />
        </dl>
      )}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate text-right font-mono text-foreground">{value}</dd>
    </div>
  )
}

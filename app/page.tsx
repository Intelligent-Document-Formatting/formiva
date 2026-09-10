"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { Header } from "@/components/header"
import { Sidebar } from "@/components/sidebar"
import { Toaster } from "@/components/toaster"
import { useWorkspace, WorkspaceProvider, type ViewId } from "@/components/workspace-context"
import { AnalysisView } from "@/components/views/analysis-view"
import { DashboardView } from "@/components/views/dashboard-view"
import { DocumentsView } from "@/components/views/documents-view"
import { FormatView } from "@/components/views/format-view"
import { OutputView } from "@/components/views/output-view"
import { PreviewView } from "@/components/views/preview-view"
import { SettingsView } from "@/components/views/settings-view"
import { UploadView } from "@/components/views/upload-view"
import { ValidationView } from "@/components/views/validation-view"

const views: Record<ViewId, () => React.JSX.Element> = {
  dashboard: DashboardView,
  documents: DocumentsView,
  upload: UploadView,
  analysis: AnalysisView,
  format: FormatView,
  preview: PreviewView,
  validation: ValidationView,
  output: OutputView,
  settings: SettingsView,
}

function Workspace() {
  const { activeView } = useWorkspace()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const ActiveView = views[activeView]

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-sidebar-border lg:block">
        <Sidebar />
      </aside>

      {/* Mobile sidebar drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85%] border-r border-sidebar-border shadow-xl">
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close navigation"
              className="absolute right-3 top-3 z-10 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <X className="size-4" />
            </button>
            <Sidebar onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <ActiveView />
        </main>
      </div>

      <Toaster />
    </div>
  )
}

export default function Page() {
  return (
    <WorkspaceProvider>
      <Workspace />
    </WorkspaceProvider>
  )
}

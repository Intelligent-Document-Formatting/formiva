"use client"

import { Menu } from "lucide-react"
import { viewMetaMap } from "@/components/nav-config"
import { OfflineBadge } from "@/components/offline-status"
import { ThemeToggle } from "@/components/theme-toggle"
import { useWorkspace } from "@/components/workspace-context"

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { activeView } = useWorkspace()
  const meta = viewMetaMap[activeView]

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="flex items-center gap-3 px-4 py-3.5 lg:px-8">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation"
          className="inline-flex size-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:hidden"
        >
          <Menu className="size-4.5" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">{meta.title}</h1>
          <p className="hidden truncate text-sm text-muted-foreground sm:block">{meta.description}</p>
        </div>

        <div className="flex items-center gap-2.5">
          <OfflineBadge className="hidden sm:inline-flex" />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
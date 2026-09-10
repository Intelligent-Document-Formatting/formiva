"use client"

import { Logo } from "@/components/logo"
import { navItems } from "@/components/nav-config"
import { SidebarStatus } from "@/components/offline-status"
import { useWorkspace } from "@/components/workspace-context"
import { cn } from "@/lib/utils"

const workflowIds = new Set(["upload", "analysis", "format", "preview", "validation", "output"])

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { activeView, navigate } = useWorkspace()

  const primary = navItems.filter((item) => !workflowIds.has(item.id) && item.id !== "settings")
  const workflow = navItems.filter((item) => workflowIds.has(item.id))
  const settings = navItems.filter((item) => item.id === "settings")

  const renderItem = (item: (typeof navItems)[number]) => {
    const Icon = item.icon
    const active = activeView === item.id
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => {
          navigate(item.id)
          onNavigate?.()
        }}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          active
            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
        )}
        aria-current={active ? "page" : undefined}
      >
        <Icon className="size-4.5 shrink-0" />
        {item.label}
      </button>
    )
  }

  return (
    <div className="flex h-full flex-col gap-6 bg-sidebar p-4">
      <div className="px-1 pt-1">
        <Logo />
      </div>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto">
        <div className="flex flex-col gap-1">{primary.map(renderItem)}</div>

        <div className="flex flex-col gap-1">
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Workflow
          </p>
          {workflow.map(renderItem)}
        </div>

        <div className="mt-auto flex flex-col gap-1">{settings.map(renderItem)}</div>
      </nav>

      <SidebarStatus />
    </div>
  )
}

import { CloudOff, Server } from "lucide-react"
import { cn } from "@/lib/utils"

export function OfflineBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-medium text-success",
        className,
      )}
    >
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
        <span className="relative inline-flex size-2 rounded-full bg-success" />
      </span>
      Offline Mode
    </span>
  )
}

export function SidebarStatus() {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-3">
      <div className="flex items-center gap-2 text-sm font-medium text-sidebar-foreground">
        <CloudOff className="size-4 text-success" />
        Offline Mode
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Documents are processed locally. Nothing is uploaded to the cloud.
      </p>
      <div className="mt-1 flex items-center justify-between border-t border-sidebar-border pt-2 text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Server className="size-3.5" />
          System Status
        </span>
        <span className="flex items-center gap-1.5 font-medium text-success">
          <span className="size-1.5 rounded-full bg-success" />
          Operational
        </span>
      </div>
    </div>
  )
}

"use client"

import { CircleAlert, CircleCheck, Info, X } from "lucide-react"
import { useWorkspace } from "@/components/workspace-context"
import { cn } from "@/lib/utils"

const iconMap = {
  success: CircleCheck,
  error: CircleAlert,
  info: Info,
}

const toneMap = {
  success: "text-success",
  error: "text-destructive",
  info: "text-info",
}

export function Toaster() {
  const { toasts, dismissToast } = useWorkspace()

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2">
      {toasts.map((toast) => {
        const Icon = iconMap[toast.variant]
        return (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto flex items-start gap-3 rounded-lg border border-border bg-popover p-3.5 shadow-lg animate-in slide-in-from-bottom-2 fade-in"
          >
            <Icon className={cn("mt-0.5 size-5 shrink-0", toneMap[toast.variant])} />
            <div className="flex-1">
              <p className="text-sm font-medium text-popover-foreground">{toast.title}</p>
              {toast.description && (
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{toast.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

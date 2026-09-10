import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

interface ProgressProps extends ComponentProps<"div"> {
  value?: number
  indicatorClassName?: string
}

function Progress({ value = 0, className, indicatorClassName, ...props }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      className={cn("bg-muted relative h-2 w-full overflow-hidden rounded-full", className)}
      {...props}
    >
      <div
        className={cn("bg-primary h-full rounded-full transition-all duration-500 ease-out", indicatorClassName)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

export { Progress }

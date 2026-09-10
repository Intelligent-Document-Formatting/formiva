import { BookText } from "lucide-react"
import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  showWordmark?: boolean
}

export function Logo({ className, showWordmark = true }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-md shadow-sm">
        <BookText className="size-5" />
      </div>
      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span className="text-[15px] font-semibold tracking-tight text-foreground">Formiva</span>
          <span className="text-[11px] text-muted-foreground">Publication Formatting</span>
        </div>
      )}
    </div>
  )
}

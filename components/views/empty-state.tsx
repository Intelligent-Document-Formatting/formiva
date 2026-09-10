"use client"

import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useWorkspace, type ViewId } from "@/components/workspace-context"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel: string
  actionView: ViewId
}

export function EmptyState({ icon: Icon, title, description, actionLabel, actionView }: EmptyStateProps) {
  const { navigate } = useWorkspace()
  return (
    <div className="mx-auto w-full max-w-md">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon className="size-7" />
          </div>
          <div>
            <p className="text-base font-medium text-foreground">{title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
          </div>
          <Button onClick={() => navigate(actionView)}>{actionLabel}</Button>
        </CardContent>
      </Card>
    </div>
  )
}

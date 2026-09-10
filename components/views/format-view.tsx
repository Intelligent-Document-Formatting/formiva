"use client"

import {
  useEffect,
  useRef,
  useState,
} from "react"

import {
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Eye,
  GraduationCap,
  Loader2,
  Newspaper,
  Settings2,
  Sliders,
  Upload,
  Wand2,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"

import { EmptyState } from "@/components/views/empty-state"

import { useWorkspace } from "@/components/workspace-context"

import { cn } from "@/lib/utils"

import {
  applyFormatting,
  getFormattingStatus,
  getPublicationStyles,
} from "@/services/api"

import type { PublicationStyleId } from "@/types/document"

const styleIcons: Record<
  PublicationStyleId,
  typeof GraduationCap
> = {
  academic:
    GraduationCap,

  research:
    Newspaper,

  general:
    Wand2,

  custom:
    Sliders,
}

type Phase =
  | "select"
  | "processing"
  | "done"

export function FormatView() {
  const {
    uploadedFile,
    analysed,
    selectedStyle,
    setSelectedStyle,
    customStyle,
    setCustomStyle,
    setFormatted,
    navigate,
    addToast,
  } =
    useWorkspace()

  const styles =
    getPublicationStyles()

  const [
    phase,
    setPhase,
  ] =
    useState<Phase>(
      "select",
    )

  const [
    progress,
    setProgress,
  ] =
    useState(0)

  const timerRef =
    useRef<ReturnType<
      typeof setInterval
    > | null>(null)

  useEffect(() => {
    return () => {
      if (
        timerRef.current
      ) {
        clearInterval(
          timerRef.current,
        )

        timerRef.current =
          null
      }
    }
  }, [])

  useEffect(() => {
    if (
      phase !==
        "processing" ||
      progress < 100
    ) {
      return
    }

    if (
      timerRef.current
    ) {
      clearInterval(
        timerRef.current,
      )

      timerRef.current =
        null
    }

    setPhase("done")

    setFormatted(true)

    addToast({
      variant:
        "success",

      title:
        "Formatting applied",

      description:
        "Your document is now publication-ready.",
    })
  }, [
    phase,
    progress,
    setFormatted,
    addToast,
  ])

  if (!uploadedFile) {
    return (
      <EmptyState
        icon={Upload}
        title="No document selected"
        description="Upload and analyse a manuscript before applying a publication style."
        actionLabel="Go to Upload"
        actionView="upload"
      />
    )
  }

  const startFormatting =
    async () => {
      if (!uploadedFile.id) {
        addToast({
          variant: "error",
          title:
            "Document ID missing",
          description:
            "Please upload the document again.",
        })

        return
      }

      if (
        timerRef.current
      ) {
        clearInterval(
          timerRef.current,
        )

        timerRef.current =
          null
      }

      setPhase(
        "processing",
      )

      setProgress(0)

      try {
        console.log(
          "Applying formatting to:",
          uploadedFile.id,
        )

        await applyFormatting(
          uploadedFile.id,
          selectedStyle,
        )

        timerRef.current =
          setInterval(() => {
            setProgress(
              (prev) => {
                const next =
                  prev +
                  Math.random() *
                    8 +
                  4

                return Math.min(
                  next,
                  100,
                )
              },
            )
          }, 450)
      } catch (
        error
      ) {
        if (
          timerRef.current
        ) {
          clearInterval(
            timerRef.current,
          )

          timerRef.current =
            null
        }

        setPhase("select")

        addToast({
          variant:
            "error",

          title:
            "Formatting failed",

          description:
            error instanceof Error
              ? error.message
              : "Something went wrong while applying the formatting.",
        })

        console.error(
          "Formatting error:",
          error,
        )
      }
    }

  if (
    phase !==
    "select"
  ) {
    const status =
      getFormattingStatus(
        progress,
      )

    return (
      <div className="mx-auto w-full max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {phase ===
              "done" ? (
                <CheckCircle2 className="size-5 text-success" />
              ) : (
                <Loader2 className="size-5 animate-spin text-primary" />
              )}

              {phase ===
              "done"
                ? "Formatting Complete"
                : "Applying Publication Format"}
            </CardTitle>
          </CardHeader>

          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Progress
                </span>

                <span className="font-medium tabular-nums text-foreground">
                  {Math.round(
                    progress,
                  )}
                  %
                </span>
              </div>

              <Progress
                value={
                  progress
                }
              />
            </div>

            <ul className="flex flex-col gap-2.5">
              {status.steps.map(
                (step) => (
                  <li
                    key={
                      step.id
                    }
                    className="flex items-center gap-3 text-sm"
                  >
                    {step.status ===
                    "done" ? (
                      <Check className="size-4 shrink-0 text-success" />
                    ) : step.status ===
                      "active" ? (
                      <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
                    ) : (
                      <Circle className="size-4 shrink-0 text-muted-foreground/40" />
                    )}

                    <span
                      className={cn(
                        step.status ===
                          "pending"
                          ? "text-muted-foreground"
                          : "text-foreground",

                        step.status ===
                          "active" &&
                          "font-medium",
                      )}
                    >
                      {
                        step.label
                      }
                    </span>
                  </li>
                ),
              )}
            </ul>

            {phase ===
              "done" && (
              <div className="flex flex-wrap gap-3 border-t border-border pt-4">
                <Button
                  onClick={() =>
                    navigate(
                      "preview",
                    )
                  }
                >
                  <Eye className="size-4" />
                  View Preview
                </Button>

                <Button
                  variant="outline"
                  onClick={() =>
                    navigate(
                      "validation",
                    )
                  }
                >
                  Run Validation
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      {!analysed && (
        <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-2.5 text-sm text-warning-foreground dark:text-warning">
          <Settings2 className="size-4 shrink-0" />

          <span>
            Tip: run the analysis first
            for the most accurate
            formatting results.
          </span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {styles.map(
          (style) => {
            const Icon =
              styleIcons[
                style.id
              ]

            const active =
              selectedStyle ===
              style.id

            return (
              <button
                key={
                  style.id
                }
                type="button"
                onClick={() =>
                  setSelectedStyle(
                    style.id,
                  )
                }
                className={cn(
                  "flex flex-col gap-3 rounded-xl border p-5 text-left transition-all",

                  active
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border bg-card hover:border-primary/40",
                )}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={cn(
                      "flex size-10 items-center justify-center rounded-lg",

                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary/10 text-primary",
                    )}
                  >
                    <Icon className="size-5" />
                  </div>

                  {active && (
                    <Badge variant="default">
                      <Check className="size-3" />
                      Selected
                    </Badge>
                  )}
                </div>

                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {
                      style.name
                    }
                  </p>

                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {
                      style.description
                    }
                  </p>
                </div>

                <ul className="mt-1 flex flex-col gap-1">
                  {style.features.map(
                    (
                      feature,
                    ) => (
                      <li
                        key={
                          feature
                        }
                        className="flex items-center gap-2 text-xs text-muted-foreground"
                      >
                        <Check className="size-3 text-success" />
                        {
                          feature
                        }
                      </li>
                    ),
                  )}
                </ul>
              </button>
            )
          },
        )}
      </div>

      {selectedStyle ===
        "custom" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sliders className="size-4 text-primary" />
              Custom Style Settings
            </CardTitle>
          </CardHeader>

          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Font family">
              <Input
                value={
                  customStyle.fontFamily
                }
                onChange={(e) =>
                  setCustomStyle({
                    ...customStyle,
                    fontFamily:
                      e.target.value,
                  })
                }
              />
            </Field>

            <Field label="Body font size (pt)">
              <Input
                type="number"
                value={
                  customStyle.bodyFontSize
                }
                onChange={(e) =>
                  setCustomStyle({
                    ...customStyle,
                    bodyFontSize:
                      Number(
                        e.target.value,
                      ),
                  })
                }
              />
            </Field>

            <Field label="Heading size (pt)">
              <Input
                type="number"
                value={
                  customStyle.headingSize
                }
                onChange={(e) =>
                  setCustomStyle({
                    ...customStyle,
                    headingSize:
                      Number(
                        e.target.value,
                      ),
                  })
                }
              />
            </Field>

            <Field label="Line spacing">
              <Input
                type="number"
                step="0.05"
                value={
                  customStyle.lineSpacing
                }
                onChange={(e) =>
                  setCustomStyle({
                    ...customStyle,
                    lineSpacing:
                      Number(
                        e.target.value,
                      ),
                  })
                }
              />
            </Field>

            <Field label="Paragraph spacing (pt)">
              <Input
                type="number"
                value={
                  customStyle.paragraphSpacing
                }
                onChange={(e) =>
                  setCustomStyle({
                    ...customStyle,
                    paragraphSpacing:
                      Number(
                        e.target.value,
                      ),
                  })
                }
              />
            </Field>

            <Field label="Page margins">
              <Input
                value={
                  customStyle.pageMargins
                }
                onChange={(e) =>
                  setCustomStyle({
                    ...customStyle,
                    pageMargins:
                      e.target.value,
                  })
                }
              />
            </Field>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={
            startFormatting
          }
        >
          <Wand2 className="size-4" />
          Apply Formatting
        </Button>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">
        {label}
      </span>

      {children}
    </label>
  )
}
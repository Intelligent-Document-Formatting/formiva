"use client"

import {
  useCallback,
  useRef,
  useState,
} from "react"

import {
  CheckCircle2,
  FileText,
  Lock,
  Loader2,
  ScanSearch,
  UploadCloud,
  X,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
} from "@/components/ui/card"

import { useWorkspace } from "@/components/workspace-context"

import { formatBytes } from "@/lib/utils"

import { uploadDocument } from "@/services/api"

const ACCEPTED = ".docx"

export function UploadView() {
  const {
    navigate,
    uploadedFile,
    setUploadedFile,
    addToast,
    setAnalysed,
    setFormatted,
  } =
    useWorkspace()

  const inputRef =
    useRef<HTMLInputElement>(
      null,
    )

  const [
    dragging,
    setDragging,
  ] =
    useState(false)

  const [
    uploading,
    setUploading,
  ] =
    useState(false)

  const handleFile =
    useCallback(
      async (
        file: File,
      ) => {
        const isWord =
          /\.docx$/i.test(
            file.name,
          )

        if (!isWord) {
          addToast({
            variant: "error",
            title:
              "Unsupported file type",
            description:
              "Please select a Microsoft Word (.docx) document.",
          })

          return
        }

        setUploading(true)

        try {
          const result =
            await uploadDocument(
              file,
            )

          console.log(
            "Uploaded file object:",
            result,
          )

          if (!result.id) {
            throw new Error(
              "Upload succeeded but document ID is missing.",
            )
          }

          setUploadedFile(
            result,
          )

          setAnalysed(false)

          setFormatted(false)

          addToast({
            variant:
              "success",

            title:
              "Upload complete",

            description:
              `${result.name} is ready to analyse.`,
          })
        } catch (
          error
        ) {
          console.error(
            "Upload error:",
            error,
          )

          addToast({
            variant:
              "error",

            title:
              "Upload failed",

            description:
              error instanceof Error
                ? error.message
                : "Please try again.",
          })
        } finally {
          setUploading(false)
        }
      },
      [
        addToast,
        setUploadedFile,
        setAnalysed,
        setFormatted,
      ],
    )

  const onDrop =
    useCallback(
      (
        e: React.DragEvent,
      ) => {
        e.preventDefault()

        setDragging(false)

        const file =
          e.dataTransfer
            .files?.[0]

        if (file) {
          handleFile(file)
        }
      },
      [handleFile],
    )

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      {!uploadedFile ? (
        <Card>
          <CardContent className="p-6">
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() =>
                setDragging(false)
              }
              onDrop={onDrop}
              className={`flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed px-6 py-14 text-center transition-colors ${
                dragging
                  ? "border-primary bg-primary/5"
                  : "border-border bg-muted/30"
              }`}
            >
              <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                {uploading ? (
                  <Loader2 className="size-7 animate-spin" />
                ) : (
                  <UploadCloud className="size-7" />
                )}
              </div>

              <div>
                <p className="text-base font-medium text-foreground">
                  {uploading
                    ? "Processing locally…"
                    : "Drag & drop your manuscript"}
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  or click to browse —
                  accepts .docx files
                  up to 50 MB
                </p>
              </div>

              <Button
                onClick={() =>
                  inputRef.current?.click()
                }
                disabled={uploading}
              >
                <FileText className="size-4" />
                Choose File
              </Button>

              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED}
                className="sr-only"
                onChange={(e) => {
                  const file =
                    e.target.files?.[0]

                  if (file) {
                    handleFile(file)
                  }
                }}
              />
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Lock className="size-3.5 text-success" />
              Files never leave your device.
              All processing happens locally.
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col gap-5 p-6">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="size-6" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-foreground">
                    {uploadedFile.name}
                  </p>

                  <Badge variant="success">
                    <CheckCircle2 className="size-3" />
                    Ready
                  </Badge>
                </div>

                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatBytes(
                    uploadedFile.size,
                  )}{" "}
                  · Microsoft Word document
                </p>

                {/* Helpful while testing */}
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Document ID:{" "}
                  {uploadedFile.id}
                </p>
              </div>

              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Remove file"
                onClick={() => {
                  setUploadedFile(null)
                  setAnalysed(false)
                  setFormatted(false)
                }}
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-sm font-medium text-foreground">
                Next step
              </p>

              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Run the local ML analysis
                to detect chapters,
                headings, tables and
                references before applying
                a publication style.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() =>
                  navigate("analysis")
                }
              >
                <ScanSearch className="size-4" />
                Analyse Document
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setUploadedFile(null)
                  setAnalysed(false)
                  setFormatted(false)
                }}
              >
                Upload a different file
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            title: "Local ML models",
            text: "Structure detection runs on-device.",
          },
          {
            title: "No cloud uploads",
            text: "Your research stays private.",
          },
          {
            title: "DOCX in, DOCX out",
            text: "Editable, publication-ready output.",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-lg border border-border bg-card p-4"
          >
            <p className="text-sm font-medium text-foreground">
              {item.title}
            </p>

            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {item.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
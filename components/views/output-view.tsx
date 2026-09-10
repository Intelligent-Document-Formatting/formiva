"use client"

import {
  CheckCircle2,
  Download,
  FileCheck2,
  Loader2,
  Upload,
} from "lucide-react"

import { useState } from "react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { Button } from "@/components/ui/button"

import { EmptyState } from "@/components/views/empty-state"

import { useWorkspace } from "@/components/workspace-context"

import { downloadDocument } from "@/services/api"

export function OutputView() {
  const {
    uploadedFile,
    formatted,
    navigate,
    addToast,
  } =
    useWorkspace()

  const [
    downloading,
    setDownloading,
  ] =
    useState(false)

  if (!uploadedFile) {
    return (
      <EmptyState
        icon={Upload}
        title="No document available"
        description="Upload a document and complete formatting first."
        actionLabel="Go to Upload"
        actionView="upload"
      />
    )
  }

  const handleDownload =
    async () => {
      if (!uploadedFile.id) {
        addToast({
          variant:
            "error",

          title:
            "Document ID missing",

          description:
            "Please upload the document again.",
        })

        return
      }

      setDownloading(true)

      try {
        console.log(
          "Exporting document:",
          uploadedFile.id,
        )

        const result =
          await downloadDocument(
            uploadedFile.id,
          )

        console.log(
          "Download complete:",
          result.fileName,
        )

        addToast({
          variant:
            "success",

          title:
            "Download started",

          description:
            `${result.fileName} has been downloaded.`,
        })
      } catch (
        error
      ) {
        console.error(
          "Download error:",
          error,
        )

        addToast({
          variant:
            "error",

          title:
            "Download failed",

          description:
            error instanceof Error
              ? error.message
              : "Formatted document could not be downloaded.",
        })
      } finally {
        setDownloading(false)
      }
    }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck2 className="size-5 text-primary" />
            Publication-Ready Document
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col items-center gap-6 p-8 text-center">
          <div className="flex size-20 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckCircle2 className="size-10" />
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {formatted
                ? "Your document is ready"
                : "Formatting not completed"}
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              {uploadedFile.name}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Document ID:{" "}
              {uploadedFile.id}
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <Button
              size="lg"
              onClick={
                handleDownload
              }
              disabled={
                downloading
              }
            >
              {downloading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}

              {downloading
                ? "Preparing…"
                : "Download DOCX"}
            </Button>

            <Button
              variant="outline"
              onClick={() =>
                navigate(
                  "preview",
                )
              }
            >
              View Preview
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
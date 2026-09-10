"use client"

import {
  Download,
  FileCheck2,
  FileText,
  Trash2,
  Upload,
} from "lucide-react"
import useSWR from "swr"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { EmptyState } from "@/components/views/empty-state"
import { useWorkspace } from "@/components/workspace-context"

import {
  deleteDocument,
  downloadDocument,
  getDocuments,
} from "@/services/api"

import { formatBytes, formatDate } from "@/lib/utils"

import type { DocumentStage } from "@/types/document"


// ============================================================
// STATUS LABELS
// ============================================================
//
// IMPORTANT:
// The backend may return different status names such as
// "uploaded", "analysed", "formatted", or "exported".
//
// This function safely converts any backend status into a
// frontend-friendly badge.
// ============================================================

type StatusBadge = {
  label: string
  variant:
    | "default"
    | "success"
    | "warning"
    | "info"
    | "secondary"
    | "destructive"
}

function getStatusBadge(
  status?: string
): StatusBadge {

  switch (status?.toLowerCase()) {

    case "uploaded":
      return {
        label: "Uploaded",
        variant: "secondary",
      }

    case "analysed":
    case "analyzed":
      return {
        label: "Analysed",
        variant: "info",
      }

    case "structured":
      return {
        label: "Structured",
        variant: "info",
      }

    case "classified":
      return {
        label: "Classified",
        variant: "info",
      }

    case "formatting":
    case "processing":
      return {
        label: "Formatting",
        variant: "warning",
      }

    case "formatted":
      return {
        label: "Formatted",
        variant: "success",
      }

    case "validated":
      return {
        label: "Validated",
        variant: "default",
      }

    case "exported":
      return {
        label: "Exported",
        variant: "success",
      }

    case "failed":
    case "error":
      return {
        label: "Error",
        variant: "destructive",
      }

    default:
      return {
        label: status || "Uploaded",
        variant: "secondary",
      }
  }
}


// ============================================================
// DOCUMENTS VIEW
// ============================================================

export function DocumentsView() {

  const {
    navigate,
    setUploadedFile,
    setAnalysed,
    setFormatted,
    addToast,
  } = useWorkspace()


  // ==========================================================
  // LOAD DOCUMENTS
  // ==========================================================

  const {
    data: documents,
    error,
    isLoading,
    mutate,
  } = useSWR(
    "documents",
    getDocuments,
    {
      revalidateOnFocus: false,
    }
  )


  // ==========================================================
  // DELETE DOCUMENT
  // ==========================================================

  const handleDelete = async (
    documentId: string,
    documentName: string
  ) => {

    const confirmed =
      window.confirm(
        `Are you sure you want to delete "${documentName}"?`
      )

    if (!confirmed) {
      return
    }

    try {

      await deleteDocument(documentId)

      await mutate()

      addToast({
        variant: "success",
        title: "Document deleted",
        description:
          `${documentName} was removed successfully.`,
      })

    } catch (error) {

      console.error(
        "Delete document error:",
        error
      )

      addToast({
        variant: "error",
        title: "Delete failed",
        description:
          error instanceof Error
            ? error.message
            : "Unable to delete the document.",
      })
    }
  }


  // ==========================================================
  // DOWNLOAD DOCUMENT
  // ==========================================================

  const handleDownload = async (
    documentId: string
  ) => {

    try {

      await downloadDocument(
        documentId
      )

      addToast({
        variant: "success",
        title: "Download complete",
        description:
          "The formatted document was downloaded successfully.",
      })

    } catch (error) {

      console.error(
        "Download error:",
        error
      )

      addToast({
        variant: "error",
        title: "Download failed",
        description:
          error instanceof Error
            ? error.message
            : "Unable to download the document.",
      })
    }
  }


  // ==========================================================
  // OPEN DOCUMENT
  // ==========================================================

  const handleOpenDocument = (
    documentId: string
  ) => {

    // The current workspace uses the selected uploaded
    // document for the analysis/format workflow.
    //
    // We do not have the original File object here because
    // the document is stored by the backend.
    //
    // Therefore, simply navigate to the upload screen.
    //
    // The document list remains available through this page.

    console.log(
      "Selected document:",
      documentId
    )

    navigate("analysis")
  }


  // ==========================================================
  // LOADING
  // ==========================================================

  if (isLoading) {

    return (
      <div className="mx-auto w-full max-w-6xl">

        <Card>

          <CardContent className="flex flex-col items-center justify-center gap-3 p-12">

            <FileText className="size-8 animate-pulse text-primary" />

            <p className="text-sm text-muted-foreground">
              Loading documents…
            </p>

          </CardContent>

        </Card>

      </div>
    )
  }


  // ==========================================================
  // ERROR
  // ==========================================================

  if (error) {

    return (
      <div className="mx-auto w-full max-w-6xl">

        <Card>

          <CardContent className="flex flex-col items-center justify-center gap-4 p-12 text-center">

            <FileText className="size-8 text-destructive" />

            <div>

              <p className="text-base font-medium text-foreground">
                Unable to load documents
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                {error instanceof Error
                  ? error.message
                  : "Something went wrong while loading your documents."}
              </p>

            </div>

            <Button
              variant="outline"
              onClick={() => mutate()}
            >
              Try Again
            </Button>

          </CardContent>

        </Card>

      </div>
    )
  }


  // ==========================================================
  // EMPTY STATE
  // ==========================================================

  if (!documents || documents.length === 0) {

    return (
      <EmptyState
        icon={FileText}
        title="No documents yet"
        description="Upload a Microsoft Word manuscript to begin analysing and formatting it."
        actionLabel="Upload Manuscript"
        actionView="upload"
      />
    )
  }


  // ==========================================================
  // DOCUMENT LIST
  // ==========================================================

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

        <div>

          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Documents
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Manage manuscripts processed by Formiva.
          </p>

        </div>

        <Button
          onClick={() => {
            setUploadedFile(null)
            setAnalysed(false)
            setFormatted(false)
            navigate("upload")
          }}
        >
          <Upload className="size-4" />
          Upload Manuscript
        </Button>

      </div>


      {/* ======================================================
          DOCUMENT COUNT
      ====================================================== */}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">

        <Card>

          <CardContent className="flex flex-col gap-2 p-5">

            <FileText className="size-5 text-primary" />

            <span className="text-2xl font-semibold text-foreground">
              {documents.length}
            </span>

            <span className="text-xs text-muted-foreground">
              Total Documents
            </span>

          </CardContent>

        </Card>


        <Card>

          <CardContent className="flex flex-col gap-2 p-5">

            <FileCheck2 className="size-5 text-success" />

            <span className="text-2xl font-semibold text-foreground">
              {
                documents.filter(
                  (doc) =>
                    doc.status === "exported" ||
                    doc.status === ("formatted" as DocumentStage)
                ).length
              }
            </span>

            <span className="text-xs text-muted-foreground">
              Completed
            </span>

          </CardContent>

        </Card>


        <Card className="col-span-2 sm:col-span-1">

          <CardContent className="flex flex-col gap-2 p-5">

            <FileText className="size-5 text-primary" />

            <span className="text-2xl font-semibold text-foreground">
              {
                documents.reduce(
                  (total, doc) =>
                    total + (doc.pages || 0),
                  0
                )
              }
            </span>

            <span className="text-xs text-muted-foreground">
              Total Pages
            </span>

          </CardContent>

        </Card>

      </div>


      {/* ======================================================
          DOCUMENT TABLE
      ====================================================== */}

      <Card>

        <CardHeader>

          <CardTitle>
            All Documents
          </CardTitle>

        </CardHeader>


        <CardContent className="p-0">

          <div className="overflow-x-auto">

            <div className="min-w-190">

              {/* TABLE HEADER */}

              <div className="grid grid-cols-[minmax(260px,1fr)_120px_120px_140px] items-center gap-4 border-b border-border bg-muted/30 px-5 py-3">

                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Document
                </span>

                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </span>

                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Size
                </span>

                <span className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Actions
                </span>

              </div>


              {/* DOCUMENT ROWS */}

              <div className="divide-y divide-border">

                {documents.map((doc) => {

                  // IMPORTANT:
                  // Always use the safe status function.
                  //
                  // This prevents:
                  // Cannot read properties of undefined
                  // (reading 'variant')

                  const status =
                    getStatusBadge(
                      String(doc.status)
                    )


                  return (
                    <div
                      key={doc.id}
                      className="grid grid-cols-[minmax(260px,1fr)_120px_120px_140px] items-center gap-4 px-5 py-4 transition-colors hover:bg-accent/40"
                    >

                      {/* DOCUMENT */}

                      <button
                        type="button"
                        onClick={() =>
                          handleOpenDocument(
                            doc.id
                          )
                        }
                        className="flex min-w-0 items-center gap-3 text-left"
                      >

                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">

                          <FileText className="size-5" />

                        </div>


                        <div className="min-w-0">

                          <p className="truncate text-sm font-medium text-foreground">
                            {doc.name}
                          </p>

                          <p className="mt-0.5 text-xs text-muted-foreground">

                            {doc.pages > 0
                              ? `${doc.pages} pages · `
                              : ""}

                            {formatBytes(
                              doc.size
                            )}

                            {" · "}

                            {formatDate(
                              doc.updatedAt
                            )}

                          </p>

                        </div>

                      </button>


                      {/* STATUS */}

                      <span className="w-28">

                        <Badge
                          variant={
                            status.variant
                          }
                        >
                          {status.label}
                        </Badge>

                      </span>


                      {/* SIZE */}

                      <span className="text-sm text-muted-foreground">

                        {formatBytes(
                          doc.size
                        )}

                      </span>


                      {/* ACTIONS */}

                      <div className="flex items-center justify-end gap-1">

                        {/* DOWNLOAD */}

                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Download"
                          aria-label={`Download ${doc.name}`}
                          onClick={() =>
                            handleDownload(
                              doc.id
                            )
                          }
                        >
                          <Download className="size-4" />
                        </Button>


                        {/* DELETE */}

                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Delete"
                          aria-label={`Delete ${doc.name}`}
                          onClick={() =>
                            handleDelete(
                              doc.id,
                              doc.name
                            )
                          }
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>

                      </div>

                    </div>
                  )
                })}

              </div>

            </div>

          </div>

        </CardContent>

      </Card>

    </div>
  )
}
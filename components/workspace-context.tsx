"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import { defaultCustomStyle } from "@/services/api"

import type {
  CustomStyleSettings,
  PublicationStyleId,
  UploadedFile,
} from "@/types/document"

export type ViewId =
  | "dashboard"
  | "documents"
  | "upload"
  | "analysis"
  | "format"
  | "preview"
  | "validation"
  | "output"
  | "settings"

export interface Toast {
  id: string
  title: string
  description?: string
  variant: "success" | "error" | "info"
}

interface WorkspaceState {
  activeView: ViewId
  navigate: (view: ViewId) => void

  uploadedFile: UploadedFile | null
  setUploadedFile: (
    file: UploadedFile | null,
  ) => void

  analysed: boolean
  setAnalysed: (
    value: boolean,
  ) => void

  formatted: boolean
  setFormatted: (
    value: boolean,
  ) => void

  selectedStyle: PublicationStyleId
  setSelectedStyle: (
    style: PublicationStyleId,
  ) => void

  customStyle: CustomStyleSettings
  setCustomStyle: (
    style: CustomStyleSettings,
  ) => void

  toasts: Toast[]

  addToast: (
    toast: Omit<Toast, "id">,
  ) => void

  dismissToast: (
    id: string,
  ) => void
}

const WorkspaceContext =
  createContext<WorkspaceState | null>(
    null,
  )

export function WorkspaceProvider({
  children,
}: {
  children: ReactNode
}) {
  const [
    activeView,
    setActiveView,
  ] =
    useState<ViewId>(
      "dashboard",
    )

  const [
    uploadedFile,
    setUploadedFile,
  ] =
    useState<UploadedFile | null>(
      null,
    )

  const [
    analysed,
    setAnalysed,
  ] =
    useState(false)

  const [
    formatted,
    setFormatted,
  ] =
    useState(false)

  const [
    selectedStyle,
    setSelectedStyle,
  ] =
    useState<PublicationStyleId>(
      "academic",
    )

  const [
    customStyle,
    setCustomStyle,
  ] =
    useState<CustomStyleSettings>(
      defaultCustomStyle,
    )

  const [
    toasts,
    setToasts,
  ] =
    useState<Toast[]>([])

  const dismissToast =
    useCallback(
      (id: string) => {
        setToasts(
          (prev) =>
            prev.filter(
              (toast) =>
                toast.id !== id,
            ),
        )
      },
      [],
    )

  const addToast =
    useCallback(
      (
        toast: Omit<
          Toast,
          "id"
        >,
      ) => {
        const id =
          Math.random()
            .toString(36)
            .slice(2)

        setToasts(
          (prev) => [
            ...prev,
            {
              ...toast,
              id,
            },
          ],
        )

        setTimeout(
          () =>
            dismissToast(id),
          4000,
        )
      },
      [dismissToast],
    )

  const navigate =
    useCallback(
      (view: ViewId) => {
        setActiveView(view)

        if (
          typeof window !==
          "undefined"
        ) {
          window.scrollTo({
            top: 0,
          })
        }
      },
      [],
    )

  const value =
    useMemo<WorkspaceState>(
      () => ({
        activeView,
        navigate,

        uploadedFile,
        setUploadedFile,

        analysed,
        setAnalysed,

        formatted,
        setFormatted,

        selectedStyle,
        setSelectedStyle,

        customStyle,
        setCustomStyle,

        toasts,
        addToast,
        dismissToast,
      }),

      [
        activeView,
        navigate,
        uploadedFile,
        analysed,
        formatted,
        selectedStyle,
        customStyle,
        toasts,
        addToast,
        dismissToast,
      ],
    )

  return (
    <WorkspaceContext.Provider
      value={value}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const ctx =
    useContext(
      WorkspaceContext,
    )

  if (!ctx) {
    throw new Error(
      "useWorkspace must be used within WorkspaceProvider",
    )
  }

  return ctx
}
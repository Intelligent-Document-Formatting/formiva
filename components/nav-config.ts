import {
  Eye,
  FileDown,
  Files,
  LayoutDashboard,
  ScanSearch,
  Settings,
  ShieldCheck,
  Upload,
  Wand2,
  type LucideIcon,
} from "lucide-react"
import type { ViewId } from "@/components/workspace-context"

export interface NavItem {
  id: ViewId
  label: string
  icon: LucideIcon
  title: string
  description: string
}

export const navItems: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    title: "Dashboard",
    description: "Overview of your local document formatting workspace.",
  },
  {
    id: "documents",
    label: "Documents",
    icon: Files,
    title: "Documents",
    description: "All manuscripts processed on this machine.",
  },
  {
    id: "upload",
    label: "Upload",
    icon: Upload,
    title: "Upload Manuscript",
    description: "Add an unformatted Microsoft Word document to begin.",
  },
  {
    id: "analysis",
    label: "Analysis",
    icon: ScanSearch,
    title: "Document Analysis",
    description: "ML-driven structure detection and element classification.",
  },
  {
    id: "format",
    label: "Formatting",
    icon: Wand2,
    title: "Publication Formatting",
    description: "Choose a publication standard and apply it locally.",
  },
  {
    id: "preview",
    label: "Preview",
    icon: Eye,
    title: "Document Preview",
    description: "Compare the original and the formatted manuscript.",
  },
  {
    id: "validation",
    label: "Validation",
    icon: ShieldCheck,
    title: "Quality Validation",
    description: "Automated checks against the publication standard.",
  },
  {
    id: "output",
    label: "Export",
    icon: FileDown,
    title: "Export & Download",
    description: "Download the publication-ready DOCX file.",
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    title: "Settings",
    description: "Local processing, model and appearance preferences.",
  },
]

export const viewMetaMap: Record<ViewId, { title: string; description: string }> = navItems.reduce(
  (acc, item) => {
    acc[item.id] = { title: item.title, description: item.description }
    return acc
  },
  {} as Record<ViewId, { title: string; description: string }>,
)

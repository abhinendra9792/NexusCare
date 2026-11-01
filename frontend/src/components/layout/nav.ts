import type { LucideIcon } from "lucide-react"
import {
  CalendarClock,
  ClipboardList,
  FileSearch,
  History,
  Inbox,
  LayoutDashboard,
  ListChecks,
  Settings,
} from "lucide-react"

export type NavItem = {
  label: string
  path: string
  icon: LucideIcon
}

export const navItems: NavItem[] = [
  { label: "Overview", path: "/", icon: LayoutDashboard },
  { label: "Appointments", path: "/appointments", icon: CalendarClock },
  { label: "Document Intelligence", path: "/documents", icon: FileSearch },
  { label: "Visit Summaries", path: "/visit-summaries", icon: ClipboardList },
  { label: "Care Plans", path: "/care-plans", icon: ListChecks },
  { label: "Service Requests", path: "/service-requests", icon: Inbox },
  { label: "Activity Log", path: "/activity", icon: History },
  { label: "Settings", path: "/settings", icon: Settings },
]

export function getPageTitle(pathname: string): string {
  const match = navItems.find((item) => item.path === pathname)
  return match?.label ?? "Page not found"
}
import {
  Activity,
  Camera,
  ClipboardList,
  Code,
  CreditCard,
  DoorOpen,
  FileImage,
  FolderOpen,
  Gem,
  KanbanSquare,
  LayoutGrid,
  Network,
  Package,
  Ticket,
  type LucideIcon,
} from "lucide-react"

/**
 * Icon lookup for the catalog.
 *
 * The catalog stores an icon by name so the row stays data — a database cannot
 * hold a React component, and a JSON blob of icon paths would rot the moment
 * lucide renamed one. Anything unrecognised falls back to a neutral grid
 * rather than breaking the page.
 */
const ICONS: Record<string, LucideIcon> = {
  Activity,
  Camera,
  ClipboardList,
  Code,
  CreditCard,
  DoorOpen,
  FileImage,
  FolderOpen,
  Gem,
  KanbanSquare,
  LayoutGrid,
  Network,
  Package,
  Ticket,
}

export function ProductIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = (name && ICONS[name]) || LayoutGrid
  return <Icon className={className} />
}

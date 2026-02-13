import * as React from "react"
import { cn } from "@/lib/utils"

interface SectionHeaderProps {
  number?: string
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
}

export function SectionHeader({
  number,
  title,
  description,
  actions,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="space-y-2">
        <div className="flex items-center gap-4">
          {number && (
            <span className="text-section-number text-club">
              {number}
            </span>
          )}
          <h2 className="text-display-xs font-semibold tracking-tight">{title}</h2>
        </div>
        {description && (
          <p className="text-body-md text-muted-foreground max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  )
}

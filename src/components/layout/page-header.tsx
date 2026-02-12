import * as React from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  heading: string
  description?: string
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({
  heading,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="space-y-1">
        <h1 className="text-display-xs tracking-tight">{heading}</h1>
        {description && (
          <p className="text-body-md text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  )
}

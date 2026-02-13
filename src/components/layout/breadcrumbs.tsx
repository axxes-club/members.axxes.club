"use client"

import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { ChevronRight, Home } from "lucide-react"

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
  showHome?: boolean
}

export function Breadcrumbs({ items, className, showHome = true }: BreadcrumbsProps) {
  const allItems = showHome
    ? [{ label: "Dashboard", href: "/dashboard" }, ...items]
    : items

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center gap-1 text-body-sm", className)}
    >
      {allItems.map((item, index) => {
        const isLast = index === allItems.length - 1
        const isFirst = index === 0

        return (
          <React.Fragment key={index}>
            {index > 0 && (
              <ChevronRight className="h-3 w-3 text-muted-foreground/50 mx-1" />
            )}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className={cn(
                  "text-muted-foreground hover:text-foreground transition-colors",
                  "flex items-center gap-1.5"
                )}
              >
                {isFirst && showHome && <Home className="h-3.5 w-3.5" />}
                <span>{item.label}</span>
              </Link>
            ) : (
              <span
                className={cn(
                  "flex items-center gap-1.5",
                  isLast ? "text-foreground font-medium" : "text-muted-foreground"
                )}
              >
                {isFirst && showHome && <Home className="h-3.5 w-3.5" />}
                <span>{item.label}</span>
              </span>
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Filter,
  X,
  Check,
} from "lucide-react"
import { format } from "date-fns"

export interface FilterState {
  types: string[]
  leadStatuses: string[]
  leadSources: string[]
  tags: string[]
  hasEmail: boolean | undefined
  hasPhone: boolean | undefined
  createdAfter: string | undefined
  createdBefore: string | undefined
}

interface AdvancedFiltersProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  metadata: {
    leadSources: string[]
    tags: string[]
    types: string[]
    leadStatuses: string[]
  }
}

const typeLabels: Record<string, string> = {
  lead: "Lead",
  customer: "Customer",
  vip: "VIP",
  vendor: "Vendor",
  partner: "Partner",
}

const leadStatusLabels: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  converted: "Converted",
  lost: "Lost",
}

export function AdvancedFilters({ filters, onFiltersChange, metadata }: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [localFilters, setLocalFilters] = useState<FilterState>(filters)

  const [previousFilters, setPreviousFilters] = useState(filters)
  if (previousFilters !== filters) {
    setPreviousFilters(filters)
    setLocalFilters(filters)
  }

  const activeFilterCount = [
    filters.types.length,
    filters.leadStatuses.length,
    filters.leadSources.length,
    filters.tags.length,
    filters.hasEmail ? 1 : 0,
    filters.hasPhone ? 1 : 0,
    filters.createdAfter ? 1 : 0,
    filters.createdBefore ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  const handleApply = () => {
    onFiltersChange(localFilters)
    setIsOpen(false)
  }

  const handleClear = () => {
    const clearedFilters: FilterState = {
      types: [],
      leadStatuses: [],
      leadSources: [],
      tags: [],
      hasEmail: undefined,
      hasPhone: undefined,
      createdAfter: undefined,
      createdBefore: undefined,
    }
    setLocalFilters(clearedFilters)
    onFiltersChange(clearedFilters)
    setIsOpen(false)
  }

  const toggleArrayValue = (key: keyof Pick<FilterState, "types" | "leadStatuses" | "leadSources" | "tags">, value: string) => {
    setLocalFilters((prev) => {
      const arr = prev[key] as string[]
      return {
        ...prev,
        [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
      }
    })
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="relative">
          <Filter className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge
              variant="secondary"
              className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] max-h-[80vh] overflow-y-auto" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h4 className="font-medium">Filters</h4>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClear}>
                Clear all
              </Button>
            )}
          </div>

          {/* Contact Type */}
          <div className="space-y-2">
            <Label>Contact Type</Label>
            <div className="flex flex-wrap gap-2">
              {metadata.types.map((type) => (
                <Badge
                  key={type}
                  variant={localFilters.types.includes(type) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleArrayValue("types", type)}
                >
                  {typeLabels[type] || type}
                  {localFilters.types.includes(type) && (
                    <Check className="h-3 w-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
          </div>

          {/* Lead Status */}
          <div className="space-y-2">
            <Label>Lead Status</Label>
            <div className="flex flex-wrap gap-2">
              {metadata.leadStatuses.map((status) => (
                <Badge
                  key={status}
                  variant={localFilters.leadStatuses.includes(status) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleArrayValue("leadStatuses", status)}
                >
                  {leadStatusLabels[status] || status}
                  {localFilters.leadStatuses.includes(status) && (
                    <Check className="h-3 w-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
          </div>

          {/* Lead Source */}
          <div className="space-y-2">
            <Label>Lead Source</Label>
            {metadata.leadSources.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {metadata.leadSources.map((source) => (
                  <Badge
                    key={source}
                    variant={localFilters.leadSources.includes(source) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleArrayValue("leadSources", source)}
                  >
                    {source}
                    {localFilters.leadSources.includes(source) && (
                      <Check className="h-3 w-3 ml-1" />
                    )}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No lead sources found</p>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            {metadata.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {metadata.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={localFilters.tags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleArrayValue("tags", tag)}
                  >
                    {tag}
                    {localFilters.tags.includes(tag) && (
                      <Check className="h-3 w-3 ml-1" />
                    )}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No tags found</p>
            )}
          </div>

          {/* Contact Info */}
          <div className="space-y-2">
            <Label>Contact Info</Label>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={localFilters.hasEmail ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    hasEmail: prev.hasEmail ? undefined : true,
                  }))
                }
              >
                Has Email
                {localFilters.hasEmail && <Check className="h-3 w-3 ml-1" />}
              </Badge>
              <Badge
                variant={localFilters.hasPhone ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    hasPhone: prev.hasPhone ? undefined : true,
                  }))
                }
              >
                Has Phone
                {localFilters.hasPhone && <Check className="h-3 w-3 ml-1" />}
              </Badge>
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <Label>Created Date</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">After</Label>
                <Input
                  type="date"
                  value={localFilters.createdAfter || ""}
                  onChange={(e) =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      createdAfter: e.target.value || undefined,
                    }))
                  }
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Before</Label>
                <Input
                  type="date"
                  value={localFilters.createdBefore || ""}
                  onChange={(e) =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      createdBefore: e.target.value || undefined,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApply}>Apply Filters</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Active Filters Display
export function ActiveFiltersDisplay({
  filters,
  onRemove,
  onClear,
}: {
  filters: FilterState
  onRemove: (key: keyof FilterState, value?: string) => void
  onClear: () => void
}) {
  const activeFilters: { key: keyof FilterState; label: string; value?: string }[] = []

  filters.types.forEach((type) => {
    activeFilters.push({ key: "types", label: `Type: ${typeLabels[type] || type}`, value: type })
  })

  filters.leadStatuses.forEach((status) => {
    activeFilters.push({ key: "leadStatuses", label: `Status: ${leadStatusLabels[status] || status}`, value: status })
  })

  filters.leadSources.forEach((source) => {
    activeFilters.push({ key: "leadSources", label: `Source: ${source}`, value: source })
  })

  filters.tags.forEach((tag) => {
    activeFilters.push({ key: "tags", label: `Tag: ${tag}`, value: tag })
  })

  if (filters.hasEmail) {
    activeFilters.push({ key: "hasEmail", label: "Has Email" })
  }

  if (filters.hasPhone) {
    activeFilters.push({ key: "hasPhone", label: "Has Phone" })
  }

  if (filters.createdAfter) {
    activeFilters.push({ key: "createdAfter", label: `After: ${format(new Date(filters.createdAfter), "MMM d")}` })
  }

  if (filters.createdBefore) {
    activeFilters.push({ key: "createdBefore", label: `Before: ${format(new Date(filters.createdBefore), "MMM d")}` })
  }

  if (activeFilters.length === 0) return null

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {activeFilters.map((filter, index) => (
        <Badge key={index} variant="secondary" className="gap-1">
          {filter.label}
          <button
            onClick={() => onRemove(filter.key, filter.value)}
            className="ml-1 hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Button variant="ghost" size="sm" onClick={onClear}>
        Clear all
      </Button>
    </div>
  )
}
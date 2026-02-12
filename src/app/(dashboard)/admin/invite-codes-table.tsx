"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toggleInviteCode, deleteInviteCode } from "@/lib/actions/admin"
import { Trash2, ToggleLeft, ToggleRight } from "lucide-react"
import type { InviteCode } from "@/lib/db/schema/invite-codes"

interface InviteCodesTableProps {
  codes: InviteCode[]
}

export function InviteCodesTable({ codes }: InviteCodesTableProps) {
  const [loading, setLoading] = useState<string | null>(null)

  async function handleToggle(id: string) {
    setLoading(id)
    try {
      await toggleInviteCode(id)
    } catch (error) {
      console.error("Failed to toggle invite code:", error)
    } finally {
      setLoading(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this invite code?")) return

    setLoading(id)
    try {
      await deleteInviteCode(id)
    } catch (error) {
      console.error("Failed to delete invite code:", error)
    } finally {
      setLoading(null)
    }
  }

  if (codes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No invite codes yet. Create one to get started.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b text-left text-sm text-muted-foreground">
            <th className="pb-3 font-medium">Code</th>
            <th className="pb-3 font-medium">Status</th>
            <th className="pb-3 font-medium">Usage</th>
            <th className="pb-3 font-medium">Created</th>
            <th className="pb-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {codes.map((code) => (
            <tr key={code.id} className="border-b">
              <td className="py-3 font-mono font-semibold">{code.code}</td>
              <td className="py-3">
                <Badge variant={code.isActive ? "default" : "secondary"}>
                  {code.isActive ? "Active" : "Inactive"}
                </Badge>
              </td>
              <td className="py-3">
                {code.usedCount}
                {code.maxUses ? ` / ${code.maxUses}` : " / ∞"}
              </td>
              <td className="py-3 text-sm text-muted-foreground">
                {new Date(code.createdAt).toLocaleDateString()}
              </td>
              <td className="py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleToggle(code.id)}
                    disabled={loading === code.id}
                  >
                    {code.isActive ? (
                      <ToggleRight className="h-4 w-4" />
                    ) : (
                      <ToggleLeft className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(code.id)}
                    disabled={loading === code.id}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

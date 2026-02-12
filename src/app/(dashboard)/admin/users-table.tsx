"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toggleUserSuperadmin } from "@/lib/actions/admin"
import { Shield, ShieldOff } from "lucide-react"
import type { User } from "@/lib/db/schema/users"

interface UsersTableProps {
  users: User[]
}

export function UsersTable({ users }: UsersTableProps) {
  const [loading, setLoading] = useState<string | null>(null)

  async function handleToggleSuperadmin(id: string) {
    setLoading(id)
    try {
      await toggleUserSuperadmin(id)
    } catch (error) {
      console.error("Failed to toggle superadmin:", error)
      alert(error instanceof Error ? error.message : "Failed to update user")
    } finally {
      setLoading(null)
    }
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No users registered yet.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b text-left text-sm text-muted-foreground">
            <th className="pb-3 font-medium">User</th>
            <th className="pb-3 font-medium">Email</th>
            <th className="pb-3 font-medium">Role</th>
            <th className="pb-3 font-medium">Joined</th>
            <th className="pb-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b">
              <td className="py-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.image || undefined} />
                    <AvatarFallback>
                      {user.name?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{user.name}</span>
                </div>
              </td>
              <td className="py-3 text-sm text-muted-foreground">
                {user.email}
              </td>
              <td className="py-3">
                {user.isSuperadmin ? (
                  <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">
                    Superadmin
                  </Badge>
                ) : (
                  <Badge variant="secondary">User</Badge>
                )}
              </td>
              <td className="py-3 text-sm text-muted-foreground">
                {new Date(user.createdAt).toLocaleDateString()}
              </td>
              <td className="py-3 text-right">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleToggleSuperadmin(user.id)}
                  disabled={loading === user.id}
                  title={user.isSuperadmin ? "Remove superadmin" : "Make superadmin"}
                >
                  {user.isSuperadmin ? (
                    <ShieldOff className="h-4 w-4" />
                  ) : (
                    <Shield className="h-4 w-4" />
                  )}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

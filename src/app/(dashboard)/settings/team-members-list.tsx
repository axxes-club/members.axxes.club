"use client"

import { useTransition } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, UserMinus, Shield } from "lucide-react"
import { updateMemberRole, removeTeamMember } from "@/lib/actions/settings"
import type { TenantMembership } from "@/lib/db/schema"

type MemberWithDetails = TenantMembership & {
  name: string
  email: string
  imageUrl?: string | null
}

interface TeamMembersListProps {
  members: MemberWithDetails[]
}

export function TeamMembersList({ members }: TeamMembersListProps) {
  const [isPending, startTransition] = useTransition()

  async function handleRoleChange(membershipId: string, role: "admin" | "manager" | "member" | "viewer") {
    startTransition(async () => {
      try {
        await updateMemberRole(membershipId, role)
      } catch (error) {
        console.error("Failed to update role:", error)
      }
    })
  }

  async function handleRemove(membershipId: string) {
    if (!confirm("Are you sure you want to remove this team member?")) return

    startTransition(async () => {
      try {
        await removeTeamMember(membershipId)
      } catch (error) {
        console.error("Failed to remove member:", error)
      }
    })
  }

  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">No team members yet</p>
      </div>
    )
  }

  return (
    <div className={`divide-y ${isPending ? "opacity-50" : ""}`}>
      {members.map((member) => (
        <div
          key={member.id}
          className="flex items-center justify-between p-4"
        >
          <div className="flex items-center gap-4">
            <Avatar>
              {member.imageUrl && <AvatarImage src={member.imageUrl} alt={member.name} />}
              <AvatarFallback>
                {member.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{member.name}</p>
              <p className="text-sm text-muted-foreground">{member.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge
              variant={
                member.role === "owner"
                  ? "default"
                  : member.role === "admin"
                  ? "secondary"
                  : "outline"
              }
            >
              {member.role}
            </Badge>
            {member.role !== "owner" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleRoleChange(member.id, "admin")}>
                    <Shield className="h-4 w-4" />
                    Make Admin
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleRoleChange(member.id, "manager")}>
                    <Shield className="h-4 w-4" />
                    Make Manager
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleRoleChange(member.id, "member")}>
                    <Shield className="h-4 w-4" />
                    Make Member
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleRoleChange(member.id, "viewer")}>
                    <Shield className="h-4 w-4" />
                    Make Viewer
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleRemove(member.id)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <UserMinus className="h-4 w-4" />
                    Remove from Team
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

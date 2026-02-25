// @ts-nocheck
"use server"

import { db } from "@/lib/db"
import {
  projects,
  projectLists,
  projectCards,
  projectLabels,
  projectCardLabels,
  projectCardMembers,
  projectChecklists,
  projectChecklistItems,
  projectCardComments,
  projectActivity,
  projectMembers,
} from "@/lib/db/schema"
import { eq, and, ilike, desc, asc, sql, inArray, isNull, gte, lte, ne } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getAuthContext } from "@/lib/auth"
import { nanoid } from "nanoid"

// ============================================
// HELPER FUNCTIONS
// ============================================

async function getTenantId() {
  return getAuthContext()
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50) + "-" + nanoid(6)
}

async function logActivity({
  projectId,
  type,
  description,
  cardId,
  listId,
  previousValue,
  newValue,
}: {
  projectId: string
  type: string
  description?: string
  cardId?: string
  listId?: string
  previousValue?: unknown
  newValue?: unknown
}) {
  const { tenantId, userId } = await getTenantId()

  await db.insert(projectActivity).values({
    projectId,
    tenantId,
    cardId: cardId || null,
    listId: listId || null,
    type,
    description,
    previousValue,
    newValue,
    userId,
  })
}

// ============================================
// PROJECTS
// ============================================

const projectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  visibility: z.enum(["private", "public", "team"]).optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
})

export type ProjectFormData = z.infer<typeof projectSchema>

export async function getProjects({
  search,
  status = "active",
  sortBy = "createdAt",
  sortOrder = "desc",
  page = 1,
  limit = 20,
}: {
  search?: string
  status?: "active" | "archived" | "completed" | "on_hold" | "all"
  sortBy?: "name" | "createdAt" | "updatedAt"
  sortOrder?: "asc" | "desc"
  page?: number
  limit?: number
} = {}) {
  const { tenantId } = await getTenantId()

  const conditions = [
    eq(projects.tenantId, tenantId),
    isNull(projects.deletedAt),
  ]

  if (status !== "all") {
    conditions.push(eq(projects.status, status))
  }

  if (search) {
    conditions.push(ilike(projects.name, `%${search}%`))
  }

  const orderColumn = {
    name: projects.name,
    createdAt: projects.createdAt,
    updatedAt: projects.updatedAt,
  }[sortBy]

  const orderFn = sortOrder === "asc" ? asc : desc

  const [projectList, countResult] = await Promise.all([
    db
      .select()
      .from(projects)
      .where(and(...conditions))
      .orderBy(orderFn(orderColumn))
      .limit(limit)
      .offset((page - 1) * limit),
    db
      .select({ count: sql<number>`count(*)` })
      .from(projects)
      .where(and(...conditions)),
  ])

  return {
    projects: projectList,
    total: Number(countResult[0].count),
    page,
    limit,
    totalPages: Math.ceil(Number(countResult[0].count) / limit),
  }
}

export async function getProject(id: string) {
  const { tenantId } = await getTenantId()

  const project = await db.query.projects.findFirst({
    where: and(
      eq(projects.id, id),
      eq(projects.tenantId, tenantId),
      isNull(projects.deletedAt)
    ),
    with: {
      lists: {
        where: isNull(projectLists.deletedAt),
        orderBy: [asc(projectLists.position)],
        with: {
          cards: {
            where: isNull(projectCards.deletedAt),
            orderBy: [asc(projectCards.position)],
            with: {
              labels: {
                with: {
                  label: true,
                },
              },
              members: {
                with: {
                  user: true,
                },
              },
              checklists: {
                with: {
                  items: true,
                },
              },
            },
          },
        },
      },
      labels: true,
      members: {
        with: {
          user: true,
        },
      },
    },
  })

  if (!project) {
    throw new Error("Project not found")
  }

  return project
}

export async function getProjectStats(id: string) {
  const { tenantId } = await getTenantId()

  // Verify project belongs to tenant
  const project = await db.query.projects.findFirst({
    where: and(
      eq(projects.id, id),
      eq(projects.tenantId, tenantId),
      isNull(projects.deletedAt)
    ),
  })

  if (!project) {
    throw new Error("Project not found")
  }

  // Get counts
  const [totalCards, completedCards, overdueCards, totalLists] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(projectCards)
      .where(
        and(
          eq(projectCards.projectId, id),
          isNull(projectCards.deletedAt)
        )
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(projectCards)
      .where(
        and(
          eq(projectCards.projectId, id),
          isNull(projectCards.deletedAt),
          sql`${projectCards.completedAt} IS NOT NULL`
        )
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(projectCards)
      .where(
        and(
          eq(projectCards.projectId, id),
          isNull(projectCards.deletedAt),
          sql`${projectCards.dueDate} < NOW()`,
          sql`${projectCards.completedAt} IS NULL`
        )
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(projectLists)
      .where(
        and(
          eq(projectLists.projectId, id),
          isNull(projectLists.deletedAt)
        )
      ),
  ])

  return {
    totalCards: Number(totalCards[0].count),
    completedCards: Number(completedCards[0].count),
    overdueCards: Number(overdueCards[0].count),
    totalLists: Number(totalLists[0].count),
  }
}

export async function createProject(data: ProjectFormData) {
  const { tenantId, userId } = await getTenantId()

  const parsed = projectSchema.parse(data)
  const slug = generateSlug(parsed.name)

  const [project] = await db
    .insert(projects)
    .values({
      tenantId,
      name: parsed.name,
      description: parsed.description || null,
      slug,
      visibility: parsed.visibility || "team",
      color: parsed.color || null,
      icon: parsed.icon || null,
      startDate: parsed.startDate ? new Date(parsed.startDate) : null,
      dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
      createdById: userId,
    })
    .returning()

  // Create default lists
  const defaultLists = [
    { name: "To Do", position: 0, color: "#64748b" },
    { name: "In Progress", position: 1, color: "#3b82f6" },
    { name: "Done", position: 2, color: "#22c55e", isDoneList: true },
  ]

  await db.insert(projectLists).values(
    defaultLists.map((list) => ({
      projectId: project.id,
      name: list.name,
      position: list.position,
      color: list.color,
      isDoneList: list.isDoneList || false,
    }))
  )

  // Add creator as project member
  await db.insert(projectMembers).values({
    projectId: project.id,
    userId,
    role: "admin",
  })

  // Create default labels
  const defaultLabels = [
    { name: "Bug", color: "#ef4444" },
    { name: "Feature", color: "#3b82f6" },
    { name: "Enhancement", color: "#8b5cf6" },
    { name: "Documentation", color: "#6b7280" },
    { name: "Priority", color: "#f59e0b" },
  ]

  await db.insert(projectLabels).values(
    defaultLabels.map((label) => ({
      projectId: project.id,
      name: label.name,
      color: label.color,
    }))
  )

  // Log activity
  await logActivity({
    projectId: project.id,
    type: "project.created",
    description: `Created project "${parsed.name}"`,
  })

  revalidatePath("/projects")
  return project
}

export async function updateProject(id: string, data: Partial<ProjectFormData>) {
  const { tenantId, userId } = await getTenantId()

  // Verify project belongs to tenant
  const existing = await db.query.projects.findFirst({
    where: and(
      eq(projects.id, id),
      eq(projects.tenantId, tenantId),
      isNull(projects.deletedAt)
    ),
  })

  if (!existing) {
    throw new Error("Project not found")
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  }

  if (data.name) updateData.name = data.name
  if (data.description !== undefined) updateData.description = data.description
  if (data.visibility) updateData.visibility = data.visibility
  if (data.color !== undefined) updateData.color = data.color
  if (data.icon !== undefined) updateData.icon = data.icon
  if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null
  if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null

  const [project] = await db
    .update(projects)
    .set(updateData)
    .where(eq(projects.id, id))
    .returning()

  // Log activity
  await logActivity({
    projectId: id,
    type: "project.updated",
    description: `Updated project details`,
    previousValue: existing,
    newValue: updateData,
  })

  revalidatePath("/projects")
  revalidatePath(`/projects/${id}`)
  return project
}

export async function archiveProject(id: string) {
  const { tenantId, userId } = await getTenantId()

  const [project] = await db
    .update(projects)
    .set({
      status: "archived",
      archivedAt: new Date(),
      archivedById: userId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(projects.id, id),
        eq(projects.tenantId, tenantId)
      )
    )
    .returning()

  if (!project) {
    throw new Error("Project not found")
  }

  await logActivity({
    projectId: id,
    type: "project.archived",
    description: `Archived project "${project.name}"`,
  })

  revalidatePath("/projects")
}

export async function deleteProject(id: string) {
  const { tenantId } = await getTenantId()

  await db
    .update(projects)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(projects.id, id),
        eq(projects.tenantId, tenantId)
      )
    )

  revalidatePath("/projects")
}

// ============================================
// PROJECT LISTS
// ============================================

const listSchema = z.object({
  name: z.string().min(1, "Name is required"),
  color: z.string().optional(),
  wipLimit: z.number().optional(),
})

export type ListFormData = z.infer<typeof listSchema>

export async function createList(projectId: string, data: ListFormData) {
  const { tenantId, userId } = await getTenantId()

  // Verify project belongs to tenant
  const project = await db.query.projects.findFirst({
    where: and(
      eq(projects.id, projectId),
      eq(projects.tenantId, tenantId),
      isNull(projects.deletedAt)
    ),
  })

  if (!project) {
    throw new Error("Project not found")
  }

  // Get max position
  const maxPosition = await db
    .select({ max: sql<number>`coalesce(max(position), -1)` })
    .from(projectLists)
    .where(
      and(
        eq(projectLists.projectId, projectId),
        isNull(projectLists.deletedAt)
      )
    )

  const parsed = listSchema.parse(data)

  const [list] = await db
    .insert(projectLists)
    .values({
      projectId,
      name: parsed.name,
      color: parsed.color || null,
      position: Number(maxPosition[0].max) + 1,
      wipLimit: parsed.wipLimit || null,
    })
    .returning()

  await logActivity({
    projectId,
    type: "list.created",
    description: `Created list "${parsed.name}"`,
    listId: list.id,
  })

  revalidatePath(`/projects/${projectId}`)
  return list
}

export async function updateList(id: string, data: Partial<ListFormData>) {
  const { tenantId } = await getTenantId()

  // Get list and verify project belongs to tenant
  const list = await db.query.projectLists.findFirst({
    where: eq(projectLists.id, id),
    with: {
      project: true,
    },
  })

  if (!list || list.project.tenantId !== tenantId) {
    throw new Error("List not found")
  }

  const [updatedList] = await db
    .update(projectLists)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(projectLists.id, id))
    .returning()

  await logActivity({
    projectId: list.projectId,
    type: "list.updated",
    description: `Updated list "${updatedList.name}"`,
    listId: id,
  })

  revalidatePath(`/projects/${list.projectId}`)
  return updatedList
}

export async function deleteList(id: string) {
  const { tenantId } = await getTenantId()

  const list = await db.query.projectLists.findFirst({
    where: eq(projectLists.id, id),
    with: {
      project: true,
    },
  })

  if (!list || list.project.tenantId !== tenantId) {
    throw new Error("List not found")
  }

  await db
    .update(projectLists)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(projectLists.id, id))

  await logActivity({
    projectId: list.projectId,
    type: "list.deleted",
    description: `Deleted list "${list.name}"`,
    listId: id,
  })

  revalidatePath(`/projects/${list.projectId}`)
}

export async function reorderLists(projectId: string, listIds: string[]) {
  const { tenantId } = await getTenantId()

  // Verify project belongs to tenant
  const project = await db.query.projects.findFirst({
    where: and(
      eq(projects.id, projectId),
      eq(projects.tenantId, tenantId),
      isNull(projects.deletedAt)
    ),
  })

  if (!project) {
    throw new Error("Project not found")
  }

  // Update positions
  for (let i = 0; i < listIds.length; i++) {
    await db
      .update(projectLists)
      .set({ position: i, updatedAt: new Date() })
      .where(eq(projectLists.id, listIds[i]))
  }

  revalidatePath(`/projects/${projectId}`)
}

// ============================================
// PROJECT CARDS
// ============================================

const cardSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  listId: z.string().min(1, "List is required"),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  dueDate: z.string().optional(),
  startDate: z.string().optional(),
  estimatedHours: z.number().optional(),
  contactId: z.string().optional(),
  coverColor: z.string().optional(),
})

export type CardFormData = z.infer<typeof cardSchema>

export async function createCard(projectId: string, data: CardFormData) {
  const { tenantId, userId } = await getTenantId()

  // Verify project belongs to tenant
  const project = await db.query.projects.findFirst({
    where: and(
      eq(projects.id, projectId),
      eq(projects.tenantId, tenantId),
      isNull(projects.deletedAt)
    ),
  })

  if (!project) {
    throw new Error("Project not found")
  }

  // Verify list belongs to project
  const list = await db.query.projectLists.findFirst({
    where: and(
      eq(projectLists.id, data.listId),
      eq(projectLists.projectId, projectId),
      isNull(projectLists.deletedAt)
    ),
  })

  if (!list) {
    throw new Error("List not found")
  }

  // Get max position in list
  const maxPosition = await db
    .select({ max: sql<number>`coalesce(max(position), -1)` })
    .from(projectCards)
    .where(
      and(
        eq(projectCards.listId, data.listId),
        isNull(projectCards.deletedAt)
      )
    )

  const parsed = cardSchema.parse(data)

  const [card] = await db
    .insert(projectCards)
    .values({
      projectId,
      listId: parsed.listId,
      title: parsed.title,
      description: parsed.description || null,
      position: Number(maxPosition[0].max) + 1,
      priority: parsed.priority || "medium",
      dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
      startDate: parsed.startDate ? new Date(parsed.startDate) : null,
      estimatedHours: parsed.estimatedHours || null,
      contactId: parsed.contactId || null,
      coverColor: parsed.coverColor || null,
      createdById: userId,
    })
    .returning()

  await logActivity({
    projectId,
    type: "card.created",
    description: `Created card "${parsed.title}"`,
    cardId: card.id,
    listId: parsed.listId,
  })

  revalidatePath(`/projects/${projectId}`)
  return card
}

export async function updateCard(id: string, data: Partial<CardFormData>) {
  const { tenantId, userId } = await getTenantId()

  const card = await db.query.projectCards.findFirst({
    where: eq(projectCards.id, id),
    with: {
      project: true,
    },
  })

  if (!card || card.project.tenantId !== tenantId) {
    throw new Error("Card not found")
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  }

  if (data.title) updateData.title = data.title
  if (data.description !== undefined) updateData.description = data.description
  if (data.priority) updateData.priority = data.priority
  if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null
  if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null
  if (data.estimatedHours !== undefined) updateData.estimatedHours = data.estimatedHours
  if (data.contactId !== undefined) updateData.contactId = data.contactId || null
  if (data.coverColor !== undefined) updateData.coverColor = data.coverColor

  const [updatedCard] = await db
    .update(projectCards)
    .set(updateData)
    .where(eq(projectCards.id, id))
    .returning()

  await logActivity({
    projectId: card.projectId,
    type: "card.updated",
    description: `Updated card "${updatedCard.title}"`,
    cardId: id,
    listId: card.listId,
    previousValue: card,
    newValue: updateData,
  })

  revalidatePath(`/projects/${card.projectId}`)
  return updatedCard
}

export async function moveCard(id: string, listId: string, position: number) {
  const { tenantId, userId } = await getTenantId()

  const card = await db.query.projectCards.findFirst({
    where: eq(projectCards.id, id),
    with: {
      project: true,
    },
  })

  if (!card || card.project.tenantId !== tenantId) {
    throw new Error("Card not found")
  }

  const previousListId = card.listId

  // Update card's list and position
  await db
    .update(projectCards)
    .set({
      listId,
      position,
      updatedAt: new Date(),
    })
    .where(eq(projectCards.id, id))

  // Reorder cards in the target list
  const cardsInList = await db.query.projectCards.findMany({
    where: and(
      eq(projectCards.listId, listId),
      isNull(projectCards.deletedAt)
    ),
    orderBy: [asc(projectCards.position)],
  })

  for (let i = 0; i < cardsInList.length; i++) {
    if (cardsInList[i].id !== id) {
      await db
        .update(projectCards)
        .set({ position: i >= position ? i + 1 : i })
        .where(eq(projectCards.id, cardsInList[i].id))
    }
  }

  await logActivity({
    projectId: card.projectId,
    type: "card.moved",
    description: `Moved card "${card.title}"`,
    cardId: id,
    listId,
    previousValue: { listId: previousListId },
    newValue: { listId, position },
  })

  revalidatePath(`/projects/${card.projectId}`)
}

export async function deleteCard(id: string) {
  const { tenantId } = await getTenantId()

  const card = await db.query.projectCards.findFirst({
    where: eq(projectCards.id, id),
    with: {
      project: true,
    },
  })

  if (!card || card.project.tenantId !== tenantId) {
    throw new Error("Card not found")
  }

  await db
    .update(projectCards)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(projectCards.id, id))

  await logActivity({
    projectId: card.projectId,
    type: "card.deleted",
    description: `Deleted card "${card.title}"`,
    cardId: id,
    listId: card.listId,
  })

  revalidatePath(`/projects/${card.projectId}`)
}

export async function completeCard(id: string) {
  const { tenantId, userId } = await getTenantId()

  const card = await db.query.projectCards.findFirst({
    where: eq(projectCards.id, id),
    with: {
      project: true,
    },
  })

  if (!card || card.project.tenantId !== tenantId) {
    throw new Error("Card not found")
  }

  const [updatedCard] = await db
    .update(projectCards)
    .set({
      completedAt: new Date(),
      completedById: userId,
      updatedAt: new Date(),
    })
    .where(eq(projectCards.id, id))
    .returning()

  await logActivity({
    projectId: card.projectId,
    type: "card.completed",
    description: `Completed card "${card.title}"`,
    cardId: id,
    listId: card.listId,
  })

  revalidatePath(`/projects/${card.projectId}`)
  return updatedCard
}

// ============================================
// CARD LABELS
// ============================================

export async function addLabelToCard(cardId: string, labelId: string) {
  const { tenantId } = await getTenantId()

  const card = await db.query.projectCards.findFirst({
    where: eq(projectCards.id, cardId),
    with: { project: true },
  })

  if (!card || card.project.tenantId !== tenantId) {
    throw new Error("Card not found")
  }

  await db.insert(projectCardLabels).values({
    cardId,
    labelId,
  })

  await logActivity({
    projectId: card.projectId,
    type: "card.label.added",
    description: `Added label to card "${card.title}"`,
    cardId,
  })

  revalidatePath(`/projects/${card.projectId}`)
}

export async function removeLabelFromCard(cardId: string, labelId: string) {
  const { tenantId } = await getTenantId()

  const card = await db.query.projectCards.findFirst({
    where: eq(projectCards.id, cardId),
    with: { project: true },
  })

  if (!card || card.project.tenantId !== tenantId) {
    throw new Error("Card not found")
  }

  await db
    .delete(projectCardLabels)
    .where(
      and(
        eq(projectCardLabels.cardId, cardId),
        eq(projectCardLabels.labelId, labelId)
      )
    )

  await logActivity({
    projectId: card.projectId,
    type: "card.label.removed",
    description: `Removed label from card "${card.title}"`,
    cardId,
  })

  revalidatePath(`/projects/${card.projectId}`)
}

// ============================================
// CARD MEMBERS
// ============================================

export async function addMemberToCard(cardId: string, memberId: string) {
  const { tenantId } = await getTenantId()

  const card = await db.query.projectCards.findFirst({
    where: eq(projectCards.id, cardId),
    with: { project: true },
  })

  if (!card || card.project.tenantId !== tenantId) {
    throw new Error("Card not found")
  }

  await db.insert(projectCardMembers).values({
    cardId,
    userId: memberId,
  })

  await logActivity({
    projectId: card.projectId,
    type: "card.member.added",
    description: `Added member to card "${card.title}"`,
    cardId,
  })

  revalidatePath(`/projects/${card.projectId}`)
}

export async function removeMemberFromCard(cardId: string, memberId: string) {
  const { tenantId } = await getTenantId()

  const card = await db.query.projectCards.findFirst({
    where: eq(projectCards.id, cardId),
    with: { project: true },
  })

  if (!card || card.project.tenantId !== tenantId) {
    throw new Error("Card not found")
  }

  await db
    .delete(projectCardMembers)
    .where(
      and(
        eq(projectCardMembers.cardId, cardId),
        eq(projectCardMembers.userId, memberId)
      )
    )

  await logActivity({
    projectId: card.projectId,
    type: "card.member.removed",
    description: `Removed member from card "${card.title}"`,
    cardId,
  })

  revalidatePath(`/projects/${card.projectId}`)
}

// ============================================
// CHECKLISTS
// ============================================

const checklistSchema = z.object({
  title: z.string().min(1, "Title is required"),
})

export type ChecklistFormData = z.infer<typeof checklistSchema>

export async function createChecklist(cardId: string, data: ChecklistFormData) {
  const { tenantId } = await getTenantId()

  const card = await db.query.projectCards.findFirst({
    where: eq(projectCards.id, cardId),
    with: { project: true },
  })

  if (!card || card.project.tenantId !== tenantId) {
    throw new Error("Card not found")
  }

  // Get max position
  const maxPosition = await db
    .select({ max: sql<number>`coalesce(max(position), -1)` })
    .from(projectChecklists)
    .where(eq(projectChecklists.cardId, cardId))

  const parsed = checklistSchema.parse(data)

  const [checklist] = await db
    .insert(projectChecklists)
    .values({
      cardId,
      title: parsed.title,
      position: Number(maxPosition[0].max) + 1,
    })
    .returning()

  await logActivity({
    projectId: card.projectId,
    type: "card.checklist.added",
    description: `Added checklist "${parsed.title}" to card "${card.title}"`,
    cardId,
  })

  revalidatePath(`/projects/${card.projectId}`)
  return checklist
}

export async function deleteChecklist(id: string) {
  const { tenantId } = await getTenantId()

  const checklist = await db.query.projectChecklists.findFirst({
    where: eq(projectChecklists.id, id),
    with: {
      card: {
        with: { project: true },
      },
    },
  })

  if (!checklist || checklist.card.project.tenantId !== tenantId) {
    throw new Error("Checklist not found")
  }

  await db.delete(projectChecklists).where(eq(projectChecklists.id, id))

  await logActivity({
    projectId: checklist.card.projectId,
    type: "card.checklist.deleted",
    description: `Deleted checklist "${checklist.title}"`,
    cardId: checklist.cardId,
  })

  revalidatePath(`/projects/${checklist.card.projectId}`)
}

// Checklist Items

const checklistItemSchema = z.object({
  text: z.string().min(1, "Text is required"),
})

export type ChecklistItemFormData = z.infer<typeof checklistItemSchema>

export async function createChecklistItem(checklistId: string, data: ChecklistItemFormData) {
  const { tenantId } = await getTenantId()

  const checklist = await db.query.projectChecklists.findFirst({
    where: eq(projectChecklists.id, checklistId),
    with: {
      card: {
        with: { project: true },
      },
    },
  })

  if (!checklist || checklist.card.project.tenantId !== tenantId) {
    throw new Error("Checklist not found")
  }

  // Get max position
  const maxPosition = await db
    .select({ max: sql<number>`coalesce(max(position), -1)` })
    .from(projectChecklistItems)
    .where(eq(projectChecklistItems.checklistId, checklistId))

  const parsed = checklistItemSchema.parse(data)

  const [item] = await db
    .insert(projectChecklistItems)
    .values({
      checklistId,
      text: parsed.text,
      position: Number(maxPosition[0].max) + 1,
    })
    .returning()

  revalidatePath(`/projects/${checklist.card.projectId}`)
  return item
}

export async function toggleChecklistItem(id: string) {
  const { tenantId, userId } = await getTenantId()

  const item = await db.query.projectChecklistItems.findFirst({
    where: eq(projectChecklistItems.id, id),
    with: {
      checklist: {
        with: {
          card: {
            with: { project: true },
          },
        },
      },
    },
  })

  if (!item || item.checklist.card.project.tenantId !== tenantId) {
    throw new Error("Checklist item not found")
  }

  const [updatedItem] = await db
    .update(projectChecklistItems)
    .set({
      isCompleted: !item.isCompleted,
      completedAt: !item.isCompleted ? new Date() : null,
      completedById: !item.isCompleted ? userId : null,
      updatedAt: new Date(),
    })
    .where(eq(projectChecklistItems.id, id))
    .returning()

  revalidatePath(`/projects/${item.checklist.card.projectId}`)
  return updatedItem
}

export async function deleteChecklistItem(id: string) {
  const { tenantId } = await getTenantId()

  const item = await db.query.projectChecklistItems.findFirst({
    where: eq(projectChecklistItems.id, id),
    with: {
      checklist: {
        with: {
          card: {
            with: { project: true },
          },
        },
      },
    },
  })

  if (!item || item.checklist.card.project.tenantId !== tenantId) {
    throw new Error("Checklist item not found")
  }

  await db.delete(projectChecklistItems).where(eq(projectChecklistItems.id, id))

  revalidatePath(`/projects/${item.checklist.card.projectId}`)
}

// ============================================
// COMMENTS
// ============================================

const commentSchema = z.object({
  content: z.string().min(1, "Content is required"),
  parentCommentId: z.string().optional(),
})

export type CommentFormData = z.infer<typeof commentSchema>

export async function createComment(cardId: string, data: CommentFormData) {
  const { tenantId, userId } = await getTenantId()

  const card = await db.query.projectCards.findFirst({
    where: eq(projectCards.id, cardId),
    with: { project: true },
  })

  if (!card || card.project.tenantId !== tenantId) {
    throw new Error("Card not found")
  }

  const parsed = commentSchema.parse(data)

  const [comment] = await db
    .insert(projectCardComments)
    .values({
      cardId,
      tenantId,
      userId,
      content: parsed.content,
      parentCommentId: parsed.parentCommentId || null,
    })
    .returning()

  await logActivity({
    projectId: card.projectId,
    type: "card.comment.added",
    description: `Added comment to card "${card.title}"`,
    cardId,
  })

  revalidatePath(`/projects/${card.projectId}`)
  return comment
}

export async function deleteComment(id: string) {
  const { tenantId } = await getTenantId()

  const comment = await db.query.projectCardComments.findFirst({
    where: eq(projectCardComments.id, id),
  })

  if (!comment || comment.tenantId !== tenantId) {
    throw new Error("Comment not found")
  }

  await db
    .update(projectCardComments)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(projectCardComments.id, id))

  revalidatePath(`/projects/${comment.cardId}`)
}

// ============================================
// PROJECT LABELS
// ============================================

const labelSchema = z.object({
  name: z.string().min(1, "Name is required"),
  color: z.string().default("#6366f1"),
})

export type LabelFormData = z.infer<typeof labelSchema>

export async function createLabel(projectId: string, data: LabelFormData) {
  const { tenantId } = await getTenantId()

  const project = await db.query.projects.findFirst({
    where: and(
      eq(projects.id, projectId),
      eq(projects.tenantId, tenantId),
      isNull(projects.deletedAt)
    ),
  })

  if (!project) {
    throw new Error("Project not found")
  }

  const parsed = labelSchema.parse(data)

  const [label] = await db
    .insert(projectLabels)
    .values({
      projectId,
      name: parsed.name,
      color: parsed.color,
    })
    .returning()

  revalidatePath(`/projects/${projectId}`)
  return label
}

export async function updateLabel(id: string, data: Partial<LabelFormData>) {
  const { tenantId } = await getTenantId()

  const label = await db.query.projectLabels.findFirst({
    where: eq(projectLabels.id, id),
    with: { project: true },
  })

  if (!label || label.project.tenantId !== tenantId) {
    throw new Error("Label not found")
  }

  const [updatedLabel] = await db
    .update(projectLabels)
    .set(data)
    .where(eq(projectLabels.id, id))
    .returning()

  revalidatePath(`/projects/${label.projectId}`)
  return updatedLabel
}

export async function deleteLabel(id: string) {
  const { tenantId } = await getTenantId()

  const label = await db.query.projectLabels.findFirst({
    where: eq(projectLabels.id, id),
    with: { project: true },
  })

  if (!label || label.project.tenantId !== tenantId) {
    throw new Error("Label not found")
  }

  await db.delete(projectLabels).where(eq(projectLabels.id, id))

  revalidatePath(`/projects/${label.projectId}`)
}

// ============================================
// ACTIVITY
// ============================================

export async function getProjectActivity(projectId: string, limit = 50) {
  const { tenantId } = await getTenantId()

  const project = await db.query.projects.findFirst({
    where: and(
      eq(projects.id, projectId),
      eq(projects.tenantId, tenantId),
      isNull(projects.deletedAt)
    ),
  })

  if (!project) {
    throw new Error("Project not found")
  }

  const activity = await db.query.projectActivity.findMany({
    where: eq(projectActivity.projectId, projectId),
    orderBy: [desc(projectActivity.createdAt)],
    limit,
    with: {
      user: true,
      card: true,
      list: true,
    },
  })

  return activity
}

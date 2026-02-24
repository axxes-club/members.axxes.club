"use server"

import { db } from "@/lib/db"
import { pages, pageBlocks } from "@/lib/db/schema"
import { eq, and, asc, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { getAuthContext } from "@/lib/auth"
import { puckDataToBlocks, puckDataToPageUpdates } from "./adapter"
import type { Data } from "@puckeditor/core"

/**
 * Save Puck data to the database
 * This handles both page updates and block updates
 */
export async function savePuckData(pageId: string, data: Data) {
  const { tenantId } = await getAuthContext()

  // Verify page ownership
  const page = await db.query.pages.findFirst({
    where: and(
      eq(pages.id, pageId),
      eq(pages.tenantId, tenantId)
    ),
  })

  if (!page) {
    throw new Error("Page not found")
  }

  // Get page updates from root props
  const pageUpdates = puckDataToPageUpdates(data)

  // Update page if there are changes
  if (Object.keys(pageUpdates).length > 0) {
    await db
      .update(pages)
      .set({
        ...pageUpdates,
        updatedAt: new Date(),
      })
      .where(eq(pages.id, pageId))
  }

  // Convert Puck content to blocks
  const newBlocks = puckDataToBlocks(data)

  // Get existing blocks
  const existingBlocks = await db.query.pageBlocks.findMany({
    where: and(
      eq(pageBlocks.pageId, pageId),
      eq(pageBlocks.tenantId, tenantId)
    ),
    orderBy: [asc(pageBlocks.sortOrder)],
  })

  const existingBlockIds = new Set(existingBlocks.map(b => b.id))
  const newBlockIds = new Set(newBlocks.map(b => b.id))

  // Determine what to create, update, and delete
  const blocksToCreate = newBlocks.filter(b => !existingBlockIds.has(b.id))
  const blocksToUpdate = newBlocks.filter(b => existingBlockIds.has(b.id))
  const blocksToDelete = existingBlocks.filter(b => !newBlockIds.has(b.id))

  // Delete removed blocks
  if (blocksToDelete.length > 0) {
    await db
      .delete(pageBlocks)
      .where(
        and(
          eq(pageBlocks.pageId, pageId),
          sql`${pageBlocks.id} IN (${blocksToDelete.map(b => b.id).map(id => `'${id}'`).join(',')})`
        )
      )
  }

  // Create new blocks
  for (const block of blocksToCreate) {
    await db.insert(pageBlocks).values({
      id: block.id,
      pageId,
      tenantId,
      type: block.type,
      content: block.content,
      settings: block.settings,
      sortOrder: block.sortOrder,
      isVisible: true,
    })
  }

  // Update existing blocks
  for (const block of blocksToUpdate) {
    await db
      .update(pageBlocks)
      .set({
        content: block.content,
        settings: block.settings,
        sortOrder: block.sortOrder,
        updatedAt: new Date(),
      })
      .where(eq(pageBlocks.id, block.id))
  }

  revalidatePath(`/website/pages/${pageId}`)
  revalidatePath("/website/pages")

  return { success: true }
}

/**
 * Load Puck data from the database
 */
export async function loadPuckData(pageId: string) {
  const { tenantId } = await getAuthContext()

  const page = await db.query.pages.findFirst({
    where: and(
      eq(pages.id, pageId),
      eq(pages.tenantId, tenantId)
    ),
    with: {
      blocks: {
        orderBy: [asc(pageBlocks.sortOrder)],
        where: eq(pageBlocks.isVisible, true),
      },
    },
  })

  if (!page) {
    throw new Error("Page not found")
  }

  return page
}
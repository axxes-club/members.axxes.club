"use server"

import { db } from "@/lib/db"
import { pages, pageBlocks, type BlockContent, type BlockSettings, type BlockType } from "@/lib/db/schema"
import { eq, and, asc, desc, sql, not } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getAuthContext } from "@/lib/auth"
import { assertNotStructuredPage } from "@/lib/website/structured"

const pageSchema = z.object({
  title: z.string().min(1, "Page title is required"),
  slug: z.string().min(1, "Page slug is required"),
  description: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  ogImage: z.string().optional(),
  isPublished: z.boolean().optional(),
  isHomepage: z.boolean().optional(),
  showNavigation: z.boolean().optional(),
  showFooter: z.boolean().optional(),
  sortOrder: z.number().optional(),
})

export type PageFormData = z.infer<typeof pageSchema>

async function getTenantId() {
  return getAuthContext()
}

// Generate a URL-safe slug from a title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 50)
}

// ============= PAGE CRUD =============

export async function getPages({
  filter = "all",
  page = 1,
  limit = 50,
}: {
  filter?: "all" | "published" | "draft"
  page?: number
  limit?: number
} = {}) {
  const { tenantId } = await getTenantId()

  const conditions = [eq(pages.tenantId, tenantId)]

  if (filter === "published") {
    conditions.push(eq(pages.isPublished, true))
  } else if (filter === "draft") {
    conditions.push(eq(pages.isPublished, false))
  }

  const [pageList, countResult] = await Promise.all([
    db.query.pages.findMany({
      where: and(...conditions),
      orderBy: [asc(pages.sortOrder), desc(pages.createdAt)],
      limit,
      offset: (page - 1) * limit,
    }),
    db
      .select({ count: sql<number>`count(*)` })
      .from(pages)
      .where(and(...conditions)),
  ])

  return {
    pages: pageList,
    total: Number(countResult[0].count),
    page,
    limit,
    totalPages: Math.ceil(Number(countResult[0].count) / limit),
  }
}

export async function getPage(id: string) {
  const { tenantId } = await getTenantId()

  const page = await db.query.pages.findFirst({
    where: and(
      eq(pages.id, id),
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

export async function getPageBySlug(slug: string) {
  const { tenantId } = await getTenantId()

  const page = await db.query.pages.findFirst({
    where: and(
      eq(pages.slug, slug),
      eq(pages.tenantId, tenantId)
    ),
    with: {
      blocks: {
        orderBy: [asc(pageBlocks.sortOrder)],
        where: eq(pageBlocks.isVisible, true),
      },
    },
  })

  return page
}

// Get a public page by tenant ID and slug (no auth required)
export async function getPublicPage(tenantId: string, slug: string) {
  const page = await db.query.pages.findFirst({
    where: and(
      eq(pages.slug, slug),
      eq(pages.tenantId, tenantId),
      eq(pages.isPublished, true)
    ),
    with: {
      blocks: {
        orderBy: [asc(pageBlocks.sortOrder)],
        where: eq(pageBlocks.isVisible, true),
      },
    },
  })

  return page
}

// Get a public homepage by tenant ID (no auth required)
export async function getPublicHomepage(tenantId: string) {
  const page = await db.query.pages.findFirst({
    where: and(
      eq(pages.tenantId, tenantId),
      eq(pages.isHomepage, true),
      eq(pages.isPublished, true)
    ),
    with: {
      blocks: {
        orderBy: [asc(pageBlocks.sortOrder)],
        where: eq(pageBlocks.isVisible, true),
      },
    },
  })

  return page
}

export async function getHomepage() {
  const { tenantId } = await getTenantId()

  const page = await db.query.pages.findFirst({
    where: and(
      eq(pages.tenantId, tenantId),
      eq(pages.isHomepage, true)
    ),
    with: {
      blocks: {
        orderBy: [asc(pageBlocks.sortOrder)],
        where: eq(pageBlocks.isVisible, true),
      },
    },
  })

  return page
}

export async function createPage(data: PageFormData) {
  const { tenantId } = await getTenantId()

  const parsed = pageSchema.parse(data)

  // Generate slug if not provided or clean it up
  const slug = parsed.slug || generateSlug(parsed.title)

  // Check if slug is unique for this tenant
  const existing = await db.query.pages.findFirst({
    where: and(
      eq(pages.tenantId, tenantId),
      eq(pages.slug, slug)
    ),
  })

  if (existing) {
    throw new Error("A page with this slug already exists")
  }

  // If this is set as homepage, unset any existing homepage
  if (parsed.isHomepage) {
    await db
      .update(pages)
      .set({ isHomepage: false, updatedAt: new Date() })
      .where(and(
        eq(pages.tenantId, tenantId),
        eq(pages.isHomepage, true)
      ))
  }

  // Get the max sort order
  const maxOrder = await db
    .select({ max: sql<number>`COALESCE(MAX(sort_order), 0)` })
    .from(pages)
    .where(eq(pages.tenantId, tenantId))

  const [page] = await db
    .insert(pages)
    .values({
      tenantId,
      title: parsed.title,
      slug,
      description: parsed.description || null,
      metaTitle: parsed.metaTitle || null,
      metaDescription: parsed.metaDescription || null,
      ogImage: parsed.ogImage || null,
      isPublished: parsed.isPublished ?? false,
      isHomepage: parsed.isHomepage ?? false,
      showNavigation: parsed.showNavigation ?? true,
      showFooter: parsed.showFooter ?? true,
      sortOrder: parsed.sortOrder ?? (maxOrder[0].max + 1),
    })
    .returning()

  revalidatePath("/website/pages")
  return page
}

export async function updatePage(id: string, data: Partial<PageFormData>) {
  const { tenantId } = await getTenantId()
  await assertNotStructuredPage(tenantId, id)

  // If updating slug, check for uniqueness
  if (data.slug) {
    const existing = await db.query.pages.findFirst({
      where: and(
        eq(pages.tenantId, tenantId),
        eq(pages.slug, data.slug),
        not(eq(pages.id, id))
      ),
    })

    if (existing) {
      throw new Error("A page with this slug already exists")
    }
  }

  // If setting as homepage, unset any existing homepage
  if (data.isHomepage) {
    await db
      .update(pages)
      .set({ isHomepage: false, updatedAt: new Date() })
      .where(and(
        eq(pages.tenantId, tenantId),
        eq(pages.isHomepage, true),
        not(eq(pages.id, id))
      ))
  }

  const [page] = await db
    .update(pages)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(pages.id, id),
        eq(pages.tenantId, tenantId)
      )
    )
    .returning()

  if (!page) {
    throw new Error("Page not found")
  }

  revalidatePath("/website/pages")
  revalidatePath(`/website/pages/${id}`)
  return page
}

export async function deletePage(id: string) {
  const { tenantId } = await getTenantId()
  await assertNotStructuredPage(tenantId, id)

  // Delete associated blocks first (cascade should handle this, but being explicit)
  await db
    .delete(pageBlocks)
    .where(
      and(
        eq(pageBlocks.pageId, id),
        eq(pageBlocks.tenantId, tenantId)
      )
    )

  await db
    .delete(pages)
    .where(
      and(
        eq(pages.id, id),
        eq(pages.tenantId, tenantId)
      )
    )

  revalidatePath("/website/pages")
}

export async function publishPage(id: string) {
  const { tenantId } = await getTenantId()

  const [page] = await db
    .update(pages)
    .set({
      isPublished: true,
      publishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(pages.id, id),
        eq(pages.tenantId, tenantId)
      )
    )
    .returning()

  revalidatePath("/website/pages")
  revalidatePath(`/website/pages/${id}`)
  return page
}

export async function unpublishPage(id: string) {
  const { tenantId } = await getTenantId()
  await assertNotStructuredPage(tenantId, id)

  const [page] = await db
    .update(pages)
    .set({
      isPublished: false,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(pages.id, id),
        eq(pages.tenantId, tenantId)
      )
    )
    .returning()

  revalidatePath("/website/pages")
  revalidatePath(`/website/pages/${id}`)
  return page
}

export async function setHomepage(id: string) {
  const { tenantId } = await getTenantId()

  // Unset any existing homepage
  await db
    .update(pages)
    .set({ isHomepage: false, updatedAt: new Date() })
    .where(and(
      eq(pages.tenantId, tenantId),
      eq(pages.isHomepage, true)
    ))

  // Set new homepage
  const [page] = await db
    .update(pages)
    .set({
      isHomepage: true,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(pages.id, id),
        eq(pages.tenantId, tenantId)
      )
    )
    .returning()

  revalidatePath("/website/pages")
  return page
}

export async function reorderPages(pageIds: string[]) {
  const { tenantId } = await getTenantId()

  // Update sort order for each page
  await Promise.all(
    pageIds.map((pageId, index) =>
      db
        .update(pages)
        .set({
          sortOrder: index,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(pages.id, pageId),
            eq(pages.tenantId, tenantId)
          )
        )
    )
  )

  revalidatePath("/website/pages")
}

// ============= BLOCK CRUD =============

export async function getPageBlocks(pageId: string) {
  const { tenantId } = await getTenantId()

  const blocks = await db.query.pageBlocks.findMany({
    where: and(
      eq(pageBlocks.pageId, pageId),
      eq(pageBlocks.tenantId, tenantId)
    ),
    orderBy: [asc(pageBlocks.sortOrder)],
  })

  return blocks
}

export async function createBlock(
  pageId: string,
  type: BlockType,
  content: BlockContent = {},
  settings: BlockSettings = {},
  sortOrder?: number
) {
  const { tenantId } = await getTenantId()

  // If sort order not provided, add at the end
  if (sortOrder === undefined) {
    const maxOrder = await db
      .select({ max: sql<number>`COALESCE(MAX(sort_order), -1)` })
      .from(pageBlocks)
      .where(eq(pageBlocks.pageId, pageId))

    sortOrder = maxOrder[0].max + 1
  }

  const [block] = await db
    .insert(pageBlocks)
    .values({
      pageId,
      tenantId,
      type,
      content,
      settings,
      sortOrder,
      isVisible: true,
    })
    .returning()

  revalidatePath(`/website/pages/${pageId}`)
  return block
}

export async function updateBlock(
  blockId: string,
  data: {
    content?: BlockContent
    settings?: BlockSettings
    isVisible?: boolean
  }
) {
  const { tenantId } = await getTenantId()

  const [block] = await db
    .update(pageBlocks)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(pageBlocks.id, blockId),
        eq(pageBlocks.tenantId, tenantId)
      )
    )
    .returning()

  if (!block) {
    throw new Error("Block not found")
  }

  revalidatePath(`/website/pages/${block.pageId}`)
  return block
}

export async function deleteBlock(blockId: string) {
  const { tenantId } = await getTenantId()

  // Get the block first to know the pageId for revalidation
  const block = await db.query.pageBlocks.findFirst({
    where: and(
      eq(pageBlocks.id, blockId),
      eq(pageBlocks.tenantId, tenantId)
    ),
  })

  if (!block) {
    throw new Error("Block not found")
  }

  await db
    .delete(pageBlocks)
    .where(
      and(
        eq(pageBlocks.id, blockId),
        eq(pageBlocks.tenantId, tenantId)
      )
    )

  revalidatePath(`/website/pages/${block.pageId}`)
}

export async function reorderBlocks(pageId: string, blockIds: string[]) {
  const { tenantId } = await getTenantId()

  await Promise.all(
    blockIds.map((blockId, index) =>
      db
        .update(pageBlocks)
        .set({
          sortOrder: index,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(pageBlocks.id, blockId),
            eq(pageBlocks.tenantId, tenantId)
          )
        )
    )
  )

  revalidatePath(`/website/pages/${pageId}`)
}

export async function duplicateBlock(blockId: string) {
  const { tenantId } = await getTenantId()

  const block = await db.query.pageBlocks.findFirst({
    where: and(
      eq(pageBlocks.id, blockId),
      eq(pageBlocks.tenantId, tenantId)
    ),
  })

  if (!block) {
    throw new Error("Block not found")
  }

  // Get the max sort order for blocks after this one
  const blocksAfter = await db.query.pageBlocks.findMany({
    where: and(
      eq(pageBlocks.pageId, block.pageId),
      eq(pageBlocks.tenantId, tenantId)
    ),
    orderBy: [asc(pageBlocks.sortOrder)],
  })

  // Shift all blocks after the current one
  const currentIndex = blocksAfter.findIndex(b => b.id === blockId)
  for (let i = currentIndex + 1; i < blocksAfter.length; i++) {
    await db
      .update(pageBlocks)
      .set({ sortOrder: blocksAfter[i].sortOrder + 1 })
      .where(eq(pageBlocks.id, blocksAfter[i].id))
  }

  // Create the duplicate
  const [newBlock] = await db
    .insert(pageBlocks)
    .values({
      pageId: block.pageId,
      tenantId,
      type: block.type,
      content: block.content,
      settings: block.settings,
      sortOrder: block.sortOrder + 1,
      isVisible: block.isVisible,
    })
    .returning()

  revalidatePath(`/website/pages/${block.pageId}`)
  return newBlock
}

export async function toggleBlockVisibility(blockId: string) {
  const { tenantId } = await getTenantId()

  const block = await db.query.pageBlocks.findFirst({
    where: and(
      eq(pageBlocks.id, blockId),
      eq(pageBlocks.tenantId, tenantId)
    ),
  })

  if (!block) {
    throw new Error("Block not found")
  }

  const [updatedBlock] = await db
    .update(pageBlocks)
    .set({
      isVisible: !block.isVisible,
      updatedAt: new Date(),
    })
    .where(eq(pageBlocks.id, blockId))
    .returning()

  revalidatePath(`/website/pages/${block.pageId}`)
  return updatedBlock
}

// ============= STATS =============

export async function getPageStats() {
  const { tenantId } = await getTenantId()

  const [total, published, draft, blocks] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(pages)
      .where(eq(pages.tenantId, tenantId)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(pages)
      .where(and(
        eq(pages.tenantId, tenantId),
        eq(pages.isPublished, true)
      )),
    db
      .select({ count: sql<number>`count(*)` })
      .from(pages)
      .where(and(
        eq(pages.tenantId, tenantId),
        eq(pages.isPublished, false)
      )),
    db
      .select({ count: sql<number>`count(*)` })
      .from(pageBlocks)
      .where(eq(pageBlocks.tenantId, tenantId)),
  ])

  return {
    total: Number(total[0].count),
    published: Number(published[0].count),
    draft: Number(draft[0].count),
    totalBlocks: Number(blocks[0].count),
  }
}

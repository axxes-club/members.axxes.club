"use server"

/**
 * Matter actions.
 *
 * Three rules hold across everything in this file, and they are the same three
 * the schema states. They are restated here because this is where they are most
 * likely to be broken by someone in a hurry:
 *
 *   1. Every read and write is tenant-scoped. A matter id from a URL is never
 *      trusted on its own; it is always paired with the tenant from the cookie.
 *   2. An acknowledgement is INSERTED, never updated. See recordAck().
 *   3. Nothing deletes an acknowledgement. There is no such function, and that
 *      is intentional — not an oversight waiting to be filled in.
 */

import { db } from "@/lib/db"
import { actorKeyFor } from "@/lib/matters"
import {
  matters,
  matterTemplates,
  matterParticipants,
  matterDocuments,
  matterAcks,
  matterDeadlines,
  matterTasks,
  assets,
  user,
} from "@/lib/db/schema"
import { and, eq, desc, asc, inArray, isNull, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getAuthContext } from "@/lib/auth"

const matterInput = z.object({
  title: z.string().trim().min(1, "A matter needs a title").max(200),
  kind: z.string().trim().min(1).max(60),
  templateKey: z.string().trim().max(60).optional(),
  summary: z.string().trim().max(2000).optional(),
  jurisdiction: z.string().trim().max(120).optional(),
  title2: z.string().optional(),
})

/** Templates drive the wizard, so they are read without a tenant scope. */
export async function getMatterTemplates() {
  return db.select().from(matterTemplates).orderBy(asc(matterTemplates.sortOrder))
}

/**
 * A tenant-scoped matter, or null.
 *
 * Every page that shows a matter calls this first. Passing an id from the URL
 * only ever narrows a query that is already limited to the signed-in tenant, so
 * a hand-edited URL cannot reach somebody else's case.
 */
export async function getMatter(matterId: string) {
  const { tenantId } = await getAuthContext()
  const [row] = await db
    .select()
    .from(matters)
    .where(and(eq(matters.id, matterId), eq(matters.tenantId, tenantId), isNull(matters.deletedAt)))
    .limit(1)
  if (!row) return null

  const [participants, documents, deadlines, tasks] = await Promise.all([
    db.select().from(matterParticipants).where(eq(matterParticipants.matterId, matterId)).orderBy(asc(matterParticipants.displayName)),
    db.select().from(matterDocuments).where(and(eq(matterDocuments.matterId, matterId), isNull(matterDocuments.deletedAt))).orderBy(asc(matterDocuments.title)),
    db.select().from(matterDeadlines).where(eq(matterDeadlines.matterId, matterId)).orderBy(asc(matterDeadlines.dueAt)),
    db.select().from(matterTasks).where(eq(matterTasks.matterId, matterId)).orderBy(asc(matterTasks.createdAt)),
  ])

  return { ...row, participants, documents, deadlines, tasks }
}

export async function listMatters() {
  const { tenantId } = await getAuthContext()
  const rows = await db
    .select()
    .from(matters)
    .where(and(eq(matters.tenantId, tenantId), isNull(matters.deletedAt)))
    .orderBy(desc(matters.updatedAt))

  if (!rows.length) return []

  // Counts for the list, in three queries rather than one per matter.
  const ids = rows.map((r) => r.id)
  const [ackRows, docRows, openTasks] = await Promise.all([
    db.select({ matterId: matterAcks.matterId, n: sql<number>`count(*)::int` }).from(matterAcks).where(inArray(matterAcks.matterId, ids)).groupBy(matterAcks.matterId),
    db.select({ matterId: matterDocuments.matterId, n: sql<number>`count(*)::int` }).from(matterDocuments).where(and(inArray(matterDocuments.matterId, ids), isNull(matterDocuments.deletedAt))).groupBy(matterDocuments.matterId),
    db.select({ matterId: matterTasks.matterId, n: sql<number>`count(*)::int` }).from(matterTasks).where(and(inArray(matterTasks.matterId, ids), eq(matterTasks.status, "open"))).groupBy(matterTasks.matterId),
  ])

  const index = (list: { matterId: string; n: number }[]) =>
    new Map(list.map((r) => [r.matterId, r.n]))

  const acks = index(ackRows)
  const docs = index(docRows)
  const tasks = index(openTasks)

  return rows.map((r) => ({
    ...r,
    ackCount: acks.get(r.id) ?? 0,
    documentCount: docs.get(r.id) ?? 0,
    openTaskCount: tasks.get(r.id) ?? 0,
  }))
}

/**
 * Starts a matter from a template, and pre-loads that template's plan.
 *
 * The creator becomes the first participant, as `executor` on a family matter
 * and `owner` on a business one. That is a guess, and it is visible in the UI
 * afterwards where it can be corrected — better than a mandatory empty field
 * that stops somebody starting the thing at all.
 */
export async function createMatter(input: z.infer<typeof matterInput>) {
  const { userId, tenantId } = await getAuthContext()
  const parsed = matterInput.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid matter" }
  const data = parsed.data

  const [template] = data.templateKey
    ? await db.select().from(matterTemplates).where(eq(matterTemplates.key, data.templateKey)).limit(1)
    : [undefined]

  const [created] = await db
    .insert(matters)
    .values({
      tenantId,
      createdById: userId,
      templateKey: template?.key,
      kind: data.kind,
      title: data.title,
      summary: data.summary || null,
      jurisdiction: data.jurisdiction || null,
    })
    .returning()

  const role = template?.key === "business" ? "owner" : "executor"
  const [me] = await db
    .select({ name: user.name })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)

  await db.insert(matterParticipants).values({
    matterId: created.id,
    tenantId,
    userId,
    actorKey: actorKeyFor(userId),
    displayName: me?.name ?? "You",
    role,
  })

  // A new matter opens with the template's dates already on it, counted from
  // openedAt. An empty calendar is how these get abandoned in week two.
  const plan = template?.defaultDeadlines ?? []
  if (plan.length) {
    const base = created.openedAt.getTime()
    await db.insert(matterDeadlines).values(
      plan.map((d) => ({
        matterId: created.id,
        tenantId,
        title: d.title,
        kind: d.kind,
        dueAt: new Date(base + d.offsetDays * 24 * 60 * 60 * 1000),
      })),
    )
  }

  for (const r of template?.defaultRoles ?? []) {
    if (r.role === role) continue
    await db.insert(matterParticipants).values({
      matterId: created.id,
      tenantId,
      userId: null,
      actorKey: `unassigned:${r.role}:${created.id}`,
      displayName: r.label,
      role: r.role,
    })
  }

  revalidatePath("/matters")
  return { id: created.id }
}

/**
 * Every acknowledgement ever given on a document, newest first.
 *
 * Returned whole, not summarised. The full history is the point: "she approved
 * it, then asked for a change, then approved it again" is a true and useful
 * sentence, and a table that only kept the last row could not say it.
 */
export async function getDocumentAcks(documentId: string) {
  const { tenantId } = await getAuthContext()
  const [doc] = await db
    .select({ id: matterDocuments.id, matterId: matterDocuments.matterId, revision: matterDocuments.revision, title: matterDocuments.title })
    .from(matterDocuments)
    .where(and(eq(matterDocuments.id, documentId), eq(matterDocuments.tenantId, tenantId)))
    .limit(1)
  if (!doc) return null

  const rows = await db
    .select()
    .from(matterAcks)
    .where(eq(matterAcks.documentId, doc.id))
    .orderBy(desc(matterAcks.decidedAt))

  return { document: doc, acks: rows }
}

/**
 * The CURRENT decision per person on a document: the latest row per actor_key.
 *
 * This is a read-side fold, not a stored column and not a unique index, because
 * the ledger is append-only. `decidedAt` breaks ties, and `id` is the final
 * tiebreak so two rows written in the same millisecond still order stably.
 */
export async function latestAcks(documentId: string) {
  const { tenantId } = await getAuthContext()
  const [doc] = await db
    .select({ id: matterDocuments.id, revision: matterDocuments.revision })
    .from(matterDocuments)
    .where(and(eq(matterDocuments.id, documentId), eq(matterDocuments.tenantId, tenantId)))
    .limit(1)
  if (!doc) return new Map<string, (typeof matterAcks.$inferSelect)[]>()

  const rows = await db
    .select()
    .from(matterAcks)
    .where(eq(matterAcks.documentId, doc.id))
    .orderBy(asc(matterAcks.decidedAt), asc(matterAcks.id))

  const latest = new Map<string, (typeof matterAcks.$inferSelect)>()
  for (const row of rows) latest.set(row.actorKey, row)
  return latest
}

const ackInput = z.object({
  documentId: z.string().uuid(),
  decision: z.enum(["viewed", "approved", "changes_requested", "rejected"]),
  note: z.string().trim().max(4000).optional(),
})

/**
 * ★ Records one person's decision about one revision of one document.
 *
 * Append-only. This inserts a row and returns. It does not check whether the
 * person has already decided, and it must not: a changed mind is a new, true
 * entry in the history, and suppressing it would make the ledger lie.
 *
 * The revision is read from the document row at insert time, not from the
 * client. A caller cannot acknowledge "v2" of a document that is now at v4 by
 * passing an old number — it gets stamped with the current revision, which is
 * the only revision that was actually on screen when they pressed the button.
 *
 * The actor is taken from the session. There is deliberately no way to pass an
 * actor_key in: a guest acknowledging through a share link arrives via the
 * signed-token route in app/api/matter/share, which resolves identity from the
 * token, not from anything the caller can choose.
 */
export async function recordAck(input: z.infer<typeof ackInput>) {
  const { userId, tenantId } = await getAuthContext()
  const parsed = ackInput.safeParse(input)
  if (!parsed.success) return { error: "That decision is not one we can record" }
  const { documentId, decision, note } = parsed.data

  const [doc] = await db
    .select({
      id: matterDocuments.id,
      matterId: matterDocuments.matterId,
      revision: matterDocuments.revision,
      title: matterDocuments.title,
    })
    .from(matterDocuments)
    .where(and(eq(matterDocuments.id, documentId), eq(matterDocuments.tenantId, tenantId), isNull(matterDocuments.deletedAt)))
    .limit(1)
  if (!doc) return { error: "Document not found" }

  // Objecting without saying why is not a decision, it is a shrug.
  if ((decision === "changes_requested" || decision === "rejected") && !note) {
    return { error: "Say what needs to change — an objection with no reason cannot be acted on" }
  }

  const [me] = await db.select({ name: user.name })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)

  const [participant] = await db
    .select({ name: matterParticipants.displayName, role: matterParticipants.role })
    .from(matterParticipants)
    .where(and(eq(matterParticipants.matterId, doc.matterId), eq(matterParticipants.userId, userId)))
    .limit(1)

  await db.insert(matterAcks).values({
    documentId: doc.id,
    matterId: doc.matterId,
    revision: doc.revision,
    actorKey: actorKeyFor(userId),
    actorName: participant?.name ?? me?.name ?? "Participant",
    actorRole: participant?.role ?? null,
    decision,
    note: note || null,
  })

  // First time anybody has looked at this revision moves it into review. Only
  // forward: a document that was agreed does not drop back to draft because
  // somebody opened it again.
  if (decision !== "viewed" && doc.revision >= 1) {
    await db
      .update(matterDocuments)
      .set({ status: "in_review", updatedAt: new Date() })
      .where(and(eq(matterDocuments.id, doc.id), eq(matterDocuments.status, "draft")))
  }

  revalidatePath(`/matters/${doc.matterId}`)
  return { ok: true, revision: doc.revision }
}

/**
 * Replaces a document's file and moves it to the next revision.
 *
 * Existing acknowledgements are NOT touched and NOT invalidated. They stay
 * attached to the revision they were given against, which is the entire reason
 * `matter_acks.revision` exists: after this call, "Rosa approved v1" and "Rosa
 * has not seen v2" are both true and both readable.
 */
export async function bumpDocumentRevision(documentId: string) {
  const { tenantId } = await getAuthContext()
  const [doc] = await db
    .select({ id: matterDocuments.id, matterId: matterDocuments.matterId, revision: matterDocuments.revision })
    .from(matterDocuments)
    .where(and(eq(matterDocuments.id, documentId), eq(matterDocuments.tenantId, tenantId)))
    .limit(1)
  if (!doc) return { error: "Document not found" }

  const next = doc.revision + 1
  await db
    .update(matterDocuments)
    .set({ revision: next, status: "draft", updatedAt: new Date() })
    .where(eq(matterDocuments.id, doc.id))

  revalidatePath(`/matters/${doc.matterId}`)
  return { ok: true, revision: next }
}

const documentInput = z.object({
  matterId: z.string().uuid(),
  title: z.string().trim().min(1, "A document needs a title").max(200),
  purpose: z.string().trim().max(1000).optional(),
  assetId: z.string().uuid().optional(),
  kind: z.enum(["asset", "external_link"]).default("asset"),
})

/**
 * Attaches a document to a matter.
 *
 * `assetId` is validated against the shared `assets` table AND the tenant,
 * because a document row that pointed at somebody else's file would be a
 * cross-tenant read dressed up as a matter document.
 */
export async function addDocument(input: z.infer<typeof documentInput>) {
  const { userId, tenantId } = await getAuthContext()
  const parsed = documentInput.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid document" }
  const data = parsed.data

  const [matter] = await db
    .select({ id: matters.id })
    .from(matters)
    .where(and(eq(matters.id, data.matterId), eq(matters.tenantId, tenantId), isNull(matters.deletedAt)))
    .limit(1)
  if (!matter) return { error: "Matter not found" }

  if (data.assetId) {
    const [asset] = await db
      .select({ id: assets.id })
      .from(assets)
      .where(and(eq(assets.id, data.assetId), eq(assets.tenantId, tenantId)))
      .limit(1)
    if (!asset) return { error: "That file is not in this workspace" }
  }

  await db.insert(matterDocuments).values({
    matterId: data.matterId,
    tenantId,
    title: data.title,
    purpose: data.purpose || null,
    assetId: data.assetId ?? null,
    kind: data.kind,
    createdById: userId,
  })

  revalidatePath(`/matters/${data.matterId}`)
  return { ok: true }
}

const taskInput = z.object({
  matterId: z.string().uuid(),
  title: z.string().trim().min(1, "Say what needs doing").max(300),
  detail: z.string().trim().max(2000).optional(),
  actorKey: z.string().trim().max(200).optional(),
  actorName: z.string().trim().max(120).optional(),
  dueAt: z.string().trim().optional(),
})

export async function addTask(input: z.infer<typeof taskInput>) {
  const { tenantId } = await getAuthContext()
  const parsed = taskInput.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid task" }
  const data = parsed.data

  const [matter] = await db.select({ id: matters.id }).from(matters)
    .where(and(eq(matters.id, data.matterId), eq(matters.tenantId, tenantId), isNull(matters.deletedAt))).limit(1)
  if (!matter) return { error: "Matter not found" }

  const due = data.dueAt ? new Date(data.dueAt) : null
  if (due && Number.isNaN(due.getTime())) return { error: "That date could not be read" }

  await db.insert(matterTasks).values({
    matterId: data.matterId,
    tenantId,
    title: data.title,
    detail: data.detail || null,
    actorKey: data.actorKey || null,
    actorName: data.actorName || null,
    dueAt: due,
  })

  revalidatePath(`/matters/${data.matterId}`)
  return { ok: true }
}

/**
 * Marks a task done or reopens it.
 *
 * Unlike an acknowledgement this IS an edit, and that asymmetry is deliberate.
 * A task is a to-do; reversing one is not a historical claim about what
 * somebody agreed to, so overwriting the row loses nothing true. The ledger
 * earns append-only because it is evidence. This does not.
 */
export async function toggleTask(taskId: string) {
  const { tenantId } = await getAuthContext()
  const [task] = await db
    .select()
    .from(matterTasks)
    .where(and(eq(matterTasks.id, taskId), eq(matterTasks.tenantId, tenantId)))
    .limit(1)
  if (!task) return { error: "Task not found" }

  const done = task.status === "done"
  await db
    .update(matterTasks)
    .set({ status: done ? "open" : "done", completedAt: done ? null : new Date(), completedByName: done ? null : task.actorName })
    .where(eq(matterTasks.id, taskId))

  revalidatePath(`/matters/${task.matterId}`)
  return { ok: true }
}

const deadlineInput = z.object({
  matterId: z.string().uuid(),
  title: z.string().trim().min(1, "Say what the deadline is for").max(300),
  kind: z.string().trim().max(40).default("other"),
  dueAt: z.string().trim().min(1),
})

export async function addDeadline(input: z.infer<typeof deadlineInput>) {
  const { tenantId } = await getAuthContext()
  const parsed = deadlineInput.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid deadline" }
  const data = parsed.data

  const [matter] = await db.select({ id: matters.id }).from(matters)
    .where(and(eq(matters.id, data.matterId), eq(matters.tenantId, tenantId), isNull(matters.deletedAt))).limit(1)
  if (!matter) return { error: "Matter not found" }

  const due = new Date(data.dueAt)
  if (Number.isNaN(due.getTime())) return { error: "That date could not be read" }

  await db.insert(matterDeadlines).values({
    matterId: data.matterId, tenantId, title: data.title, kind: data.kind, dueAt: due,
  })

  revalidatePath(`/matters/${data.matterId}`)
  return { ok: true }
}

const participantInput = z.object({
  matterId: z.string().uuid(),
  displayName: z.string().trim().min(1, "Who is this?").max(120),
  role: z.string().trim().min(1, "In what capacity?").max(60),
  org: z.string().trim().max(160).optional(),
  email: z.string().trim().email("That email does not look right").max(200).optional(),
})

/**
 * Adds somebody to a matter.
 *
 * Until they accept an invite they have a placeholder actor_key and a null
 * user_id, which is what keeps the participant list populated on day one
 * instead of showing three empty rows waiting for people to sign up. When they
 * do sign in, the key is upgraded in place.
 */
export async function addParticipant(input: z.infer<typeof participantInput>) {
  const { tenantId } = await getAuthContext()
  const parsed = participantInput.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid participant" }
  const data = parsed.data

  const [matter] = await db.select({ id: matters.id }).from(matters)
    .where(and(eq(matters.id, data.matterId), eq(matters.tenantId, tenantId), isNull(matters.deletedAt))).limit(1)
  if (!matter) return { error: "Matter not found" }

  const placeholder = `pending:${data.role}:${data.displayName.toLowerCase().replace(/\s+/g, "-")}:${data.matterId}`

  await db.insert(matterParticipants).values({
    matterId: data.matterId,
    tenantId,
    userId: null,
    actorKey: placeholder,
    displayName: data.displayName,
    role: data.role,
    org: data.org || null,
    email: data.email || null,
  }).onConflictDoNothing({ target: [matterParticipants.matterId, matterParticipants.actorKey] })

  revalidatePath(`/matters/${data.matterId}`)
  return { ok: true }
}

export async function setMatterStage(matterId: string, stage: string) {
  const { tenantId } = await getAuthContext()
  const allowed = ["collecting", "reviewing", "agreed", "filed", "closed"]
  if (!allowed.includes(stage)) return { error: "Unknown stage" }

  const [row] = await db.update(matters)
    .set({ stage, updatedAt: new Date() })
    .where(and(eq(matters.id, matterId), eq(matters.tenantId, tenantId), isNull(matters.deletedAt)))
    .returning({ id: matters.id })
  if (!row) return { error: "Matter not found" }

  revalidatePath(`/matters/${matterId}`)
  return { ok: true }
}

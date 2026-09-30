/**
 * Plain helpers for Matter. Deliberately NOT in src/lib/actions/matters.ts.
 *
 * A file marked "use server" may only export async functions — Next.js rejects
 * a synchronous export there outright ("Server Actions must be async
 * functions"), which is a confusing way to learn the rule. This is where the
 * synchronous ones live.
 */

/**
 * The stable identity of a person, used by every actor_* column in the Matter
 * tables.
 *
 * "user:<id>" for a signed-in AXXES account, "guest:<subject>" for somebody who
 * arrived through a signed share link and never made one, and
 * "pending:<role>:<slug>:<matterId>" for a name on the participant list that
 * has not yet been claimed by a real person.
 *
 * The prefix is load-bearing. It is what lets a guest's acknowledgement sit in
 * the same ledger as the executor's without pretending the two are the same
 * kind of person, and it is why a person who later signs in is upgraded in
 * place rather than duplicated.
 */
export function actorKeyFor(userId: string) {
  return `user:${userId}`
}

/** Human label for the legal capacity a person holds in a matter. */
export const ROLE_LABEL: Record<string, string> = {
  executor: "Executor",
  heir: "Heir",
  beneficiary: "Beneficiary",
  counsel: "Counsel",
  accountant: "Accountant",
  notary: "Notary",
  owner: "Owner",
  co_owner: "Co-owner",
  observer: "Observer",
}

/** Roles that can record a decision on a document. An observer watches. */
export const DECIDING_ROLES = new Set([
  "executor",
  "heir",
  "beneficiary",
  "counsel",
  "accountant",
  "notary",
  "owner",
  "co_owner",
])

/** What an acknowledgement means, for the badge. */
export const DECISION_LABEL: Record<string, string> = {
  viewed: "Seen",
  approved: "Approved",
  changes_requested: "Changes requested",
  rejected: "Rejected",
}

/** Where a matter is in its life. */
export const STAGE_LABEL: Record<string, string> = {
  collecting: "Collecting",
  reviewing: "In review",
  agreed: "Agreed",
  filed: "Filed",
  closed: "Closed",
}

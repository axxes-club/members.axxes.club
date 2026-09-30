# Matter

A case, the people in it, and a record of who has seen what.

Built for succession: a family settling an estate, or the owners of a business
handing it over. Both run on the same tables, the same screens and the same
code. The only difference is which template the matter was started from.

## Running it locally

```bash
cd ~/Developer/members.axxes.club
node scripts/matter-migrate.mjs          # tables (idempotent, safe to re-run)
node scripts/matter-seed-templates.mjs   # the two templates
node scripts/matter-demo.mjs             # two mock matters, in "AXXES CLUB"
npm run dev -- --port 3111
```

Then sign in at http://localhost:3111/sign-in and open **/matters**.

To remove the mock data:

```bash
node scripts/matter-demo.mjs --clean
```

`matter-demo.mjs` writes real rows to the real database, scoped to one tenant.
`LOCAL-TESTING.md` already says a local session is a real session; this is the
same thing with a narrower blast radius, and `--clean` removes exactly what it
added.

## Why it is not a project

The portal already has projects, cards, checklists and deadlines. A matter is
deliberately not one, for a single reason: **documents**.

In a project a file is an attachment. In a matter the file is the subject, and
the question is not "is this done" but *"has everyone seen this, and what did
they say about it?"* Nothing on the platform answered that before, and it is the
only question a room containing two lawyers actually cares about.

## The three rules

They are stated on the schema, restated in the actions, and enforced here. If
you change one of them, you have changed the product.

**1. An acknowledgement names a revision, not a document.**

`matter_acks.revision` is part of every row. "I approved v3" is a claim that
stays true after v4 is uploaded. A document-level ack would silently become a
lie the moment the file changed, which is the entire failure this exists to
prevent.

**2. The ledger is append-only, with no unique constraint on
(document, revision, actor).**

The obvious index to add is one that stops a person deciding twice on the same
revision. Do not add it. Somebody who changes their mind is not a bug; make them
fight the database to say so and they will say nothing at all — and a silent
person is worse than a contradictory one, because nobody can follow up on it.
Every decision is kept and the current one is the latest by `decidedAt`
(`latestAcks()`).

**3. Nothing deletes an acknowledgement.**

`matter_documents` soft-deletes so a superseded file leaves the list. This table
has no `deleted_at` and no delete path. Adding one is the single change to this
product that should be decided outside a sprint.

Tasks are the deliberate exception: `matter_tasks` is edited, not appended. A
to-do reversed is not a historical claim, so overwriting loses nothing true.
That asymmetry is on purpose.

## Layout

| Path | What it is |
|---|---|
| `src/lib/db/schema/matters.ts` | Tables, with the reasoning on each |
| `db/matters.sql` | The same tables as SQL; additive and idempotent |
| `src/lib/actions/matters.ts` | Server actions, all tenant-scoped |
| `src/lib/matters.ts` | Synchronous helpers (a `"use server"` file cannot export them) |
| `src/app/(dashboard)/matters/` | The screens |

## Actors

A participant is a signed-in user **or** a guest who arrived through a signed
share link and never made an account. Every table keys on `actor_key`:

- `user:<id>` — signed in
- `guest:<subject>` — reached through a share link
- `pending:<role>:<slug>:<matterId>` — a name on the list not yet claimed

The prefix is load-bearing. It is why a guest's acknowledgement sits in the same
ledger as the executor's without pretending they are the same kind of person.
Vibez set this precedent: access is keyed on a subject, not on an account.

Guest *acknowledging* is Phase 4 and is not built. `recordAck()` deliberately
takes no `actor_key` argument, so a caller cannot choose their own identity —
when that path is built it resolves the actor from a signed token.

## Known gaps

- **`canViewAll` is not enforced.** It is a label on a participant and nothing
  more. AXXES has no row-level security anywhere, so per-heir privacy ("Rosa
  sees her own branch, not her cousin's") is real work and is not claimed here.
  The column exists so the data is right on day one.
- **No file upload.** Documents can be linked to an existing DAM asset, which is
  the honest position; there is no upload widget in this product.
- **The conversation link is unused.** `matter_threads` points at the existing
  `conversations` table so the same thread can appear in Relay with the same
  read receipts. The table and the screen are not wired up yet.

## Positioning

Per `AXXES-BRAND.md`, the vertical-vs-horizontal decision is still open and
blocks everything else. The two-template design is a hedge, not a resolution:
Business succession is defensible under the current positioning, and Family
succession is one `surface_in_members` boolean away from being hidden without
touching the engine.

`node scripts/matter-catalog.mjs --hide` hides the tile.

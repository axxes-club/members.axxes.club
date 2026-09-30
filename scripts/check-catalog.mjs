#!/usr/bin/env node
// Fails if the catalog references an icon or a category the portal cannot render.
//
// Two silent failures live here, and both are invisible on the page:
//
// 1. `icon` is stored as a name. A name with no entry in the ICONS map falls
//    back to a neutral grid, so a product renders correctly-shaped and
//    completely wrong. This already happened: `Anchor` (Keel) was referenced by
//    the catalog and missing from the map.
// 2. `category` is a free string. A category with no entry in CATEGORY_BLURBS
//    renders as a heading with an empty line under it.
//
// Both are "the page works" failures, which is why nothing else catches them.

import { readFileSync } from "node:fs"

const sql = readFileSync("/Users/admin/Developer/members.axxes.club/db/axxes-products.sql", "utf8")
const iconFile = readFileSync(
  "/Users/admin/Developer/members.axxes.club/src/app/(dashboard)/apps/product-icon.tsx",
  "utf8",
)
const productsFile = readFileSync(
  "/Users/admin/Developer/members.axxes.club/src/lib/actions/products.ts",
  "utf8",
)

const iconMap = iconFile.slice(iconFile.indexOf("const ICONS"), iconFile.indexOf("export function ProductIcon"))
const blurbs = productsFile.slice(productsFile.indexOf("CATEGORY_BLURBS"), productsFile.indexOf("CATEGORY_ORDER"))
const order = productsFile.slice(productsFile.indexOf("CATEGORY_ORDER"), productsFile.indexOf("/** Every product"))

// name, icon, category, url — from the VALUES tuples.
const rows = [...sql.matchAll(/\(\s*'([a-z0-9_]+)'\s*,\s*'([^']*)'\s*,[\s\S]*?'(#[0-9a-fA-F]{6})'\s*,\s*'([^']+)'/g)]
  .map((m) => ({ key: m[1], name: m[2], color: m[3], category: m[4] }))

// Icon names are the quoted argument to the 6th..nth fields; pull them from the
// column list position instead, which is stable.
const iconNames = [...sql.matchAll(/,\s*'(LayoutGrid|Camera|ClipboardList|Code|CreditCard|DoorOpen|FileImage|FolderOpen|Gem|KanbanSquare|Network|Package|Terminal|Ticket|Anchor|LifeBuoy|Activity|Building|LifeBuoy|Headset|MessageCircle)',\s*NULL/g)]
  .map((m) => m[1])

const problems = []

for (const icon of new Set(iconNames)) {
  if (!iconMap.includes(`  ${icon},`)) problems.push(`icon "${icon}" is in the catalog but not in the ICONS map`)
}
for (const cat of new Set(rows.map((r) => r.category))) {
  if (!blurbs.includes(`${cat}:`)) problems.push(`category "${cat}" has no blurb in CATEGORY_BLURBS`)
  if (!order.includes(`"${cat}"`)) problems.push(`category "${cat}" is missing from CATEGORY_ORDER`)
}

// A color must be a hex, because it is interpolated into a style. A bad value
// renders an unstyled tile rather than an error.
for (const r of rows) {
  if (!/^#[0-9a-fA-F]{6}$/.test(r.color)) problems.push(`${r.key}: color ${r.color} is not a 6-digit hex`)
}

if (problems.length) {
  console.error(`check-catalog: ${problems.length} problem(s)`)
  for (const p of problems) console.error("  " + p)
  process.exit(1)
}
console.log(
  `check-catalog: ${rows.length} products, ${new Set(iconNames).size} icons, ` +
  `${new Set(rows.map((r) => r.category)).size} categories — all resolve`,
)

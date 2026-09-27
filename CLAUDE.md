# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
pnpm dev          # Start Next.js dev server on localhost:3000
pnpm build        # Production build
pnpm lint         # Run ESLint

# Database
pnpm drizzle-kit generate   # Generate migrations from schema changes
pnpm drizzle-kit push       # Push schema directly to database (dev)
pnpm drizzle-kit migrate    # Apply migrations
pnpm drizzle-kit studio     # Open Drizzle Studio GUI
```

## Architecture & Ecosystem Context

**AXXES** is the parent SaaS company. Users log in to AXXES to access the various specialized tools they subscribe to.

The AXXES product ecosystem consists of:
1. **Landing Page** (`axxes.club`): The public-facing marketing site.
2. **Portal Product Dashboard** (`members.axxes.club`): This repository. The central multi-tenant SaaS platform built with Next.js 16 App Router where users authenticate and manage their subscriptions.
3. **Inventory System** (`demb-inventory`): A specialized product hosted externally on Netlify.
4. **Event Ticketing Platform**: Another standalone product in the AXXES suite.

While `demb-inventory` and other tools might run on separate infrastructure, they are all products of AXXES, and the `members.axxes.club` dashboard serves as the central hub linking out to these external applications.

### Multi-Tenancy Model
- Tenants represent businesses (promoters, venues, agencies, brands)
- Users can belong to multiple tenants via `tenantMemberships` with roles (owner, admin, manager, member, viewer)
- Active tenant stored in `tenant_id` cookie, validated via `requireTenantAccess()` in server actions
- All data tables include `tenantId` column for isolation

### Key Patterns

**Authentication (Better Auth)**
- Config: `src/lib/auth/index.ts` - uses Drizzle adapter with session caching
- Middleware (`src/middleware.ts`) checks `better-auth.session_token` cookie
- Use `getAuthContext()` for server components/actions - returns `{ userId, tenantId }`

**Server Actions**
- Located in `src/lib/actions/` - each domain has its own file
- Always start with `const { tenantId } = await getAuthContext()` for tenant scoping
- Use `revalidatePath()` after mutations
- Validate with Zod schemas

**Database (Drizzle + Neon)**
- Schema: `src/lib/db/schema/` - organized by domain
- Connection: `src/lib/db/index.ts` - uses `@neondatabase/serverless`
- Relations defined alongside tables for type-safe queries

**API Routes**
- Use `withTenantAccess()` wrapper from `src/lib/auth/tenant-context.ts`
- Pattern: validate session, extract tenantId, verify membership, then handle

### Route Groups
- `(auth)` - Sign-in, sign-up, password reset, onboarding, invite acceptance
- `(dashboard)` - Protected routes with sidebar layout and brand theming

### Real-time (Pusher)
- Server: `src/lib/pusher/server.ts`
- Client: `src/lib/pusher/client.ts`
- Used for messaging conversations with typing indicators

### UI Components
- `src/components/ui/` - Radix-based primitives (shadcn/ui style)
- `src/components/layout/` - Sidebar, breadcrumbs, tenant switcher
- Uses Tailwind CSS v4 with `tailwind-merge` and `class-variance-authority`
- Toast notifications: Sonner (`toast` from "sonner"), configured top-center with `richColors`

### Path Aliases
- `@/*` maps to `./src/*`

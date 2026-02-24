# Version History & Changelog

**Project:** members.axxes.club  
**Repository:** https://github.com/axxes-club/members.axxes.club  
**Versioning:** Semantic Versioning (SemVer) - `MAJOR.MINOR.PATCH`

---

## [Unreleased]

### Planned for v1.1.0
- [ ] Mobile apps (iOS/Android)
- [ ] Barcode scanning implementation
- [ ] Shipping carrier integrations (USPS, FedEx, UPS)
- [ ] Customer portal for B2B ordering
- [ ] Accounting integrations (QuickBooks, Xero)
- [ ] Custom report builder UI
- [ ] Advanced analytics dashboards
- [ ] AI-powered insights

---

## [1.0.0] - 2026-02-23

### 🎉 MAJOR RELEASE - Complete Inventory Management Platform

**Theme:** Enterprise-Ready Inventory Management with Premium Features

#### Added - Database Schema (2,268 new lines)

**InvenTree Core (`inventree.ts` - 1,004 lines):**
- Suppliers & Supplier Parts management
- Bill of Materials (BOM) with hierarchical parts
- Build Orders & Production tracking
- Purchase Orders with line items
- Sales Orders with fulfillment tracking
- Serial Numbers & Lot/Batch tracking
- Stock Items with full movement history
- Return Orders (RMA) management
- API Tokens for external integrations
- Label Templates for printing

**Advanced Features (`inventory-advanced.ts` - 1,264 lines):**
- Multi-channel sales integrations (Shopify, Amazon, eBay, Etsy, Walmart)
- Channel listings with product mapping
- Demand forecasting with multiple methods (moving average, exponential smoothing, ML-based)
- Automated replenishment with EOQ calculations
- ABC/XYZ inventory analysis
- Product kits & bundles
- Drop shipping rules
- Transfer orders between warehouses
- Inventory audits & cycle counting
- Landed cost tracking (freight, duty, insurance, customs)
- Quality control inspections
- Price lists with tiers (B2B wholesale/distributor)
- Bin/shelf location tracking with hierarchy
- Expiry date tracking for perishables
- Consignment inventory agreements
- Configurable reports with scheduling

#### Added - Features

**Authentication:**
- Development auto-auth bypass (`/?devauth`)
- Admin user: `admin@axxes.club` (superadmin)
- Demo user: `demo@axxes.club`
- Password authentication support

**Integrations Framework:**
- Multi-provider integration architecture
- Afters.am (OAuth) - Events, Orders, Tickets sync
- Qortr (API Key) - Venue rental marketplace
- Peerspace (API Key) - Event space bookings
- Orders.co (API Key) - Restaurant order management
- ShipStation (API Key) - Multi-channel shipping
- Dropbox (OAuth) - Digital asset management

**UI/UX:**
- Redesigned README with on-brand aesthetic
- Feature comparison documentation
- Professional badge-style headers
- Architecture diagrams

#### Technical Changes

**Database:**
- 33 new tables added
- Full multi-tenant support
- Comprehensive audit logging
- Soft deletes with `deletedAt` timestamps

**Architecture:**
- Next.js 16.1.6 (App Router, Turbopack)
- TypeScript 5
- Drizzle ORM with Neon PostgreSQL
- Better Auth for authentication
- Pusher for real-time features

#### Documentation

- `README.md` - Complete redesign with feature overview
- `FEATURE_COMPARISON.md` - Competitive analysis vs Cin7, TradeGecko, Zoho
- `HISTORY.md` - This file (version history)
- `CLAUDE.md` - Development guidelines
- `VERCEL_ENV_SETUP.md` - Environment variable setup

#### Commits (v1.0.0)

```
23832b1 docs: add comprehensive feature comparison vs Cin7, TradeGecko, Zoho
8df24a3 feat: add 20+ premium inventory features to compete with Cin7, TradeGecko, Zoho
53dc5f9 feat: add complete InvenTree-inspired inventory management
65f03af fix: improve dev-auth error logging and remove account table dependency
6fd2a3c feat: add development auto-auth bypass via ?devauth
9479a82 docs: redesign README with on-brand design system aesthetic
832dbcc feat: Multi-Provider Integration Framework (#14)
```

#### Competitive Position

**Features that differentiate from competitors:**
1. ABC/XYZ Analysis (enterprise-only feature)
2. Consignment Inventory (unique to our platform)
3. Full Landed Cost Tracking
4. AI-Powered Demand Forecasting
5. Bin/Shelf Location Hierarchy
6. Quality Control Workflows
7. Cycle Counting & Audits
8. Price Lists with Tiers

**Pricing advantage:** 80% less than enterprise solutions ($299/mo vs $2,500+/mo)

---

## [0.2.0] - 2026-02-18

### Multi-Provider Integration Framework

#### Added
- Integration framework with OAuth/API key support
- Afters.am integration (ticketing platform)
- Generic API routes for any provider
- Webhook handlers for real-time sync
- Integration settings UI

#### Changed
- Updated package dependencies
- Fixed TypeScript errors
- Resolved ESLint warnings

#### Commits
```
832dbcc feat: Multi-Provider Integration Framework (#14)
f3ceeef chore(deps): bump the production-dependencies group across 1 directory
6a1301d fix: resolve all eslint errors (#12)
```

---

## [0.1.0] - 2026-02-10

### Initial Platform Release

#### Core Features
- Multi-tenant SaaS architecture
- Better Auth authentication
- Drizzle ORM with Neon PostgreSQL
- Next.js 16 App Router
- Tailwind CSS v4
- Pusher real-time messaging

#### Modules
- CRM (Contacts, Segments, Pipelines)
- Events (Management, Venues, Ticketing)
- Inventory (Products, Variants, Locations)
- Orders (Order management, fulfillment)
- Marketing (SEO, Assets, Social)
- Messages (Conversations, Real-time)
- Settings (Team, Brand, Billing)
- Website (Page builder, Custom domains)

#### Commits
```
1e38c4a feat: add Afters OAuth integration for members portal
39251e7 fix: use cookie-based tenant ID in OAuth routes
7f5c1dd Merge pull request #1 from axxes-club/feature/afters-oauth-integration
```

---

## Versioning Guidelines

### Semantic Versioning

```
MAJOR.MINOR.PATCH
  │     │     │
  │     │     └─ Bug fixes (backward compatible)
  │     └─────── New features (backward compatible)
  └───────────── Breaking changes
```

### Release Process

1. **Development** → Work on `main` branch
2. **Feature Complete** → Create release branch `release/vX.Y.Z`
3. **Testing** → QA testing, bug fixes
4. **Version Bump** → Update `package.json`, `HISTORY.md`
5. **Tag Release** → `git tag -a vX.Y.Z -m "Release X.Y.Z"`
6. **Deploy** → Push to production via Vercel
7. **Announce** → Update changelog, notify users

### Commit Message Format

```
type(scope): subject

body (optional)

footer (optional)
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Formatting
- `refactor` - Code restructuring
- `test` - Tests
- `chore` - Maintenance

**Examples:**
```
feat(inventory): add ABC/XYZ analysis
fix(auth): resolve session timeout issue
docs: update API documentation
```

---

## Upgrade Paths

### From v0.2.0 to v1.0.0

**Database Migrations Required:**
```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

**New Tables (33):**
- `suppliers`, `supplier_parts`
- `bom_items`
- `build_orders`, `build_allocations`
- `purchase_orders`, `purchase_order_items`
- `sales_orders`, `sales_order_items`
- `stock_items`, `stock_item_tracking`
- `return_orders`, `return_order_items`
- `api_tokens`
- `label_templates`
- `sales_channels`, `channel_listings`
- `demand_forecasts`
- `replenishment_rules`
- `abc_analysis`
- `product_kits`, `kit_components`
- `dropship_rules`
- `transfer_orders`, `transfer_order_items`
- `inventory_audits`, `audit_items`
- `landed_costs`
- `quality_checks`
- `price_lists`, `price_list_items`
- `location_bins`
- `expiry_tracking`
- `consignment_agreements`, `consignment_stock`
- `report_configs`

**Breaking Changes:** None (backward compatible)

**New Environment Variables:**
```env
# OAuth Providers
AFTERS_CLIENT_ID=
AFTERS_CLIENT_SECRET=
AFTERS_OAUTH_URL=
DROPBOX_CLIENT_ID=
DROPBOX_CLIENT_SECRET=

# Webhooks
AFTERS_WEBHOOK_SECRET=
```

---

## Known Issues

### v1.0.0
- [ ] Mobile apps not yet available
- [ ] Shipping carrier integrations pending
- [ ] Customer portal UI pending
- [ ] Accounting integrations pending

---

## Support

**Documentation:** https://docs.members.axxes.club  
**API Reference:** https://api.members.axxes.club  
**Support Email:** support@axxes.club  

---

## License

Proprietary. All rights reserved.

---

*Last Updated: 2026-02-23*

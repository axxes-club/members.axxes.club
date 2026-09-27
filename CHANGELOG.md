# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- New public landing page showcasing AXXES as "The Operating System for the Entertainment Industry"
- Features, Testimonials, and Pricing sections on the public site
- External navigation support in the dashboard sidebar

### Changed
- Replaced the root (`/`) redirect with the new landing page
- Sidebar "Inventory" module is now "Simple Inventory" and links to the standalone Netlify web app

### Planned
- Mobile apps (iOS/Android)
- Barcode scanning implementation
- Shipping carrier integrations
- Customer portal for B2B ordering
- Accounting integrations (QuickBooks, Xero)

---

## [1.0.0] - 2026-02-23

### 🎉 Major Release - Enterprise Inventory Management Platform

#### Added

**Database Schema (2,268 lines):**
- `inventree.ts` - Core inventory management (Suppliers, BOM, Build Orders, PO, SO, Serial/Lot tracking)
- `inventory-advanced.ts` - Premium features (Forecasting, ABC Analysis, Multi-channel, QC, Consignment)

**Features:**
- Multi-channel sales integrations (Shopify, Amazon, eBay, Etsy, Walmart)
- Demand forecasting with AI/ML methods
- Automated replenishment with EOQ calculations
- ABC/XYZ inventory analysis
- Product kits & bundles
- Drop shipping support
- Transfer orders between warehouses
- Cycle counting & inventory audits
- Landed cost tracking
- Quality control inspections
- B2B price lists with tiers
- Bin/shelf location hierarchy
- Expiry date tracking
- Consignment inventory

**Authentication:**
- Development auto-auth bypass (`/?devauth`)
- Admin user: `admin@axxes.club`
- Demo user: `demo@axxes.club`

**Integrations:**
- Afters.am (OAuth) - Ticketing platform
- Qortr (API Key) - Venue marketplace
- Peerspace (API Key) - Event spaces
- Orders.co (API Key) - Restaurant orders
- ShipStation (API Key) - Shipping
- Dropbox (OAuth) - Cloud storage

#### Changed
- Redesigned README with professional aesthetic
- Updated package version to 1.0.0

#### Technical
- 33 new database tables
- Next.js 16.1.6
- TypeScript 5
- Drizzle ORM + Neon PostgreSQL

---

## [0.2.0] - 2026-02-18

### Added
- Multi-provider integration framework
- OAuth 2.0 support
- API key authentication support
- Generic integration API routes
- Webhook handlers

#### Changed
- Updated dependencies
- Fixed TypeScript errors
- Resolved ESLint warnings

---

## [0.1.0] - 2026-02-10

### Added
- Initial platform release
- Multi-tenant architecture
- Better Auth authentication
- CRM module
- Events module
- Inventory module (basic)
- Orders module
- Marketing module
- Messages module
- Settings module
- Website builder

---

## Version History

See [HISTORY.md](./HISTORY.md) for detailed version history and upgrade paths.

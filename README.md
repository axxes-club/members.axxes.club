<div align="center">

# members.axxes.club

**Multi-tenant SaaS platform for event promoters, venues, agencies, and brands**

[![Build Status](https://img.shields.io/github/actions/workflow/status/axxes-club/members.axxes.club/ci.yml?style=flat-square)](https://github.com/axxes-club/members.axxes.club/actions)
[![License](https://img.shields.io/badge/license-proprietary-black?style=flat-square)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black?logo=next.js&style=flat-square)](https://nextjs.org)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel&style=flat-square)](https://vercel.com)

![axxes.club platform](https://via.placeholder.com/1200x400/141414/f5f5f0?text=axxes.club+Platform+Dashboard)

</div>

---

## 🎯 Overview

A comprehensive business management platform built for the nightlife and entertainment industry. Manage members, events, inventory, marketing, and more — all in one place.

### ✨ Core Features

| Feature | Description |
|---------|-------------|
| 🎫 **Ticketing** | Native ticketing system with Afters.am integration for event management |
| 🏢 **Venues** | Manage multiple venues with capacity, amenities, and booking |
| 📦 **Inventory** | Track products, variants, and stock levels across locations |
| 📊 **CRM** | Contact management with segmentation and engagement tracking |
| 📱 **Marketing** | Social media scheduling, asset management, and SEO tools |
| 💬 **Messaging** | Real-time customer conversations via Pusher |
| 🌐 **Website Builder** | Drag-and-drop page builder with custom domains |
| 🔗 **Integrations** | Connect with Qortr, Peerspace, ShipStation, Dropbox, Orders.co |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js 16 App Router                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   (auth)    │  │ (dashboard) │  │    API Routes       │  │
│  │  Sign-in    │  │   Sidebar   │  │  /api/integrations  │  │
│  │  Sign-up    │  │   Breadcrumbs│  │  /api/v1/*          │  │
│  │  Onboarding │  │   Layout    │  │  Webhooks           │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    Better Auth (Session)                     │
├─────────────────────────────────────────────────────────────┤
│              Drizzle ORM → Neon PostgreSQL                   │
└─────────────────────────────────────────────────────────────┘
```

### Tech Stack

- **Framework:** Next.js 16.1.6 (App Router, Turbopack)
- **Language:** TypeScript 5
- **Database:** PostgreSQL (Neon) + Drizzle ORM
- **Auth:** Better Auth with multi-tenant support
- **UI:** Radix UI + Tailwind CSS v4 + shadcn/ui patterns
- **Real-time:** Pusher for messaging
- **Email:** Nodemailer
- **Deployment:** Vercel

---

## 🚀 Quick Start

### Prerequisites

```bash
node >= 20
pnpm >= 9
```

### Installation

```bash
# Clone the repository
git clone https://github.com/axxes-club/members.axxes.club.git
cd members.axxes.club

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Run database migrations
pnpm drizzle-kit migrate

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

---

## 📁 Project Structure

```
members.axxes.club/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/               # Auth pages (sign-in, sign-up, onboarding)
│   │   ├── (dashboard)/          # Protected dashboard routes
│   │   ├── api/                  # API routes
│   │   │   ├── integrations/     # Integration providers
│   │   │   └── v1/               # REST API endpoints
│   │   └── p/[tenant]/[page]     # Public tenant pages
│   ├── components/
│   │   ├── ui/                   # Reusable UI primitives
│   │   └── layout/               # Layout components
│   ├── lib/
│   │   ├── auth/                 # Authentication config
│   │   ├── db/                   # Database schema & connection
│   │   ├── integrations/         # Integration providers
│   │   ├── actions/              # Server actions
│   │   └── utils/                # Utility functions
│   └── providers/                # React context providers
├── drizzle/                      # Database migrations
├── public/                       # Static assets
└── scripts/                      # Utility scripts
```

---

## 🔐 Multi-Tenancy

The platform supports multiple business types with isolated data:

| Tenant Type | Use Case |
|-------------|----------|
| 🎉 Promoters | Event management, ticketing, marketing |
| 🏢 Venues | Space rental, capacity management, amenities |
| 🏛 Agencies | Artist management, booking, contracts |
| 🏷 Brands | Product sales, inventory, order fulfillment |

Each tenant has:
- Isolated data with `tenantId` scoping
- Custom branding and themes
- Team members with role-based access
- Independent integrations

---

## 🔗 Integrations

Connect external services to extend functionality:

| Provider | Category | Auth | Features |
|----------|----------|------|----------|
| **Afters.am** | Ticketing | OAuth | Events, Orders, Tickets sync |
| **Qortr** | Venues | API Key | Venue rental marketplace |
| **Peerspace** | Venues | API Key | Event space bookings |
| **Orders.co** | Orders | API Key | Restaurant order management |
| **ShipStation** | Shipping | API Key | Multi-channel shipping |
| **Dropbox** | Storage | OAuth | Digital asset management |

### Configure Integrations

1. Navigate to **Settings → Integrations**
2. Click **Connect** on desired provider
3. Complete OAuth flow or enter API credentials
4. Configure sync settings

---

## 📚 Documentation

- [Architecture Overview](docs/ARCHITECTURE.md)
- [Database Schema](docs/DATABASE.md)
- [Integration Guide](docs/INTEGRATIONS.md)
- [Deployment Guide](docs/DEPLOYMENT.md)

---

## 🛠 Development

```bash
# Start development server
pnpm dev

# Run production build
pnpm build

# Lint codebase
pnpm lint

# Database commands
pnpm drizzle-kit generate    # Create migrations
pnpm drizzle-kit push        # Push schema (dev)
pnpm drizzle-kit migrate     # Apply migrations
pnpm drizzle-kit studio      # Open Drizzle Studio
```

---

## 🚢 Deployment

The application is deployed on Vercel with automatic deployments from `main`:

1. Push to `main` branch
2. Vercel builds and deploys
3. Database migrations run automatically

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Session encryption key |
| `BETTER_AUTH_BASE_URL` | App base URL |
| `NEXT_PUBLIC_APP_URL` | Public app URL |
| `PUSHER_*` | Pusher credentials |
| `AFTERS_*` | Afters OAuth credentials |
| `DROPBOX_*` | Dropbox OAuth credentials |

---

## 👥 Team

Built by the **axxes.club** team for the nightlife and entertainment industry.

---

## 📄 License

Proprietary. All rights reserved.

---

<div align="center">

**[members.axxes.club](https://members.axxes.club)** • **[axxes.club](https://axxes.club)**

</div>

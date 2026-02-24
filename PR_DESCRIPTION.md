# Multi-Provider Integration Framework

## Overview
This PR implements a comprehensive multi-provider integration framework that allows the platform to connect with external services for ticketing, venues, orders, shipping, and cloud storage. The framework supports both OAuth 2.0 and API key authentication methods.

## Changes

### Core Framework
- **`src/lib/integrations/base.ts`** - Abstract base class providing:
  - OAuth 2.0 flow (authorization URL, token exchange, refresh, revoke)
  - API key validation
  - Connection health checks
  - Token management with automatic refresh
  - Abstract methods for provider-specific implementations

- **`src/lib/integrations/types.ts`** - Shared types for:
  - OAuth/API key configurations
  - Provider metadata
  - Connection state and health
  - Sync results and errors
  - Webhook events
  - External entity mappers

- **`src/lib/integrations/index.ts`** - Provider registry with:
  - Central registration and lookup
  - Category-based filtering
  - Grouped provider listings

### API Routes
- **`/api/integrations/[provider]`** - Generic connection management (GET/POST/DELETE/PATCH)
- **`/api/integrations/[provider]/sync`** - Manual sync trigger for any provider
- **`/api/integrations/afters/callback`** - Afters OAuth callback
- **/api/integrations/afters/webhook`** - Afters webhook handler
- **`/api/integrations/afters/sync`** - Afters-specific sync endpoint
- **`/api/integrations/dropbox/callback`** - Dropbox OAuth callback

### Provider Implementations

| Provider | Category | Auth | Features |
|----------|----------|------|----------|
| **Afters.am** | Ticketing | OAuth | Events, Orders, Tickets sync |
| **Qortr** | Venues | API Key | Venue rental marketplace |
| **Peerspace** | Venues | API Key | Event space bookings |
| **Orders.co** | Orders | API Key | Restaurant order management |
| **ShipStation** | Shipping | API Key | Multi-channel shipping |
| **Dropbox** | Storage | OAuth | Digital asset management |

### UI Updates
- **`src/app/(dashboard)/settings/integrations/integrations-client.tsx`**:
  - Removed `comingSoon` flags - all integrations now available
  - Load all provider connections on mount
  - Unified connect/disconnect flow
  - Sync controls for supported providers
  - Settings dialog for sync configuration

### Bug Fixes
- Fixed force-dynamic rendering for accept-invite page
- Fixed TypeScript errors in integration providers
- Added `shipping` to IntegrationFeature type

## Testing

### Build Verification
```bash
pnpm build
# ✓ Compiled successfully
# ✓ Generating static pages (23/23)
```

### Lint Verification
```bash
pnpm lint
# No errors (pre-existing warnings only)
```

### TypeScript Verification
```bash
pnpm tsc --noEmit
# No errors
```

## Environment Variables Required

### Afters.am
```env
AFTERS_CLIENT_ID=
AFTERS_CLIENT_SECRET=
AFTERS_OAUTH_URL=https://afters.am
AFTERS_WEBHOOK_SECRET=
```

### Dropbox
```env
DROPBOX_CLIENT_ID=
DROPBOX_CLIENT_SECRET=
```

### Others (API Key based - configured per-tenant)
- Qortr API Key + Account ID
- Peerspace API Key
- Orders.co API Key + Account ID
- ShipStation API Key + API Secret

## Usage

### Connecting a Provider
1. Navigate to Settings → Integrations
2. Click "Connect" on desired provider
3. For OAuth: Complete authorization flow
4. For API Key: Enter credentials in dialog

### Syncing Data
1. Connected providers show a "Sync" button
2. Click to manually sync events/orders/venues
3. Sync frequency can be configured in provider settings

## Database Changes
No new migrations required. Uses existing tables:
- `integrationConnection` - Stores provider connections
- `events`, `orders`, `venues`, `assets` - Sync targets with metadata fields

## Security Considerations
- OAuth state parameter with timestamp validation (5 min expiry)
- Token encryption at rest (handled by Better Auth)
- Webhook signature verification for Afters
- Tenant isolation enforced on all operations
- API keys validated before storage

## Future Enhancements
- Scheduled sync via cron jobs
- Webhook registration for all providers
- Bi-directional sync support
- Sync history and audit logs
- Provider-specific error handling dashboards

## Related Issues
- Closes #[issue-number]

## Checklist
- [x] Code compiles without errors
- [x] Lint passes
- [x] Build succeeds
- [x] All providers registered in index.ts
- [x] OAuth callbacks implemented
- [x] UI updated to show all providers
- [ ] Unit tests for base integration class
- [ ] E2E tests for OAuth flows
- [ ] Documentation updated

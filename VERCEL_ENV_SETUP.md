# Vercel Environment Variables Setup

## Required Environment Variables for Integrations

### Already Configured ✅
- `AFTERS_OAUTH_URL` - Afters OAuth base URL
- `AFTERS_CLIENT_ID` - Afters OAuth client ID
- `AFTERS_CLIENT_SECRET` - Afters OAuth client secret
- `NEXT_PUBLIC_APP_URL` - App base URL (used for OAuth callbacks)

### Need to Add ⚠️

#### Dropbox Integration
```
DROPBOX_CLIENT_ID=<your-dropbox-app-key>
DROPBOX_CLIENT_SECRET=<your-dropbox-app-secret>
```

#### Afters Webhook (Optional but Recommended)
```
AFTERS_WEBHOOK_SECRET=<your-webhook-signing-secret>
```

## How to Add

### Option 1: Vercel Dashboard
1. Go to https://vercel.com/axxes-club/members.axxes.club/settings/environment-variables
2. Click "Add New"
3. Add each variable:
   - Name: `DROPBOX_CLIENT_ID`
   - Value: `<your-dropbox-client-id>`
   - Environment: Production ✅
4. Repeat for `DROPBOX_CLIENT_SECRET` and `AFTERS_WEBHOOK_SECRET`
5. Redeploy for changes to take effect

### Option 2: Vercel CLI
```bash
# Dropbox
vercel env add DROPBOX_CLIENT_ID
vercel env add DROPBOX_CLIENT_SECRET

# Afters webhook
vercel env add AFTERS_WEBHOOK_SECRET

# Deploy to apply
vercel --prod
```

### Option 3: Using vercel.json (Not Recommended for Secrets)
For local development only - never commit secrets to git.

## OAuth Callback URLs to Configure

### Dropbox App Console
Add this redirect URI to your Dropbox app:
```
<NEXT_PUBLIC_APP_URL>/api/integrations/dropbox/callback
```

### Afters Dashboard
Add this redirect URI to your Afters app:
```
<NEXT_PUBLIC_APP_URL>/api/integrations/afters/callback
```

### Webhook Endpoints to Register

#### Afters Webhook
Register this endpoint in Afters dashboard:
```
<NEXT_PUBLIC_APP_URL>/api/integrations/afters/webhook
```
Events to subscribe:
- `event.created`
- `event.updated`
- `order.created`
- `order.updated`
- `ticket.sold`

## Verification

After adding variables, verify with:
```bash
vercel env ls
```

Expected output should include:
```
DROPBOX_CLIENT_ID          Encrypted   Production
DROPBOX_CLIENT_SECRET      Encrypted   Production
AFTERS_WEBHOOK_SECRET      Encrypted   Production (optional)
```

## Local Development

Create `.env.local` with:
```bash
# Dropbox
DROPBOX_CLIENT_ID=your-dropbox-client-id
DROPBOX_CLIENT_SECRET=your-dropbox-client-secret

# Afters
AFTERS_OAUTH_URL=https://afters.am
AFTERS_CLIENT_ID=your-afters-client-id
AFTERS_CLIENT_SECRET=your-afters-client-secret
AFTERS_WEBHOOK_SECRET=your-webhook-secret

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

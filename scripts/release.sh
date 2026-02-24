#!/bin/bash

# Release Preparation Script for members.axxes.club
# This script prepares a release by running checks, building, and creating release notes

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  Release Preparation Script${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Step 1: Check current branch
echo -e "${YELLOW}Step 1: Checking branch...${NC}"
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${RED}Error: Releases must be created from main branch${NC}"
    echo "Current branch: $CURRENT_BRANCH"
    exit 1
fi
echo -e "${GREEN}✓ On main branch${NC}"

# Step 2: Check for uncommitted changes
echo -e "${YELLOW}Step 2: Checking for uncommitted changes...${NC}"
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${RED}Error: Uncommitted changes detected${NC}"
    git status --short
    exit 1
fi
echo -e "${GREEN}✓ No uncommitted changes${NC}"

# Step 3: Pull latest changes
echo -e "${YELLOW}Step 3: Pulling latest changes...${NC}"
git pull origin main
echo -e "${GREEN}✓ Up to date${NC}"

# Step 4: Run linting
echo -e "${YELLOW}Step 4: Running linter...${NC}"
pnpm lint
echo -e "${GREEN}✓ Linting passed${NC}"

# Step 5: Run TypeScript check
echo -e "${YELLOW}Step 5: Running TypeScript check...${NC}"
pnpm tsc --noEmit
echo -e "${GREEN}✓ TypeScript check passed${NC}"

# Step 6: Run build
echo -e "${YELLOW}Step 6: Building project...${NC}"
pnpm build
echo -e "${GREEN}✓ Build successful${NC}"

# Step 7: Get version info
echo -e "${YELLOW}Step 7: Getting version info...${NC}"
CURRENT_VERSION=$(grep '"version":' package.json | head -1 | cut -d'"' -f4)
echo -e "${BLUE}Current version: ${CURRENT_VERSION}${NC}"

# Step 8: Generate release notes
echo -e "${YELLOW}Step 8: Generating release notes...${NC}"
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
if [ -z "$LAST_TAG" ]; then
    COMMITS=$(git log --oneline -20)
else
    COMMITS=$(git log --oneline $LAST_TAG..HEAD -20)
fi

echo ""
echo -e "${BLUE}Recent commits:${NC}"
echo "$COMMITS"
echo ""

# Step 9: Create release summary
echo -e "${YELLOW}Step 9: Creating release summary...${NC}"
RELEASE_SUMMARY="
## Release Summary - v$CURRENT_VERSION

### Database Changes
- New tables: inventree.ts (1,004 lines), inventory-advanced.ts (1,264 lines)
- Total: 33 new tables for enterprise inventory features

### New Features
- Multi-channel sales integrations
- Demand forecasting with AI/ML
- ABC/XYZ inventory analysis
- Automated replenishment
- Quality control workflows
- Consignment inventory tracking
- And 20+ more premium features

### Breaking Changes
- None (backward compatible)

### Migration Required
\`\`\`bash
pnpm drizzle-kit migrate
\`\`\`

### Environment Variables
\`\`\`env
AFTERS_CLIENT_ID=
AFTERS_CLIENT_SECRET=
DROPBOX_CLIENT_ID=
DROPBOX_CLIENT_SECRET=
AFTERS_WEBHOOK_SECRET=
\`\`\`
"

echo "$RELEASE_SUMMARY"

# Step 10: Confirm release
echo ""
read -p "${YELLOW}Proceed with release v$CURRENT_VERSION? (y/n) ${NC}" -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Release cancelled${NC}"
    exit 0
fi

# Step 11: Create tag
echo -e "${YELLOW}Step 11: Creating git tag...${NC}"
git tag -a "v$CURRENT_VERSION" -m "Release version $CURRENT_VERSION"
echo -e "${GREEN}✓ Tag created: v$CURRENT_VERSION${NC}"

# Step 12: Push
echo -e "${YELLOW}Step 12: Pushing to remote...${NC}"
git push origin main --tags
echo -e "${GREEN}✓ Pushed to origin${NC}"

# Step 13: Create GitHub release
echo -e "${YELLOW}Step 13: Creating GitHub release...${NC}"
echo -e "${BLUE}Run: gh release create v$CURRENT_VERSION --generate-notes${NC}"

# Step 14: Deploy to Vercel
echo -e "${YELLOW}Step 14: Deploy to production...${NC}"
echo -e "${BLUE}Run: vercel --prod${NC}"

echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  Release Preparation Complete!${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Create GitHub release: gh release create v$CURRENT_VERSION --generate-notes"
echo "2. Deploy to Vercel: vercel --prod"
echo "3. Update documentation"
echo "4. Announce release"

#!/bin/bash

# Version Management Script for members.axxes.club
# Usage: ./scripts/version.sh [major|minor|patch|premajor|preminor|prepatch|prerelease] [version]

set -e

VERSION_TYPE=${1:-patch}
CUSTOM_VERSION=$2

PACKAGE_JSON="package.json"
HISTORY_MD="HISTORY.md"
CHANGELOG_MD="CHANGELOG.md"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get current version
CURRENT_VERSION=$(grep '"version":' "$PACKAGE_JSON" | head -1 | cut -d'"' -f4)
echo -e "${BLUE}Current version: ${CURRENT_VERSION}${NC}"

# Calculate new version
if [ -n "$CUSTOM_VERSION" ]; then
    NEW_VERSION=$CUSTOM_VERSION
else
    # Parse current version
    IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"
    
    case $VERSION_TYPE in
        major)
            NEW_VERSION="$((MAJOR + 1)).0.0"
            ;;
        minor)
            NEW_VERSION="$MAJOR.$((MINOR + 1)).0"
            ;;
        patch)
            NEW_VERSION="$MAJOR.$MINOR.$((PATCH + 1))"
            ;;
        premajor)
            NEW_VERSION="$((MAJOR + 1)).0.0-beta.0"
            ;;
        preminor)
            NEW_VERSION="$MAJOR.$((MINOR + 1)).0-beta.0"
            ;;
        prepatch)
            NEW_VERSION="$MAJOR.$MINOR.$((PATCH + 1))-beta.0"
            ;;
        prerelease)
            # Increment prerelease number
            if [[ $PATCH == *"-beta."* ]]; then
                BASE_PATCH=$(echo $PATCH | cut -d'-' -f1)
                BETA_NUM=$(echo $PATCH | cut -d'.' -f2)
                NEW_BETA_NUM=$((BETA_NUM + 1))
                NEW_VERSION="$MAJOR.$MINOR.$BASE_PATCH-beta.$NEW_BETA_NUM"
            else
                NEW_VERSION="$MAJOR.$MINOR.$((PATCH + 1))-beta.0"
            fi
            ;;
        *)
            echo -e "${RED}Invalid version type: $VERSION_TYPE${NC}"
            echo "Usage: $0 [major|minor|patch|premajor|preminor|prepatch|prerelease] [custom_version]"
            exit 1
            ;;
    esac
fi

echo -e "${GREEN}New version: ${NEW_VERSION}${NC}"

# Confirm version bump
read -p "Proceed with version bump to $NEW_VERSION? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Version bump cancelled${NC}"
    exit 0
fi

# Update package.json
echo -e "${BLUE}Updating package.json...${NC}"
sed -i.bak "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" "$PACKAGE_JSON"
rm "$PACKAGE_JSON.bak"

# Get recent commits since last version
echo -e "${BLUE}Generating changelog from recent commits...${NC}"
COMMITS=$(git log --oneline --no-merges -20)

# Create changelog entry
CHANGELOG_ENTRY="## [$NEW_VERSION] - $(date +%Y-%m-%d)

### Changes
\`\`\`
$COMMITS
\`\`\`

### Database Changes
- Run migrations: \`pnpm drizzle-kit migrate\`

### Breaking Changes
- None (backward compatible)

---
"

# Prepend to CHANGELOG.md if exists, otherwise create
if [ -f "$CHANGELOG_MD" ]; then
    echo -e "$CHANGELOG_ENTRY$(cat $CHANGELOG_MD)" > "$CHANGELOG_MD.tmp"
    mv "$CHANGELOG_MD.tmp" "$CHANGELOG_MD"
else
    echo "# Changelog

$CHANGELOG_ENTRY" > "$CHANGELOG_MD"
fi

# Git operations
echo -e "${BLUE}Creating git commit and tag...${NC}"
git add "$PACKAGE_JSON" "$HISTORY_MD" "$CHANGELOG_MD" 2>/dev/null || true
git commit -m "chore: bump version to $NEW_VERSION" || echo "No changes to commit"
git tag -a "v$NEW_VERSION" -m "Release version $NEW_VERSION"

echo -e "${GREEN}✓ Version bumped to $NEW_VERSION${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review changes: git show v$NEW_VERSION"
echo "2. Push to remote: git push origin main --tags"
echo "3. Create GitHub release: gh release create v$NEW_VERSION --generate-notes"
echo "4. Deploy to production: vercel --prod"

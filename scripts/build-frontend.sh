#!/bin/bash

# Fast Lane Fuel System - Frontend Build Script
# This script prepares frontend files for deployment

set -e

# Get the repository root directory
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND_DIR="$REPO_ROOT/frontend"
CONFIG_DIR="$REPO_ROOT/config"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Frontend Build Script                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if config files exist
if [ ! -f "$CONFIG_DIR/server.json" ]; then
    echo -e "${YELLOW}⚠️  Warning: server.json not found in config/${NC}"
    echo "   Using default values"
fi

echo -e "${GREEN}✓${NC} Frontend files are static HTML/CSS/JS"
echo -e "${GREEN}✓${NC} No build process required"
echo ""
echo "Frontend directories:"
echo "  - $FRONTEND_DIR/landing/"
echo "  - $FRONTEND_DIR/user/"
echo "  - $FRONTEND_DIR/admin/"
echo ""
echo -e "${YELLOW}Note:${NC} Update API URLs in frontend JS files if needed:"
echo "  - frontend/user/assets/js/user.js"
echo "  - frontend/admin/assets/js/admin.js"
echo "  - frontend/landing/assets/js/landing.js"
echo ""
echo -e "${GREEN}✓${NC} Frontend ready to serve!"

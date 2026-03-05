#!/bin/bash

# Fast Lane Fuel System - Deployment Script
# Deploys the entire system (backend + ESP32 + frontend)

set -e

# Get the repository root directory
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Fast Lane Fuel System Deployment     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Setup backend
echo -e "${YELLOW}[1/4]${NC} Setting up backend..."
"$REPO_ROOT/scripts/setup-backend.sh"
echo ""

# Step 2: Check configuration
echo -e "${YELLOW}[2/4]${NC} Checking configuration files..."
if [ -f "$REPO_ROOT/config/server.json" ]; then
    echo -e "${GREEN}✓${NC} server.json found"
else
    echo -e "${RED}✗${NC} server.json missing in config/"
fi

if [ -f "$REPO_ROOT/config/wifi.json" ]; then
    echo -e "${GREEN}✓${NC} wifi.json found"
else
    echo -e "${RED}✗${NC} wifi.json missing in config/"
fi

if [ -f "$REPO_ROOT/config/database.json" ]; then
    echo -e "${GREEN}✓${NC} database.json found"
else
    echo -e "${RED}✗${NC} database.json missing in config/"
fi

if [ -f "$REPO_ROOT/config/constants.json" ]; then
    echo -e "${GREEN}✓${NC} constants.json found"
else
    echo -e "${RED}✗${NC} constants.json missing in config/"
fi
echo ""

# Step 3: Prepare frontend
echo -e "${YELLOW}[3/4]${NC} Preparing frontend..."
"$REPO_ROOT/scripts/build-frontend.sh"
echo ""

# Step 4: Instructions for ESP32
echo -e "${YELLOW}[4/4]${NC} ESP32 firmware deployment..."
echo "To upload ESP32 firmware:"
echo "  1. Connect ESP32 via USB"
echo "  2. Run: cd $REPO_ROOT && ./scripts/upload-esp32.sh"
echo "  3. Or use: cd esp32 && pio run --target upload"
echo ""

echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Deployment Complete!                 ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo "Next steps:"
echo -e "  1. Start backend: ${BLUE}./scripts/start-server.sh${NC}"
echo -e "  2. Upload ESP32 firmware: ${BLUE}./scripts/upload-esp32.sh${NC}"
echo -e "  3. Monitor ESP32: ${BLUE}./scripts/monitor-esp32.sh${NC}"
echo ""
echo "Configuration files are in: $REPO_ROOT/config/"
echo ""

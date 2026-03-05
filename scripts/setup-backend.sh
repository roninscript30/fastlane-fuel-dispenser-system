#!/bin/bash

# Fuel Backend Setup Script
# This script sets up MongoDB and the backend server dependencies

set -e

# Get the repository root directory
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$REPO_ROOT/backend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Fuel System - Backend Setup Script    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if MongoDB is running
echo -e "${YELLOW}[1/3]${NC} Checking MongoDB..."
if command -v mongod &> /dev/null; then
    if pgrep -x "mongod" > /dev/null; then
        echo -e "${GREEN}✓${NC} MongoDB is already running"
    else
        echo -e "${YELLOW}▶${NC} Starting MongoDB..."
        mongod &
        sleep 3
        echo -e "${GREEN}✓${NC} MongoDB started"
    fi
elif command -v docker &> /dev/null; then
    if docker ps | grep -q fuel-mongodb; then
        echo -e "${GREEN}✓${NC} MongoDB container is already running"
    else
        echo -e "${YELLOW}▶${NC} Starting MongoDB with Docker..."
        docker run -d -p 27017:27017 --name fuel-mongodb mongo:latest
        sleep 3
        echo -e "${GREEN}✓${NC} MongoDB container started"
    fi
else
    echo -e "${RED}✗${NC} MongoDB not found. Install MongoDB or Docker"
    exit 1
fi

# Check Node.js
echo ""
echo -e "${YELLOW}[2/3]${NC} Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗${NC} Node.js not found. Please install Node.js"
    exit 1
fi
NODE_VERSION=$(node -v)
echo -e "${GREEN}✓${NC} Node.js $NODE_VERSION found"

# Install dependencies if needed
echo ""
echo -e "${YELLOW}[3/3]${NC} Checking backend dependencies..."
cd "$BACKEND_DIR"
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}▶${NC} Installing npm packages..."
    npm install
    echo -e "${GREEN}✓${NC} Dependencies installed"
else
    echo -e "${GREEN}✓${NC} Dependencies already installed"
fi

# Check if seed is needed
if [ "$1" = "--seed" ]; then
    echo ""
    echo -e "${YELLOW}▶${NC} Seeding database..."
    npm run seed
    echo -e "${GREEN}✓${NC} Database seeded"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Backend Setup Complete!              ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "Start backend with:  ${BLUE}cd $REPO_ROOT && ./scripts/start-server.sh${NC}"
echo ""
echo -e "Configuration files: ${BLUE}$REPO_ROOT/config/${NC}"
echo "Database:            MongoDB at mongodb://localhost:27017/fuel-backend"
echo "Backend Port:        3000"
echo ""

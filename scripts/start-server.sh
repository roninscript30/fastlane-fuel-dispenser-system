#!/bin/bash

# Fast Lane Fuel Dispenser - Server Startup Script
# Run this script from the repository root to start the backend server

set -e

# Get the repository root directory
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$REPO_ROOT/backend"
CONFIG_DIR="$REPO_ROOT/config"

echo "🚀 Starting Fast Lane Fuel Backend Server..."
echo ""

# Load configuration
if [ -f "$CONFIG_DIR/server.json" ]; then
    BACKEND_URL=$(grep -o '"url": *"[^"]*"' "$CONFIG_DIR/server.json" | grep backend | cut -d'"' -f4)
    ESP32_URL=$(grep -o '"url": *"[^"]*"' "$CONFIG_DIR/server.json" | grep esp32 | cut -d'"' -f4)
else
    BACKEND_URL="http://localhost:3000"
    ESP32_URL="http://localhost:80"
fi

ADMIN_RFID=$(grep -o '"adminTag": *"[^"]*"' "$CONFIG_DIR/constants.json" 2>/dev/null | cut -d'"' -f4 || echo "ABCD1234")

# Change to backend directory
cd "$BACKEND_DIR"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Check if MongoDB is running
echo "🔍 Checking MongoDB connection..."
if ! nc -z localhost 27017 2>/dev/null; then
    echo "⚠️  WARNING: MongoDB doesn't appear to be running on localhost:27017"
    echo "   Please start MongoDB before running the server"
    echo ""
fi

# Start the server
echo "✅ Starting server..."
echo "   Landing Page: ${BACKEND_URL}/"
echo "   User Dashboard: ${BACKEND_URL}/user"
echo "   Admin Panel: ${BACKEND_URL}/admin"
echo ""
echo "   ESP32 API: ${ESP32_URL}"
echo "   Admin RFID: ${ADMIN_RFID}"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm start

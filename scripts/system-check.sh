#!/bin/bash

# Fast Lane Fuel System - Complete System Check & Summary
# Run from repository root

# Get the repository root directory
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ESP32_DIR="$REPO_ROOT/esp32"
BACKEND_DIR="$REPO_ROOT/backend"
CONFIG_DIR="$REPO_ROOT/config"

echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║      FAST LANE FUEL SYSTEM - COMPLETE STATUS CHECK                ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

# Load configuration
if [ -f "$CONFIG_DIR/server.json" ]; then
    BACKEND_IP=$(grep -o '"ip": *"[^"]*"' "$CONFIG_DIR/server.json" | grep -v esp32 | head -1 | cut -d'"' -f4)
    BACKEND_PORT=$(grep -o '"port": *[0-9]*' "$CONFIG_DIR/server.json" | head -1 | grep -o '[0-9]*')
    BACKEND_URL="${BACKEND_IP}:${BACKEND_PORT}"
else
    BACKEND_URL="localhost:3000"
fi

# Check Backend
echo "📡 BACKEND SERVER:"
if curl -s "http://${BACKEND_URL}/health" > /dev/null 2>&1; then
    echo "   ✓ Backend is RUNNING at http://${BACKEND_URL}"
    echo "   ✓ Accessible on network"
else
    echo "   ✗ Backend is NOT responding at http://${BACKEND_URL}"
fi
echo ""

# Check MongoDB
echo "🗄️  DATABASE:"
if pgrep -x mongod > /dev/null; then
    echo "   ✓ MongoDB is RUNNING"
elif docker ps | grep -q fuel-mongodb; then
    echo "   ✓ MongoDB is RUNNING (Docker)"
else
    echo "   ✗ MongoDB is NOT running"
fi
echo ""

# Check Node.js
echo "🟢 NODE.JS:"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo "   ✓ Node.js installed: $NODE_VERSION"
    if [ -d "$BACKEND_DIR/node_modules" ]; then
        echo "   ✓ Backend dependencies installed"
    else
        echo "   ⚠ Backend dependencies NOT installed"
        echo "   → Run: ./scripts/setup-backend.sh"
    fi
else
    echo "   ✗ Node.js NOT installed"
fi
echo ""

# Check Network
echo "🌐 NETWORK:"
IP=$(ip -4 addr show wlan0 2>/dev/null | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | head -1)
if [ -z "$IP" ]; then
    IP=$(ip -4 addr show eth0 2>/dev/null | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | head -1)
fi
if [ ! -z "$IP" ]; then
    echo "   ✓ Network Connected"
    echo "   ✓ IP Address: $IP"
else
    echo "   ✗ Network NOT connected"
fi
echo ""

# Check Configuration Files
echo "⚙️  CONFIGURATION FILES:"
for config_file in wifi.json server.json database.json constants.json; do
    if [ -f "$CONFIG_DIR/$config_file" ]; then
        echo "   ✓ $config_file exists"
    else
        echo "   ✗ $config_file MISSING"
    fi
done
echo ""

# Check ESP32 Connection
echo "🔌 ESP32 DEVICE:"
if [ -e /dev/ttyUSB1 ]; then
    echo "   ✓ ESP32 detected at /dev/ttyUSB1"
    ls -lah /dev/ttyUSB1 | awk '{print "   ✓ Permissions:", $1, $3, $4}'
else
    echo "   ✗ ESP32 NOT detected (/dev/ttyUSB1 not found)"
    if lsusb | grep -i "10c4:ea60" > /dev/null; then
        echo "   ⚠ USB device detected but driver not loaded"
        echo "   → Run: echo '10c4 ea60' | sudo tee /sys/bus/usb-serial/drivers/generic/new_id"
    fi
fi
echo ""

# Check PlatformIO
echo "🔧 PLATFORMIO:"
if command -v pio &> /dev/null; then
    echo "   ✓ PlatformIO CLI installed"
    if [ -f "$ESP32_DIR/.pio/build/esp32dev/firmware.bin" ]; then
        SIZE=$(du -h "$ESP32_DIR/.pio/build/esp32dev/firmware.bin" | awk '{print $1}')
        echo "   ✓ Firmware compiled: $SIZE"
    else
        echo "   ⚠ Firmware NOT compiled"
        echo "   → Run: cd $ESP32_DIR && pio run"
    fi
else
    echo "   ✗ PlatformIO CLI NOT installed"
    echo "   → Run: pip install platformio"
fi
echo ""

# Summary
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║                         NEXT STEPS                                ║"
echo "╠═══════════════════════════════════════════════════════════════════╣"

if [ ! -d "$BACKEND_DIR/node_modules" ]; then
    echo "║  1. Setup backend: ./scripts/setup-backend.sh                    ║"
elif ! pgrep -x mongod > /dev/null && ! docker ps | grep -q fuel-mongodb; then
    echo "║  1. Start MongoDB: mongod OR docker compose up -d                ║"
    echo "║  2. Start backend: ./scripts/start-server.sh                     ║"
elif ! curl -s "http://${BACKEND_URL}/health" > /dev/null 2>&1; then
    echo "║  1. Start backend: ./scripts/start-server.sh                     ║"
    echo "║  2. Upload ESP32: ./scripts/upload-esp32.sh                      ║"
elif [ ! -e /dev/ttyUSB1 ]; then
    echo "║  1. Connect ESP32 via USB                                         ║"
    echo "║  2. Upload firmware: ./scripts/upload-esp32.sh                   ║"
else
    echo "║  ✓ System ready!                                                  ║"
    echo "║  1. Start backend: ./scripts/start-server.sh                     ║"
    echo "║  2. Upload ESP32: ./scripts/upload-esp32.sh                      ║"
    echo "║  3. Monitor ESP32: ./scripts/monitor-esp32.sh                    ║"
fi

echo "╚═══════════════════════════════════════════════════════════════════╝"

#!/bin/bash

# ESP32 Serial Monitor Script
# Run from repository root

# Get the repository root directory
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ESP32_DIR="$REPO_ROOT/esp32"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║           ESP32 SERIAL MONITOR - LIVE OUTPUT                   ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║  Press Ctrl+C to exit                                          ║"
echo "║  You should see:                                               ║"
echo "║  - WiFi connection status                                      ║"
echo "║  - ESP32 IP address                                            ║"
echo "║  - RFID card detection                                         ║"
echo "║  - API calls to backend                                        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
sleep 2

cd "$ESP32_DIR"
platformio device monitor --baud 115200 --port /dev/ttyUSB1

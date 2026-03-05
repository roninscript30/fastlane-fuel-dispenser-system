#!/bin/bash

# ESP32 Upload Script - Fast Lane Fuel System
# Run from repository root

set -e

# Get the repository root directory
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ESP32_DIR="$REPO_ROOT/esp32"
CONFIG_DIR="$REPO_ROOT/config"

# Load WiFi config
if [ -f "$CONFIG_DIR/wifi.json" ]; then
    WIFI_SSID=$(grep -o '"ssid": *"[^"]*"' "$CONFIG_DIR/wifi.json" | cut -d'"' -f4)
else
    WIFI_SSID="(see config/wifi.json)"
fi

# Load server config
if [ -f "$CONFIG_DIR/server.json" ]; then
    BACKEND_URL=$(grep -o '"url": *"[^"]*"' "$CONFIG_DIR/server.json" | grep backend | cut -d'"' -f4)
else
    BACKEND_URL="(see config/server.json)"
fi

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║          ESP32 FUEL DISPENSER - UPLOAD SCRIPT                  ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║  Configuration:                                                 ║"
echo "║  WiFi SSID: $WIFI_SSID"
echo "║  Backend URL: $BACKEND_URL"
echo "║  Device Port: /dev/ttyUSB1                                     ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║  MANUAL BOOTLOADER MODE PROCEDURE:                             ║"
echo "║                                                                 ║"
echo "║  1. Locate BOOT button on ESP32 (usually near USB)            ║"
echo "║  2. Press and HOLD the BOOT button                            ║"
echo "║  3. While holding BOOT, briefly press EN/RST button           ║"
echo "║  4. Release EN/RST (keep holding BOOT for 2 seconds)          ║"
echo "║  5. Release BOOT button                                        ║"
echo "║                                                                 ║"
echo "║  ESP32 will show a dim LED - it's now in bootloader mode!     ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Press ENTER after ESP32 is in bootloader mode..."
read

echo ""
echo "🔄 Starting upload now..."
sleep 1

cd "$ESP32_DIR"
platformio run --target upload

if [ $? -eq 0 ]; then
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                   ✓ UPLOAD SUCCESSFUL! ✓                       ║"
    echo "╠════════════════════════════════════════════════════════════════╣"
    echo "║  Next steps:                                                   ║"
    echo "║  1. ESP32 will restart automatically                           ║"
    echo "║  2. It will connect to WiFi: $WIFI_SSID"
    echo "║  3. Check serial monitor: ./scripts/monitor-esp32.sh           ║"
    echo "║  4. Access web dashboard at ESP32's IP address                ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Run this command to see ESP32 output:"
    echo "  $REPO_ROOT/scripts/monitor-esp32.sh"
else
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                   ✗ UPLOAD FAILED ✗                            ║"
    echo "╠════════════════════════════════════════════════════════════════╣"
    echo "║  Troubleshooting:                                              ║"
    echo "║  1. Make sure ESP32 was in bootloader mode BEFORE upload       ║"
    echo "║  2. Check USB cable connection                                 ║"
    echo "║  3. Try: sudo chmod 666 /dev/ttyUSB0                          ║"
    echo "║  4. Install driver: sudo pacman -S linux-headers && reboot    ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
fi

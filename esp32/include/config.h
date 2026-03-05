#pragma once

// ============================================
// CONFIGURATION - Fast Lane Fuel Dispenser
// ============================================
// 
// Main configuration values are now centralized in ../config/ directory:
//   - wifi.json: WiFi credentials
//   - server.json: Backend and ESP32 IP/URL settings
//   - database.json: MongoDB configuration (for backend)
//   - constants.json: RFID admin tag, fuel rates, hardware pins
//
// Update those JSON files to change system-wide settings.
// Hard-coded values below are kept for firmware compilation.
// ============================================

// Backend URL - Update this or read from ../config/server.json
// Example: "http://192.168.0.102:3000"
#define BASE_URL "http://192.168.1.100:3000"

// WiFi credentials - Update these or read from ../config/wifi.json
#define WIFI_SSID "YourWiFiSSID"
#define WIFI_PASS "YourWiFiPassword"

// Hardware pins - Defined in ../config/constants.json
#define RST_PIN 22
#define SS_PIN 21
#define RELAY_PIN 25
#define RELAY_ACTIVE_LOW false  // Transistor logic: false = active HIGH

// Fuel settings - Defined in ../config/constants.json
#define PETROL_RATE_RUPEES_PER_LITRE 100.0f
#define SECONDS_PER_LITRE 15.0f

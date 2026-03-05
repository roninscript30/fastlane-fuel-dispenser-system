// Fast Lane Fuel Dispenser - RFID (RC522) + Relay + Web Dashboard
// Backend Integration + Manual UID Entry + Enhanced UI + Frontend Login
// Connects to Node.js backend for user management and transaction history

#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include "config.h"  // Include configuration file

// **ADMIN RFID TAG - Special handling, NO fuel dispensing**
const String ADMIN_RFID_UID = "ABCD1234";

MFRC522 mfrc522(SS_PIN, RST_PIN);

WebServer server(80);
Preferences prefs;

// STATE
String lastUID = "";
String lastUserName = "";
String lastMode = "IDLE";  // IDLE, ADMIN, USER, UNKNOWN
float lastBalance = 0.0;
bool motorRunning = false;
unsigned long motorEndMillis = 0;
float pendingDispenseAmount = 0.0;
String dispensingUID = "";
String lastMessage = "Ready";

// RFID Card Presence Timeout
unsigned long lastCardDetectionTime = 0;
const unsigned long CARD_TIMEOUT_MS = 3000;  // Reset UID after 3 seconds of no card

// Convert RFID UID to String (UPPERCASE for consistency)
String uidToString(MFRC522::Uid &uid) {
  String s = "";
  for (byte i = 0; i < uid.size; i++) {
    if (uid.uidByte[i] < 0x10) s += "0";
    s += String(uid.uidByte[i], HEX);
  }
  s.toUpperCase();  // Ensure uppercase for admin detection
  return s;
}

void relayWrite(bool on) {
  if (RELAY_ACTIVE_LOW) {
    if (on) {
      digitalWrite(RELAY_PIN, LOW);   // Full ON
      Serial.println("Relay: ON (LOW)");
    } else {
      digitalWrite(RELAY_PIN, HIGH);  // Force OFF
      pinMode(RELAY_PIN, OUTPUT);     // Re-initialize
      digitalWrite(RELAY_PIN, HIGH);  // Double write
      Serial.println("Relay: OFF (HIGH) - FORCED");
    }
  } else {
    digitalWrite(RELAY_PIN, on ? HIGH : LOW);
    Serial.print("Relay: ");
    Serial.println(on ? "ON (HIGH)" : "OFF (LOW)");
  }
}

// Local balance storage helpers
String balanceKeyForUID(const String &uid) { return "B_" + uid; }

float getBalanceForUID(const String &uid) {
  if (uid.length() == 0) return 0.0;
  return prefs.getString(balanceKeyForUID(uid).c_str(), "0").toFloat();
}

void setBalanceForUID(const String &uid, float amount) {
  if (uid.length() == 0) return;
  prefs.putString(balanceKeyForUID(uid).c_str(), String(amount, 2));
}

// ========== BACKEND API FUNCTIONS ==========
bool httpGET(const String &url, String &response) {
  if (WiFi.status() != WL_CONNECTED) return false;
  
  HTTPClient http;
  http.begin(url);
  http.setTimeout(5000);
  int code = http.GET();
  
  if (code > 0) {
    response = http.getString();
    http.end();
    return true;
  }
  
  http.end();
  return false;
}

bool httpPOST(const String &url, const String &payload, String &response) {
  if (WiFi.status() != WL_CONNECTED) return false;
  
  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000);
  int code = http.POST(payload);
  
  if (code > 0) {
    response = http.getString();
    http.end();
    return true;
  }
  
  http.end();
  return false;
}

// Fetch user from backend by RFID
bool fetchUserByRFID(const String &rfid) {
  String url = String(BASE_URL) + "/api/users/by-rfid/" + rfid;
  String response;
  
  if (!httpGET(url, response)) {
    Serial.println("Failed to fetch user from backend");
    return false;
  }
  
  StaticJsonDocument<512> doc;
  DeserializationError err = deserializeJson(doc, response);
  
  if (err) {
    Serial.print("JSON parse error: ");
    Serial.println(err.c_str());
    return false;
  }
  
  if (doc.containsKey("balance")) {
    lastBalance = doc["balance"] | 0.0;
    lastUserName = doc["name"] | String("Unknown");
    lastMessage = "User found: " + lastUserName;
    Serial.printf("User: %s, Balance: ₹%.2f\n", lastUserName.c_str(), lastBalance);
    return true;
  }
  
  return false;
}

// Top-up balance via backend
bool backendTopup(const String &rfid, float amount) {
  String url = String(BASE_URL) + "/api/users/topup";
  
  StaticJsonDocument<256> payload;
  payload["rfid_uid"] = rfid;
  payload["amount"] = amount;
  
  String body;
  serializeJson(payload, body);
  
  String response;
  if (!httpPOST(url, body, response)) {
    Serial.println("Top-up request failed");
    return false;
  }
  
  StaticJsonDocument<512> doc;
  DeserializationError err = deserializeJson(doc, response);
  
  if (err) {
    Serial.print("JSON parse error: ");
    Serial.println(err.c_str());
    return false;
  }
  
  if (doc["success"] | false) {
    lastBalance = doc["newBalance"] | lastBalance;
    Serial.printf("Top-up successful! New balance: ₹%.2f\n", lastBalance);
    return true;
  }
  
  return false;
}

// Record dispense transaction via backend
bool backendDispense(const String &rfid, float volume, float amount) {
  String url = String(BASE_URL) + "/api/dispense";
  
  StaticJsonDocument<256> payload;
  payload["rfid_uid"] = rfid;
  payload["volume_litre"] = volume;
  payload["amount"] = amount;
  payload["fuel_type"] = "petrol";
  
  String body;
  serializeJson(payload, body);
  
  String response;
  if (!httpPOST(url, body, response)) {
    Serial.println("Dispense recording failed");
    return false;
  }
  
  StaticJsonDocument<512> doc;
  DeserializationError err = deserializeJson(doc, response);
  
  if (err) {
    Serial.print("JSON parse error: ");
    Serial.println(err.c_str());
    return false;
  }
  
  if (doc["success"] | false) {
    lastBalance = doc["newBalance"] | lastBalance;
    Serial.printf("Dispense recorded! New balance: ₹%.2f\n", lastBalance);
    return true;
  }
  
  return false;
}

// ========= BACKEND HANDLERS =========
// ESP32 now serves JSON API only - HTML frontend served by backend

// Manual UID handler - Fetch from backend
void handleSetUID() {
  // Enable CORS
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  
  String body = server.arg("plain");
  StaticJsonDocument<256> doc;
  DeserializationError err = deserializeJson(doc, body);
  
  if (err) {
    server.send(400, "application/json", "{\"ok\":false,\"msg\":\"Invalid JSON\"}");
    return;
  }

  String uid = doc["uid"] | "";
  if (uid.length() == 0) {
    server.send(400, "application/json", "{\"ok\":false,\"msg\":\"Invalid UID\"}");
    return;
  }

  uid.toUpperCase();  // Convert to uppercase
  lastUID = uid;      // Store the UID
  lastCardDetectionTime = millis();  // IMPORTANT: Update detection time to prevent timeout reset
  
  // Check if balance and name are provided (from frontend)
  if (doc.containsKey("balance") && doc.containsKey("name")) {
    lastBalance = doc["balance"] | 0.0;
    lastUserName = doc["name"] | String("Unknown");
    lastMode = "USER";
    Serial.printf("✅ User set from frontend: %s | Balance: ₹%.2f\n", lastUserName.c_str(), lastBalance);
    server.send(200, "application/json", "{\"ok\":true,\"msg\":\"User loaded from frontend\"}");
    return;
  }
  
  // Fetch user from backend database
  if (fetchUserByRFID(uid)) {
    lastMode = "USER";
    Serial.printf("✅ User loaded from backend: %s | Balance: ₹%.2f\n", lastUserName.c_str(), lastBalance);
    server.send(200, "application/json", "{\"ok\":true,\"msg\":\"User loaded from database\"}");
  } else {
    // Fallback to local storage
    lastMode = "UNKNOWN";
    lastBalance = getBalanceForUID(uid);
    lastUserName = "Unknown";
    Serial.println("⚠️ Backend fetch failed, using local storage");
    server.send(200, "application/json", "{\"ok\":true,\"msg\":\"UID set (offline mode)\"}");
  }
}

// ROOT PAGE - Redirect to backend landing page
void handleRoot() {
  // Enable CORS
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  
  String json = "{";
  json += "\"status\":\"ok\",";
  json += "\"device\":\"ESP32 Fuel Dispenser\",";
  json += "\"message\":\"API Only - Frontend served by backend\",";
  json += "\"redirect\":\"http://192.168.1.100:3000/\",";
  json += "\"endpoints\":{";
  json += "\"status\":\"/status\",";
  json += "\"start\":\"/start\",";
  json += "\"stop\":\"/stop\",";
  json += "\"topup\":\"/topup\",";
  json += "\"setuid\":\"/setuid\"";

  json += "}";
  json += "}";
  
  server.send(200, "application/json", json);
}

// STOP DISPENSING (EMERGENCY)
void handleStop() {
  // Enable CORS
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  
  if (!motorRunning) {
    server.send(200, "application/json", "{\"ok\":true,\"msg\":\"Motor not running\"}");
    return;
  }

  // Turn off relay immediately
  relayWrite(false);
  motorRunning = false;

  // Calculate partial dispense
  unsigned long elapsedMs = millis() - (motorEndMillis - (unsigned long)(pendingDispenseAmount / PETROL_RATE_RUPEES_PER_LITRE * SECONDS_PER_LITRE * 1000));
  float elapsedSec = elapsedMs / 1000.0;
  float dispensedLiters = elapsedSec / SECONDS_PER_LITRE;
  float dispensedAmount = dispensedLiters * PETROL_RATE_RUPEES_PER_LITRE;

  // Deduct only dispensed amount
  float bal = getBalanceForUID(dispensingUID);
  bal -= dispensedAmount;
  if (bal < 0) bal = 0;

  setBalanceForUID(dispensingUID, bal);
  if (dispensingUID == lastUID) lastBalance = bal;

  Serial.printf("Emergency stop! Dispensed: %.2f rupees, New balance: %.2f\n", dispensedAmount, bal);

  pendingDispenseAmount = 0;
  dispensingUID = "";

  server.send(200, "application/json", "{\"ok\":true,\"msg\":\"Stopped! Partial amount deducted\"}");
}

// TOP-UP BALANCE - Sync with backend database
void handleTopup() {
  // Enable CORS
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  
  String body = server.arg("plain");
  StaticJsonDocument<256> doc;
  DeserializationError err = deserializeJson(doc, body);
  
  if (err) {
    server.send(400, "application/json", "{\"ok\":false,\"msg\":\"Invalid JSON\"}");
    return;
  }

  float amount = doc["amount"] | 0.0f;

  if (lastUID.length() == 0) {
    server.send(400, "application/json", "{\"ok\":false,\"msg\":\"No card/UID set. Scan card first!\"}");
    return;
  }

  if (amount <= 0) {
    server.send(400, "application/json", "{\"ok\":false,\"msg\":\"Invalid amount\"}");
    return;
  }

  // Send top-up to backend database
  if (backendTopup(lastUID, amount)) {
    Serial.printf("✅ Top-up recorded in database: ₹%.2f | New balance: ₹%.2f\n", amount, lastBalance);
    
    // Also update local storage as backup
    setBalanceForUID(lastUID, lastBalance);
    
    String json = "{\"ok\":true,\"msg\":\"Top-up successful\",\"newBalance\":" + String(lastBalance, 2) + "}";
    server.send(200, "application/json", json);
  } else {
    // Fallback to local storage if backend fails
    float bal = getBalanceForUID(lastUID);
    bal += amount;
    setBalanceForUID(lastUID, bal);
    lastBalance = bal;
    
    Serial.printf("⚠️ Backend failed, local top-up: ₹%.2f | New balance: ₹%.2f\n", amount, bal);
    
    String json = "{\"ok\":true,\"msg\":\"Top-up saved locally\",\"newBalance\":" + String(bal, 2) + "}";
    server.send(200, "application/json", json);
  }
}

// STATUS (UPDATED - WITH ADMIN DETECTION)
void handleStatus() {
  // Enable CORS for browser access
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  
  float sec = motorRunning ? (float)(motorEndMillis - millis()) / 1000.0 : 0;
  if (sec < 0) sec = 0;

  String json = "{";
  json += "\"uid\":\"" + lastUID + "\",";
  json += "\"mode\":\"" + lastMode + "\",";  // IDLE, ADMIN, USER, UNKNOWN
  json += "\"name\":\"" + lastUserName + "\",";
  json += "\"balance\":" + String(lastBalance, 2) + ",";
  json += "\"motorRunning\":" + String(motorRunning ? "true" : "false") + ",";
  json += "\"secondsRemaining\":" + String(sec) + ",";
  json += "\"message\":\"" + String(motorRunning ? "Dispensing fuel..." : "Ready for card scan") + "\"";
  json += "}";

  server.send(200, "application/json", json);
}

// START DISPENSING (UPDATED - PREVENT ADMIN DISPENSING)
void handleStart() {
  // Enable CORS
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  
  String body = server.arg("plain");
  StaticJsonDocument<256> doc;
  DeserializationError err = deserializeJson(doc, body);
  
  if (err) {
    server.send(400, "application/json", "{\"ok\":false,\"msg\":\"Invalid JSON\"}");
    return;
  }

  float amount = doc["amount"] | 0.0f;

  if (lastUID.length() == 0) {
    server.send(400, "application/json", "{\"ok\":false,\"msg\":\"No card/UID set. Scan card first!\"}");
    return;
  }

  // **PREVENT ADMIN TAG FROM DISPENSING**
  if (lastUID == ADMIN_RFID_UID) {
    server.send(403, "application/json", "{\"ok\":false,\"msg\":\"Admin tag cannot dispense fuel!\"}");
    return;
  }

  if (motorRunning) {
    server.send(400, "application/json", "{\"ok\":false,\"msg\":\"Already dispensing!\"}");
    return;
  }

  float bal = getBalanceForUID(lastUID);
  if (bal < amount) {
    String msg = "{\"ok\":false,\"msg\":\"Insufficient balance: ₹" + String(bal, 2) + "\"}";
    server.send(400, "application/json", msg);
    return;
  }

  float liters = amount / PETROL_RATE_RUPEES_PER_LITRE;
  float sec = liters * SECONDS_PER_LITRE;

  // CONNECT RELAY POWER ROUTE
  relayWrite(true);
  
  motorRunning = true;
  pendingDispenseAmount = amount;
  dispensingUID = lastUID;
  motorEndMillis = millis() + (unsigned long)(sec * 1000);

  Serial.printf("✅ Relay power route CONNECTED\n");
  Serial.printf("Dispensing: ₹%.2f (%.2fL) for %s - Duration: %.1fs\n", 
                amount, liters, lastUID.c_str(), sec);
  
  server.send(200, "application/json", "{\"ok\":true,\"msg\":\"Power route connected! Press physical START button on pump\"}");
}

// ========= SETUP =========
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n\n=== ESP32 Fuel Dispenser ===");
  
  SPI.begin();
  mfrc522.PCD_Init();
  Serial.println("✅ MFRC522 RFID reader initialized");

  pinMode(RELAY_PIN, OUTPUT);
  relayWrite(false);  // Start with relay DISCONNECTED
  Serial.println("✅ Relay initialized (Power route: DISCONNECTED)");

  prefs.begin("balances", false);
  Serial.println("✅ Preferences storage initialized");

  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi connected!");
    Serial.print("📡 IP address: ");
    Serial.println(WiFi.localIP());
    Serial.print("🌐 Dashboard: http://");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n❌ WiFi connection failed!");
  }

  // Handle CORS preflight requests
  server.onNotFound([]() {
    if (server.method() == HTTP_OPTIONS) {
      server.sendHeader("Access-Control-Allow-Origin", "*");
      server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
      server.send(204);
    } else {
      server.send(404, "text/plain", "Not Found");
    }
  });
  
  server.on("/", handleRoot);
  server.on("/status", handleStatus);
  server.on("/setuid", HTTP_POST, handleSetUID);
  server.on("/start", HTTP_POST, handleStart);
  server.on("/stop", HTTP_POST, handleStop);  // NEW: Stop endpoint
  server.on("/topup", HTTP_POST, handleTopup);

  server.begin();
  Serial.println("✅ Web server started");
  Serial.println("\n🚀 System ready!");
  Serial.println("🔐 Login: user2025 / user2025");
  Serial.println("\n📌 RELAY LOGIC:");
  Serial.println("   - Relay OFF = Power route DISCONNECTED (motor can't start)");
  Serial.println("   - Relay ON  = Power route CONNECTED (press physical START button)");
}

// ========= LOOP =========
void loop() {
  server.handleClient();

  // Check for RFID card
  if (mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial()) {
    lastUID = uidToString(mfrc522.uid);
    lastCardDetectionTime = millis();  // Update detection timestamp
    Serial.printf("💳 Card detected: %s\n", lastUID.c_str());
    
    // **CHECK IF ADMIN TAG**
    if (lastUID == ADMIN_RFID_UID) {
      lastMode = "ADMIN";
      lastUserName = "Administrator";
      lastBalance = 0.0;  // Admin has no balance
      Serial.println("🔑 ADMIN TAG DETECTED - No dispensing allowed");
    }
    // Normal user tag - fetch from backend
    else if (fetchUserByRFID(lastUID)) {
      lastMode = "USER";
      Serial.printf("✅ User: %s | Balance: ₹%.2f (from database)\n", lastUserName.c_str(), lastBalance);
    } 
    // Unknown tag - use local storage
    else {
      lastMode = "UNKNOWN";
      lastBalance = getBalanceForUID(lastUID);
      lastUserName = "Unknown";
      Serial.printf("⚠️ Using local balance: ₹%.2f\n", lastBalance);
    }
    
    mfrc522.PICC_HaltA();
  }
  
  // Reset UID if no card detected for CARD_TIMEOUT_MS (card removed)
  // Don't reset during active dispensing to preserve user context
  if (lastUID.length() > 0 && !motorRunning) {
    if (millis() - lastCardDetectionTime > CARD_TIMEOUT_MS) {
      Serial.printf("⏱️ Card timeout - Resetting UID (was: %s)\n", lastUID.c_str());
      lastUID = "";
      lastMode = "IDLE";
      lastUserName = "";
      lastBalance = 0.0;
    }
  }

  // Check if dispensing time is complete
  if (motorRunning && millis() >= motorEndMillis) {
    // DISCONNECT RELAY POWER ROUTE
    relayWrite(false);
    motorRunning = false;

    // Deduct full amount
    float bal = getBalanceForUID(dispensingUID);
    bal -= pendingDispenseAmount;
    if (bal < 0) bal = 0;

    setBalanceForUID(dispensingUID, bal);
    if (dispensingUID == lastUID) lastBalance = bal;

    Serial.printf("✅ Dispensing complete | Amount: ₹%.2f | New balance: ₹%.2f\n", 
                  pendingDispenseAmount, bal);
    Serial.println("⚠️ Relay power route DISCONNECTED");

    pendingDispenseAmount = 0;
    dispensingUID = "";
  }
}

#!/bin/bash

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}   Configuration Checker${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}\n"

# Get current PC IP
PC_IP=$(hostname -i | awk '{print $1}')
echo -e "${BLUE}🖥️  Your PC IP Address:${NC} ${GREEN}$PC_IP${NC}\n"

# Check WiFi config
echo -e "${BLUE}📡 WiFi Configuration (config/wifi.json):${NC}"
if [ -f "$PROJECT_ROOT/config/wifi.json" ]; then
    WIFI_SSID=$(grep -o '"ssid": "[^"]*"' "$PROJECT_ROOT/config/wifi.json" | cut -d'"' -f4)
    WIFI_PASS=$(grep -o '"password": "[^"]*"' "$PROJECT_ROOT/config/wifi.json" | cut -d'"' -f4)
    
    if [ "$WIFI_SSID" == "YOUR_WIFI_NAME" ] || [ -z "$WIFI_SSID" ]; then
        echo -e "  ${RED}❌ WiFi SSID not configured!${NC}"
        echo -e "     ${YELLOW}Edit: nano config/wifi.json${NC}"
    else
        echo -e "  ${GREEN}✓ SSID:${NC} $WIFI_SSID"
    fi
    
    if [ "$WIFI_PASS" == "YOUR_WIFI_PASSWORD" ] || [ -z "$WIFI_PASS" ]; then
        echo -e "  ${RED}❌ WiFi password not configured!${NC}"
    else
        echo -e "  ${GREEN}✓ Password:${NC} ******* (set)"
    fi
else
    echo -e "  ${RED}❌ config/wifi.json not found!${NC}"
fi
echo ""

# Check server config
echo -e "${BLUE}🌐 Server Configuration (config/server.json):${NC}"
if [ -f "$PROJECT_ROOT/config/server.json" ]; then
    BACKEND_IP=$(grep -o '"ip": "[^"]*"' "$PROJECT_ROOT/config/server.json" | head -n1 | cut -d'"' -f4)
    BACKEND_PORT=$(grep -o '"port": [0-9]*' "$PROJECT_ROOT/config/server.json" | head -n1 | grep -o '[0-9]*')
    BACKEND_URL=$(grep -o '"url": "[^"]*"' "$PROJECT_ROOT/config/server.json" | head -n1 | cut -d'"' -f4)
    
    echo -e "  ${BLUE}Backend IP:${NC} $BACKEND_IP"
    echo -e "  ${BLUE}Backend Port:${NC} $BACKEND_PORT"
    echo -e "  ${BLUE}Backend URL:${NC} $BACKEND_URL"
    
    if [ "$BACKEND_IP" != "$PC_IP" ]; then
        echo -e "  ${YELLOW}⚠️  Backend IP ($BACKEND_IP) differs from current PC IP ($PC_IP)${NC}"
        echo -e "     ${YELLOW}Update with: nano config/server.json${NC}"
    else
        echo -e "  ${GREEN}✓ Backend IP matches current PC IP${NC}"
    fi
else
    echo -e "  ${RED}❌ config/server.json not found!${NC}"
fi
echo ""

# Check database config
echo -e "${BLUE}🗄️  Database Configuration (config/database.json):${NC}"
if [ -f "$PROJECT_ROOT/config/database.json" ]; then
    DB_HOST=$(grep -o '"host": "[^"]*"' "$PROJECT_ROOT/config/database.json" | cut -d'"' -f4)
    DB_PORT=$(grep -o '"port": [0-9]*' "$PROJECT_ROOT/config/database.json" | grep -o '[0-9]*')
    DB_NAME=$(grep -o '"database": "[^"]*"' "$PROJECT_ROOT/config/database.json" | cut -d'"' -f4)
    
    echo -e "  ${GREEN}✓ Host:${NC} $DB_HOST"
    echo -e "  ${GREEN}✓ Port:${NC} $DB_PORT"
    echo -e "  ${GREEN}✓ Database:${NC} $DB_NAME"
else
    echo -e "  ${RED}❌ config/database.json not found!${NC}"
fi
echo ""

# Check constants config
echo -e "${BLUE}⚙️  Constants Configuration (config/constants.json):${NC}"
if [ -f "$PROJECT_ROOT/config/constants.json" ]; then
    ADMIN_TAG=$(grep -o '"adminTag": "[^"]*"' "$PROJECT_ROOT/config/constants.json" | cut -d'"' -f4)
    PRICE=$(grep -o '"pricePerLiter": [0-9.]*' "$PROJECT_ROOT/config/constants.json" | grep -o '[0-9.]*')
    
    echo -e "  ${BLUE}Admin RFID:${NC} $ADMIN_TAG"
    echo -e "  ${BLUE}Price/Liter:${NC} \$$PRICE"
    
    if [ "$ADMIN_TAG" == "ABCD1234" ]; then
        echo -e "  ${YELLOW}⚠️  Using default admin RFID tag${NC}"
        echo -e "     ${YELLOW}Update after scanning your card${NC}"
    fi
else
    echo -e "  ${RED}❌ config/constants.json not found!${NC}"
fi
echo ""

# Check ESP32 config
echo -e "${BLUE}🔧 ESP32 Configuration (esp32/include/config.h):${NC}"
if [ -f "$PROJECT_ROOT/esp32/include/config.h" ]; then
    ESP_SSID=$(grep '#define WIFI_SSID' "$PROJECT_ROOT/esp32/include/config.h" | cut -d'"' -f2)
    ESP_BACKEND_IP=$(grep '#define BACKEND_IP' "$PROJECT_ROOT/esp32/include/config.h" | cut -d'"' -f2)
    
    if [ "$ESP_SSID" == "YOUR_WIFI_NAME" ] || [ -z "$ESP_SSID" ]; then
        echo -e "  ${RED}❌ ESP32 WiFi not configured!${NC}"
        echo -e "     ${YELLOW}Edit: nano esp32/include/config.h${NC}"
    else
        echo -e "  ${GREEN}✓ WiFi SSID:${NC} $ESP_SSID"
    fi
    
    if [ "$ESP_BACKEND_IP" != "$PC_IP" ]; then
        echo -e "  ${YELLOW}⚠️  ESP32 Backend IP ($ESP_BACKEND_IP) differs from PC IP ($PC_IP)${NC}"
        echo -e "     ${YELLOW}Update: nano esp32/include/config.h${NC}"
    else
        echo -e "  ${GREEN}✓ Backend IP matches${NC}"
    fi
else
    echo -e "  ${RED}❌ esp32/include/config.h not found!${NC}"
fi
echo ""

# Check backend .env
echo -e "${BLUE}🔐 Backend Environment (backend/.env):${NC}"
if [ -f "$PROJECT_ROOT/backend/.env" ]; then
    echo -e "  ${GREEN}✓ .env file exists${NC}"
    
    if grep -q "MONGO_URI" "$PROJECT_ROOT/backend/.env"; then
        MONGO_URI=$(grep "MONGO_URI" "$PROJECT_ROOT/backend/.env" | cut -d'=' -f2)
        echo -e "  ${GREEN}✓ MongoDB URI:${NC} $MONGO_URI"
    fi
else
    echo -e "  ${YELLOW}⚠️  .env file not found${NC}"
    if [ -f "$PROJECT_ROOT/backend/.env.example" ]; then
        echo -e "     ${YELLOW}Create: cp backend/.env.example backend/.env${NC}"
    fi
fi
echo ""

# Summary
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}   Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}\n"

echo -e "${YELLOW}⚡ Quick Fix Commands:${NC}"
echo -e "  Update WiFi:     ${BLUE}nano config/wifi.json${NC}"
echo -e "  Update Server:   ${BLUE}nano config/server.json${NC}"
echo -e "  Update ESP32:    ${BLUE}nano esp32/include/config.h${NC}"
echo -e "  Create .env:     ${BLUE}cp backend/.env.example backend/.env${NC}"
echo ""

echo -e "${YELLOW}📝 Your Current Settings:${NC}"
echo -e "  PC IP:           ${GREEN}$PC_IP${NC}"
echo -e "  Backend IP:      ${GREEN}${BACKEND_IP:-Not Set}${NC}"
echo -e "  WiFi SSID:       ${GREEN}${WIFI_SSID:-Not Set}${NC}"
echo -e "  Admin RFID:      ${GREEN}${ADMIN_TAG:-Not Set}${NC}"
echo ""

echo -e "${YELLOW}📚 Next Steps:${NC}"
echo -e "  1. Fix any ${RED}❌${NC} or ${YELLOW}⚠️${NC} issues above"
echo -e "  2. Run: ${BLUE}./scripts/setup-mongodb.sh${NC} (one-time)"
echo -e "  3. Run: ${BLUE}./scripts/start-server.sh${NC}"
echo -e "  4. Upload ESP32: ${BLUE}./scripts/upload-esp32.sh${NC}"
echo ""
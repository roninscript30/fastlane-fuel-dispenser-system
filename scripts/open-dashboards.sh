#!/bin/bash

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Get backend URL from config
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

if [ -f "$PROJECT_ROOT/config/server.json" ]; then
    BACKEND_IP=$(grep -o '"ip": "[^"]*"' "$PROJECT_ROOT/config/server.json" | head -n1 | cut -d'"' -f4)
    BACKEND_PORT=$(grep -o '"port": [0-9]*' "$PROJECT_ROOT/config/server.json" | head -n1 | grep -o '[0-9]*')
    BACKEND_URL="http://${BACKEND_IP}:${BACKEND_PORT}"
else
    BACKEND_URL="http://localhost:3000"
fi

echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}   Opening Fast Lane Dashboards${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}\n"

echo -e "${GREEN}🌐 Access Points:${NC}"
echo -e "   Landing:  ${CYAN}${BACKEND_URL}/${NC}"
echo -e "   User:     ${CYAN}${BACKEND_URL}/user${NC}"
echo -e "   Admin:    ${CYAN}${BACKEND_URL}/admin${NC}\n"

# Open in default browser
if command -v xdg-open &> /dev/null; then
    echo -e "${GREEN}Opening Landing Page...${NC}"
    xdg-open "${BACKEND_URL}/" &> /dev/null &
    sleep 1
    
    echo -e "${GREEN}Opening User Portal...${NC}"
    xdg-open "${BACKEND_URL}/user" &> /dev/null &
    sleep 1
    
    echo -e "${GREEN}Opening Admin Panel...${NC}"
    xdg-open "${BACKEND_URL}/admin" &> /dev/null &
    
    echo -e "\n${GREEN}✅ All dashboards opened in browser!${NC}\n"
else
    echo -e "${YELLOW}⚠️  xdg-open not found. Please open manually:${NC}"
    echo -e "   ${CYAN}${BACKEND_URL}/${NC}"
    echo -e "   ${CYAN}${BACKEND_URL}/user${NC}"
    echo -e "   ${CYAN}${BACKEND_URL}/admin${NC}\n"
fi

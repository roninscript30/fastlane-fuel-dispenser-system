#!/bin/bash

# Fuel Backend API Test Script
# This script tests all API endpoints

BASE_URL="http://localhost:3000"
RFID_UID="TEST_USER_$(date +%s)"

echo "================================"
echo "Fuel Backend API Testing"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

test_endpoint() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local expected_code="$5"  # Optional: specific expected status code
    
    echo -e "${BLUE}Testing: ${name}${NC}"
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" "${BASE_URL}${endpoint}")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "${BASE_URL}${endpoint}" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    # Check if a specific status code is expected
    if [ -n "$expected_code" ]; then
        if [ "$http_code" -eq "$expected_code" ]; then
            echo -e "${GREEN}✓ PASSED${NC} (HTTP $http_code - As expected)"
            echo "Response: $body"
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            echo -e "${RED}✗ FAILED${NC} (HTTP $http_code - Expected $expected_code)"
            echo "Response: $body"
            TESTS_FAILED=$((TESTS_FAILED + 1))
        fi
    # Otherwise, any 2xx status is success
    elif [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✓ PASSED${NC} (HTTP $http_code)"
        echo "Response: $body"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗ FAILED${NC} (HTTP $http_code)"
        echo "Response: $body"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    echo ""
}

# 1. Health Check
test_endpoint "Health Check" "GET" "/" ""

# 2. Create User
test_endpoint "Create User" "POST" "/api/users" \
    "{\"rfid_uid\":\"${RFID_UID}\",\"name\":\"Test User\",\"phone\":\"+1234567890\",\"car_number\":\"TEST-123\"}"

# 3. Get User by RFID
test_endpoint "Get User by RFID" "GET" "/api/users/by-rfid/${RFID_UID}" ""

# 4. Get All Users
test_endpoint "Get All Users" "GET" "/api/users?page=1&limit=5" ""

# 5. Top-up Balance
test_endpoint "Top-up Balance (1000)" "POST" "/api/users/topup" \
    "{\"rfid_uid\":\"${RFID_UID}\",\"amount\":1000}"

# 6. Successful Dispense
test_endpoint "Dispense Fuel (Success)" "POST" "/api/dispense" \
    "{\"rfid_uid\":\"${RFID_UID}\",\"volume_litre\":10.5,\"amount\":150,\"fuel_type\":\"PETROL\"}"

# 7. Get User After Dispense
test_endpoint "Get User After Dispense" "GET" "/api/users/by-rfid/${RFID_UID}" ""

# 8. Get Dispense History by User
test_endpoint "Get User Dispense History" "GET" "/api/dispense/history/by-rfid/${RFID_UID}" ""

# 9. Get All Dispense History
test_endpoint "Get All Dispense History" "GET" "/api/dispense/history?page=1&limit=5" ""

# 10. Get Dispense Stats
test_endpoint "Get Dispense Statistics" "GET" "/api/dispense/stats" ""

# 11. Get Stats for Specific User
test_endpoint "Get User Dispense Stats" "GET" "/api/dispense/stats?rfid_uid=${RFID_UID}" ""

# 12. Update User Balance
test_endpoint "Update User Balance" "PATCH" "/api/users/by-rfid/${RFID_UID}/balance" \
    "{\"balance\":2000}"

# 13. Attempt Dispense with Insufficient Balance (Expected to fail with 400)
test_endpoint "Dispense with Insufficient Balance (Should Return 400)" "POST" "/api/dispense" \
    "{\"rfid_uid\":\"${RFID_UID}\",\"volume_litre\":100,\"amount\":5000,\"fuel_type\":\"DIESEL\"}" "400"

# 14. Search Users
test_endpoint "Search Users" "GET" "/api/users?search=Test" ""

# 15. Update User Info
test_endpoint "Update User Info" "POST" "/api/users" \
    "{\"rfid_uid\":\"${RFID_UID}\",\"name\":\"Test User Updated\",\"car_number\":\"TEST-456\"}"

# 16. Delete User
test_endpoint "Delete User" "DELETE" "/api/users/by-rfid/${RFID_UID}" ""

# 17. Verify User Deleted
echo -e "${BLUE}Testing: Verify User Deleted (Should Return 404)${NC}"
response=$(curl -s -w "\n%{http_code}" -X "GET" "${BASE_URL}/api/users/by-rfid/${RFID_UID}")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 404 ]; then
    echo -e "${GREEN}✓ PASSED${NC} (HTTP $http_code - User not found as expected)"
    echo "Response: $body"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗ FAILED${NC} (HTTP $http_code - Expected 404)"
    echo "Response: $body"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# Summary
echo "================================"
echo "Test Summary"
echo "================================"
echo -e "Tests Passed: ${GREEN}${TESTS_PASSED}${NC}"
echo -e "Tests Failed: ${RED}${TESTS_FAILED}${NC}"
echo "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed!${NC}"
    exit 1
fi

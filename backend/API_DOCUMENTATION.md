# Fuel Backend API Documentation

Base URL: `http://localhost:3000`

## Table of Contents
- [Health Check](#health-check)
- [User Management](#user-management)
- [Financial Operations](#financial-operations)
- [Dispense History](#dispense-history)
- [Statistics](#statistics)

---

## Health Check

### Check API Status
```http
GET /
```

**Response:**
```json
{
  "status": "ok",
  "message": "Fuel Backend API",
  "timestamp": "2025-11-19T10:00:00.000Z",
  "database": "connected"
}
```

---

## User Management

### 1. Create or Update User
```http
POST /api/users
```

**Request Body:**
```json
{
  "rfid_uid": "ABC123",
  "phone": "+1234567890",
  "name": "John Doe",
  "car_number": "ABC-1234"
}
```

**Response (201 Created / 200 OK):**
```json
{
  "message": "User created successfully",
  "user": {
    "_id": "...",
    "rfid_uid": "ABC123",
    "phone": "+1234567890",
    "name": "John Doe",
    "car_number": "ABC-1234",
    "balance": 0,
    "total_dispenses": 0,
    "total_topups": 0,
    "createdAt": "2025-11-19T10:00:00.000Z",
    "updatedAt": "2025-11-19T10:00:00.000Z"
  }
}
```

### 2. Get User by RFID
```http
GET /api/users/by-rfid/:uid
```

**Example:**
```http
GET /api/users/by-rfid/ABC123
```

**Response (200 OK):**
```json
{
  "user": {
    "_id": "...",
    "rfid_uid": "ABC123",
    "phone": "+1234567890",
    "name": "John Doe",
    "car_number": "ABC-1234",
    "balance": 1000,
    "last_dispense": "2025-11-19T09:30:00.000Z",
    "last_dispense_volume": 10,
    "last_dispense_amount": 150,
    "last_dispense_status": "SUCCESS",
    "last_topup": "2025-11-19T08:00:00.000Z",
    "last_topup_amount": 500,
    "total_dispenses": 5,
    "total_topups": 3,
    "createdAt": "2025-11-19T10:00:00.000Z",
    "updatedAt": "2025-11-19T10:00:00.000Z"
  }
}
```

### 3. Get All Users
```http
GET /api/users?page=1&limit=10&search=john
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search term (searches in rfid_uid, name, phone, car_number)

**Response (200 OK):**
```json
{
  "users": [...],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "pages": 5
  }
}
```

### 4. Delete User
```http
DELETE /api/users/by-rfid/:uid
```

**Example:**
```http
DELETE /api/users/by-rfid/ABC123
```

**Response (200 OK):**
```json
{
  "message": "User deleted successfully",
  "user": {...}
}
```

### 5. Update User Balance (Admin)
```http
PATCH /api/users/by-rfid/:uid/balance
```

**Request Body:**
```json
{
  "balance": 1500
}
```

**Response (200 OK):**
```json
{
  "message": "Balance updated successfully",
  "user": {...}
}
```

---

## Financial Operations

### 1. Top-up Balance
```http
POST /api/users/topup
```

**Request Body:**
```json
{
  "rfid_uid": "ABC123",
  "amount": 500,
  "car_number": "ABC-1234"  // optional
}
```

**Response (200 OK):**
```json
{
  "message": "Top-up successful",
  "balance_before": 1000,
  "balance_after": 1500,
  "amount_added": 500,
  "user": {...}
}
```

**Error Responses:**
- `400 Bad Request`: Invalid input (missing rfid_uid, non-positive amount)
- `500 Internal Server Error`: Database error

### 2. Dispense Fuel
```http
POST /api/dispense
```

**Request Body:**
```json
{
  "rfid_uid": "ABC123",
  "volume_litre": 10.5,
  "amount": 150,
  "fuel_type": "PETROL",  // optional, default: "PETROL"
  "car_number": "ABC-1234"  // optional
}
```

**Response (200 OK):**
```json
{
  "message": "Dispense recorded successfully",
  "balance_before": 1500,
  "balance_after": 1350,
  "amount_deducted": 150,
  "volume_dispensed": 10.5,
  "fuel_type": "PETROL",
  "history": {
    "_id": "...",
    "rfid_uid": "ABC123",
    "volume_litre": 10.5,
    "amount": 150,
    "fuel_type": "PETROL",
    "status": "SUCCESS",
    "time": "2025-11-19T10:00:00.000Z"
  },
  "user": {...}
}
```

**Error Responses:**
- `400 Bad Request`: Invalid input, insufficient balance
- `404 Not Found`: User not found
- `500 Internal Server Error`: Database error

---

## Dispense History

### 1. Get All Dispense History
```http
GET /api/dispense/history?page=1&limit=20&status=SUCCESS&fuel_type=PETROL
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `status` (optional): Filter by status (SUCCESS/FAILED)
- `fuel_type` (optional): Filter by fuel type

**Response (200 OK):**
```json
{
  "history": [
    {
      "_id": "...",
      "rfid_uid": "ABC123",
      "volume_litre": 10.5,
      "amount": 150,
      "fuel_type": "PETROL",
      "status": "SUCCESS",
      "time": "2025-11-19T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "pages": 5
  }
}
```

### 2. Get Dispense History by User
```http
GET /api/dispense/history/by-rfid/:uid?page=1&limit=20
```

**Example:**
```http
GET /api/dispense/history/by-rfid/ABC123?page=1&limit=20
```

**Response (200 OK):**
```json
{
  "rfid_uid": "ABC123",
  "history": [...],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 20,
    "pages": 2
  }
}
```

---

## Statistics

### Get Dispense Statistics
```http
GET /api/dispense/stats?rfid_uid=ABC123
```

**Query Parameters:**
- `rfid_uid` (optional): Get stats for specific user. If omitted, returns global stats.

**Response (200 OK):**
```json
{
  "rfid_uid": "ABC123",  // only if rfid_uid parameter provided
  "overall": {
    "total_dispenses": 100,
    "successful_dispenses": 95,
    "failed_dispenses": 5,
    "total_volume": 1050.5,
    "total_amount": 15000,
    "avg_volume_per_dispense": 10.5,
    "avg_amount_per_dispense": 150
  },
  "by_fuel_type": [
    {
      "_id": "PETROL",
      "count": 80,
      "total_volume": 850,
      "total_amount": 12000
    },
    {
      "_id": "DIESEL",
      "count": 20,
      "total_volume": 200.5,
      "total_amount": 3000
    }
  ]
}
```

---

## Error Codes

### Standard Error Response Format
```json
{
  "error": "Error message description"
}
```

### HTTP Status Codes
- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid input or business logic error
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource already exists
- `500 Internal Server Error`: Server error

---

## Data Models

### User Schema
```javascript
{
  rfid_uid: String (required, unique),
  phone: String,
  name: String,
  car_number: String,
  balance: Number (default: 0),
  
  // Last dispense info
  last_dispense: Date,
  last_dispense_volume: Number,
  last_dispense_amount: Number,
  last_dispense_status: String,
  
  // Last topup info
  last_topup: Date,
  last_topup_amount: Number,
  
  // Counters
  total_dispenses: Number (default: 0),
  total_topups: Number (default: 0),
  
  createdAt: Date,
  updatedAt: Date
}
```

### DispenseHistory Schema
```javascript
{
  rfid_uid: String (required, indexed),
  volume_litre: Number (required),
  amount: Number (required),
  fuel_type: String (default: "PETROL"),
  status: String (default: "SUCCESS"),
  time: Date (default: now)
}
```

---

## Testing with cURL

### Create User
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "rfid_uid": "ABC123",
    "phone": "+1234567890",
    "name": "John Doe",
    "car_number": "ABC-1234"
  }'
```

### Top-up Balance
```bash
curl -X POST http://localhost:3000/api/users/topup \
  -H "Content-Type: application/json" \
  -d '{
    "rfid_uid": "ABC123",
    "amount": 1000
  }'
```

### Dispense Fuel
```bash
curl -X POST http://localhost:3000/api/dispense \
  -H "Content-Type: application/json" \
  -d '{
    "rfid_uid": "ABC123",
    "volume_litre": 10.5,
    "amount": 150,
    "fuel_type": "PETROL"
  }'
```

### Get User
```bash
curl http://localhost:3000/api/users/by-rfid/ABC123
```

### Get Dispense History
```bash
curl http://localhost:3000/api/dispense/history/by-rfid/ABC123
```

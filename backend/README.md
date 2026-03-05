# Fuel Backend API

A robust backend API for managing fuel dispense operations with RFID-based user authentication and balance management.

## Features

✅ **User Management**
- Create/Update users with RFID UID
- Get user details by RFID
- List all users with pagination and search
- Delete users
- Update user balance (admin)

✅ **Financial Operations**
- Top-up user balance
- Dispense fuel with automatic balance deduction
- Atomic transactions to prevent race conditions
- Failed transaction tracking

✅ **History & Analytics**
- Complete dispense history with pagination
- Per-user dispense history
- Statistics and analytics (total volume, amount, fuel types)
- Success/failure tracking

✅ **Error Handling**
- Comprehensive input validation
- Detailed error messages
- Proper HTTP status codes
- Transaction safety

## Technology Stack

- **Node.js** with Express 5
- **MongoDB** with Mongoose ODM
- **CORS** enabled
- **dotenv** for configuration

## Installation

1. Clone the repository
```bash
cd fuel-backend
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
```

Edit `.env` file:
```env
PORT=3000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/fuel-dispenser
```

4. Make sure MongoDB is running
```bash
# On Linux
sudo systemctl start mongod

# Or using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

5. Start the server
```bash
# Production
npm start

# Development (with auto-reload)
npm run dev
```

## Project Structure

```
fuel-backend/
├── server.js                    # Main application entry point
├── package.json                 # Dependencies and scripts
├── .env.example                 # Environment variables template
├── API_DOCUMENTATION.md         # Complete API documentation
├── controllers/
│   ├── userController.js        # User management logic
│   └── financeController.js     # Financial operations logic
├── models/
│   ├── user.js                  # User schema
│   └── dispense_histories.js    # Dispense history schema
├── routes/
│   ├── userRoutes.js            # User API routes
│   └── dispenseRoutes.js        # Dispense API routes
└── utils/
    └── db.js                    # Database utilities
```

## Database Collections

### users
Stores user information and current balance:
- `rfid_uid` - Unique RFID identifier
- `phone`, `name`, `car_number` - User details
- `balance` - Current account balance
- `last_dispense_*` - Latest dispense information
- `last_topup_*` - Latest top-up information
- `total_dispenses`, `total_topups` - Transaction counters

### dispense_histories
Complete transaction history:
- `rfid_uid` - User identifier
- `volume_litre` - Amount of fuel dispensed
- `amount` - Cost of transaction
- `fuel_type` - Type of fuel (PETROL, DIESEL, etc.)
- `status` - SUCCESS or FAILED
- `time` - Transaction timestamp

## Quick Start Examples

### Create a User
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"rfid_uid":"ABC123","name":"John Doe","phone":"+1234567890"}'
```

### Top-up Balance
```bash
curl -X POST http://localhost:3000/api/users/topup \
  -H "Content-Type: application/json" \
  -d '{"rfid_uid":"ABC123","amount":1000}'
```

### Dispense Fuel
```bash
curl -X POST http://localhost:3000/api/dispense \
  -H "Content-Type: application/json" \
  -d '{"rfid_uid":"ABC123","volume_litre":10.5,"amount":150}'
```

### Get User Details
```bash
curl http://localhost:3000/api/users/by-rfid/ABC123
```

## API Endpoints

For complete API documentation, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

### User Management
- `POST /api/users` - Create/update user
- `GET /api/users` - Get all users (paginated)
- `GET /api/users/by-rfid/:uid` - Get user by RFID
- `DELETE /api/users/by-rfid/:uid` - Delete user
- `PATCH /api/users/by-rfid/:uid/balance` - Update balance

### Financial Operations
- `POST /api/users/topup` - Top-up balance
- `POST /api/dispense` - Dispense fuel

### History & Statistics
- `GET /api/dispense/history` - Get all dispense history
- `GET /api/dispense/history/by-rfid/:uid` - Get user's dispense history
- `GET /api/dispense/stats` - Get dispense statistics

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error message description"
}
```

HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors, insufficient balance)
- `404` - Not Found
- `409` - Conflict (duplicate RFID)
- `500` - Internal Server Error

## Features & Improvements

### Security
- Input validation on all endpoints
- Atomic database operations to prevent race conditions
- Proper error handling without exposing sensitive data

### Performance
- MongoDB indexes on frequently queried fields
- Pagination support for large datasets
- Efficient aggregation queries for statistics

### Reliability
- Transaction safety with atomic operations
- Failed transaction tracking
- Database connection management
- Graceful shutdown handling

## Development

### Start in Development Mode
```bash
npm run dev
```

This uses Node's `--watch` flag to automatically restart on file changes.

### Database Connection
The server will automatically connect to MongoDB using the `MONGO_URI` from `.env`. If the connection fails, the server will exit with an error message.

## Troubleshooting

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Check connection
mongosh mongodb://localhost:27017/fuel-backend
```

### Port Already in Use
```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

## License

ISC

## Author

Your Name / Organization

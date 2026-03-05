# ESP32 Firmware - Fast Lane Fuel Dispenser

## Overview
This directory contains the ESP32 firmware for the fuel dispensing system with RFID authentication.

## Hardware Components
- **ESP32 Dev Board**
- **MFRC522 RFID Reader** (RC522 module)
- **Relay Module** (for pump control)
- **LED indicators** (optional)

## Pin Configuration
See `include/config.h` for pin definitions:
- RST_PIN: 22
- SS_PIN: 21
- RELAY_PIN: 25

## Configuration
Update the following in `../config/`:
- `wifi.json` - WiFi credentials
- `server.json` - Backend server URL and ESP32 IP
- `constants.json` - RFID admin tag, fuel rates, hardware pins

## Building and Uploading
```bash
# Install PlatformIO (if not already installed)
pip install platformio

# Build the firmware
pio run

# Upload to ESP32
pio run --target upload

# Monitor serial output
pio device monitor
```

## Quick Upload (using script)
```bash
cd ..
./scripts/upload-esp32.sh
```

## Features
- RFID card authentication (MFRC522)
- Backend integration for user management
- Real-time balance checking
- Fuel dispensing control via relay
- Web API for frontend integration
- Offline mode with local balance storage
- Admin card detection (no dispensing)

## API Endpoints
- `GET /` - Device info and API documentation
- `GET /status` - Current device status
- `POST /setuid` - Set user by RFID UID
- `POST /start` - Start fuel dispensing
- `POST /stop` - Emergency stop
- `POST /topup` - Top-up user balance

## Troubleshooting
- **WiFi not connecting**: Check credentials in `../config/wifi.json`
- **Backend connection failed**: Verify backend URL in `../config/server.json`
- **Relay not working**: Check pin configuration and relay type (active HIGH/LOW)
- **RFID not reading**: Verify SPI pin connections

## Admin RFID Tag
The admin tag is defined in `../config/constants.json`. This tag is used for management access but cannot dispense fuel.

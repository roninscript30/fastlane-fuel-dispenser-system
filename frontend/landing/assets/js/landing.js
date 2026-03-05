// Fast Lane Fuel Dispenser - Landing Page
// Handles RFID scanning and routing to User or Admin dashboard

const ESP32_IP = 'http://192.168.1.247';
const BACKEND_URL = 'http://192.168.1.100:3000';
const ADMIN_RFID_UID = 'ABCD1234';

let scanInterval = null;
let isScanning = false;
let lastScannedUID = '';

// DOM Elements
const scannerCard = document.getElementById('scannerCard');
const scanButton = document.getElementById('scanButton');
const stopButton = document.getElementById('stopButton');
const uidValue = document.getElementById('uidValue');
const scannerStatus = document.getElementById('scannerStatus');
const alertBox = document.getElementById('alertBox');
const alertMessage = document.getElementById('alertMessage');

// Start scanning for RFID cards
function startScanning() {
    if (isScanning) return;

    isScanning = true;
    lastScannedUID = '';
    
    // Update UI
    scannerCard.classList.add('scanning');
    scanButton.style.display = 'none';
    stopButton.style.display = 'flex';
    updateStatus('🔍 Scanning for cards...', 'info');
    
    // Poll ESP32 status every 800ms
    scanInterval = setInterval(async () => {
        try {
            const response = await fetch(`${ESP32_IP}/status`);
            const data = await response.json();
            
            // Reset lastScannedUID when card is removed (empty UID from ESP32)
            if (!data.uid || data.uid === '-' || data.uid === '') {
                lastScannedUID = '';
                return;
            }
            
            // Check if a NEW card is detected
            if (data.uid !== lastScannedUID) {
                lastScannedUID = data.uid;
                uidValue.textContent = data.uid;
                
                // Check if admin tag
                if (data.uid === ADMIN_RFID_UID || data.mode === 'ADMIN') {
                    await handleAdminLogin(data.uid);
                } else {
                    await handleUserLogin(data.uid);
                }
            }
        } catch (error) {
            console.error('Error scanning:', error);
            showAlert('Cannot connect to ESP32 device', 'error');
        }
    }, 800);
}

// Stop scanning
function stopScanning() {
    isScanning = false;
    clearInterval(scanInterval);
    
    // Reset UI
    scannerCard.classList.remove('scanning');
    scanButton.style.display = 'flex';
    stopButton.style.display = 'none';
    uidValue.textContent = '-';
    updateStatus('Waiting for card...', 'idle');
    hideAlert();
}

// Handle Admin RFID tag detection
async function handleAdminLogin(uid) {
    console.log('Admin tag detected:', uid);
    stopScanning();
    
    updateStatus('✅ Admin tag detected', 'success');
    showAlert('Admin access granted. Redirecting...', 'success');
    
    // Set admin session
    sessionStorage.setItem('isAdmin', 'true');
    sessionStorage.setItem('adminUID', uid);
    sessionStorage.setItem('loginTime', new Date().toISOString());
    
    // Redirect to admin panel after brief delay
    setTimeout(() => {
        window.location.href = '/admin';
    }, 1500);
}

// Handle normal user RFID tag detection
async function handleUserLogin(uid) {
    console.log('User tag detected:', uid);
    stopScanning();
    
    updateStatus('🔍 Checking user...', 'info');
    
    try {
        // Check if user exists in backend
        const response = await fetch(`${BACKEND_URL}/api/users/by-rfid/${uid}`);
        
        if (response.ok) {
            const user = await response.json();
            
            // User found
            updateStatus(`✅ Welcome ${user.name}`, 'success');
            showAlert(`User verified: ${user.name}`, 'success');
            
            // Set user session
            sessionStorage.setItem('isUser', 'true');
            sessionStorage.setItem('userUID', uid);
            sessionStorage.setItem('userName', user.name);
            sessionStorage.setItem('userBalance', user.balance);
            sessionStorage.setItem('loginTime', new Date().toISOString());
            
            // Redirect to user dashboard
            setTimeout(() => {
                window.location.href = `/user?uid=${uid}`;
            }, 1500);
            
        } else if (response.status === 404) {
            // User not found
            updateStatus('❌ Card not registered', 'error');
            showAlert('This card is not registered. Please contact admin.', 'error');
            
            // Reset after delay
            setTimeout(() => {
                lastScannedUID = '';
                uidValue.textContent = '-';
                startScanning();
            }, 3000);
        } else {
            throw new Error('Backend error');
        }
        
    } catch (error) {
        console.error('Error verifying user:', error);
        showAlert('Error connecting to server. Using offline mode.', 'warning');
        
        // Fallback to user dashboard with offline mode
        setTimeout(() => {
            sessionStorage.setItem('isUser', 'true');
            sessionStorage.setItem('userUID', uid);
            sessionStorage.setItem('offlineMode', 'true');
            window.location.href = `/user?uid=${uid}`;
        }, 2000);
    }
}

// Update scanner status text
function updateStatus(text, type) {
    const statusElement = scannerStatus.querySelector('span:last-child');
    if (statusElement) {
        statusElement.textContent = text;
    }
    
    // Update status pill styling based on type
    scannerStatus.className = 'status-pill';
    if (type === 'success') {
        scannerStatus.classList.add('status-success');
    } else if (type === 'error') {
        scannerStatus.classList.add('status-error');
    } else if (type === 'info') {
        scannerStatus.classList.add('status-scanning');
    } else {
        scannerStatus.classList.add('status-idle');
    }
}

// Show alert message
function showAlert(message, type = 'info') {
    alertMessage.textContent = message;
    const alertIcon = document.getElementById('alertIcon');
    
    // Update icon based on type
    if (type === 'error') {
        alertIcon.className = 'bi bi-x-circle-fill text-xl flex-shrink-0 text-red-400';
    } else if (type === 'warning') {
        alertIcon.className = 'bi bi-exclamation-triangle-fill text-xl flex-shrink-0 text-amber-400';
    } else if (type === 'success') {
        alertIcon.className = 'bi bi-check-circle-fill text-xl flex-shrink-0 text-emerald-400';
    } else {
        alertIcon.className = 'bi bi-info-circle-fill text-xl flex-shrink-0 text-blue-400';
    }
    
    alertBox.style.display = 'block';
}

// Hide alert message
function hideAlert() {
    alertBox.style.display = 'none';
}

// Check if user is already logged in
window.addEventListener('DOMContentLoaded', () => {
    // Clear any old sessions on landing page load
    sessionStorage.clear();
    
    console.log('Fast Lane Fuel Dispenser - Landing Page Ready');
    console.log('ESP32 IP:', ESP32_IP);
    console.log('Backend URL:', BACKEND_URL);
});

// Prevent back navigation to landing if logged in
window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        // Page loaded from cache (back button)
        sessionStorage.clear();
    }
});

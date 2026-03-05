// Fast Lane Fuel Dispenser - User Dashboard
// Handles fuel dispensing for authenticated users

const ESP32_IP = 'http://192.168.1.247';
const BACKEND_URL = 'http://192.168.1.100:3000';
const PETROL_RATE = 100.0; // ₹100 per liter
const SECONDS_PER_LITER = 15.0;

let userUID = '';
let userName = '';
let userBalance = 0;
let isDispensing = false;
let refreshInterval = null;
let countdownInterval = null;

// DOM Elements
const userNameEl = document.getElementById('userName');
const userUIDEl = document.getElementById('userUID');
const balanceEl = document.getElementById('balance');
const balanceStatusEl = document.getElementById('balanceStatus');
const amountInput = document.getElementById('amount');
const fuelAmountEl = document.getElementById('fuelAmount');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const dispenseStatus = document.getElementById('dispenseStatus');
const dispenseCard = document.getElementById('dispenseCard');
const remainingTimeEl = document.getElementById('remainingTime');
const dispensingAmountEl = document.getElementById('dispensingAmount');
const dispensingVolumeEl = document.getElementById('dispensingVolume');
const progressCircle = document.getElementById('progressCircle');
const activityList = document.getElementById('activityList');
const alertBox = document.getElementById('alertBox');
const alertMessage = document.getElementById('alertMessage');

// Initialize dashboard
window.addEventListener('DOMContentLoaded', async () => {
    // Check if user is logged in
    if (!sessionStorage.getItem('isUser')) {
        showAlert('Session expired. Please scan your card again.', 'error');
        setTimeout(() => {
            window.location.href = '/';
        }, 2000);
        return;
    }

    // Get user data from session
    userUID = sessionStorage.getItem('userUID');
    userName = sessionStorage.getItem('userName') || 'User';
    userBalance = parseFloat(sessionStorage.getItem('userBalance')) || 0;

    // Display user info
    userNameEl.textContent = userName;
    userUIDEl.textContent = `UID: ${userUID}`;
    updateBalance(userBalance);

    // Set UID on ESP32 and keep it active
    await setUIDOnESP32(userUID);

    // Fetch latest data from backend
    await refreshUserData();

    // Load recent activity
    await loadRecentActivity();

    // Start auto-refresh every 5 seconds (keep UID alive on ESP32)
    refreshInterval = setInterval(async () => {
        await refreshUserData();
        // Keep UID alive on ESP32 (refresh before 3 second timeout)
        if (!isDispensing) {
            await setUIDOnESP32(userUID);
        }
    }, 2500);

    console.log('User Dashboard Ready');
    console.log('UID:', userUID);
    console.log('Balance:', userBalance);
});

// Set UID on ESP32 before dispensing
async function setUIDOnESP32(uid) {
    try {
        const payload = { 
            uid: uid,
            balance: userBalance,
            name: userName
        };
        console.log('Sending to ESP32:', payload);
        
        const response = await fetch(`${ESP32_IP}/setuid`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('UID set on ESP32:', result);
            return true;
        } else {
            console.error('Failed to set UID on ESP32');
            return false;
        }
    } catch (error) {
        console.error('Error setting UID on ESP32:', error);
        return false;
    }
}

// Refresh user data from backend/ESP32
async function refreshUserData() {
    try {
        // Try backend first
        const response = await fetch(`${BACKEND_URL}/api/users/by-rfid/${userUID}`);
        
        if (response.ok) {
            const user = await response.json();
            userBalance = user.balance;
            updateBalance(userBalance);
            sessionStorage.setItem('userBalance', userBalance);
        } else {
            // Fallback to ESP32
            const esp32Response = await fetch(`${ESP32_IP}/status`);
            const data = await esp32Response.json();
            
            if (data.uid === userUID && data.balance) {
                userBalance = data.balance;
                updateBalance(userBalance);
            }
        }
    } catch (error) {
        console.error('Error refreshing data:', error);
    }
}

// Update balance display
function updateBalance(balance) {
    balanceEl.textContent = `₹${balance.toFixed(2)}`;
    
    // Update status indicator - new HTML structure
    const indicator = balanceStatusEl.querySelector('span:first-child');
    const statusText = balanceStatusEl.querySelector('span:last-child');
    
    if (balance < 50) {
        indicator.className = 'w-2 h-2 bg-red-400 rounded-full';
        statusText.className = 'text-red-400 font-medium text-sm';
        statusText.textContent = 'Low balance';
    } else if (balance < 200) {
        indicator.className = 'w-2 h-2 bg-amber-400 rounded-full';
        statusText.className = 'text-amber-400 font-medium text-sm';
        statusText.textContent = 'Recharge soon';
    } else {
        indicator.className = 'w-2 h-2 bg-emerald-400 rounded-full';
        statusText.className = 'text-emerald-400 font-medium text-sm';
        statusText.textContent = 'Active';
    }
}

// Calculate fuel amount based on input
function calculateFuel() {
    const amount = parseFloat(amountInput.value) || 0;
    
    if (amount > 0) {
        const liters = amount / PETROL_RATE;
        const seconds = liters * SECONDS_PER_LITER;
        
        fuelAmountEl.textContent = `${liters.toFixed(2)} Liters • ${Math.ceil(seconds)} seconds`;
        
        // Enable/disable start button
        if (amount <= userBalance) {
            startButton.disabled = false;
            fuelInfo.className = 'flex items-center gap-2 mt-3 text-sm text-emerald-400';
        } else {
            startButton.disabled = true;
            fuelAmountEl.textContent = `Insufficient balance (need ₹${amount.toFixed(2)})`;
            fuelInfo.className = 'flex items-center gap-2 mt-3 text-sm text-red-400';
        }
    } else {
        fuelAmountEl.textContent = 'Enter amount to calculate fuel';
        startButton.disabled = true;
        fuelInfo.className = 'flex items-center gap-2 mt-3 text-sm text-slate-400';
    }
}

// Start fuel dispensing
async function startDispense() {
    const amount = parseFloat(amountInput.value);
    
    if (!amount || amount <= 0) {
        showAlert('Please enter a valid amount', 'error');
        return;
    }
    
    if (amount > userBalance) {
        showAlert('Insufficient balance', 'error');
        return;
    }
    
    try {
        // Set UID on ESP32 first (in case it was reset by timeout)
        showAlert('Preparing to dispense...', 'info');
        await setUIDOnESP32(userUID);
        
        // Small delay to ensure ESP32 processed the UID
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Send start command to ESP32
        const response = await fetch(`${ESP32_IP}/start`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ amount: amount })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'Failed to start dispensing');
        }
        
        const result = await response.json();
        
        if (result.ok) {
            // Update UI
            isDispensing = true;
            startButton.style.display = 'none';
            stopButton.style.display = 'flex';
            dispenseStatus.style.display = 'block';
            amountInput.disabled = true;
            
            // Calculate dispensing details
            const liters = amount / PETROL_RATE;
            const totalSeconds = Math.ceil(liters * SECONDS_PER_LITER);
            
            dispensingAmountEl.textContent = `₹${amount.toFixed(2)}`;
            dispensingVolumeEl.textContent = `${liters.toFixed(2)} L`;
            
            // Start countdown
            startCountdown(totalSeconds);
            
            showAlert('Dispensing started successfully', 'success');
        } else {
            throw new Error(result.msg || 'Failed to start');
        }
        
    } catch (error) {
        console.error('Error starting dispense:', error);
        showAlert('Error starting dispense: ' + error.message, 'error');
    }
}

// Stop fuel dispensing (emergency)
async function stopDispense() {
    try {
        const response = await fetch(`${ESP32_IP}/stop`, {
            method: 'POST'
        });
        
        if (response.ok) {
            isDispensing = false;
            clearInterval(countdownInterval);
            
            // Reset UI
            startButton.style.display = 'flex';
            stopButton.style.display = 'none';
            dispenseStatus.style.display = 'none';
            amountInput.disabled = false;
            amountInput.value = '';
            calculateFuel();
            
            showAlert('Dispensing stopped', 'warning');
            
            // Refresh balance
            await refreshUserData();
            await loadRecentActivity();
        }
        
    } catch (error) {
        console.error('Error stopping dispense:', error);
        showAlert('Error stopping dispense', 'error');
    }
}

// Countdown timer during dispensing
function startCountdown(totalSeconds) {
    let remaining = totalSeconds;
    const circumference = 283; // 2 * π * radius (45)
    
    // Monitor ESP32 status during dispensing
    const statusCheckInterval = setInterval(async () => {
        try {
            const response = await fetch(`${ESP32_IP}/status`);
            const data = await response.json();
            
            // Check if motor stopped (dispensing completed on ESP32 side)
            if (!data.motorRunning && isDispensing) {
                clearInterval(countdownInterval);
                clearInterval(statusCheckInterval);
                finishDispensing();
            }
        } catch (error) {
            console.error('Error checking ESP32 status:', error);
        }
    }, 1000);
    
    countdownInterval = setInterval(() => {
        remaining--;
        remainingTimeEl.textContent = `${remaining}s`;
        
        // Update progress circle
        const progress = remaining / totalSeconds;
        const offset = circumference * (1 - progress);
        progressCircle.style.strokeDashoffset = offset;
        
        if (remaining <= 0) {
            clearInterval(countdownInterval);
            clearInterval(statusCheckInterval);
            finishDispensing();
        }
    }, 1000);
}

// Finish dispensing
async function finishDispensing() {
    isDispensing = false;
    
    // Get the dispensed amount from UI
    const dispensedAmountText = dispensingAmountEl.textContent.replace('₹', '');
    const dispensedAmount = parseFloat(dispensedAmountText);
    const dispensedVolumeText = dispensingVolumeEl.textContent.replace(' L', '');
    const dispensedVolume = parseFloat(dispensedVolumeText);
    
    try {
        // Record transaction to database
        const response = await fetch(`${BACKEND_URL}/api/dispense`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                rfid_uid: userUID,
                volume_litre: dispensedVolume,
                amount: dispensedAmount,
                fuel_type: 'PETROL'
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            // Update balance from server response
            userBalance = result.balance_after;
            updateBalance(userBalance);
            sessionStorage.setItem('userBalance', userBalance);
            
            showAlert(`Dispensing completed! ₹${dispensedAmount.toFixed(2)} deducted. New balance: ₹${userBalance.toFixed(2)}`, 'success');
        } else {
            showAlert('Dispensing completed but failed to update database', 'warning');
        }
    } catch (error) {
        console.error('Error recording transaction:', error);
        showAlert('Dispensing completed but database update failed', 'warning');
    }
    
    // Reset UI
    setTimeout(() => {
        startButton.style.display = 'flex';
        stopButton.style.display = 'none';
        dispenseStatus.style.display = 'none';
        amountInput.disabled = false;
        amountInput.value = '';
        calculateFuel();
    }, 2000);
    
    // Refresh data
    await refreshUserData();
    await loadRecentActivity();
}

// Load recent activity
async function loadRecentActivity() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/dispense/history/${userUID}?limit=5`);
        
        if (response.ok) {
            const data = await response.json();
            const transactions = data.dispenses || data.history || [];
            
            if (transactions.length === 0) {
                activityList.innerHTML = `
                    <div class="flex items-center gap-3 p-4 bg-slate-800 rounded-lg border border-slate-700">
                        <i class="bi bi-info-circle text-slate-400 text-xl"></i>
                        <span class="text-slate-400">No recent transactions</span>
                    </div>
                `;
            } else {
                activityList.innerHTML = transactions.map(tx => {
                    const date = new Date(tx.time);
                    return `
                        <div class="flex items-center gap-3 p-4 bg-slate-800 rounded-lg border border-slate-700 hover:border-blue-500 transition-colors">
                            <i class="bi bi-fuel-pump-fill text-blue-400 text-xl"></i>
                            <div class="flex-1">
                                <div class="font-semibold text-white">₹${tx.amount.toFixed(2)} • ${tx.volume_litre.toFixed(2)} L</div>
                                <div class="text-sm text-slate-400">${date.toLocaleString()}</div>
                            </div>
                            <span class="text-emerald-400 font-semibold text-xs">SUCCESS</span>
                        </div>
                    `;
                }).join('');
            }
        }
    } catch (error) {
        console.error('Error loading activity:', error);
    }
}

// Show alert message
function showAlert(message, type = 'info') {
    alertMessage.textContent = message;
    
    // Base classes
    let bgColor = 'bg-blue-500';
    let borderColor = 'border-blue-600';
    let textColor = 'text-white';
    
    if (type === 'error') {
        bgColor = 'bg-red-500';
        borderColor = 'border-red-600';
    } else if (type === 'warning') {
        bgColor = 'bg-amber-500';
        borderColor = 'border-amber-600';
    } else if (type === 'success') {
        bgColor = 'bg-emerald-500';
        borderColor = 'border-emerald-600';
    }
    
    alertBox.className = `fixed top-4 right-4 ${bgColor} rounded-lg shadow-lg border ${borderColor} p-4 max-w-sm z-50 flex items-center gap-3`;
    alertMessage.className = `text-sm ${textColor}`;
    
    // Auto-hide after 4 seconds
    setTimeout(() => {
        alertBox.className = 'hidden fixed top-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm z-50';
    }, 4000);
}

// Logout function
async function logout() {
    if (isDispensing) {
        if (!confirm('Dispensing is in progress. Are you sure you want to logout?')) {
            return;
        }
        // Stop dispensing before logout
        await stopDispense();
    }
    
    // Clear intervals
    clearInterval(refreshInterval);
    clearInterval(countdownInterval);
    
    // The ESP32 will auto-reset UID after 3 seconds of inactivity
    // No need to manually clear it
    
    // Clear session
    sessionStorage.clear();
    
    // Show logout message
    showAlert('Logged out successfully', 'success');
    
    // Redirect to landing after brief delay
    setTimeout(() => {
        window.location.href = '/';
    }, 1000);
}

// Prevent back navigation without logout
window.addEventListener('popstate', () => {
    if (sessionStorage.getItem('isUser')) {
        window.location.href = '/user';
    }
});

// Top-up modal functions
function showTopupModal() {
    document.getElementById('topupModal').style.display = 'flex';
    document.getElementById('topupAmount').value = '';
    document.getElementById('topupAmount').focus();
}

function closeTopupModal() {
    document.getElementById('topupModal').style.display = 'none';
}

function setTopupAmount(amount) {
    document.getElementById('topupAmount').value = amount;
}

async function processTopup() {
    const amount = parseFloat(document.getElementById('topupAmount').value);
    
    if (!amount || amount <= 0) {
        showAlert('Please enter a valid amount', 'error');
        return;
    }
    
    try {
        showAlert('Processing top-up...', 'info');
        
        const response = await fetch(`${BACKEND_URL}/api/users/topup`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                rfid_uid: userUID,
                amount: amount
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Top-up failed');
        }
        
        const result = await response.json();
        
        // Update balance
        userBalance = result.balance_after;
        updateBalance(userBalance);
        sessionStorage.setItem('userBalance', userBalance);
        
        // Close modal
        closeTopupModal();
        
        // Show success
        showAlert(`Successfully added ₹${amount.toFixed(2)}. New balance: ₹${userBalance.toFixed(2)}`, 'success');
        
        // Refresh data
        await loadRecentActivity();
        
    } catch (error) {
        console.error('Error processing top-up:', error);
        showAlert('Error: ' + error.message, 'error');
    }
}


// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    clearInterval(refreshInterval);
    clearInterval(countdownInterval);
});

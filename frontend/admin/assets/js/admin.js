// Configuration
const API_BASE = 'http://192.168.1.100:3000/api';

// Check admin session
if (!sessionStorage.getItem('isAdmin')) {
    window.location.href = '/';
}

// State
let currentPage = 'dashboard';
let usersData = [];
let transactionsData = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    loadDashboard();
});

// Navigation
function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            switchPage(page);
        });
    });
}

function switchPage(page) {
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-page="${page}"]`).classList.add('active');
    
    // Update page - use hidden class instead of active
    document.querySelectorAll('.page').forEach(p => {
        p.classList.add('hidden');
        p.classList.remove('active');
    });
    const pageEl = document.getElementById(`page-${page}`);
    pageEl.classList.remove('hidden');
    pageEl.classList.add('active');
    
    // Update title
    const titles = {
        dashboard: 'Dashboard',
        users: 'Users Management',
        transactions: 'Transaction History',
        analytics: 'System Analytics'
    };
    document.getElementById('pageTitle').textContent = titles[page];
    
    currentPage = page;
    
    // Load data
    if (page === 'dashboard') loadDashboard();
    if (page === 'users') loadUsers();
    if (page === 'transactions') loadTransactions();
    if (page === 'analytics') loadAnalytics();
}

// Dashboard
async function loadDashboard() {
    try {
        const [usersRes, dispensesRes] = await Promise.all([
            fetch(`${API_BASE}/users`),
            fetch(`${API_BASE}/dispense/history`)
        ]);
        
        const usersData = await usersRes.json();
        const dispensesData = await dispensesRes.json();
        
        // Handle both response formats
        const dispenses = dispensesData.dispenses || dispensesData.history || [];
        
        // Update stats
        document.getElementById('totalUsers').textContent = usersData.pagination?.total || 0;
        document.getElementById('totalDispenses').textContent = dispenses.length;
        
        // Calculate revenue
        const totalRevenue = dispenses.reduce((sum, d) => sum + (d.amount || 0), 0);
        document.getElementById('totalRevenue').textContent = `₹${totalRevenue.toFixed(2)}`;
        
        // Today's activity
        const today = new Date().toDateString();
        const todayDispenses = dispenses.filter(d => {
            const timestamp = d.timestamp || d.time;
            return timestamp && new Date(timestamp).toDateString() === today;
        });
        document.getElementById('todayActivity').textContent = todayDispenses.length;
        
        // Recent activity
        const recentList = document.getElementById('recentActivityList');
        if (dispenses.length === 0) {
            recentList.innerHTML = '<p class="text-sm text-slate-400">No recent activity</p>';
        } else {
            recentList.innerHTML = dispenses.slice(0, 5).map(d => `
                <div class="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700 hover:border-blue-500 transition-all">
                    <div class="flex-1">
                        <div class="text-sm font-medium text-white">${d.rfid_uid}</div>
                        <div class="text-xs text-slate-400 mt-1">
                            <i class="bi bi-fuel-pump-fill"></i> Dispensed ₹${d.amount} (${d.volume_litre || d.liters_dispensed || 0}L)
                        </div>
                    </div>
                    <div class="text-xs text-slate-500">${formatTime(d.timestamp || d.time)}</div>
                </div>
            `).join('');
        }
    } catch (err) {
        console.error('Dashboard load error:', err);
    }
}

// Users
async function loadUsers(search = '') {
    try {
        const url = search 
            ? `${API_BASE}/users?search=${encodeURIComponent(search)}` 
            : `${API_BASE}/users`;
        const res = await fetch(url);
        const data = await res.json();
        
        usersData = data.users;
        
        const tbody = document.getElementById('usersTableBody');
        if (usersData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-8 text-center text-slate-400">No users found</td></tr>';
            return;
        }
        
        tbody.innerHTML = usersData.map(user => `
            <tr class="hover:bg-slate-800 transition-colors">
                <td class="px-4 py-3 text-white font-medium">${user.rfid_uid}</td>
                <td class="px-4 py-3 text-white">${user.name || '-'}</td>
                <td class="px-4 py-3 text-slate-400">${user.phone || '-'}</td>
                <td class="px-4 py-3 text-slate-400">${user.car_number || '-'}</td>
                <td class="px-4 py-3 text-white font-semibold">₹${(user.balance || 0).toFixed(2)}</td>
                <td class="px-4 py-3">
                    <div class="flex items-center gap-2">
                        <button onclick="editUser('${user.rfid_uid}')" class="text-sm px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium transition-all"><i class="bi bi-pencil-fill"></i></button>
                        <button onclick="deleteUser('${user.rfid_uid}')" class="text-sm px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium transition-all"><i class="bi bi-trash-fill"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Users load error:', err);
    }
}

function searchUsers() {
    const query = document.getElementById('userSearch').value;
    loadUsers(query);
}

function showAddUserModal() {
    document.getElementById('modalTitle').textContent = 'Add New User';
    document.getElementById('userForm').reset();
    document.getElementById('rfid_uid').disabled = false;
    document.getElementById('userModal').classList.add('active');
}

function closeUserModal() {
    document.getElementById('userModal').classList.remove('active');
}

async function saveUser(event) {
    event.preventDefault();
    
    const userData = {
        rfid_uid: document.getElementById('rfid_uid').value.trim(),
        name: document.getElementById('name').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        car_number: document.getElementById('car_number').value.trim()
    };
    
    const balance = parseFloat(document.getElementById('balance').value);
    
    try {
        // Create user
        const res = await fetch(`${API_BASE}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        
        if (!res.ok) throw new Error('Failed to save user');
        
        // Update balance if needed
        if (balance > 0) {
            await fetch(`${API_BASE}/users/by-rfid/${userData.rfid_uid}/balance`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ balance })
            });
        }
        
        closeUserModal();
        loadUsers();
        alert('✅ User saved successfully');
    } catch (err) {
        alert('❌ Error: ' + err.message);
    }
}

async function editUser(uid) {
    const user = usersData.find(u => u.rfid_uid === uid);
    if (!user) return;
    
    document.getElementById('modalTitle').textContent = 'Edit User';
    document.getElementById('rfid_uid').value = user.rfid_uid;
    document.getElementById('rfid_uid').disabled = true;
    document.getElementById('name').value = user.name || '';
    document.getElementById('phone').value = user.phone || '';
    document.getElementById('car_number').value = user.car_number || '';
    document.getElementById('balance').value = user.balance || 0;
    
    document.getElementById('userModal').classList.add('active');
}

async function deleteUser(uid) {
    if (!confirm(`Delete user ${uid}?`)) return;
    
    try {
        const res = await fetch(`${API_BASE}/users/by-rfid/${uid}`, {
            method: 'DELETE'
        });
        
        if (!res.ok) throw new Error('Failed to delete user');
        
        loadUsers();
        alert('✅ User deleted');
    } catch (err) {
        alert('❌ Error: ' + err.message);
    }
}

// Transactions
async function loadTransactions() {
    try {
        const res = await fetch(`${API_BASE}/dispense/history`);
        const data = await res.json();
        
        transactionsData = data.dispenses || data.history || [];
        renderTransactions(transactionsData);
    } catch (err) {
        console.error('Transactions load error:', err);
    }
}

function filterTransactions() {
    const filter = document.getElementById('transactionFilter').value;
    let filtered = transactionsData;
    
    if (filter === 'dispense') {
        filtered = transactionsData.filter(t => t.liters_dispensed > 0);
    } else if (filter === 'topup') {
        // Assuming topup transactions have a specific flag or type
        filtered = transactionsData.filter(t => t.type === 'topup');
    }
    
    renderTransactions(filtered);
}

function renderTransactions(data) {
    const tbody = document.getElementById('transactionsTableBody');
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-8 text-center text-slate-400">No transactions found</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.map(tx => `
        <tr class="hover:bg-slate-800 transition-colors">
            <td class="px-4 py-3 text-white text-sm">${formatDateTime(tx.timestamp || tx.time)}</td>
            <td class="px-4 py-3 text-white font-medium text-sm">${tx.rfid_uid}</td>
            <td class="px-4 py-3 text-sm"><span class="px-2 py-1 rounded-full text-xs font-medium bg-blue-600/20 text-blue-400 border border-blue-600/30">${tx.status || tx.type || 'dispense'}</span></td>
            <td class="px-4 py-3 text-white font-semibold text-sm">₹${(tx.amount || 0).toFixed(2)}</td>
            <td class="px-4 py-3 text-slate-400 text-sm">${(tx.volume_litre || tx.liters_dispensed || 0).toFixed(2)}L</td>
            <td class="px-4 py-3 text-sm">${tx.status === 'SUCCESS' ? '<span class="text-emerald-400 font-medium flex items-center gap-1"><i class="bi bi-check-circle-fill"></i> Success</span>' : tx.completed ? '<span class="text-emerald-400 font-medium flex items-center gap-1"><i class="bi bi-check-circle-fill"></i> Complete</span>' : '<span class="text-amber-400 font-medium flex items-center gap-1"><i class="bi bi-exclamation-circle-fill"></i> Failed</span>'}</td>
        </tr>
    `).join('');
}

// Analytics
async function loadAnalytics() {
    try {
        const [usersRes, dispensesRes] = await Promise.all([
            fetch(`${API_BASE}/users`),
            fetch(`${API_BASE}/dispense/history`)
        ]);
        
        const usersData = await usersRes.json();
        const dispensesData = await dispensesRes.json();
        
        const dispenses = dispensesData.dispenses || dispensesData.history || [];
        
        // Top users by consumption
        const userConsumption = {};
        dispenses.forEach(d => {
            if (!userConsumption[d.rfid_uid]) {
                userConsumption[d.rfid_uid] = 0;
            }
            userConsumption[d.rfid_uid] += d.amount || 0;
        });
        
        const topUsers = Object.entries(userConsumption)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        document.getElementById('topUsersList').innerHTML = topUsers.map(([uid, amount]) => `
            <div class="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700 hover:border-blue-500 transition-all">
                <span class="text-sm font-medium text-white">${uid}</span>
                <span class="text-sm font-semibold text-blue-400">₹${amount.toFixed(2)}</span>
            </div>
        `).join('') || '<p class="text-sm text-slate-400">No data available</p>';
        
        // Revenue breakdown
        const totalRevenue = dispenses.reduce((sum, d) => sum + (d.amount || 0), 0);
        const totalDispenses = dispenses.length;
        const avgPerDispense = totalDispenses > 0 ? totalRevenue / totalDispenses : 0;
        
        document.getElementById('revenueBreakdown').innerHTML = `
            <div class="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700 hover:border-blue-500 transition-all">
                <span class="text-sm text-slate-300">Total Revenue</span>
                <span class="text-sm font-semibold text-white">₹${totalRevenue.toFixed(2)}</span>
            </div>
            <div class="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700 hover:border-blue-500 transition-all">
                <span class="text-sm text-slate-300">Total Dispenses</span>
                <span class="text-sm font-semibold text-white">${totalDispenses}</span>
            </div>
            <div class="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700 hover:border-blue-500 transition-all">
                <span class="text-sm text-slate-300">Avg per Dispense</span>
                <span class="text-sm font-semibold text-white">₹${avgPerDispense.toFixed(2)}</span>
            </div>
        `;
    } catch (err) {
        console.error('Analytics load error:', err);
    }
}

// Logout
function logout() {
    sessionStorage.removeItem('isAdmin');
    window.location.href = '/';
}

// Utilities
function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
}

function formatDateTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString();
}

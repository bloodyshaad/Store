// Admin authentication functions
function checkAdminAuth() {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        window.location.href = 'admin-login.html';
        return false;
    }
    return true;
}

function getAdminToken() {
    return localStorage.getItem('adminToken');
}

function adminLogout() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    window.location.href = 'admin-login.html';
}

// Admin authenticated fetch
function adminFetch(url, options = {}) {
    const token = getAdminToken();
    
    if (!token) {
        window.location.href = 'admin-login.html';
        return Promise.reject('No admin token');
    }
    
    const headers = {
        'Authorization': `Bearer ${token}`,
        'X-Admin-Access': 'true',
        ...options.headers
    };
    
    return fetch(url, {
        ...options,
        headers
    });
}

// Global variables
let currentDeleteAction = null;

// Initialize admin panel
document.addEventListener('DOMContentLoaded', function() {
    if (!checkAdminAuth()) return;
    
    // Initialize admin info
    const adminUser = localStorage.getItem('adminUser');
    if (adminUser) {
        document.getElementById('admin-username').textContent = adminUser;
    }
    
    initializeAdminTabs();
    initializeAdminModals();
    loadSystemStats();
    loadStores(); // Load stores by default
    
    // Initialize logout button
    document.getElementById('admin-logout-btn').addEventListener('click', adminLogout);
});

// Admin tab functionality
function initializeAdminTabs() {
    const tabButtons = document.querySelectorAll('.admin-tab-btn');
    const tabContents = document.querySelectorAll('.admin-tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-admin-tab');
            
            // Remove active class from all tabs and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            button.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
            
            // Load data for specific tabs
            switch(targetTab) {
                case 'stores':
                    loadStores();
                    break;
                case 'owners':
                    loadStoreOwners();
                    break;
                case 'customers':
                    loadAllCustomers();
                    break;
                case 'transactions':
                    loadAllTransactions();
                    break;
                case 'analytics':
                    loadSystemAnalytics();
                    break;
            }
        });
    });
}

// Admin modal functionality
function initializeAdminModals() {
    const modals = document.querySelectorAll('.modal');
    const closeButtons = document.querySelectorAll('.close');

    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            button.closest('.modal').style.display = 'none';
        });
    });

    window.addEventListener('click', (event) => {
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });

    // Add store modal
    document.getElementById('add-store-btn').addEventListener('click', () => {
        document.getElementById('add-store-form').reset();
        document.getElementById('add-store-modal').style.display = 'block';
    });

    // Form submissions
    document.getElementById('add-store-form').addEventListener('submit', handleAddStore);
    
    // Confirmation modal
    document.getElementById('confirm-cancel').addEventListener('click', () => {
        document.getElementById('confirm-modal').style.display = 'none';
        currentDeleteAction = null;
    });
    
    document.getElementById('confirm-delete').addEventListener('click', () => {
        if (currentDeleteAction) {
            currentDeleteAction();
        }
        document.getElementById('confirm-modal').style.display = 'none';
        currentDeleteAction = null;
    });
}

// Load system statistics
async function loadSystemStats() {
    try {
        const response = await adminFetch('/api/admin/stats');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const stats = await response.json();
        
        document.getElementById('total-stores').textContent = stats.total_stores || 0;
        document.getElementById('total-owners').textContent = stats.total_owners || 0;
        document.getElementById('total-customers').textContent = stats.total_customers || 0;
        document.getElementById('total-transactions').textContent = stats.total_transactions || 0;
    } catch (error) {
        console.error('Error loading system stats:', error);
        showAdminMessage('Error loading system statistics', 'error');
    }
}

// Store Management
async function loadStores() {
    try {
        const response = await adminFetch('/api/admin/stores');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const stores = await response.json();
        displayStores(stores);
    } catch (error) {
        console.error('Error loading stores:', error);
        displayStores([]);
        showAdminMessage('Error loading stores', 'error');
    }
}

function displayStores(stores) {
    const storesList = document.getElementById('stores-list');
    
    if (stores.length === 0) {
        storesList.innerHTML = '<p>No stores found.</p>';
        return;
    }
    
    const table = `
        <table class="table">
            <thead>
                <tr>
                    <th>Store ID</th>
                    <th>Store Name</th>
                    <th>Owner</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Address</th>
                    <th>Created</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${stores.map(store => `
                    <tr>
                        <td>${store.store_id}</td>
                        <td>${store.store_name}</td>
                        <td>${store.owner_name}</td>
                        <td>${store.owner_email}</td>
                        <td>${store.store_phone}</td>
                        <td>${store.store_address}</td>
                        <td>${new Date(store.created_at).toLocaleDateString()}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn btn-secondary" onclick="viewStoreDetails(${store.store_id})">View Details</button>
                                <button class="btn btn-danger" onclick="confirmDeleteStore(${store.store_id}, '${store.store_name}')">Delete Store</button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    storesList.innerHTML = table;
}

async function handleAddStore(e) {
    e.preventDefault();
    
    const formData = {
        firstName: document.getElementById('owner-first-name').value,
        lastName: document.getElementById('owner-last-name').value,
        email: document.getElementById('owner-email').value,
        storeName: document.getElementById('store-name').value,
        storeAddress: document.getElementById('store-address').value,
        phone: document.getElementById('store-phone').value,
        password: document.getElementById('initial-password').value
    };
    
    try {
        const response = await adminFetch('/api/admin/stores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            document.getElementById('add-store-modal').style.display = 'none';
            loadStores();
            loadSystemStats();
            showAdminMessage('Store and owner created successfully', 'success');
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create store');
        }
    } catch (error) {
        console.error('Error creating store:', error);
        showAdminMessage(error.message, 'error');
    }
}

function confirmDeleteStore(storeId, storeName) {
    document.getElementById('confirm-message').textContent = 
        `Are you sure you want to delete "${storeName}" and all its data? This action cannot be undone.`;
    document.getElementById('confirm-modal').style.display = 'block';
    
    currentDeleteAction = async () => {
        try {
            const response = await adminFetch(`/api/admin/stores/${storeId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                loadStores();
                loadSystemStats();
                showAdminMessage('Store deleted successfully', 'success');
            } else {
                throw new Error('Failed to delete store');
            }
        } catch (error) {
            console.error('Error deleting store:', error);
            showAdminMessage('Error deleting store', 'error');
        }
    };
}

async function viewStoreDetails(storeId) {
    try {
        // Get store details
        const detailsResponse = await adminFetch(`/api/admin/stores/${storeId}/details`);
        if (!detailsResponse.ok) {
            throw new Error(`HTTP error! status: ${detailsResponse.status}`);
        }
        const details = await detailsResponse.json();
        
        // Get store basic info
        const storesResponse = await adminFetch("/api/admin/stores");
        if (!storesResponse.ok) {
            throw new Error(`HTTP error! status: ${storesResponse.status}`);
        }
        const stores = await storesResponse.json();
        const store = stores.find(s => s.store_id == storeId);
        
        // Populate the modal with data
        document.getElementById("detail-items").textContent = details.items_count || 0;
        document.getElementById("detail-customers").textContent = details.customers_count || 0;
        document.getElementById("detail-transactions").textContent = details.transactions_count || 0;
        document.getElementById("detail-revenue").textContent = `$${(details.total_revenue || 0).toFixed(2)}`;
        
        if (store) {
            document.getElementById("detail-store-name").textContent = store.store_name || "-";
            document.getElementById("detail-owner-name").textContent = store.owner_name || "-";
            document.getElementById("detail-owner-email").textContent = store.owner_email || "-";
            document.getElementById("detail-store-phone").textContent = store.store_phone || "-";
            document.getElementById("detail-store-address").textContent = store.store_address || "-";
            document.getElementById("detail-created-date").textContent = store.created_at ? new Date(store.created_at).toLocaleDateString() : "-";
        }
        
        // Show the modal
        document.getElementById("store-details-modal").style.display = "block";
        
    } catch (error) {
        console.error("Error loading store details:", error);
        showAdminMessage("Error loading store details", "error");
    }
}

// Store Owners Management
async function loadStoreOwners() {
    try {
        const response = await adminFetch('/api/admin/owners');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const owners = await response.json();
        displayStoreOwners(owners);
    } catch (error) {
        console.error('Error loading store owners:', error);
        displayStoreOwners([]);
        showAdminMessage('Error loading store owners', 'error');
    }
}

function displayStoreOwners(owners) {
    const ownersList = document.getElementById('owners-list');
    
    if (owners.length === 0) {
        ownersList.innerHTML = '<p>No store owners found.</p>';
        return;
    }
    
    const table = `
        <table class="table">
            <thead>
                <tr>
                    <th>Owner ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Store Name</th>
                    <th>Store Phone</th>
                    <th>Joined</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${owners.map(owner => `
                    <tr>
                        <td>${owner.owner_id}</td>
                        <td>${owner.owner_name}</td>
                        <td>${owner.email}</td>
                        <td>${owner.store_name}</td>
                        <td>${owner.store_phone}</td>
                        <td>${new Date(owner.created_at).toLocaleDateString()}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn btn-danger" onclick="confirmDeleteOwner(${owner.owner_id}, '${owner.owner_name}')">Delete Owner</button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    ownersList.innerHTML = table;
}

function confirmDeleteOwner(ownerId, ownerName) {
    document.getElementById('confirm-message').textContent = 
        `Are you sure you want to delete owner "${ownerName}" and their store? This action cannot be undone.`;
    document.getElementById('confirm-modal').style.display = 'block';
    
    currentDeleteAction = async () => {
        try {
            const response = await adminFetch(`/api/admin/owners/${ownerId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                loadStoreOwners();
                loadSystemStats();
                showAdminMessage('Store owner deleted successfully', 'success');
            } else {
                throw new Error('Failed to delete store owner');
            }
        } catch (error) {
            console.error('Error deleting store owner:', error);
            showAdminMessage('Error deleting store owner', 'error');
        }
    };
}

// All Customers Management
async function loadAllCustomers() {
    try {
        const response = await adminFetch('/api/admin/customers');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const customers = await response.json();
        displayAllCustomers(customers);
    } catch (error) {
        console.error('Error loading customers:', error);
        displayAllCustomers([]);
        showAdminMessage('Error loading customers', 'error');
    }
}

function displayAllCustomers(customers) {
    const customersList = document.getElementById('all-customers-list');
    
    if (customers.length === 0) {
        customersList.innerHTML = '<p>No customers found.</p>';
        return;
    }
    
    const table = `
        <table class="table">
            <thead>
                <tr>
                    <th>Customer ID</th>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Store</th>
                    <th>Balance</th>
                    <th>Created</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${customers.map(customer => `
                    <tr>
                        <td>${customer.customer_id}</td>
                        <td>${customer.name}</td>
                        <td>${customer.phone || 'N/A'}</td>
                        <td>${customer.email || 'N/A'}</td>
                        <td>${customer.store_name}</td>
                        <td>$${(customer.current_balance || 0).toFixed(2)}</td>
                        <td>${new Date(customer.created_at).toLocaleDateString()}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn btn-danger" onclick="confirmDeleteCustomer(${customer.customer_id}, '${customer.name}')">Delete</button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    customersList.innerHTML = table;
}

function confirmDeleteCustomer(customerId, customerName) {
    document.getElementById('confirm-message').textContent = 
        `Are you sure you want to delete customer "${customerName}"? This action cannot be undone.`;
    document.getElementById('confirm-modal').style.display = 'block';
    
    currentDeleteAction = async () => {
        try {
            const response = await adminFetch(`/api/admin/customers/${customerId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                loadAllCustomers();
                loadSystemStats();
                showAdminMessage('Customer deleted successfully', 'success');
            } else {
                throw new Error('Failed to delete customer');
            }
        } catch (error) {
            console.error('Error deleting customer:', error);
            showAdminMessage('Error deleting customer', 'error');
        }
    };
}

// All Transactions Management
async function loadAllTransactions() {
    try {
        const response = await adminFetch('/api/admin/transactions');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const transactions = await response.json();
        displayAllTransactions(transactions);
    } catch (error) {
        console.error('Error loading transactions:', error);
        displayAllTransactions([]);
        showAdminMessage('Error loading transactions', 'error');
    }
}

function displayAllTransactions(transactions) {
    const transactionsList = document.getElementById('all-transactions-list');
    
    if (transactions.length === 0) {
        transactionsList.innerHTML = '<p>No transactions found.</p>';
        return;
    }
    
    const table = `
        <table class="table">
            <thead>
                <tr>
                    <th>Transaction ID</th>
                    <th>Store</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Payment Type</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${transactions.map(transaction => `
                    <tr>
                        <td>${transaction.id.substring(0, 8)}...</td>
                        <td>${transaction.store_name}</td>
                        <td>${transaction.customer_name || 'Walk-in'}</td>
                        <td>$${transaction.total_amount.toFixed(2)}</td>
                        <td>${transaction.payment_type.toUpperCase()}</td>
                        <td>
                            <span class="${transaction.credit_status === 'overdue' ? 'text-danger' : transaction.credit_status === 'paid' ? 'text-success' : ''}">
                                ${transaction.credit_status || transaction.status}
                            </span>
                        </td>
                        <td>${new Date(transaction.created_at).toLocaleDateString()}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn btn-danger" onclick="confirmDeleteTransaction('${transaction.id}')">Delete</button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    transactionsList.innerHTML = table;
}

function confirmDeleteTransaction(transactionId) {
    document.getElementById('confirm-message').textContent = 
        `Are you sure you want to delete this transaction? This action cannot be undone.`;
    document.getElementById('confirm-modal').style.display = 'block';
    
    currentDeleteAction = async () => {
        try {
            const response = await adminFetch(`/api/admin/transactions/${transactionId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                loadAllTransactions();
                loadSystemStats();
                showAdminMessage('Transaction deleted successfully', 'success');
            } else {
                throw new Error('Failed to delete transaction');
            }
        } catch (error) {
            console.error('Error deleting transaction:', error);
            showAdminMessage('Error deleting transaction', 'error');
        }
    };
}

// System Analytics
async function loadSystemAnalytics() {
    try {
        const response = await adminFetch('/api/admin/analytics');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const analytics = await response.json();
        displaySystemAnalytics(analytics);
    } catch (error) {
        console.error('Error loading system analytics:', error);
        showAdminMessage('Error loading system analytics', 'error');
    }
}

// Fixed displaySystemAnalytics function
function displaySystemAnalytics(analytics) {
    // Destroy existing charts if they exist
    if (window.revenueChart) {
        window.revenueChart.destroy();
    }
    if (window.transactionsChart) {
        window.transactionsChart.destroy();
    }
    
    // Revenue by Store Chart
    const revenueCtx = document.getElementById('revenue-by-store-chart').getContext('2d');
    window.revenueChart = new Chart(revenueCtx, {
        type: 'bar',
        data: {
            labels: analytics.revenue_by_store.map(store => store.store_name),
            datasets: [{
                label: 'Revenue ($)',
                data: analytics.revenue_by_store.map(store => store.total_revenue),
                backgroundColor: 'rgba(0, 122, 255, 0.7)',
                borderColor: '#007AFF',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: { color: 'white' }
                }
            },
            scales: {
                x: {
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });

    // Transactions by Store Chart
    const transactionsCtx = document.getElementById('transactions-by-store-chart').getContext('2d');
    window.transactionsChart = new Chart(transactionsCtx, {
        type: 'doughnut',
        data: {
            labels: analytics.transactions_by_store.map(store => store.store_name),
            datasets: [{
                data: analytics.transactions_by_store.map(store => store.transaction_count),
                backgroundColor: [
                    '#007AFF',
                    '#FF3B30',
                    '#30D158',
                    '#FF9500',
                    '#AF52DE',
                    '#00C7BE',
                    '#FFD60A'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: { color: 'white' }
                }
            }
        }
    });

    // System Summary
    const summaryDiv = document.getElementById('system-summary');
    summaryDiv.innerHTML = `
        <div class="summary-item">
            <h4>Total System Revenue</h4>
            <div class="value">$${analytics.total_revenue.toFixed(2)}</div>
        </div>
        <div class="summary-item">
            <h4>Average Revenue per Store</h4>
            <div class="value">$${analytics.avg_revenue_per_store.toFixed(2)}</div>
        </div>
        <div class="summary-item">
            <h4>Total System Transactions</h4>
            <div class="value">${analytics.total_transactions}</div>
        </div>
        <div class="summary-item">
            <h4>Average Transactions per Store</h4>
            <div class="value">${analytics.avg_transactions_per_store.toFixed(0)}</div>
        </div>
    `;
}
// Utility functions
function showAdminMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    messageDiv.style.position = 'fixed';
    messageDiv.style.top = '20px';
    messageDiv.style.right = '20px';
    messageDiv.style.zIndex = '9999';
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}
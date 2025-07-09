// Authentication functions
function checkAuthStatus() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
}

function initializeStoreInfo() {
    const storeName = localStorage.getItem('storeName');
    const ownerName = localStorage.getItem('ownerName');
    const storeCountry = localStorage.getItem('storeCountry');
    const storeCurrency = localStorage.getItem('storeCurrency');
    
    if (storeName) {
        document.getElementById('store-name').textContent = storeName;
    }
    
    if (ownerName) {
        document.getElementById('owner-name').textContent = ownerName;
    }
    
    // Update cart total display with currency symbol
    updateCartTotalDisplay();
}

function updateCartTotalDisplay() {
    const cartTotalElement = document.querySelector('.cart-total strong');
    if (cartTotalElement) {
        const currentTotal = document.getElementById('cart-total').textContent;
        cartTotalElement.innerHTML = `Total: ${getStoreCurrencySymbol()}<span id="cart-total">${currentTotal}</span>`;
    }
}

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('storeId');
    localStorage.removeItem('storeName');
    localStorage.removeItem('storeCountry');
    localStorage.removeItem('storeCurrency');
    localStorage.removeItem('storeCurrencySymbol');
    localStorage.removeItem('ownerName');
    window.location.href = 'login.html';
}

// Get auth token for API requests
function getAuthToken() {
    return localStorage.getItem('authToken');
}

// Get store ID for API requests
function getStoreId() {
    return localStorage.getItem('storeId');
}

// Add auth header to fetch requests
function authenticatedFetch(url, options = {}) {
    const token = getAuthToken();
    const storeId = getStoreId();
    
    if (!token) {
        window.location.href = 'login.html';
        return Promise.reject('No auth token');
    }
    
    const headers = {
        'Authorization': `Bearer ${token}`,
        'X-Store-ID': storeId,
        ...options.headers
    };
    
    return fetch(url, {
        ...options,
        headers
    });
}

// Global variables
let items = [];
let customers = [];
let cart = [];
let currentEditingItem = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication first
    checkAuthStatus();
    
    // Initialize store info
    initializeStoreInfo();
    
    initializeTabs();
    initializeModals();
    initializePOS();
    
    // Load initial data only if authenticated
    if (getAuthToken()) {
        loadItems();
        loadCustomers();
        // Load transactions/returns/analytics only when their tabs are clicked
    }
    
    // Initialize logout button
    document.getElementById('logout-btn').addEventListener('click', logout);
});

// Tab functionality
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // Remove active class from all tabs and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            button.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
            
            // Load data for specific tabs
            if (targetTab === 'transactions') {
                loadTransactions();
            } else if (targetTab === 'returns') {
                loadReturns();
            } else if (targetTab === 'analytics') {
                loadAnalytics();
            } else if (targetTab === 'credits') {
                loadCreditManagement();
            }
        });
    });
}

// Modal functionality
function initializeModals() {
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

    // Add item modal
    document.getElementById('add-item-btn').addEventListener('click', () => {
        currentEditingItem = null;
        document.getElementById('item-modal-title').textContent = 'Add New Item';
        document.getElementById('item-form').reset();
        document.getElementById('item-modal').style.display = 'block';
    });

    // Add customer modal
    document.getElementById('add-customer-btn').addEventListener('click', () => {
        document.getElementById('customer-form').reset();
        document.getElementById('customer-modal').style.display = 'block';
    });

    // Process return modal
    document.getElementById('process-return-btn').addEventListener('click', () => {
        document.getElementById('return-form').reset();
        document.getElementById('return-items-list').innerHTML = '';
        document.getElementById('return-modal').style.display = 'block';
    });

    // Form submissions
    document.getElementById('item-form').addEventListener('submit', handleItemSubmit);
    document.getElementById('customer-form').addEventListener('submit', handleCustomerSubmit);
    document.getElementById('return-form').addEventListener('submit', handleReturnSubmit);
}

// POS functionality
function initializePOS() {
    const itemSearch = document.getElementById('item-search');
    const suggestions = document.getElementById('item-suggestions');
    const paymentType = document.getElementById('payment-type');
    const creditDueDateGroup = document.getElementById('credit-due-date-group');
    const creditDueDateInput = document.getElementById('credit-due-date');
    
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    creditDueDateInput.min = today;
    creditDueDateInput.value = today;
    
    // Show/hide credit due date based on payment type
    paymentType.addEventListener('change', (e) => {
        if (e.target.value === 'credit') {
            creditDueDateGroup.style.display = 'block';
            creditDueDateInput.required = true;
        } else {
            creditDueDateGroup.style.display = 'none';
            creditDueDateInput.required = false;
        }
    });
    
    itemSearch.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        if (query.length < 2) {
            suggestions.innerHTML = '';
            return;
        }
        
        const filteredItems = items.filter(item => 
            item.name.toLowerCase().includes(query) || 
            (item.barcode && item.barcode.includes(query))
        );
        
        suggestions.innerHTML = filteredItems.map(item => 
            `<div class="suggestion-item" onclick="addToCart(${item.id})">
                ${item.name} - ${formatCurrency(item.price)} (Stock: ${item.stock})
            </div>`
        ).join('');
    });

    document.getElementById('complete-sale').addEventListener('click', completeSale);
    document.getElementById('clear-cart').addEventListener('click', clearCart);
    
    loadRecentTransactions();
}

// Items management
async function loadItems() {
    try {
        const response = await authenticatedFetch('/api/items');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // Ensure we have an array
        items = Array.isArray(data) ? data : [];
        displayItems();
        updatePOSCustomers();
    } catch (error) {
        console.error('Error loading items:', error);
        items = []; // Set to empty array on error
        displayItems();
        showMessage('Error loading items', 'error');
    }
}

function displayItems() {
    const itemsList = document.getElementById('items-list');
    
    if (items.length === 0) {
        itemsList.innerHTML = '<p>No items found. Add your first item!</p>';
        return;
    }
    
    const table = `
        <table class="table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Barcode</th>
                    <th>Price</th>
                    <th>Cost</th>
                    <th>Stock</th>
                    <th>Category</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${items.map(item => `
                    <tr>
                        <td>${item.name}</td>
                        <td>${item.barcode || 'N/A'}</td>
                        <td>${formatCurrency(item.price)}</td>
                        <td>${formatCurrency(item.cost)}</td>
                        <td>${item.stock}</td>
                        <td>${item.category || 'N/A'}</td>
                        <td>
                            <button class="btn btn-secondary" onclick="editItem(${item.id})">Edit</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    itemsList.innerHTML = table;
}

function editItem(id) {
    const item = items.find(i => i.id === id);
    if (!item) return;
    
    currentEditingItem = item;
    document.getElementById('item-modal-title').textContent = 'Edit Item';
    document.getElementById('item-name').value = item.name;
    document.getElementById('item-barcode').value = item.barcode || '';
    document.getElementById('item-price').value = item.price;
    document.getElementById('item-cost').value = item.cost;
    document.getElementById('item-stock').value = item.stock;
    document.getElementById('item-category').value = item.category || '';
    document.getElementById('item-modal').style.display = 'block';
}

async function handleItemSubmit(e) {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('item-name').value,
        barcode: document.getElementById('item-barcode').value,
        price: parseFloat(document.getElementById('item-price').value),
        cost: parseFloat(document.getElementById('item-cost').value),
        stock: parseInt(document.getElementById('item-stock').value),
        category: document.getElementById('item-category').value
    };
    
    try {
        const url = currentEditingItem ? `/api/items/${currentEditingItem.id}` : '/api/items';
        const method = currentEditingItem ? 'PUT' : 'POST';
        
        const response = await authenticatedFetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            document.getElementById('item-modal').style.display = 'none';
            loadItems();
            showMessage(currentEditingItem ? 'Item updated successfully' : 'Item added successfully', 'success');
        } else {
            throw new Error('Failed to save item');
        }
    } catch (error) {
        console.error('Error saving item:', error);
        showMessage('Error saving item', 'error');
    }
}

// Customers management
async function loadCustomers() {
    try {
        const response = await authenticatedFetch('/api/customers');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // Ensure we have an array
        customers = Array.isArray(data) ? data : [];
        displayCustomers();
        updatePOSCustomers();
    } catch (error) {
        console.error('Error loading customers:', error);
        customers = []; // Set to empty array on error
        displayCustomers();
        updatePOSCustomers();
        showMessage('Error loading customers', 'error');
    }
}

function displayCustomers() {
    const customersList = document.getElementById('customers-list');
    
    if (customers.length === 0) {
        customersList.innerHTML = '<p>No customers found. Add your first customer!</p>';
        return;
    }
    
    const table = `
        <table class="table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Address</th>
                    <th>Current Balance</th>
                </tr>
            </thead>
            <tbody>
                ${customers.map(customer => `
                    <tr>
                        <td>${customer.name}</td>
                        <td>${customer.phone || 'N/A'}</td>
                        <td>${customer.email || 'N/A'}</td>
                        <td>${customer.address || 'N/A'}</td>
                        <td>${formatCurrency(customer.current_balance || 0)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    customersList.innerHTML = table;
}

function updatePOSCustomers() {
    const customerSelect = document.getElementById('pos-customer');
    customerSelect.innerHTML = '<option value="">Walk-in Customer</option>';
    
    customers.forEach(customer => {
        const option = document.createElement('option');
        option.value = customer.id;
        option.textContent = `${customer.name} (Balance: ${formatCurrency(customer.current_balance)})`;
        customerSelect.appendChild(option);
    });
}

async function handleCustomerSubmit(e) {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('customer-name').value,
        phone: document.getElementById('customer-phone').value,
        email: document.getElementById('customer-email').value,
        address: document.getElementById('customer-address').value
    };
    
    try {
        const response = await authenticatedFetch('/api/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            document.getElementById('customer-modal').style.display = 'none';
            loadCustomers();
            showMessage('Customer added successfully', 'success');
        } else {
            throw new Error('Failed to add customer');
        }
    } catch (error) {
        console.error('Error adding customer:', error);
        showMessage('Error adding customer', 'error');
    }
}

// Cart functionality
function addToCart(itemId) {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    
    if (item.stock <= 0) {
        showMessage('Item is out of stock', 'error');
        return;
    }
    
    const existingCartItem = cart.find(ci => ci.item_id === itemId);
    
    if (existingCartItem) {
        if (existingCartItem.quantity >= item.stock) {
            showMessage('Cannot add more items than available in stock', 'error');
            return;
        }
        existingCartItem.quantity++;
    } else {
        cart.push({
            item_id: itemId,
            name: item.name,
            unit_price: item.price,
            quantity: 1
        });
    }
    
    updateCartDisplay();
    document.getElementById('item-search').value = '';
    document.getElementById('item-suggestions').innerHTML = '';
}

function removeFromCart(itemId) {
    cart = cart.filter(item => item.item_id !== itemId);
    updateCartDisplay();
}

function updateCartQuantity(itemId, newQuantity) {
    const cartItem = cart.find(item => item.item_id === itemId);
    const item = items.find(i => i.id === itemId);
    
    if (!cartItem || !item) return;
    
    if (newQuantity <= 0) {
        removeFromCart(itemId);
        return;
    }
    
    if (newQuantity > item.stock) {
        showMessage('Cannot add more items than available in stock', 'error');
        return;
    }
    
    cartItem.quantity = newQuantity;
    updateCartDisplay();
}

function updateCartDisplay() {
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<p>Cart is empty</p>';
        cartTotal.textContent = '0.00';
        return;
    }
    
    let total = 0;
    cartItems.innerHTML = cart.map(item => {
        const itemTotal = item.quantity * item.unit_price;
        total += itemTotal;
        
        return `
            <div class="cart-item">
                <div>
                    <strong>${item.name}</strong><br>
                    ${formatCurrency(item.unit_price)} each
                </div>
                <div class="quantity-controls">
                    <button class="quantity-btn" onclick="updateCartQuantity(${item.item_id}, ${item.quantity - 1})">-</button>
                    <input type="number" class="quantity-input" value="${item.quantity}" 
                           onchange="updateCartQuantity(${item.item_id}, parseInt(this.value))" min="1">
                    <button class="quantity-btn" onclick="updateCartQuantity(${item.item_id}, ${item.quantity + 1})">+</button>
                    <button class="btn btn-danger" onclick="removeFromCart(${item.item_id})">Remove</button>
                </div>
                <div>${formatCurrency(itemTotal)}</div>
            </div>
        `;
    }).join('');
    
    cartTotal.textContent = total.toFixed(2);
}

function clearCart() {
    cart = [];
    updateCartDisplay();
}

async function completeSale() {
    if (cart.length === 0) {
        showMessage('Cart is empty', 'error');
        return;
    }
    
    const customerId = document.getElementById('pos-customer').value;
    const paymentType = document.getElementById('payment-type').value;
    const creditDueDate = document.getElementById('credit-due-date').value;
    
    if (paymentType === 'credit' && !customerId) {
        showMessage('Please select a customer for credit transactions', 'error');
        return;
    }
    
    if (paymentType === 'credit' && !creditDueDate) {
        showMessage('Please select a due date for credit transactions', 'error');
        return;
    }
    
    const transactionData = {
        customer_id: customerId || null,
        items: cart,
        payment_type: paymentType,
        credit_due_date: paymentType === 'credit' ? creditDueDate : null
    };
    
    try {
        const response = await authenticatedFetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transactionData)
        });
        
        if (response.ok) {
            const result = await response.json();
            showMessage(`Transaction completed successfully! Receipt ID: ${result.transaction_id}`, 'success');
            clearCart();
            loadItems(); // Refresh stock
            loadCustomers(); // Refresh customer balances
            loadRecentTransactions();
            
            // Reset payment type to cash and hide credit due date
            document.getElementById('payment-type').value = 'cash';
            document.getElementById('credit-due-date-group').style.display = 'none';
            document.getElementById('credit-due-date').required = false;
        } else {
            throw new Error('Failed to complete transaction');
        }
    } catch (error) {
        console.error('Error completing transaction:', error);
        showMessage('Error completing transaction', 'error');
    }
}

// Transactions
async function loadTransactions() {
    try {
        const response = await authenticatedFetch('/api/transactions');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const transactions = Array.isArray(data) ? data : [];
        displayTransactions(transactions);
    } catch (error) {
        console.error('Error loading transactions:', error);
        displayTransactions([]);
        showMessage('Error loading transactions', 'error');
    }
}

function displayTransactions(transactions) {
    const transactionsList = document.getElementById('transactions-list');
    
    if (transactions.length === 0) {
        transactionsList.innerHTML = '<p>No transactions found.</p>';
        return;
    }
    
    const table = `
        <table class="table">
            <thead>
                <tr>
                    <th>Transaction ID</th>
                    <th>Customer</th>
                    <th>Total Amount</th>
                    <th>Payment Type</th>
                    <th>Date</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${transactions.map(transaction => `
                    <tr>
                        <td>${transaction.id.substring(0, 8)}...</td>
                        <td>${transaction.customer_name || 'Walk-in'}</td>
                        <td>${formatCurrency(transaction.total_amount)}</td>
                        <td>${transaction.payment_type.toUpperCase()}</td>
                        <td>${new Date(transaction.created_at).toLocaleDateString()}</td>
                        <td>
                            <button class="btn btn-secondary" onclick="viewTransactionDetails('${transaction.id}')">View Details</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    transactionsList.innerHTML = table;
}

async function loadRecentTransactions() {
    try {
        const response = await authenticatedFetch('/api/transactions');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const transactions = Array.isArray(data) ? data : [];
        const recentTransactions = transactions.slice(0, 5);
        
        const recentTransactionsDiv = document.getElementById('recent-transactions');
        recentTransactionsDiv.innerHTML = recentTransactions.map(transaction => `
            <div class="cart-item">
                <div>
                    <strong>${transaction.id.substring(0, 8)}...</strong><br>
                    ${transaction.customer_name || 'Walk-in'}
                </div>
                <div>${formatCurrency(transaction.total_amount)}</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading recent transactions:', error);
        // Don't show error message for recent transactions as it's not critical
        const recentTransactionsDiv = document.getElementById('recent-transactions');
        if (recentTransactionsDiv) {
            recentTransactionsDiv.innerHTML = '<p>No recent transactions</p>';
        }
    }
}

async function viewTransactionDetails(transactionId) {
    try {
        const response = await authenticatedFetch(`/api/transactions/${transactionId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const details = await response.json();
        
        if (details.length > 0) {
            const transaction = details[0];
            const items = details.map(d => ({
                name: d.item_name,
                quantity: d.quantity,
                unit_price: d.unit_price,
                total_price: d.total_price
            }));
            
            // Populate the modal with transaction details
            const modalContent = document.getElementById('transaction-details-content');
            modalContent.innerHTML = `
                <div class="transaction-info">
                    <div class="form-group">
                        <label>Transaction ID:</label>
                        <p>${transaction.id}</p>
                    </div>
                    <div class="form-group">
                        <label>Customer:</label>
                        <p>${transaction.customer_name || 'Walk-in Customer'}</p>
                    </div>
                    <div class="form-group">
                        <label>Total Amount:</label>
                        <p>${formatCurrency(transaction.total_amount)}</p>
                    </div>
                    <div class="form-group">
                        <label>Payment Type:</label>
                        <p>${transaction.payment_type.toUpperCase()}</p>
                    </div>
                    <div class="form-group">
                        <label>Date:</label>
                        <p>${new Date(transaction.created_at).toLocaleString()}</p>
                    </div>
                </div>
                
                <div class="transaction-items">
                    <h4>Items Purchased:</h4>
                    <div class="data-table">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Quantity</th>
                                    <th>Unit Price</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items.map(item => `
                                    <tr>
                                        <td>${item.name}</td>
                                        <td>${item.quantity}</td>
                                        <td>${formatCurrency(item.unit_price)}</td>
                                        <td>${formatCurrency(item.total_price)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            
            // Show the modal
            document.getElementById('transaction-details-modal').style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading transaction details:', error);
        showMessage('Error loading transaction details', 'error');
    }
}

// Returns
async function loadReturns() {
    try {
        const response = await authenticatedFetch('/api/returns');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const returns = Array.isArray(data) ? data : [];
        displayReturns(returns);
    } catch (error) {
        console.error('Error loading returns:', error);
        displayReturns([]);
        showMessage('Error loading returns', 'error');
    }
}

function displayReturns(returns) {
    const returnsList = document.getElementById('returns-list');
    
    if (returns.length === 0) {
        returnsList.innerHTML = '<p>No returns found.</p>';
        return;
    }
    
    const table = `
        <table class="table">
            <thead>
                <tr>
                    <th>Return ID</th>
                    <th>Original Transaction</th>
                    <th>Customer</th>
                    <th>Refund Amount</th>
                    <th>Reason</th>
                    <th>Date</th>
                </tr>
            </thead>
            <tbody>
                ${returns.map(returnItem => `
                    <tr>
                        <td>${returnItem.id.substring(0, 8)}...</td>
                        <td>${returnItem.original_transaction_id.substring(0, 8)}...</td>
                        <td>${returnItem.customer_name || 'Walk-in'}</td>
                        <td>${formatCurrency(returnItem.total_refund)}</td>
                        <td>${returnItem.reason || 'N/A'}</td>
                        <td>${new Date(returnItem.created_at).toLocaleDateString()}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    returnsList.innerHTML = table;
}

async function handleReturnSubmit(e) {
    e.preventDefault();
    
    const transactionId = document.getElementById('return-transaction-id').value;
    const reason = document.getElementById('return-reason').value;
    
    try {
        // First, get transaction details
        const response = await authenticatedFetch(`/api/transactions/${transactionId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const transactionDetails = await response.json();
        
        if (transactionDetails.length === 0) {
            showMessage('Transaction not found', 'error');
            return;
        }
        
        const transaction = transactionDetails[0];
        const items = transactionDetails.map(d => ({
            item_id: d.item_id,
            quantity: d.quantity,
            unit_price: d.unit_price
        }));
        
        const returnData = {
            original_transaction_id: transactionId,
            customer_id: transaction.customer_id,
            items: items,
            reason: reason
        };
        
        const returnResponse = await authenticatedFetch('/api/returns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(returnData)
        });
        
        if (returnResponse.ok) {
            const result = await returnResponse.json();
            document.getElementById('return-modal').style.display = 'none';
            loadReturns();
            loadItems(); // Refresh stock
            loadCustomers(); // Refresh customer balances
            showMessage(`Return processed successfully! Return ID: ${result.return_id}`, 'success');
        } else {
            throw new Error('Failed to process return');
        }
    } catch (error) {
        console.error('Error processing return:', error);
        showMessage('Error processing return', 'error');
    }
}

// Analytics
async function loadAnalytics() {
    try {
        const [incomeResponse, profitResponse] = await Promise.all([
            authenticatedFetch('/api/analytics/income'),
            authenticatedFetch('/api/analytics/profit')
        ]);
        
        if (!incomeResponse.ok || !profitResponse.ok) {
            throw new Error('Failed to load analytics data');
        }
        
        const incomeDataRaw = await incomeResponse.json();
        const profitDataRaw = await profitResponse.json();
        
        const incomeData = Array.isArray(incomeDataRaw) ? incomeDataRaw : [];
        const profitData = Array.isArray(profitDataRaw) ? profitDataRaw : [];
        
        displayIncomeChart(incomeData);
        displayProfitChart(profitData);
        displayAnalyticsSummary(incomeData, profitData);
    } catch (error) {
        console.error('Error loading analytics:', error);
        // Display empty charts on error
        displayIncomeChart([]);
        displayProfitChart([]);
        displayAnalyticsSummary([], []);
        showMessage('Error loading analytics', 'error');
    }
}

function displayIncomeChart(data) {
    const ctx = document.getElementById('income-chart').getContext('2d');
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.date).reverse(),
            datasets: [{
                label: 'Daily Income',
                data: data.map(d => d.daily_income).reverse(),
                borderColor: '#6a0dad',
                backgroundColor: 'rgba(106, 13, 173, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: {
                        color: 'white'
                    }
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
}

function displayProfitChart(data) {
    const ctx = document.getElementById('profit-chart').getContext('2d');
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.date).reverse(),
            datasets: [
                {
                    label: 'Revenue',
                    data: data.map(d => d.revenue).reverse(),
                    backgroundColor: 'rgba(106, 13, 173, 0.7)'
                },
                {
                    label: 'Cost',
                    data: data.map(d => d.cost).reverse(),
                    backgroundColor: 'rgba(220, 53, 69, 0.7)'
                },
                {
                    label: 'Profit',
                    data: data.map(d => d.profit).reverse(),
                    backgroundColor: 'rgba(40, 167, 69, 0.7)'
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: {
                        color: 'white'
                    }
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
}

function displayAnalyticsSummary(incomeData, profitData) {
    const summaryDiv = document.getElementById('analytics-summary');
    
    const totalIncome = incomeData.reduce((sum, d) => sum + d.daily_income, 0);
    const totalProfit = profitData.reduce((sum, d) => sum + d.profit, 0);
    const totalTransactions = incomeData.reduce((sum, d) => sum + d.transaction_count, 0);
    const avgTransactionValue = totalTransactions > 0 ? totalIncome / totalTransactions : 0;
    
    summaryDiv.innerHTML = `
        <div class="summary-item">
            <h4>Total Income (30 days)</h4>
            <div class="value">${formatCurrency(totalIncome)}</div>
        </div>
        <div class="summary-item">
            <h4>Total Profit (30 days)</h4>
            <div class="value">${formatCurrency(totalProfit)}</div>
        </div>
        <div class="summary-item">
            <h4>Total Transactions</h4>
            <div class="value">${totalTransactions}</div>
        </div>
        <div class="summary-item">
            <h4>Avg Transaction Value</h4>
            <div class="value">${formatCurrency(avgTransactionValue)}</div>
        </div>
    `;
}

// Credit Management
async function loadCreditManagement() {
    try {
        // Initialize credit tab functionality
        initializeCreditTabs();
        
        // Load alerts first
        await loadCreditAlerts();
        
        // Load pending credits by default
        await loadPendingCredits();
        
        // Initialize mark as paid modal
        initializeMarkPaidModal();
    } catch (error) {
        console.error('Error loading credit management:', error);
        showMessage('Error loading credit management', 'error');
    }
}

function initializeCreditTabs() {
    const creditTabButtons = document.querySelectorAll('.credit-tab-btn');
    const creditTabContents = document.querySelectorAll('.credit-tab-content');

    creditTabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-credit-tab');
            
            // Remove active class from all credit tabs and contents
            creditTabButtons.forEach(btn => btn.classList.remove('active'));
            creditTabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            button.classList.add('active');
            document.getElementById(`${targetTab}-credits`).classList.add('active');
            
            // Load data for specific credit tabs
            if (targetTab === 'pending') {
                loadPendingCredits();
            } else if (targetTab === 'overdue') {
                loadOverdueCredits();
            } else if (targetTab === 'paid') {
                loadPaidCredits();
            }
        });
    });
}

function initializeMarkPaidModal() {
    // Set today as default payment date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('payment-date').value = today;
    
    // Handle mark as paid form submission
    document.getElementById('mark-paid-form').addEventListener('submit', handleMarkAsPaid);
}

async function loadCreditAlerts() {
    try {
        const response = await authenticatedFetch('/api/credits/alerts');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const alerts = await response.json();
        displayCreditAlerts(alerts);
    } catch (error) {
        console.error('Error loading credit alerts:', error);
        displayCreditAlerts({ overdue_count: 0, due_soon_count: 0, overdue_amount: 0, due_soon_amount: 0 });
    }
}

function displayCreditAlerts(alerts) {
    const alertsDiv = document.getElementById('credit-alerts');
    
    let alertsHtml = '';
    
    if (alerts.overdue_count > 0) {
        alertsHtml += `
            <div class="alert alert-danger">
                <strong>⚠️ ${alerts.overdue_count} Overdue Credits</strong> - 
                Total Amount: ${formatCurrency(alerts.overdue_amount)}
            </div>
        `;
    }
    
    if (alerts.due_soon_count > 0) {
        alertsHtml += `
            <div class="alert alert-warning">
                <strong>📅 ${alerts.due_soon_count} Credits Due Soon</strong> - 
                Total Amount: ${formatCurrency(alerts.due_soon_amount)}
            </div>
        `;
    }
    
    if (alerts.overdue_count === 0 && alerts.due_soon_count === 0) {
        alertsHtml = `
            <div class="alert alert-success">
                <strong>✅ All Credits Up to Date</strong> - No overdue or upcoming payments
            </div>
        `;
    }
    
    alertsDiv.innerHTML = alertsHtml;
}

async function loadPendingCredits() {
    try {
        const response = await authenticatedFetch('/api/credits/pending');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const credits = await response.json();
        displayCredits(credits, 'pending-credits-list', 'pending');
    } catch (error) {
        console.error('Error loading pending credits:', error);
        displayCredits([], 'pending-credits-list', 'pending');
    }
}

async function loadOverdueCredits() {
    try {
        const response = await authenticatedFetch('/api/credits/overdue');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const credits = await response.json();
        displayCredits(credits, 'overdue-credits-list', 'overdue');
    } catch (error) {
        console.error('Error loading overdue credits:', error);
        displayCredits([], 'overdue-credits-list', 'overdue');
    }
}

async function loadPaidCredits() {
    try {
        const response = await authenticatedFetch('/api/credits/paid');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const credits = await response.json();
        displayCredits(credits, 'paid-credits-list', 'paid');
    } catch (error) {
        console.error('Error loading paid credits:', error);
        displayCredits([], 'paid-credits-list', 'paid');
    }
}

function displayCredits(credits, containerId, type) {
    const container = document.getElementById(containerId);
    
    if (credits.length === 0) {
        container.innerHTML = `<p>No ${type} credits found.</p>`;
        return;
    }
    
    let actionsHeader = '';
    let actionsCell = '';
    
    if (type === 'pending' || type === 'overdue') {
        actionsHeader = '<th>Actions</th>';
        actionsCell = (credit) => `
            <td>
                <button class="btn btn-primary" onclick="openMarkAsPaidModal('${credit.id}', '${credit.customer_name || 'Walk-in'}', ${credit.total_amount})">
                    Mark as Paid
                </button>
            </td>
        `;
    } else if (type === 'paid') {
        actionsHeader = '<th>Payment Info</th>';
        actionsCell = (credit) => `
            <td>
                <small>
                    Paid: ${credit.payment_date ? new Date(credit.payment_date).toLocaleDateString() : 'N/A'}<br>
                    Method: ${credit.payment_method || 'N/A'}
                </small>
            </td>
        `;
    }
    
    const table = `
        <table class="table">
            <thead>
                <tr>
                    <th>Transaction ID</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Due Date</th>
                    <th>Days ${type === 'overdue' ? 'Overdue' : type === 'paid' ? 'Since Payment' : 'Until Due'}</th>
                    <th>Phone</th>
                    ${actionsHeader}
                </tr>
            </thead>
            <tbody>
                ${credits.map(credit => {
                    const today = new Date();
                    const dueDate = new Date(credit.credit_due_date);
                    const daysDiff = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
                    
                    let daysDisplay = '';
                    if (type === 'overdue') {
                        daysDisplay = `<span class="text-danger">${Math.abs(daysDiff)} days</span>`;
                    } else if (type === 'paid') {
                        const paymentDate = credit.payment_date ? new Date(credit.payment_date) : today;
                        const daysSincePayment = Math.ceil((today - paymentDate) / (1000 * 60 * 60 * 24));
                        daysDisplay = `${daysSincePayment} days`;
                    } else {
                        if (daysDiff > 0) {
                            daysDisplay = `<span class="text-danger">Overdue by ${daysDiff} days</span>`;
                        } else {
                            daysDisplay = `<span class="text-success">${Math.abs(daysDiff)} days</span>`;
                        }
                    }
                    
                    return `
                        <tr>
                            <td>${credit.id.substring(0, 8)}...</td>
                            <td>${credit.customer_name || 'Walk-in'}</td>
                            <td>${formatCurrency(credit.total_amount)}</td>
                            <td>${new Date(credit.credit_due_date).toLocaleDateString()}</td>
                            <td>${daysDisplay}</td>
                            <td>${credit.customer_phone || 'N/A'}</td>
                            ${actionsCell(credit)}
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = table;
}

function openMarkAsPaidModal(transactionId, customerName, amount) {
    document.getElementById('paid-transaction-id').value = transactionId;
    document.getElementById('paid-customer-name').value = customerName;
    document.getElementById('paid-amount').value = formatCurrency(amount);
    
    // Reset form fields
    document.getElementById('payment-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('payment-method').value = '';
    document.getElementById('payment-notes').value = '';
    
    document.getElementById('mark-paid-modal').style.display = 'block';
}

async function handleMarkAsPaid(e) {
    e.preventDefault();
    
    const transactionId = document.getElementById('paid-transaction-id').value;
    const paymentDate = document.getElementById('payment-date').value;
    const paymentMethod = document.getElementById('payment-method').value;
    const paymentNotes = document.getElementById('payment-notes').value;
    
    try {
        const response = await authenticatedFetch('/api/credits/mark-paid', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                transaction_id: transactionId,
                payment_date: paymentDate,
                payment_method: paymentMethod,
                payment_notes: paymentNotes
            })
        });
        
        if (response.ok) {
            document.getElementById('mark-paid-modal').style.display = 'none';
            showMessage('Credit marked as paid successfully', 'success');
            
            // Refresh credit data
            loadCreditAlerts();
            loadPendingCredits();
            loadOverdueCredits();
            loadCustomers(); // Refresh customer balances
        } else {
            throw new Error('Failed to mark credit as paid');
        }
    } catch (error) {
        console.error('Error marking credit as paid:', error);
        showMessage('Error marking credit as paid', 'error');
    }
}

// Utility functions
function showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}
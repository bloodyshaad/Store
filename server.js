const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { supabase, db, initializeDatabase } = require('./supabase-config');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || '8f1e87YZ2boH+z7QuBNctciDCuL1nCAEQTva5sakxSCyBKC2fn5n3g9xLSdttZZpBL40vVuVKsmzjjsjtOEuAQ==';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Initialize database on startup
initializeDatabase().then(success => {
    if (success) {
        console.log('✅ Supabase database initialized successfully');
    } else {
        console.log('⚠️ Database initialization had issues - check Supabase configuration');
    }
});

// Authentication middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        req.storeId = req.headers['x-store-id'];
        
        // Validate that storeId is provided
        if (!req.storeId) {
            return res.status(400).json({ error: 'Store ID required' });
        }
        
        next();
    });
}

// Routes

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Authentication Routes
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { firstName, lastName, email, storeName, storeAddress, phone, country, currency, currencySymbol, password } = req.body;

        // Check if email already exists
        const existingUser = await db.select('store_owners', '*', { email });
        if (existingUser.error) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (existingUser.data && existingUser.data.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        try {
            // Hash password
            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(password, saltRounds);

            // Insert store owner
            const ownerResult = await db.insert('store_owners', {
                first_name: firstName,
                last_name: lastName,
                email: email,
                password_hash: passwordHash
            });

            if (ownerResult.error) {
                return res.status(500).json({ error: 'Failed to create account' });
            }

            const ownerId = ownerResult.data[0].id;

            // Insert store
            const storeResult = await db.insert('stores', {
                owner_id: ownerId,
                name: storeName,
                address: storeAddress,
                phone: phone,
                country: country || null,
                currency: currency || 'USD',
                currency_symbol: currencySymbol || '$'
            });

            if (storeResult.error) {
                // If store creation fails, we should ideally delete the owner too
                await db.delete('store_owners', { id: ownerId });
                return res.status(500).json({ error: 'Failed to create store' });
            }

            res.json({ message: 'Account created successfully' });
        } catch (error) {
            console.error('Signup error:', error);
            res.status(500).json({ error: 'Failed to process registration' });
        }
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Get user and store info
        const { data, error } = await supabase
            .from('store_owners')
            .select(`
                id, first_name, last_name, email, password_hash,
                stores (
                    id, name, country, currency, currency_symbol
                )
            `)
            .eq('email', email)
            .single();

        if (error || !data) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        try {
            // Verify password
            const isValidPassword = await bcrypt.compare(password, data.password_hash);
            if (!isValidPassword) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            // Generate JWT token
            const token = jwt.sign(
                { 
                    userId: data.id, 
                    email: data.email,
                    storeId: data.stores[0]?.id 
                },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.json({
                token,
                owner: {
                    id: data.id,
                    name: `${data.first_name} ${data.last_name}`,
                    email: data.email
                },
                store: {
                    id: data.stores[0]?.id,
                    name: data.stores[0]?.name,
                    country: data.stores[0]?.country,
                    currency: data.stores[0]?.currency,
                    currency_symbol: data.stores[0]?.currency_symbol
                }
            });
        } catch (error) {
            console.error('Authentication error:', error);
            res.status(500).json({ error: 'Authentication failed' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Items API
app.get('/api/items', authenticateToken, async (req, res) => {
    try {
        const result = await db.select('items', '*', { 
            store_id: req.storeId,
            order: { column: 'name', ascending: true }
        });
        
        if (result.error) {
            return res.status(500).json({ error: result.error });
        }
        
        res.json(result.data);
    } catch (error) {
        console.error('Get items error:', error);
        res.status(500).json({ error: 'Failed to fetch items' });
    }
});

app.post('/api/items', authenticateToken, async (req, res) => {
    try {
        const { name, barcode, price, cost, stock, category } = req.body;
        
        const result = await db.insert('items', {
            store_id: req.storeId,
            name,
            barcode,
            price: parseFloat(price),
            cost: parseFloat(cost),
            stock: parseInt(stock) || 0,
            category
        });
        
        if (result.error) {
            return res.status(500).json({ error: result.error });
        }
        
        res.json({ 
            id: result.data[0].id, 
            message: 'Item added successfully' 
        });
    } catch (error) {
        console.error('Add item error:', error);
        res.status(500).json({ error: 'Failed to add item' });
    }
});

app.put('/api/items/:id', authenticateToken, async (req, res) => {
    try {
        const { name, barcode, price, cost, stock, category } = req.body;
        
        const result = await db.update('items', {
            name,
            barcode,
            price: parseFloat(price),
            cost: parseFloat(cost),
            stock: parseInt(stock),
            category
        }, {
            id: req.params.id,
            store_id: req.storeId
        });
        
        if (result.error) {
            return res.status(500).json({ error: result.error });
        }
        
        res.json({ message: 'Item updated successfully' });
    } catch (error) {
        console.error('Update item error:', error);
        res.status(500).json({ error: 'Failed to update item' });
    }
});

// Customers API
app.get('/api/customers', authenticateToken, async (req, res) => {
    try {
        const result = await db.select('customers', '*', { 
            store_id: req.storeId,
            order: { column: 'name', ascending: true }
        });
        
        if (result.error) {
            return res.status(500).json({ error: result.error });
        }
        
        res.json(result.data);
    } catch (error) {
        console.error('Get customers error:', error);
        res.status(500).json({ error: 'Failed to fetch customers' });
    }
});

app.post('/api/customers', authenticateToken, async (req, res) => {
    try {
        const { name, phone, email, address } = req.body;
        
        const result = await db.insert('customers', {
            store_id: req.storeId,
            name,
            phone,
            email,
            address
        });
        
        if (result.error) {
            return res.status(500).json({ error: result.error });
        }
        
        res.json({ 
            id: result.data[0].id, 
            message: 'Customer added successfully' 
        });
    } catch (error) {
        console.error('Add customer error:', error);
        res.status(500).json({ error: 'Failed to add customer' });
    }
});

// Transactions API
app.post('/api/transactions', authenticateToken, async (req, res) => {
    try {
        const { customer_id, items, payment_type, credit_due_date } = req.body;
        const transaction_id = uuidv4();
        
        let total_amount = 0;
        items.forEach(item => {
            total_amount += item.quantity * item.unit_price;
        });

        const credit_status = payment_type === 'credit' ? 'pending' : null;

        // Insert transaction
        const transactionResult = await db.insert('transactions', {
            id: transaction_id,
            store_id: req.storeId,
            customer_id: customer_id || null,
            total_amount,
            payment_type,
            credit_due_date: credit_due_date || null,
            credit_status
        });

        if (transactionResult.error) {
            return res.status(500).json({ error: transactionResult.error });
        }

        // Insert transaction items and update stock
        for (const item of items) {
            // Insert transaction item
            await db.insert('transaction_items', {
                transaction_id,
                item_id: item.item_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total_price: item.quantity * item.unit_price
            });
            
            // Update item stock
            const { data: currentItem } = await supabase
                .from('items')
                .select('stock')
                .eq('id', item.item_id)
                .eq('store_id', req.storeId)
                .single();
                
            if (currentItem) {
                await supabase
                    .from('items')
                    .update({ stock: currentItem.stock - item.quantity })
                    .eq('id', item.item_id)
                    .eq('store_id', req.storeId);
            }
        }

        // Update customer balance if credit
        if (payment_type === 'credit' && customer_id) {
            const { data: currentCustomer } = await supabase
                .from('customers')
                .select('current_balance')
                .eq('id', customer_id)
                .eq('store_id', req.storeId)
                .single();
                
            if (currentCustomer) {
                await supabase
                    .from('customers')
                    .update({ current_balance: currentCustomer.current_balance + total_amount })
                    .eq('id', customer_id)
                    .eq('store_id', req.storeId);
            }
        }

        res.json({ transaction_id, message: 'Transaction completed successfully' });
    } catch (error) {
        console.error('Transaction error:', error);
        res.status(500).json({ error: 'Failed to process transaction' });
    }
});

app.get('/api/transactions', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('transactions')
            .select(`
                *,
                customers (name)
            `)
            .eq('store_id', req.storeId)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        // Format the response to match the expected structure
        const formattedData = data.map(transaction => ({
            ...transaction,
            customer_name: transaction.customers?.name || null
        }));

        res.json(formattedData);
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

app.get('/api/transactions/:id', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('transactions')
            .select(`
                *,
                customers (name),
                transaction_items (
                    item_id, quantity, unit_price, total_price,
                    items (name)
                )
            `)
            .eq('id', req.params.id)
            .eq('store_id', req.storeId)
            .single();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.json(data);
    } catch (error) {
        console.error('Get transaction details error:', error);
        res.status(500).json({ error: 'Failed to fetch transaction details' });
    }
});

// Returns API
app.post('/api/returns', authenticateToken, async (req, res) => {
    try {
        const { original_transaction_id, customer_id, items, reason } = req.body;
        const return_id = uuidv4();
        
        let total_refund = 0;
        items.forEach(item => {
            total_refund += item.quantity * item.unit_price;
        });

        // Insert return
        const returnResult = await db.insert('returns', {
            id: return_id,
            store_id: req.storeId,
            original_transaction_id,
            customer_id: customer_id || null,
            total_refund,
            reason
        });

        if (returnResult.error) {
            return res.status(500).json({ error: returnResult.error });
        }

        // Insert return items and update stock
        for (const item of items) {
            // Insert return item
            await db.insert('return_items', {
                return_id,
                item_id: item.item_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total_refund: item.quantity * item.unit_price
            });
            
            // Update item stock
            const { data: currentItem } = await supabase
                .from('items')
                .select('stock')
                .eq('id', item.item_id)
                .eq('store_id', req.storeId)
                .single();
                
            if (currentItem) {
                await supabase
                    .from('items')
                    .update({ stock: currentItem.stock + item.quantity })
                    .eq('id', item.item_id)
                    .eq('store_id', req.storeId);
            }
        }

        // Update customer balance if original was credit
        if (customer_id) {
            const { data: currentCustomer } = await supabase
                .from('customers')
                .select('current_balance')
                .eq('id', customer_id)
                .eq('store_id', req.storeId)
                .single();
                
            if (currentCustomer) {
                await supabase
                    .from('customers')
                    .update({ current_balance: currentCustomer.current_balance - total_refund })
                    .eq('id', customer_id)
                    .eq('store_id', req.storeId);
            }
        }

        res.json({ return_id, message: 'Return processed successfully' });
    } catch (error) {
        console.error('Return error:', error);
        res.status(500).json({ error: 'Failed to process return' });
    }
});

app.get('/api/returns', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('returns')
            .select(`
                *,
                customers (name)
            `)
            .eq('store_id', req.storeId)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        // Format the response to match the expected structure
        const formattedData = data.map(returnItem => ({
            ...returnItem,
            customer_name: returnItem.customers?.name || null
        }));

        res.json(formattedData);
    } catch (error) {
        console.error('Get returns error:', error);
        res.status(500).json({ error: 'Failed to fetch returns' });
    }
});

// Credit Management API
app.get('/api/credits/pending', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('transactions')
            .select(`
                *,
                customers (name, phone)
            `)
            .eq('store_id', req.storeId)
            .eq('payment_type', 'credit')
            .eq('credit_status', 'pending')
            .order('credit_due_date', { ascending: true });

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        // Format the response
        const formattedData = data.map(transaction => ({
            ...transaction,
            customer_name: transaction.customers?.name || null,
            customer_phone: transaction.customers?.phone || null
        }));

        res.json(formattedData);
    } catch (error) {
        console.error('Get pending credits error:', error);
        res.status(500).json({ error: 'Failed to fetch pending credits' });
    }
});

app.get('/api/credits/overdue', authenticateToken, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        const { data, error } = await supabase
            .from('transactions')
            .select(`
                *,
                customers (name, phone)
            `)
            .eq('store_id', req.storeId)
            .eq('payment_type', 'credit')
            .in('credit_status', ['pending', 'overdue'])
            .lt('credit_due_date', today)
            .order('credit_due_date', { ascending: true });

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        // Update credit status to overdue for pending transactions
        for (const transaction of data) {
            if (transaction.credit_status === 'pending') {
                await supabase
                    .from('transactions')
                    .update({ credit_status: 'overdue' })
                    .eq('id', transaction.id)
                    .eq('store_id', req.storeId);
            }
        }

        // Format the response
        const formattedData = data.map(transaction => ({
            ...transaction,
            customer_name: transaction.customers?.name || null,
            customer_phone: transaction.customers?.phone || null,
            days_overdue: Math.floor((new Date() - new Date(transaction.credit_due_date)) / (1000 * 60 * 60 * 24))
        }));

        res.json(formattedData);
    } catch (error) {
        console.error('Get overdue credits error:', error);
        res.status(500).json({ error: 'Failed to fetch overdue credits' });
    }
});

app.get('/api/credits/paid', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('transactions')
            .select(`
                *,
                customers (name, phone)
            `)
            .eq('store_id', req.storeId)
            .eq('payment_type', 'credit')
            .eq('credit_status', 'paid')
            .order('payment_date', { ascending: false });

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        // Format the response
        const formattedData = data.map(transaction => ({
            ...transaction,
            customer_name: transaction.customers?.name || null,
            customer_phone: transaction.customers?.phone || null
        }));

        res.json(formattedData);
    } catch (error) {
        console.error('Get paid credits error:', error);
        res.status(500).json({ error: 'Failed to fetch paid credits' });
    }
});

app.post('/api/credits/mark-paid', authenticateToken, async (req, res) => {
    try {
        const { transaction_id, payment_date, payment_method, payment_notes } = req.body;
        
        // Get transaction details first
        const { data: transaction, error: transactionError } = await supabase
            .from('transactions')
            .select('*')
            .eq('id', transaction_id)
            .eq('store_id', req.storeId)
            .single();

        if (transactionError || !transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // Update transaction as paid
        const { error: updateError } = await supabase
            .from('transactions')
            .update({
                credit_status: 'paid',
                payment_date,
                payment_method,
                payment_notes
            })
            .eq('id', transaction_id)
            .eq('store_id', req.storeId);

        if (updateError) {
            return res.status(500).json({ error: updateError.message });
        }

        // Update customer balance
        if (transaction.customer_id) {
            const { data: currentCustomer } = await supabase
                .from('customers')
                .select('current_balance')
                .eq('id', transaction.customer_id)
                .eq('store_id', req.storeId)
                .single();
                
            if (currentCustomer) {
                await supabase
                    .from('customers')
                    .update({ current_balance: currentCustomer.current_balance - transaction.total_amount })
                    .eq('id', transaction.customer_id)
                    .eq('store_id', req.storeId);
            }
        }

        res.json({ message: 'Credit marked as paid successfully' });
    } catch (error) {
        console.error('Mark paid error:', error);
        res.status(500).json({ error: 'Failed to mark credit as paid' });
    }
});

app.get('/api/credits/alerts', authenticateToken, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        // Get overdue transactions
        const { data: overdueData } = await supabase
            .from('transactions')
            .select('total_amount')
            .eq('store_id', req.storeId)
            .eq('payment_type', 'credit')
            .in('credit_status', ['pending', 'overdue'])
            .lt('credit_due_date', today);

        // Get due soon transactions
        const { data: dueSoonData } = await supabase
            .from('transactions')
            .select('total_amount')
            .eq('store_id', req.storeId)
            .eq('payment_type', 'credit')
            .eq('credit_status', 'pending')
            .gte('credit_due_date', today)
            .lte('credit_due_date', threeDaysFromNow);

        const overdueCount = overdueData?.length || 0;
        const dueSoonCount = dueSoonData?.length || 0;
        const overdueAmount = overdueData?.reduce((sum, t) => sum + t.total_amount, 0) || 0;
        const dueSoonAmount = dueSoonData?.reduce((sum, t) => sum + t.total_amount, 0) || 0;

        res.json({
            overdue_count: overdueCount,
            due_soon_count: dueSoonCount,
            overdue_amount: overdueAmount,
            due_soon_amount: dueSoonAmount
        });
    } catch (error) {
        console.error('Get credit alerts error:', error);
        res.status(500).json({ error: 'Failed to fetch credit alerts' });
    }
});

// Store API - Get store information
app.get('/api/store', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('stores')
            .select(`
                id, name, address, phone, country, currency, currency_symbol,
                store_owners (first_name, last_name, email)
            `)
            .eq('id', req.storeId)
            .single();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        if (!data) {
            return res.status(404).json({ error: 'Store not found' });
        }

        const formattedData = {
            ...data,
            owner_name: `${data.store_owners.first_name} ${data.store_owners.last_name}`,
            owner_email: data.store_owners.email
        };

        res.json(formattedData);
    } catch (error) {
        console.error('Get store error:', error);
        res.status(500).json({ error: 'Failed to fetch store information' });
    }
});

// Analytics API
app.get('/api/analytics/income', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('transactions')
            .select('created_at, total_amount')
            .eq('store_id', req.storeId)
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .limit(1000);

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        // Group by date
        const dailyIncome = {};
        data.forEach(transaction => {
            const date = transaction.created_at.split('T')[0];
            if (!dailyIncome[date]) {
                dailyIncome[date] = { date, daily_income: 0, transaction_count: 0 };
            }
            dailyIncome[date].daily_income += transaction.total_amount;
            dailyIncome[date].transaction_count += 1;
        });

        const result = Object.values(dailyIncome)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 30);

        res.json(result);
    } catch (error) {
        console.error('Get income analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch income analytics' });
    }
});

app.get('/api/analytics/profit', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('transactions')
            .select(`
                created_at,
                transaction_items (
                    quantity, total_price,
                    items (cost)
                )
            `)
            .eq('store_id', req.storeId)
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .limit(1000);

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        // Group by date and calculate profit
        const dailyProfit = {};
        data.forEach(transaction => {
            const date = transaction.created_at.split('T')[0];
            if (!dailyProfit[date]) {
                dailyProfit[date] = { date, revenue: 0, cost: 0, profit: 0 };
            }
            
            transaction.transaction_items.forEach(item => {
                const revenue = item.total_price;
                const cost = item.quantity * item.items.cost;
                const profit = revenue - cost;
                
                dailyProfit[date].revenue += revenue;
                dailyProfit[date].cost += cost;
                dailyProfit[date].profit += profit;
            });
        });

        const result = Object.values(dailyProfit)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 30);

        res.json(result);
    } catch (error) {
        console.error('Get profit analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch profit analytics' });
    }
});

// Admin Authentication
const ADMIN_CREDENTIALS = {
    username: process.env.ADMIN_USERNAME || 'Admin',
    password: process.env.ADMIN_PASSWORD || 'Noori@123'
};

// Admin authentication middleware
function authenticateAdmin(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const adminAccess = req.headers['x-admin-access'];

    if (!token || !adminAccess) {
        return res.status(401).json({ error: 'Admin access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err || !decoded.isAdmin) {
            return res.status(403).json({ error: 'Invalid admin token' });
        }
        req.admin = decoded;
        next();
    });
}

// Admin Routes
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (username !== ADMIN_CREDENTIALS.username || password !== ADMIN_CREDENTIALS.password) {
            return res.status(401).json({ error: 'Invalid admin credentials' });
        }

        // Generate admin JWT token
        const token = jwt.sign(
            { 
                username: username,
                isAdmin: true,
                loginTime: new Date().toISOString()
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            admin: {
                username: username,
                role: 'Administrator'
            }
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin system statistics
app.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
    try {
        // For admin operations, we'll use count queries with head: true to bypass RLS
        const [storesResult, ownersResult, customersResult, transactionsResult] = await Promise.all([
            supabase.from('stores').select('*', { count: 'exact', head: true }),
            supabase.from('store_owners').select('*', { count: 'exact', head: true }),
            supabase.from('customers').select('*', { count: 'exact', head: true }),
            supabase.from('transactions').select('*', { count: 'exact', head: true })
        ]);

        res.json({
            total_stores: storesResult.count || 0,
            total_owners: ownersResult.count || 0,
            total_customers: customersResult.count || 0,
            total_transactions: transactionsResult.count || 0
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ error: 'Failed to fetch admin statistics' });
    }
});

// Admin store management
app.get('/api/admin/stores', authenticateAdmin, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('stores')
            .select(`
                id, name, address, phone, created_at,
                store_owners (id, first_name, last_name, email)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        // Format the response
        const formattedData = data.map(store => ({
            store_id: store.id,
            store_name: store.name,
            store_address: store.address,
            store_phone: store.phone,
            created_at: store.created_at,
            owner_id: store.store_owners.id,
            owner_name: `${store.store_owners.first_name} ${store.store_owners.last_name}`,
            owner_email: store.store_owners.email
        }));

        res.json(formattedData);
    } catch (error) {
        console.error('Admin get stores error:', error);
        res.status(500).json({ error: 'Failed to fetch stores' });
    }
});

// Admin store details
app.get('/api/admin/stores/:id/details', authenticateAdmin, async (req, res) => {
    try {
        const storeId = req.params.id;
        
        // Get store counts
        const [itemsResult, customersResult, transactionsResult] = await Promise.all([
            supabase.from('items').select('*', { count: 'exact', head: true }).eq('store_id', storeId),
            supabase.from('customers').select('*', { count: 'exact', head: true }).eq('store_id', storeId),
            supabase.from('transactions').select('total_amount').eq('store_id', storeId)
        ]);

        // Calculate total revenue
        const totalRevenue = transactionsResult.data?.reduce((sum, t) => sum + (t.total_amount || 0), 0) || 0;

        res.json({
            items_count: itemsResult.count || 0,
            customers_count: customersResult.count || 0,
            transactions_count: transactionsResult.data?.length || 0,
            total_revenue: totalRevenue
        });
    } catch (error) {
        console.error('Admin get store details error:', error);
        res.status(500).json({ error: 'Failed to fetch store details' });
    }
});

app.post('/api/admin/stores', authenticateAdmin, async (req, res) => {
    try {
        const { firstName, lastName, email, storeName, storeAddress, phone, password } = req.body;

        // Check if email already exists
        const existingUser = await db.select('store_owners', '*', { email });
        if (existingUser.error) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (existingUser.data && existingUser.data.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        try {
            // Hash password
            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(password, saltRounds);

            // Insert store owner
            const ownerResult = await db.insert('store_owners', {
                first_name: firstName,
                last_name: lastName,
                email: email,
                password_hash: passwordHash
            });

            if (ownerResult.error) {
                return res.status(500).json({ error: 'Failed to create owner' });
            }

            const ownerId = ownerResult.data[0].id;

            // Insert store
            const storeResult = await db.insert('stores', {
                owner_id: ownerId,
                name: storeName,
                address: storeAddress,
                phone: phone
            });

            if (storeResult.error) {
                // If store creation fails, delete the owner
                await db.delete('store_owners', { id: ownerId });
                return res.status(500).json({ error: 'Failed to create store' });
            }

            res.json({ message: 'Store and owner created successfully' });
        } catch (error) {
            console.error('Admin create store error:', error);
            res.status(500).json({ error: 'Failed to process creation' });
        }
    } catch (error) {
        console.error('Admin create store error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin customers management
app.get('/api/admin/customers', authenticateAdmin, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('customers')
            .select(`
                id, name, phone, email, current_balance, created_at,
                stores (name)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        // Format the response
        const formattedData = data.map(customer => ({
            customer_id: customer.id,
            name: customer.name,
            phone: customer.phone,
            email: customer.email,
            current_balance: customer.current_balance,
            created_at: customer.created_at,
            store_name: customer.stores?.name || 'Unknown'
        }));

        res.json(formattedData);
    } catch (error) {
        console.error('Admin get customers error:', error);
        res.status(500).json({ error: 'Failed to fetch customers' });
    }
});

// Admin store owners management
app.get('/api/admin/owners', authenticateAdmin, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('store_owners')
            .select(`
                id, first_name, last_name, email, created_at,
                stores (name, phone)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        // Format the response
        const formattedData = data.map(owner => ({
            owner_id: owner.id,
            owner_name: `${owner.first_name} ${owner.last_name}`,
            email: owner.email,
            created_at: owner.created_at,
            store_name: owner.stores?.name || 'No Store',
            store_phone: owner.stores?.phone || 'N/A'
        }));

        res.json(formattedData);
    } catch (error) {
        console.error('Admin get owners error:', error);
        res.status(500).json({ error: 'Failed to fetch store owners' });
    }
});

// Admin transactions management
app.get('/api/admin/transactions', authenticateAdmin, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('transactions')
            .select(`
                id, total_amount, payment_type, status, credit_status, created_at,
                customers (name),
                stores (name)
            `)
            .order('created_at', { ascending: false })
            .limit(1000);

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        // Format the response
        const formattedData = data.map(transaction => ({
            id: transaction.id,
            total_amount: transaction.total_amount,
            payment_type: transaction.payment_type,
            status: transaction.status,
            credit_status: transaction.credit_status,
            created_at: transaction.created_at,
            customer_name: transaction.customers?.name || null,
            store_name: transaction.stores?.name || 'Unknown'
        }));

        res.json(formattedData);
    } catch (error) {
        console.error('Admin get transactions error:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// Admin delete operations
app.delete('/api/admin/stores/:id', authenticateAdmin, async (req, res) => {
    try {
        const storeId = req.params.id;
        
        // Validate store ID
        if (!storeId || storeId === '-1') {
            return res.status(400).json({ error: 'Invalid store ID' });
        }

        // Get store details first to get owner_id
        const { data: store, error: storeError } = await supabase
            .from('stores')
            .select('owner_id')
            .eq('id', storeId)
            .single();

        if (storeError || !store) {
            return res.status(404).json({ error: 'Store not found' });
        }

        // Delete store (cascade will handle related data)
        const { error: deleteStoreError } = await supabase
            .from('stores')
            .delete()
            .eq('id', storeId);

        if (deleteStoreError) {
            return res.status(500).json({ error: deleteStoreError.message });
        }

        // Delete store owner
        const { error: deleteOwnerError } = await supabase
            .from('store_owners')
            .delete()
            .eq('id', store.owner_id);

        if (deleteOwnerError) {
            console.error('Error deleting store owner:', deleteOwnerError);
            // Don't fail the request if owner deletion fails
        }

        res.json({ message: 'Store deleted successfully' });
    } catch (error) {
        console.error('Admin delete store error:', error);
        res.status(500).json({ error: 'Failed to delete store' });
    }
});

app.delete('/api/admin/owners/:id', authenticateAdmin, async (req, res) => {
    try {
        const ownerId = req.params.id;
        
        // Validate owner ID
        if (!ownerId || ownerId === '-1') {
            return res.status(400).json({ error: 'Invalid owner ID' });
        }

        // Get store ID first
        const { data: store, error: storeError } = await supabase
            .from('stores')
            .select('id')
            .eq('owner_id', ownerId)
            .single();

        // Delete store first (if exists) - cascade will handle related data
        if (store && !storeError) {
            await supabase
                .from('stores')
                .delete()
                .eq('id', store.id);
        }

        // Delete store owner
        const { error: deleteOwnerError } = await supabase
            .from('store_owners')
            .delete()
            .eq('id', ownerId);

        if (deleteOwnerError) {
            return res.status(500).json({ error: deleteOwnerError.message });
        }

        res.json({ message: 'Store owner deleted successfully' });
    } catch (error) {
        console.error('Admin delete owner error:', error);
        res.status(500).json({ error: 'Failed to delete store owner' });
    }
});

app.delete('/api/admin/customers/:id', authenticateAdmin, async (req, res) => {
    try {
        const customerId = req.params.id;
        
        // Validate customer ID
        if (!customerId || customerId === '-1') {
            return res.status(400).json({ error: 'Invalid customer ID' });
        }

        // Delete customer (cascade will handle related data)
        const { error } = await supabase
            .from('customers')
            .delete()
            .eq('id', customerId);

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.json({ message: 'Customer deleted successfully' });
    } catch (error) {
        console.error('Admin delete customer error:', error);
        res.status(500).json({ error: 'Failed to delete customer' });
    }
});

app.delete('/api/admin/transactions/:id', authenticateAdmin, async (req, res) => {
    try {
        const transactionId = req.params.id;
        
        // Validate transaction ID
        if (!transactionId || transactionId === '-1') {
            return res.status(400).json({ error: 'Invalid transaction ID' });
        }

        // Delete transaction (cascade will handle related data)
        const { error } = await supabase
            .from('transactions')
            .delete()
            .eq('id', transactionId);

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.json({ message: 'Transaction deleted successfully' });
    } catch (error) {
        console.error('Admin delete transaction error:', error);
        res.status(500).json({ error: 'Failed to delete transaction' });
    }
});

// Admin analytics
app.get('/api/admin/analytics', authenticateAdmin, async (req, res) => {
    try {
        // Get revenue by store
        const { data: revenueData, error: revenueError } = await supabase
            .from('stores')
            .select(`
                name,
                transactions!inner (total_amount)
            `)
            .eq('transactions.status', 'completed');

        // Get transactions by store
        const { data: transactionData, error: transactionError } = await supabase
            .from('stores')
            .select(`
                name,
                transactions (id)
            `);

        if (revenueError || transactionError) {
            return res.status(500).json({ error: 'Failed to fetch analytics data' });
        }

        // Process revenue by store
        const revenueByStore = {};
        revenueData?.forEach(store => {
            if (!revenueByStore[store.name]) {
                revenueByStore[store.name] = 0;
            }
            store.transactions.forEach(transaction => {
                revenueByStore[store.name] += transaction.total_amount;
            });
        });

        // Process transactions by store
        const transactionsByStore = {};
        transactionData?.forEach(store => {
            transactionsByStore[store.name] = store.transactions?.length || 0;
        });

        // Calculate totals
        const totalRevenue = Object.values(revenueByStore).reduce((sum, revenue) => sum + revenue, 0);
        const totalTransactions = Object.values(transactionsByStore).reduce((sum, count) => sum + count, 0);
        const storeCount = Object.keys(revenueByStore).length;

        // Format revenue by store
        const formattedRevenueByStore = Object.entries(revenueByStore).map(([store_name, total_revenue]) => ({
            store_name,
            total_revenue
        })).sort((a, b) => b.total_revenue - a.total_revenue);

        // Format transactions by store
        const formattedTransactionsByStore = Object.entries(transactionsByStore).map(([store_name, transaction_count]) => ({
            store_name,
            transaction_count
        })).sort((a, b) => b.transaction_count - a.transaction_count);

        res.json({
            revenue_by_store: formattedRevenueByStore,
            transactions_by_store: formattedTransactionsByStore,
            total_revenue: totalRevenue,
            total_transactions: totalTransactions,
            avg_revenue_per_store: storeCount > 0 ? totalRevenue / storeCount : 0,
            avg_transactions_per_store: storeCount > 0 ? totalTransactions / storeCount : 0
        });
    } catch (error) {
        console.error('Admin analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Grocery Store App running on http://localhost:${PORT}`);
    console.log(`📊 Using Supabase database`);
});

// Export for Vercel serverless functions
module.exports = app;
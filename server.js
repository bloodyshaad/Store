const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Database setup
const db = new sqlite3.Database('./grocery_store.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

// Initialize database tables
function initializeDatabase() {
    // Store owners table
    db.run(`CREATE TABLE IF NOT EXISTS store_owners (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Stores table
    db.run(`CREATE TABLE IF NOT EXISTS stores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        phone TEXT NOT NULL,
        country TEXT,
        currency TEXT,
        currency_symbol TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES store_owners (id)
    )`);

    // Items table (now with store_id for multi-tenancy)
    db.run(`CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        store_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        barcode TEXT,
        price REAL NOT NULL,
        cost REAL NOT NULL,
        stock INTEGER DEFAULT 0,
        category TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (store_id) REFERENCES stores (id),
        UNIQUE(store_id, barcode)
    )`);

    // Customers table (now with store_id for multi-tenancy)
    db.run(`CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        store_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT,
        credit_limit REAL DEFAULT 0,
        current_balance REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (store_id) REFERENCES stores (id)
    )`);

    // Transactions table (now with store_id for multi-tenancy)
    db.run(`CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        store_id INTEGER NOT NULL,
        customer_id INTEGER,
        total_amount REAL NOT NULL,
        payment_type TEXT NOT NULL CHECK(payment_type IN ('cash', 'credit')),
        status TEXT DEFAULT 'completed',
        credit_due_date DATE,
        credit_status TEXT DEFAULT 'pending' CHECK(credit_status IN ('pending', 'paid', 'overdue')),
        payment_date DATE,
        payment_method TEXT,
        payment_notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (store_id) REFERENCES stores (id),
        FOREIGN KEY (customer_id) REFERENCES customers (id)
    )`);

    // Transaction items table
    db.run(`CREATE TABLE IF NOT EXISTS transaction_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id TEXT,
        item_id INTEGER,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        total_price REAL NOT NULL,
        FOREIGN KEY (transaction_id) REFERENCES transactions (id),
        FOREIGN KEY (item_id) REFERENCES items (id)
    )`);

    // Returns table (now with store_id for multi-tenancy)
    db.run(`CREATE TABLE IF NOT EXISTS returns (
        id TEXT PRIMARY KEY,
        store_id INTEGER NOT NULL,
        original_transaction_id TEXT,
        customer_id INTEGER,
        total_refund REAL NOT NULL,
        reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (store_id) REFERENCES stores (id),
        FOREIGN KEY (original_transaction_id) REFERENCES transactions (id),
        FOREIGN KEY (customer_id) REFERENCES customers (id)
    )`);

    // Return items table
    db.run(`CREATE TABLE IF NOT EXISTS return_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        return_id TEXT,
        item_id INTEGER,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        total_refund REAL NOT NULL,
        FOREIGN KEY (return_id) REFERENCES returns (id),
        FOREIGN KEY (item_id) REFERENCES items (id)
    )`);

    console.log('Database tables initialized');
}

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
        
        // Validate that storeId is provided and is a valid number
        if (!req.storeId || isNaN(parseInt(req.storeId))) {
            return res.status(400).json({ error: 'Valid Store ID required' });
        }
        
        req.storeId = parseInt(req.storeId);
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
        db.get('SELECT id FROM store_owners WHERE email = ?', [email], async (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            if (row) {
                return res.status(400).json({ error: 'Email already registered' });
            }

            try {
                // Hash password
                const saltRounds = 10;
                const passwordHash = await bcrypt.hash(password, saltRounds);

                db.serialize(() => {
                    db.run('BEGIN TRANSACTION');

                    // Insert store owner
                    db.run(
                        'INSERT INTO store_owners (first_name, last_name, email, password_hash) VALUES (?, ?, ?, ?)',
                        [firstName, lastName, email, passwordHash],
                        function(err) {
                            if (err) {
                                db.run('ROLLBACK');
                                return res.status(500).json({ error: 'Failed to create account' });
                            }

                            const ownerId = this.lastID;

                            // Insert store with country and currency
                            db.run(
                                'INSERT INTO stores (owner_id, name, address, phone, country, currency, currency_symbol) VALUES (?, ?, ?, ?, ?, ?, ?)',
                                [ownerId, storeName, storeAddress, phone, country, currency, currencySymbol],
                                function(err) {
                                    if (err) {
                                        db.run('ROLLBACK');
                                        return res.status(500).json({ error: 'Failed to create store' });
                                    }

                                    db.run('COMMIT', (err) => {
                                        if (err) {
                                            db.run('ROLLBACK');
                                            return res.status(500).json({ error: 'Failed to complete registration' });
                                        }
                                        res.json({ message: 'Account created successfully' });
                                    });
                                }
                            );
                        }
                    );
                });
            } catch (error) {
                res.status(500).json({ error: 'Failed to process registration' });
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Get user and store info including country and currency
        const query = `
            SELECT so.id, so.first_name, so.last_name, so.email, so.password_hash,
                   s.id as store_id, s.name as store_name, s.country, s.currency, s.currency_symbol
            FROM store_owners so
            JOIN stores s ON so.id = s.owner_id
            WHERE so.email = ?
        `;

        db.get(query, [email], async (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            if (!row) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            try {
                // Verify password
                const isValidPassword = await bcrypt.compare(password, row.password_hash);
                if (!isValidPassword) {
                    return res.status(401).json({ error: 'Invalid email or password' });
                }

                // Generate JWT token
                const token = jwt.sign(
                    { 
                        userId: row.id, 
                        email: row.email,
                        storeId: row.store_id 
                    },
                    JWT_SECRET,
                    { expiresIn: '24h' }
                );

                res.json({
                    token,
                    owner: {
                        id: row.id,
                        name: `${row.first_name} ${row.last_name}`,
                        email: row.email
                    },
                    store: {
                        id: row.store_id,
                        name: row.store_name,
                        country: row.country,
                        currency: row.currency,
                        currency_symbol: row.currency_symbol
                    }
                });
            } catch (error) {
                res.status(500).json({ error: 'Authentication failed' });
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Items API (now with multi-tenancy)
app.get('/api/items', authenticateToken, (req, res) => {
    db.all('SELECT * FROM items WHERE store_id = ? ORDER BY name', [req.storeId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

app.post('/api/items', authenticateToken, (req, res) => {
    const { name, barcode, price, cost, stock, category } = req.body;
    db.run(
        'INSERT INTO items (store_id, name, barcode, price, cost, stock, category) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [req.storeId, name, barcode, price, cost, stock, category],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json({ id: this.lastID, message: 'Item added successfully' });
            }
        }
    );
});

app.put('/api/items/:id', authenticateToken, (req, res) => {
    const { name, barcode, price, cost, stock, category } = req.body;
    db.run(
        'UPDATE items SET name = ?, barcode = ?, price = ?, cost = ?, stock = ?, category = ? WHERE id = ? AND store_id = ?',
        [name, barcode, price, cost, stock, category, req.params.id, req.storeId],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json({ message: 'Item updated successfully' });
            }
        }
    );
});

// Customers API (now with multi-tenancy)
app.get('/api/customers', authenticateToken, (req, res) => {
    db.all('SELECT * FROM customers WHERE store_id = ? ORDER BY name', [req.storeId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

app.post('/api/customers', authenticateToken, (req, res) => {
    const { name, phone, email, address } = req.body;
    db.run(
        'INSERT INTO customers (store_id, name, phone, email, address) VALUES (?, ?, ?, ?, ?)',
        [req.storeId, name, phone, email, address],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json({ id: this.lastID, message: 'Customer added successfully' });
            }
        }
    );
});

// Transactions API (now with multi-tenancy)
app.post('/api/transactions', authenticateToken, (req, res) => {
    const { customer_id, items, payment_type, credit_due_date } = req.body;
    const transaction_id = uuidv4();
    
    let total_amount = 0;
    items.forEach(item => {
        total_amount += item.quantity * item.unit_price;
    });

    // Set credit status based on payment type
    const credit_status = payment_type === 'credit' ? 'pending' : null;

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // Insert transaction
        db.run(
            'INSERT INTO transactions (id, store_id, customer_id, total_amount, payment_type, credit_due_date, credit_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [transaction_id, req.storeId, customer_id, total_amount, payment_type, credit_due_date, credit_status],
            function(err) {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: err.message });
                }
            }
        );

        // Insert transaction items and update stock
        items.forEach(item => {
            db.run(
                'INSERT INTO transaction_items (transaction_id, item_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)',
                [transaction_id, item.item_id, item.quantity, item.unit_price, item.quantity * item.unit_price]
            );
            
            db.run(
                'UPDATE items SET stock = stock - ? WHERE id = ? AND store_id = ?',
                [item.quantity, item.item_id, req.storeId]
            );
        });

        // Update customer balance if credit
        if (payment_type === 'credit' && customer_id) {
            db.run(
                'UPDATE customers SET current_balance = current_balance + ? WHERE id = ? AND store_id = ?',
                [total_amount, customer_id, req.storeId]
            );
        }

        db.run('COMMIT', (err) => {
            if (err) {
                db.run('ROLLBACK');
                res.status(500).json({ error: err.message });
            } else {
                res.json({ transaction_id, message: 'Transaction completed successfully' });
            }
        });
    });
});

app.get('/api/transactions', authenticateToken, (req, res) => {
    const query = `
        SELECT t.*, c.name as customer_name 
        FROM transactions t 
        LEFT JOIN customers c ON t.customer_id = c.id 
        WHERE t.store_id = ?
        ORDER BY t.created_at DESC
    `;
    db.all(query, [req.storeId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

app.get('/api/transactions/:id', authenticateToken, (req, res) => {
    const query = `
        SELECT t.*, c.name as customer_name,
               ti.item_id, ti.quantity, ti.unit_price, ti.total_price,
               i.name as item_name
        FROM transactions t
        LEFT JOIN customers c ON t.customer_id = c.id
        LEFT JOIN transaction_items ti ON t.id = ti.transaction_id
        LEFT JOIN items i ON ti.item_id = i.id
        WHERE t.id = ? AND t.store_id = ?
    `;
    db.all(query, [req.params.id, req.storeId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// Returns API (now with multi-tenancy)
app.post('/api/returns', authenticateToken, (req, res) => {
    const { original_transaction_id, customer_id, items, reason } = req.body;
    const return_id = uuidv4();
    
    let total_refund = 0;
    items.forEach(item => {
        total_refund += item.quantity * item.unit_price;
    });

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // Insert return
        db.run(
            'INSERT INTO returns (id, store_id, original_transaction_id, customer_id, total_refund, reason) VALUES (?, ?, ?, ?, ?, ?)',
            [return_id, req.storeId, original_transaction_id, customer_id, total_refund, reason],
            function(err) {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: err.message });
                }
            }
        );

        // Insert return items and update stock
        items.forEach(item => {
            db.run(
                'INSERT INTO return_items (return_id, item_id, quantity, unit_price, total_refund) VALUES (?, ?, ?, ?, ?)',
                [return_id, item.item_id, item.quantity, item.unit_price, item.quantity * item.unit_price]
            );
            
            db.run(
                'UPDATE items SET stock = stock + ? WHERE id = ? AND store_id = ?',
                [item.quantity, item.item_id, req.storeId]
            );
        });

        // Update customer balance if original was credit
        if (customer_id) {
            db.run(
                'UPDATE customers SET current_balance = current_balance - ? WHERE id = ? AND store_id = ?',
                [total_refund, customer_id, req.storeId]
            );
        }

        db.run('COMMIT', (err) => {
            if (err) {
                db.run('ROLLBACK');
                res.status(500).json({ error: err.message });
            } else {
                res.json({ return_id, message: 'Return processed successfully' });
            }
        });
    });
});

app.get('/api/returns', authenticateToken, (req, res) => {
    const query = `
        SELECT r.*, c.name as customer_name 
        FROM returns r 
        LEFT JOIN customers c ON r.customer_id = c.id 
        WHERE r.store_id = ?
        ORDER BY r.created_at DESC
    `;
    db.all(query, [req.storeId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// Credit Management API
app.get('/api/credits/pending', authenticateToken, (req, res) => {
    const query = `
        SELECT t.*, c.name as customer_name, c.phone as customer_phone
        FROM transactions t 
        LEFT JOIN customers c ON t.customer_id = c.id 
        WHERE t.store_id = ? AND t.payment_type = 'credit' AND t.credit_status = 'pending'
        ORDER BY t.credit_due_date ASC
    `;
    db.all(query, [req.storeId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

app.get('/api/credits/overdue', authenticateToken, (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const query = `
        SELECT t.*, c.name as customer_name, c.phone as customer_phone,
               julianday('${today}') - julianday(t.credit_due_date) as days_overdue
        FROM transactions t 
        LEFT JOIN customers c ON t.customer_id = c.id 
        WHERE t.store_id = ? AND t.payment_type = 'credit' 
        AND (t.credit_status = 'pending' OR t.credit_status = 'overdue')
        AND t.credit_due_date < '${today}'
        ORDER BY t.credit_due_date ASC
    `;
    db.all(query, [req.storeId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            // Update credit status to overdue for these transactions
            rows.forEach(row => {
                if (row.credit_status === 'pending') {
                    db.run(
                        'UPDATE transactions SET credit_status = ? WHERE id = ? AND store_id = ?',
                        ['overdue', row.id, req.storeId]
                    );
                }
            });
            res.json(rows);
        }
    });
});

app.get('/api/credits/paid', authenticateToken, (req, res) => {
    const query = `
        SELECT t.*, c.name as customer_name, c.phone as customer_phone
        FROM transactions t 
        LEFT JOIN customers c ON t.customer_id = c.id 
        WHERE t.store_id = ? AND t.payment_type = 'credit' AND t.credit_status = 'paid'
        ORDER BY t.payment_date DESC
    `;
    db.all(query, [req.storeId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

app.post('/api/credits/mark-paid', authenticateToken, (req, res) => {
    const { transaction_id, payment_date, payment_method, payment_notes } = req.body;
    
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // Get transaction details first
        db.get(
            'SELECT * FROM transactions WHERE id = ? AND store_id = ?',
            [transaction_id, req.storeId],
            (err, transaction) => {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: err.message });
                }
                
                if (!transaction) {
                    db.run('ROLLBACK');
                    return res.status(404).json({ error: 'Transaction not found' });
                }
                
                // Update transaction as paid
                db.run(
                    'UPDATE transactions SET credit_status = ?, payment_date = ?, payment_method = ?, payment_notes = ? WHERE id = ? AND store_id = ?',
                    ['paid', payment_date, payment_method, payment_notes, transaction_id, req.storeId],
                    function(err) {
                        if (err) {
                            db.run('ROLLBACK');
                            return res.status(500).json({ error: err.message });
                        }
                        
                        // Update customer balance
                        if (transaction.customer_id) {
                            db.run(
                                'UPDATE customers SET current_balance = current_balance - ? WHERE id = ? AND store_id = ?',
                                [transaction.total_amount, transaction.customer_id, req.storeId],
                                function(err) {
                                    if (err) {
                                        db.run('ROLLBACK');
                                        return res.status(500).json({ error: err.message });
                                    }
                                    
                                    db.run('COMMIT', (err) => {
                                        if (err) {
                                            db.run('ROLLBACK');
                                            res.status(500).json({ error: err.message });
                                        } else {
                                            res.json({ message: 'Credit marked as paid successfully' });
                                        }
                                    });
                                }
                            );
                        } else {
                            db.run('COMMIT', (err) => {
                                if (err) {
                                    db.run('ROLLBACK');
                                    res.status(500).json({ error: err.message });
                                } else {
                                    res.json({ message: 'Credit marked as paid successfully' });
                                }
                            });
                        }
                    }
                );
            }
        );
    });
});

app.get('/api/credits/alerts', authenticateToken, (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const query = `
        SELECT 
            COUNT(CASE WHEN t.credit_due_date < '${today}' AND t.credit_status IN ('pending', 'overdue') THEN 1 END) as overdue_count,
            COUNT(CASE WHEN t.credit_due_date BETWEEN '${today}' AND '${threeDaysFromNow}' AND t.credit_status = 'pending' THEN 1 END) as due_soon_count,
            SUM(CASE WHEN t.credit_due_date < '${today}' AND t.credit_status IN ('pending', 'overdue') THEN t.total_amount ELSE 0 END) as overdue_amount,
            SUM(CASE WHEN t.credit_due_date BETWEEN '${today}' AND '${threeDaysFromNow}' AND t.credit_status = 'pending' THEN t.total_amount ELSE 0 END) as due_soon_amount
        FROM transactions t 
        WHERE t.store_id = ? AND t.payment_type = 'credit'
    `;
    
    db.get(query, [req.storeId], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(row);
        }
    });
});

// Store API - Get store information
app.get('/api/store', authenticateToken, (req, res) => {
    const query = `
        SELECT s.id, s.name, s.address, s.phone, s.country, s.currency, s.currency_symbol,
               so.first_name || ' ' || so.last_name as owner_name, so.email as owner_email
        FROM stores s
        JOIN store_owners so ON s.owner_id = so.id
        WHERE s.id = ?
    `;
    
    db.get(query, [req.storeId], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else if (!row) {
            res.status(404).json({ error: 'Store not found' });
        } else {
            res.json(row);
        }
    });
});

// Analytics API (now with multi-tenancy)
app.get('/api/analytics/income', authenticateToken, (req, res) => {
    const query = `
        SELECT 
            DATE(created_at) as date,
            SUM(total_amount) as daily_income,
            COUNT(*) as transaction_count
        FROM transactions 
        WHERE status = 'completed' AND store_id = ?
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
    `;
    db.all(query, [req.storeId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

app.get('/api/analytics/profit', authenticateToken, (req, res) => {
    const query = `
        SELECT 
            DATE(t.created_at) as date,
            SUM(ti.total_price) as revenue,
            SUM(ti.quantity * i.cost) as cost,
            SUM(ti.total_price - (ti.quantity * i.cost)) as profit
        FROM transactions t
        JOIN transaction_items ti ON t.id = ti.transaction_id
        JOIN items i ON ti.item_id = i.id
        WHERE t.status = 'completed' AND t.store_id = ?
        GROUP BY DATE(t.created_at)
        ORDER BY date DESC
        LIMIT 30
    `;
    db.all(query, [req.storeId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Grocery Store App running on http://localhost:${PORT}`);
});

// Admin Authentication
const ADMIN_CREDENTIALS = {
    username: 'Admin',
    password: '8888'
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
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin system statistics
app.get('/api/admin/stats', authenticateAdmin, (req, res) => {
    const queries = [
        'SELECT COUNT(*) as total_stores FROM stores',
        'SELECT COUNT(*) as total_owners FROM store_owners',
        'SELECT COUNT(*) as total_customers FROM customers',
        'SELECT COUNT(*) as total_transactions FROM transactions'
    ];

    Promise.all(queries.map(query => {
        return new Promise((resolve, reject) => {
            db.get(query, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    })).then(results => {
        res.json({
            total_stores: results[0].total_stores,
            total_owners: results[1].total_owners,
            total_customers: results[2].total_customers,
            total_transactions: results[3].total_transactions
        });
    }).catch(err => {
        res.status(500).json({ error: err.message });
    });
});

// Admin store management
app.get('/api/admin/stores', authenticateAdmin, (req, res) => {
    const query = `
        SELECT s.id as store_id, s.name as store_name, s.address as store_address, 
               s.phone as store_phone, s.created_at,
               so.id as owner_id, so.first_name || ' ' || so.last_name as owner_name,
               so.email as owner_email
        FROM stores s
        JOIN store_owners so ON s.owner_id = so.id
        ORDER BY s.created_at DESC
    `;
    
    db.all(query, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

app.post('/api/admin/stores', authenticateAdmin, async (req, res) => {
    const { firstName, lastName, email, storeName, storeAddress, phone, password } = req.body;

    try {
        // Check if email already exists
        db.get('SELECT id FROM store_owners WHERE email = ?', [email], async (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            if (row) {
                return res.status(400).json({ error: 'Email already registered' });
            }

            try {
                // Hash password
                const saltRounds = 10;
                const passwordHash = await bcrypt.hash(password, saltRounds);

                db.serialize(() => {
                    db.run('BEGIN TRANSACTION');

                    // Insert store owner
                    db.run(
                        'INSERT INTO store_owners (first_name, last_name, email, password_hash) VALUES (?, ?, ?, ?)',
                        [firstName, lastName, email, passwordHash],
                        function(err) {
                            if (err) {
                                db.run('ROLLBACK');
                                return res.status(500).json({ error: 'Failed to create owner' });
                            }

                            const ownerId = this.lastID;

                            // Insert store
                            db.run(
                                'INSERT INTO stores (owner_id, name, address, phone) VALUES (?, ?, ?, ?)',
                                [ownerId, storeName, storeAddress, phone],
                                function(err) {
                                    if (err) {
                                        db.run('ROLLBACK');
                                        return res.status(500).json({ error: 'Failed to create store' });
                                    }

                                    db.run('COMMIT', (err) => {
                                        if (err) {
                                            db.run('ROLLBACK');
                                            return res.status(500).json({ error: 'Failed to complete creation' });
                                        }
                                        res.json({ message: 'Store and owner created successfully' });
                                    });
                                }
                            );
                        }
                    );
                });
            } catch (error) {
                res.status(500).json({ error: 'Failed to process creation' });
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/admin/stores/:id', authenticateAdmin, (req, res) => {
    const storeId = req.params.id;
    
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // Delete in order to maintain referential integrity
        const deleteQueries = [
            'DELETE FROM return_items WHERE return_id IN (SELECT id FROM returns WHERE store_id = ?)',
            'DELETE FROM returns WHERE store_id = ?',
            'DELETE FROM transaction_items WHERE transaction_id IN (SELECT id FROM transactions WHERE store_id = ?)',
            'DELETE FROM transactions WHERE store_id = ?',
            'DELETE FROM customers WHERE store_id = ?',
            'DELETE FROM items WHERE store_id = ?'
        ];
        
        let completed = 0;
        const total = deleteQueries.length;
        
        deleteQueries.forEach(query => {
            db.run(query, [storeId], (err) => {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: err.message });
                }
                
                completed++;
                if (completed === total) {
                    // Get owner_id before deleting store
                    db.get('SELECT owner_id FROM stores WHERE id = ?', [storeId], (err, row) => {
                        if (err) {
                            db.run('ROLLBACK');
                            return res.status(500).json({ error: err.message });
                        }
                        
                        const ownerId = row ? row.owner_id : null;
                        
                        // Delete store
                        db.run('DELETE FROM stores WHERE id = ?', [storeId], (err) => {
                            if (err) {
                                db.run('ROLLBACK');
                                return res.status(500).json({ error: err.message });
                            }
                            
                            // Delete store owner
                            if (ownerId) {
                                db.run('DELETE FROM store_owners WHERE id = ?', [ownerId], (err) => {
                                    if (err) {
                                        db.run('ROLLBACK');
                                        return res.status(500).json({ error: err.message });
                                    }
                                    
                                    db.run('COMMIT', (err) => {
                                        if (err) {
                                            db.run('ROLLBACK');
                                            res.status(500).json({ error: err.message });
                                        } else {
                                            res.json({ message: 'Store deleted successfully' });
                                        }
                                    });
                                });
                            } else {
                                db.run('COMMIT', (err) => {
                                    if (err) {
                                        db.run('ROLLBACK');
                                        res.status(500).json({ error: err.message });
                                    } else {
                                        res.json({ message: 'Store deleted successfully' });
                                    }
                                });
                            }
                        });
                    });
                }
            });
        });
    });
});

app.get('/api/admin/stores/:id/details', authenticateAdmin, (req, res) => {
    const storeId = req.params.id;
    
    const queries = [
        'SELECT COUNT(*) as items_count FROM items WHERE store_id = ?',
        'SELECT COUNT(*) as customers_count FROM customers WHERE store_id = ?',
        'SELECT COUNT(*) as transactions_count FROM transactions WHERE store_id = ?',
        'SELECT COALESCE(SUM(total_amount), 0) as total_revenue FROM transactions WHERE store_id = ? AND status = "completed"'
    ];

    Promise.all(queries.map(query => {
        return new Promise((resolve, reject) => {
            db.get(query, [storeId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    })).then(results => {
        res.json({
            items_count: results[0].items_count,
            customers_count: results[1].customers_count,
            transactions_count: results[2].transactions_count,
            total_revenue: results[3].total_revenue
        });
    }).catch(err => {
        res.status(500).json({ error: err.message });
    });
});

// Admin store owners management
app.get('/api/admin/owners', authenticateAdmin, (req, res) => {
    const query = `
        SELECT so.id as owner_id, so.first_name || ' ' || so.last_name as owner_name,
               so.email, so.created_at,
               s.name as store_name, s.phone as store_phone
        FROM store_owners so
        LEFT JOIN stores s ON so.id = s.owner_id
        ORDER BY so.created_at DESC
    `;
    
    db.all(query, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

app.delete('/api/admin/owners/:id', authenticateAdmin, (req, res) => {
    const ownerId = req.params.id;
    
    // First get the store_id
    db.get('SELECT id FROM stores WHERE owner_id = ?', [ownerId], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        const storeId = row ? row.id : null;
        
        if (storeId) {
            // Delete store and all related data first
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');
                
                const deleteQueries = [
                    'DELETE FROM return_items WHERE return_id IN (SELECT id FROM returns WHERE store_id = ?)',
                    'DELETE FROM returns WHERE store_id = ?',
                    'DELETE FROM transaction_items WHERE transaction_id IN (SELECT id FROM transactions WHERE store_id = ?)',
                    'DELETE FROM transactions WHERE store_id = ?',
                    'DELETE FROM customers WHERE store_id = ?',
                    'DELETE FROM items WHERE store_id = ?',
                    'DELETE FROM stores WHERE id = ?'
                ];
                
                let completed = 0;
                const total = deleteQueries.length;
                
                deleteQueries.forEach((query, index) => {
                    const params = index === deleteQueries.length - 1 ? [storeId] : [storeId];
                    db.run(query, params, (err) => {
                        if (err) {
                            db.run('ROLLBACK');
                            return res.status(500).json({ error: err.message });
                        }
                        
                        completed++;
                        if (completed === total) {
                            // Finally delete the owner
                            db.run('DELETE FROM store_owners WHERE id = ?', [ownerId], (err) => {
                                if (err) {
                                    db.run('ROLLBACK');
                                    return res.status(500).json({ error: err.message });
                                }
                                
                                db.run('COMMIT', (err) => {
                                    if (err) {
                                        db.run('ROLLBACK');
                                        res.status(500).json({ error: err.message });
                                    } else {
                                        res.json({ message: 'Store owner deleted successfully' });
                                    }
                                });
                            });
                        }
                    });
                });
            });
        } else {
            // Just delete the owner if no store
            db.run('DELETE FROM store_owners WHERE id = ?', [ownerId], (err) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                } else {
                    res.json({ message: 'Store owner deleted successfully' });
                }
            });
        }
    });
});

// Admin customers management
app.get('/api/admin/customers', authenticateAdmin, (req, res) => {
    const query = `
        SELECT c.id as customer_id, c.name, c.phone, c.email, c.current_balance, c.created_at,
               s.name as store_name
        FROM customers c
        JOIN stores s ON c.store_id = s.id
        ORDER BY c.created_at DESC
    `;
    
    db.all(query, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

app.delete('/api/admin/customers/:id', authenticateAdmin, (req, res) => {
    const customerId = req.params.id;
    
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // Delete customer transactions and related data
        const deleteQueries = [
            'DELETE FROM return_items WHERE return_id IN (SELECT id FROM returns WHERE customer_id = ?)',
            'DELETE FROM returns WHERE customer_id = ?',
            'DELETE FROM transaction_items WHERE transaction_id IN (SELECT id FROM transactions WHERE customer_id = ?)',
            'DELETE FROM transactions WHERE customer_id = ?',
            'DELETE FROM customers WHERE id = ?'
        ];
        
        let completed = 0;
        const total = deleteQueries.length;
        
        deleteQueries.forEach(query => {
            db.run(query, [customerId], (err) => {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: err.message });
                }
                
                completed++;
                if (completed === total) {
                    db.run('COMMIT', (err) => {
                        if (err) {
                            db.run('ROLLBACK');
                            res.status(500).json({ error: err.message });
                        } else {
                            res.json({ message: 'Customer deleted successfully' });
                        }
                    });
                }
            });
        });
    });
});

// Admin transactions management
app.get('/api/admin/transactions', authenticateAdmin, (req, res) => {
    const query = `
        SELECT t.id, t.total_amount, t.payment_type, t.status, t.credit_status, t.created_at,
               c.name as customer_name, s.name as store_name
        FROM transactions t
        LEFT JOIN customers c ON t.customer_id = c.id
        JOIN stores s ON t.store_id = s.id
        ORDER BY t.created_at DESC
        LIMIT 1000
    `;
    
    db.all(query, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

app.delete('/api/admin/transactions/:id', authenticateAdmin, (req, res) => {
    const transactionId = req.params.id;
    
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // Delete transaction and related data
        const deleteQueries = [
            'DELETE FROM return_items WHERE return_id IN (SELECT id FROM returns WHERE original_transaction_id = ?)',
            'DELETE FROM returns WHERE original_transaction_id = ?',
            'DELETE FROM transaction_items WHERE transaction_id = ?',
            'DELETE FROM transactions WHERE id = ?'
        ];
        
        let completed = 0;
        const total = deleteQueries.length;
        
        deleteQueries.forEach(query => {
            db.run(query, [transactionId], (err) => {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: err.message });
                }
                
                completed++;
                if (completed === total) {
                    db.run('COMMIT', (err) => {
                        if (err) {
                            db.run('ROLLBACK');
                            res.status(500).json({ error: err.message });
                        } else {
                            res.json({ message: 'Transaction deleted successfully' });
                        }
                    });
                }
            });
        });
    });
});

// Admin analytics
app.get('/api/admin/analytics', authenticateAdmin, (req, res) => {
    const queries = [
        // Revenue by store
        `SELECT s.name as store_name, COALESCE(SUM(t.total_amount), 0) as total_revenue
         FROM stores s
         LEFT JOIN transactions t ON s.id = t.store_id AND t.status = 'completed'
         GROUP BY s.id, s.name
         ORDER BY total_revenue DESC`,
        
        // Transactions by store
        `SELECT s.name as store_name, COUNT(t.id) as transaction_count
         FROM stores s
         LEFT JOIN transactions t ON s.id = t.store_id
         GROUP BY s.id, s.name
         ORDER BY transaction_count DESC`,
        
        // Total system revenue
        `SELECT COALESCE(SUM(total_amount), 0) as total_revenue FROM transactions WHERE status = 'completed'`,
        
        // Total system transactions
        `SELECT COUNT(*) as total_transactions FROM transactions`
    ];

    Promise.all(queries.map(query => {
        return new Promise((resolve, reject) => {
            db.all(query, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    })).then(results => {
        const totalRevenue = results[2][0].total_revenue;
        const totalTransactions = results[3][0].total_transactions;
        const storeCount = results[0].length;
        
        res.json({
            revenue_by_store: results[0],
            transactions_by_store: results[1],
            total_revenue: totalRevenue,
            total_transactions: totalTransactions,
            avg_revenue_per_store: storeCount > 0 ? totalRevenue / storeCount : 0,
            avg_transactions_per_store: storeCount > 0 ? totalTransactions / storeCount : 0
        });
    }).catch(err => {
        res.status(500).json({ error: err.message });
    });
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Database connection closed.');
        process.exit(0);
    });
});
// Export for Vercel serverless functions
module.exports = app;

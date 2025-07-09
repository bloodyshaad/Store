// Fix for admin transactions endpoint
// This script will help debug the issue

const sqlite3 = require('sqlite3').verbose();

// Open database
const db = new sqlite3.Database('./grocery_store.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        return;
    }
    console.log('Connected to SQLite database');
});

// Test the admin transactions query
const query = `
    SELECT t.id, t.total_amount, t.payment_type, t.status, t.credit_status, t.created_at,
           c.name as customer_name, s.name as store_name
    FROM transactions t
    LEFT JOIN customers c ON t.customer_id = c.id
    JOIN stores s ON t.store_id = s.id
    ORDER BY t.created_at DESC
    LIMIT 1000
`;

console.log('Testing admin transactions query...');

db.all(query, (err, rows) => {
    if (err) {
        console.error('Database error:', err.message);
        
        // Let's try a simpler query to see what's in the database
        console.log('\nTrying simpler queries...');
        
        db.get('SELECT COUNT(*) as count FROM transactions', (err, row) => {
            if (err) {
                console.error('Error counting transactions:', err.message);
            } else {
                console.log('Total transactions:', row.count);
            }
        });
        
        db.get('SELECT COUNT(*) as count FROM stores', (err, row) => {
            if (err) {
                console.error('Error counting stores:', err.message);
            } else {
                console.log('Total stores:', row.count);
            }
        });
        
        db.get('SELECT COUNT(*) as count FROM customers', (err, row) => {
            if (err) {
                console.error('Error counting customers:', err.message);
            } else {
                console.log('Total customers:', row.count);
            }
        });
        
    } else {
        console.log(`Found ${rows.length} transactions`);
        if (rows.length > 0) {
            console.log('Sample transaction:', rows[0]);
        }
    }
    
    db.close();
});
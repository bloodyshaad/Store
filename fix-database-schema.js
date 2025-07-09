// Fix database schema - add missing columns
const sqlite3 = require('sqlite3').verbose();

// Open database
const db = new sqlite3.Database('./grocery_store.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        return;
    }
    console.log('Connected to SQLite database');
});

// Check current schema
db.all("PRAGMA table_info(transactions)", (err, columns) => {
    if (err) {
        console.error('Error getting table info:', err.message);
        return;
    }
    
    console.log('Current transactions table columns:');
    columns.forEach(col => {
        console.log(`- ${col.name}: ${col.type}`);
    });
    
    // Check if credit_status column exists
    const hasCreditStatus = columns.some(col => col.name === 'credit_status');
    const hasCreditDueDate = columns.some(col => col.name === 'credit_due_date');
    const hasPaymentDate = columns.some(col => col.name === 'payment_date');
    const hasPaymentMethod = columns.some(col => col.name === 'payment_method');
    const hasPaymentNotes = columns.some(col => col.name === 'payment_notes');
    
    console.log('\nMissing columns check:');
    console.log('credit_status:', hasCreditStatus ? 'EXISTS' : 'MISSING');
    console.log('credit_due_date:', hasCreditDueDate ? 'EXISTS' : 'MISSING');
    console.log('payment_date:', hasPaymentDate ? 'EXISTS' : 'MISSING');
    console.log('payment_method:', hasPaymentMethod ? 'EXISTS' : 'MISSING');
    console.log('payment_notes:', hasPaymentNotes ? 'EXISTS' : 'MISSING');
    
    // Add missing columns
    const alterQueries = [];
    
    if (!hasCreditStatus) {
        alterQueries.push("ALTER TABLE transactions ADD COLUMN credit_status TEXT DEFAULT 'pending' CHECK(credit_status IN ('pending', 'paid', 'overdue'))");
    }
    if (!hasCreditDueDate) {
        alterQueries.push("ALTER TABLE transactions ADD COLUMN credit_due_date DATE");
    }
    if (!hasPaymentDate) {
        alterQueries.push("ALTER TABLE transactions ADD COLUMN payment_date DATE");
    }
    if (!hasPaymentMethod) {
        alterQueries.push("ALTER TABLE transactions ADD COLUMN payment_method TEXT");
    }
    if (!hasPaymentNotes) {
        alterQueries.push("ALTER TABLE transactions ADD COLUMN payment_notes TEXT");
    }
    
    if (alterQueries.length > 0) {
        console.log('\nAdding missing columns...');
        
        let completed = 0;
        alterQueries.forEach((query, index) => {
            db.run(query, (err) => {
                if (err) {
                    console.error(`Error adding column ${index + 1}:`, err.message);
                } else {
                    console.log(`✓ Added column ${index + 1}`);
                }
                
                completed++;
                if (completed === alterQueries.length) {
                    console.log('\nDatabase schema update completed!');
                    
                    // Test the query again
                    const testQuery = `
                        SELECT t.id, t.total_amount, t.payment_type, t.status, t.credit_status, t.created_at,
                               c.name as customer_name, s.name as store_name
                        FROM transactions t
                        LEFT JOIN customers c ON t.customer_id = c.id
                        JOIN stores s ON t.store_id = s.id
                        ORDER BY t.created_at DESC
                        LIMIT 1000
                    `;
                    
                    db.all(testQuery, (err, rows) => {
                        if (err) {
                            console.error('Test query still failing:', err.message);
                        } else {
                            console.log('✓ Test query successful! Found', rows.length, 'transactions');
                        }
                        db.close();
                    });
                }
            });
        });
    } else {
        console.log('\nAll required columns exist!');
        db.close();
    }
});
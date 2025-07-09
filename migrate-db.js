const sqlite3 = require('sqlite3').verbose();

// Database setup
const db = new sqlite3.Database('./grocery_store.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database for migration');
        migrateDatabase();
    }
});

function migrateDatabase() {
    console.log('Starting database migration...');
    
    // Add country and currency columns to existing stores if they don't exist
    db.run(`ALTER TABLE stores ADD COLUMN country TEXT DEFAULT 'United States'`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.log('Country column error:', err.message);
        } else {
            console.log('Country column added successfully');
        }
    });
    
    db.run(`ALTER TABLE stores ADD COLUMN currency TEXT DEFAULT 'USD'`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.log('Currency column error:', err.message);
        } else {
            console.log('Currency column added successfully');
        }
    });
    
    db.run(`ALTER TABLE stores ADD COLUMN currency_symbol TEXT DEFAULT '$'`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.log('Currency symbol column error:', err.message);
        } else {
            console.log('Currency symbol column added successfully');
        }
        
        console.log('Database migration completed');
        db.close();
    });
}
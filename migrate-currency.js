const sqlite3 = require('sqlite3').verbose();

// Database migration to add country and currency columns to existing stores
const db = new sqlite3.Database('./grocery_store.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    } else {
        console.log('Connected to SQLite database for migration');
        migrateCurrencyColumns();
    }
});

function migrateCurrencyColumns() {
    console.log('Starting currency migration...');
    
    // Check if columns already exist
    db.all("PRAGMA table_info(stores)", (err, columns) => {
        if (err) {
            console.error('Error checking table structure:', err.message);
            process.exit(1);
        }
        
        const hasCountry = columns.some(col => col.name === 'country');
        const hasCurrency = columns.some(col => col.name === 'currency');
        const hasCurrencySymbol = columns.some(col => col.name === 'currency_symbol');
        
        if (hasCountry && hasCurrency && hasCurrencySymbol) {
            console.log('Currency columns already exist. Migration not needed.');
            db.close();
            return;
        }
        
        db.serialize(() => {
            console.log('Adding currency columns to stores table...');
            
            if (!hasCountry) {
                db.run("ALTER TABLE stores ADD COLUMN country TEXT", (err) => {
                    if (err) {
                        console.error('Error adding country column:', err.message);
                    } else {
                        console.log('Added country column');
                    }
                });
            }
            
            if (!hasCurrency) {
                db.run("ALTER TABLE stores ADD COLUMN currency TEXT", (err) => {
                    if (err) {
                        console.error('Error adding currency column:', err.message);
                    } else {
                        console.log('Added currency column');
                    }
                });
            }
            
            if (!hasCurrencySymbol) {
                db.run("ALTER TABLE stores ADD COLUMN currency_symbol TEXT", (err) => {
                    if (err) {
                        console.error('Error adding currency_symbol column:', err.message);
                    } else {
                        console.log('Added currency_symbol column');
                    }
                });
            }
            
            // Set default values for existing stores
            db.run("UPDATE stores SET country = 'United States', currency = 'USD', currency_symbol = '$' WHERE country IS NULL OR currency IS NULL OR currency_symbol IS NULL", (err) => {
                if (err) {
                    console.error('Error setting default values:', err.message);
                } else {
                    console.log('Set default currency values for existing stores');
                }
                
                console.log('Currency migration completed successfully!');
                db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err.message);
                    } else {
                        console.log('Database connection closed');
                    }
                });
            });
        });
    });
}
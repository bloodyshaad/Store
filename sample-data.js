const sqlite3 = require('sqlite3').verbose();

// Connect to database
const db = new sqlite3.Database('./grocery_store.db');

// Sample data
const sampleItems = [
    { name: 'Milk (1L)', barcode: '1234567890123', price: 3.99, cost: 2.50, stock: 50, category: 'Dairy' },
    { name: 'Bread (White)', barcode: '2345678901234', price: 2.49, cost: 1.20, stock: 30, category: 'Bakery' },
    { name: 'Eggs (12 pack)', barcode: '3456789012345', price: 4.99, cost: 3.00, stock: 25, category: 'Dairy' },
    { name: 'Bananas (per lb)', barcode: '4567890123456', price: 1.29, cost: 0.80, stock: 100, category: 'Produce' },
    { name: 'Chicken Breast (per lb)', barcode: '5678901234567', price: 8.99, cost: 6.50, stock: 20, category: 'Meat' },
    { name: 'Rice (5lb bag)', barcode: '6789012345678', price: 6.99, cost: 4.00, stock: 15, category: 'Pantry' },
    { name: 'Tomatoes (per lb)', barcode: '7890123456789', price: 2.99, cost: 1.80, stock: 40, category: 'Produce' },
    { name: 'Pasta (1lb box)', barcode: '8901234567890', price: 1.99, cost: 1.00, stock: 35, category: 'Pantry' },
    { name: 'Orange Juice (64oz)', barcode: '9012345678901', price: 4.49, cost: 2.80, stock: 20, category: 'Beverages' },
    { name: 'Cereal (Family Size)', barcode: '0123456789012', price: 5.99, cost: 3.50, stock: 18, category: 'Breakfast' }
];

const sampleCustomers = [
    { name: 'John Smith', phone: '555-0101', email: 'john.smith@email.com', address: '123 Main St, City, State', credit_limit: 500.00 },
    { name: 'Sarah Johnson', phone: '555-0102', email: 'sarah.j@email.com', address: '456 Oak Ave, City, State', credit_limit: 300.00 },
    { name: 'Mike Wilson', phone: '555-0103', email: 'mike.wilson@email.com', address: '789 Pine Rd, City, State', credit_limit: 750.00 },
    { name: 'Emily Davis', phone: '555-0104', email: 'emily.davis@email.com', address: '321 Elm St, City, State', credit_limit: 400.00 },
    { name: 'Robert Brown', phone: '555-0105', email: 'rob.brown@email.com', address: '654 Maple Dr, City, State', credit_limit: 600.00 }
];

console.log('Adding sample data to the database...');

// Insert sample items
db.serialize(() => {
    const itemStmt = db.prepare('INSERT INTO items (name, barcode, price, cost, stock, category) VALUES (?, ?, ?, ?, ?, ?)');
    
    sampleItems.forEach(item => {
        itemStmt.run(item.name, item.barcode, item.price, item.cost, item.stock, item.category);
    });
    
    itemStmt.finalize();
    console.log(`Added ${sampleItems.length} sample items`);
    
    // Insert sample customers
    const customerStmt = db.prepare('INSERT INTO customers (name, phone, email, address, credit_limit) VALUES (?, ?, ?, ?, ?)');
    
    sampleCustomers.forEach(customer => {
        customerStmt.run(customer.name, customer.phone, customer.email, customer.address, customer.credit_limit);
    });
    
    customerStmt.finalize();
    console.log(`Added ${sampleCustomers.length} sample customers`);
    
    console.log('Sample data added successfully!');
    console.log('You can now start the server with: npm start');
    
    db.close();
});
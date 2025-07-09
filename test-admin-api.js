// Test admin API endpoints
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testAdminAPI() {
    try {
        console.log('Testing admin login...');
        
        // First, login as admin
        const loginResponse = await fetch(`${BASE_URL}/api/admin/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'Admin',
                password: '8888'
            })
        });
        
        if (!loginResponse.ok) {
            throw new Error(`Login failed: ${loginResponse.status}`);
        }
        
        const loginData = await loginResponse.json();
        console.log('✓ Admin login successful');
        console.log('Token:', loginData.token.substring(0, 20) + '...');
        
        // Now test the transactions endpoint
        console.log('\nTesting admin transactions endpoint...');
        
        const transactionsResponse = await fetch(`${BASE_URL}/api/admin/transactions`, {
            headers: {
                'Authorization': `Bearer ${loginData.token}`,
                'X-Admin-Access': 'true'
            }
        });
        
        if (!transactionsResponse.ok) {
            const errorText = await transactionsResponse.text();
            throw new Error(`Transactions endpoint failed: ${transactionsResponse.status} - ${errorText}`);
        }
        
        const transactions = await transactionsResponse.json();
        console.log('✓ Admin transactions endpoint working');
        console.log(`Found ${transactions.length} transactions`);
        
        // Test other admin endpoints
        console.log('\nTesting other admin endpoints...');
        
        const endpoints = [
            '/api/admin/stats',
            '/api/admin/stores',
            '/api/admin/owners',
            '/api/admin/customers'
        ];
        
        for (const endpoint of endpoints) {
            try {
                const response = await fetch(`${BASE_URL}${endpoint}`, {
                    headers: {
                        'Authorization': `Bearer ${loginData.token}`,
                        'X-Admin-Access': 'true'
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    console.log(`✓ ${endpoint} - OK (${Array.isArray(data) ? data.length + ' items' : 'object'})`);
                } else {
                    console.log(`✗ ${endpoint} - Failed (${response.status})`);
                }
            } catch (error) {
                console.log(`✗ ${endpoint} - Error: ${error.message}`);
            }
        }
        
        console.log('\nAdmin API test completed!');
        
    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

// Run the test
testAdminAPI();
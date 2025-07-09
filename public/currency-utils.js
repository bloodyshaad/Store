// Currency utility functions

// Format currency value with store's currency symbol
function formatCurrency(amount) {
    const symbol = getStoreCurrencySymbol();
    return `${symbol}${amount.toFixed(2)}`;
}

// Get store currency symbol
function getStoreCurrencySymbol() {
    return localStorage.getItem('storeCurrencySymbol') || '$';
}

// Get store currency
function getStoreCurrency() {
    return localStorage.getItem('storeCurrency') || 'USD';
}

// Get store country
function getStoreCountry() {
    return localStorage.getItem('storeCountry') || '';
}
// Authentication JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    checkAuthStatus();
    
    // Initialize forms
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (signupForm) {
        // Initialize country and currency dropdowns
        initializeCountryCurrencyDropdowns();
        
        signupForm.addEventListener('submit', handleSignup);
        
        // Password confirmation validation
        const password = document.getElementById('password');
        const confirmPassword = document.getElementById('confirmPassword');
        
        confirmPassword.addEventListener('input', function() {
            if (password.value !== confirmPassword.value) {
                confirmPassword.setCustomValidity('Passwords do not match');
            } else {
                confirmPassword.setCustomValidity('');
            }
        });
    }
});

// Initialize country and currency dropdowns
function initializeCountryCurrencyDropdowns() {
    const countrySelect = document.getElementById('country');
    const currencySelect = document.getElementById('currency');
    
    if (!countrySelect || !currencySelect) return;
    
    // Create enhanced country selector
    createEnhancedCountrySelector(countrySelect);
    
    // Populate currencies
    const currencies = getAllCurrencies();
    currencies.forEach(currency => {
        const currencyInfo = COUNTRIES_CURRENCIES.find(item => item.currency === currency);
        const option = document.createElement('option');
        option.value = currency;
        option.textContent = `${currency} - ${currencyInfo.name}`;
        currencySelect.appendChild(option);
    });
    
    // Auto-select currency when country is selected
    countrySelect.addEventListener('change', function() {
        const selectedCountry = this.value;
        if (selectedCountry) {
            const countryInfo = getCurrencyByCountry(selectedCountry);
            if (countryInfo) {
                currencySelect.value = countryInfo.currency;
            }
        }
    });
}

// Create enhanced country input with auto-complete and currency matching
function createEnhancedCountrySelector(selectElement) {
    // Hide the original select
    selectElement.style.display = 'none';
    
    // Create custom dropdown container
    const dropdownContainer = document.createElement('div');
    dropdownContainer.className = 'custom-select-container';
    
    // Create the display button
    const displayButton = document.createElement('div');
    displayButton.className = 'custom-select-display';
    displayButton.innerHTML = `
        <span class="selected-country">
            <span class="country-flag">🌍</span>
            <span class="country-name">Select your country</span>
        </span>
        <span class="dropdown-arrow">▼</span>
    `;
    
    // Create the dropdown content
    const dropdownContent = document.createElement('div');
    dropdownContent.className = 'custom-select-dropdown';
    
    // Create search input
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'country-search';
    searchInput.placeholder = 'Search countries...';
    
    // Create countries list
    const countriesList = document.createElement('div');
    countriesList.className = 'countries-list';
    
    // Populate countries with flags
    COUNTRIES_CURRENCIES.forEach(countryData => {
        const countryOption = document.createElement('div');
        countryOption.className = 'country-option';
        countryOption.dataset.country = countryData.country;
        countryOption.innerHTML = `
            <span class="country-flag">${countryData.flag}</span>
            <span class="country-name">${countryData.country}</span>
            <span class="country-currency">${countryData.currency}</span>
        `;
        
        countryOption.addEventListener('click', function() {
            selectCountry(countryData, selectElement, displayButton, dropdownContent);
        });
        
        countriesList.appendChild(countryOption);
    });
    
    // Add search functionality
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const countryOptions = countriesList.querySelectorAll('.country-option');
        
        countryOptions.forEach(option => {
            const countryName = option.dataset.country.toLowerCase();
            if (countryName.includes(searchTerm)) {
                option.style.display = 'flex';
            } else {
                option.style.display = 'none';
            }
        });
    });
    
    // Assemble dropdown
    dropdownContent.appendChild(searchInput);
    dropdownContent.appendChild(countriesList);
    dropdownContainer.appendChild(displayButton);
    dropdownContainer.appendChild(dropdownContent);
    
    // Insert after the original select
    selectElement.parentNode.insertBefore(dropdownContainer, selectElement.nextSibling);
    
    // Toggle dropdown
    displayButton.addEventListener('click', function(event) {
        event.stopPropagation();
        const isOpen = dropdownContent.classList.contains('show');
        
        // Close all other dropdowns first
        document.querySelectorAll('.custom-select-dropdown.show').forEach(dropdown => {
            dropdown.classList.remove('show');
            dropdown.parentElement.classList.remove('dropdown-open');
        });
        
        if (!isOpen) {
            dropdownContent.classList.add('show');
            dropdownContainer.classList.add('dropdown-open');
            setTimeout(() => {
                searchInput.focus();
            }, 100);
        }
    });
    
    // Prevent dropdown from closing when clicking inside it
    dropdownContent.addEventListener('click', function(event) {
        event.stopPropagation();
    });
    
    // Allow scrolling within the countries list
    countriesList.addEventListener('wheel', function(event) {
        event.stopPropagation();
    });
    
    // Allow touch scrolling on mobile
    countriesList.addEventListener('touchmove', function(event) {
        event.stopPropagation();
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(event) {
        if (!dropdownContainer.contains(event.target)) {
            dropdownContent.classList.remove('show');
            dropdownContainer.classList.remove('dropdown-open');
        }
    });
    
    // Handle escape key to close dropdown
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            dropdownContent.classList.remove('show');
            dropdownContainer.classList.remove('dropdown-open');
        }
    });
}

// Select a country and update the display
function selectCountry(countryData, selectElement, displayButton, dropdownContent) {
    // Update the original select
    selectElement.value = countryData.country;
    
    // Update the display
    const selectedCountry = displayButton.querySelector('.selected-country');
    selectedCountry.innerHTML = `
        <span class="country-flag">${countryData.flag}</span>
        <span class="country-name">${countryData.country}</span>
    `;
    
    // Close dropdown
    dropdownContent.classList.remove('show');
    dropdownContent.parentElement.classList.remove('dropdown-open');
    
    // Trigger change event
    selectElement.dispatchEvent(new Event('change'));
}

// Check if user is already authenticated
function checkAuthStatus() {
    const token = localStorage.getItem('authToken');
    const currentPage = window.location.pathname;
    
    if (token && (currentPage.includes('login.html') || currentPage.includes('signup.html'))) {
        // User is logged in but on auth page, redirect to main app
        window.location.href = 'index.html';
    } else if (!token && currentPage.includes('index.html')) {
        // User is not logged in but trying to access main app
        window.location.href = 'login.html';
    }
}

// Handle login form submission
async function handleLogin(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const btnText = submitBtn.querySelector('.btn-text');
    const loading = submitBtn.querySelector('.loading');
    const errorMessage = document.getElementById('error-message');
    
    // Show loading state
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    loading.style.display = 'block';
    errorMessage.style.display = 'none';
    
    const formData = {
        email: form.email.value,
        password: form.password.value
    };
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Store auth token and store info including country and currency
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('storeId', data.store.id);
            localStorage.setItem('storeName', data.store.name);
            localStorage.setItem('storeCountry', data.store.country || '');
            localStorage.setItem('storeCurrency', data.store.currency || 'USD');
            localStorage.setItem('storeCurrencySymbol', data.store.currency_symbol || '$');
            localStorage.setItem('ownerName', data.owner.name);
            
            // Redirect to main app
            window.location.href = 'index.html';
        } else {
            throw new Error(data.error || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError(errorMessage, error.message || 'Login failed. Please try again.');
    } finally {
        // Reset button state
        submitBtn.disabled = false;
        btnText.style.display = 'block';
        loading.style.display = 'none';
    }
}

// Handle signup form submission
async function handleSignup(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const btnText = submitBtn.querySelector('.btn-text');
    const loading = submitBtn.querySelector('.loading');
    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');
    
    // Validate password confirmation
    if (form.password.value !== form.confirmPassword.value) {
        showError(errorMessage, 'Passwords do not match');
        return;
    }
    
    // Show loading state
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    loading.style.display = 'block';
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';
    
    // Get currency symbol for the selected currency
    const selectedCurrency = form.currency.value;
    const currencyInfo = COUNTRIES_CURRENCIES.find(item => item.currency === selectedCurrency);
    const currencySymbol = currencyInfo ? currencyInfo.symbol : '$';
    
    const formData = {
        firstName: form.firstName.value,
        lastName: form.lastName.value,
        email: form.email.value,
        storeName: form.storeName.value,
        storeAddress: form.storeAddress.value,
        phone: form.phone.value,
        country: form.country.value,
        currency: form.currency.value,
        currencySymbol: currencySymbol,
        password: form.password.value
    };
    
    try {
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Show success message
            showSuccess(successMessage, 'Account created successfully! Redirecting to login...');
            
            // Redirect to login after 2 seconds
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else {
            throw new Error(data.error || 'Signup failed');
        }
    } catch (error) {
        console.error('Signup error:', error);
        showError(errorMessage, error.message || 'Signup failed. Please try again.');
    } finally {
        // Reset button state
        submitBtn.disabled = false;
        btnText.style.display = 'block';
        loading.style.display = 'none';
    }
}

// Show error message
function showError(element, message) {
    element.textContent = message;
    element.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        element.style.display = 'none';
    }, 5000);
}

// Show success message
function showSuccess(element, message) {
    element.textContent = message;
    element.style.display = 'block';
}

// Logout function (to be called from main app)
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
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
    
    // Create enhanced country input
    createEnhancedCountryInput(countrySelect);
    
    // Populate currencies (but make it read-only since it auto-updates)
    const currencies = getAllCurrencies();
    currencies.forEach(currency => {
        const currencyInfo = COUNTRIES_CURRENCIES.find(item => item.currency === currency);
        const option = document.createElement('option');
        option.value = currency;
        option.textContent = `${currency} - ${currencyInfo.name}`;
        currencySelect.appendChild(option);
    });
    
    // Make currency field read-only
    currencySelect.disabled = true;
    currencySelect.style.opacity = '0.7';
    currencySelect.style.cursor = 'not-allowed';
}

// Create enhanced country input with auto-complete and currency matching
function createEnhancedCountryInput(selectElement) {
    // Remove required attribute from hidden select and hide it
    selectElement.removeAttribute('required');
    selectElement.style.display = 'none';
    
    // Create custom input container
    const inputContainer = document.createElement('div');
    inputContainer.className = 'country-input-container';
    
    // Create the country input
    const countryInput = document.createElement('input');
    countryInput.type = 'text';
    countryInput.className = 'country-input';
    countryInput.placeholder = 'Type your country name...';
    countryInput.autocomplete = 'off';
    countryInput.required = true;
    countryInput.name = 'countryInput';
    
    // Create suggestions dropdown
    const suggestionsContainer = document.createElement('div');
    suggestionsContainer.className = 'country-suggestions';
    
    // Create flag display
    const flagDisplay = document.createElement('span');
    flagDisplay.className = 'country-flag-display';
    flagDisplay.textContent = '🌍';
    
    // Assemble the input container
    inputContainer.appendChild(flagDisplay);
    inputContainer.appendChild(countryInput);
    inputContainer.appendChild(suggestionsContainer);
    
    // Insert after the original select
    selectElement.parentNode.insertBefore(inputContainer, selectElement.nextSibling);
    
    // Handle input changes
    countryInput.addEventListener('input', function() {
        const inputValue = this.value.trim();
        
        if (inputValue.length === 0) {
            // Clear everything when input is empty
            selectElement.value = '';
            flagDisplay.textContent = '🌍';
            suggestionsContainer.innerHTML = '';
            suggestionsContainer.classList.remove('show');
            updateCurrencyField('');
            return;
        }
        
        // Find matching countries
        const matches = COUNTRIES_CURRENCIES.filter(country => 
            country.country.toLowerCase().includes(inputValue.toLowerCase())
        );
        
        // Check for exact match
        const exactMatch = COUNTRIES_CURRENCIES.find(country => 
            country.country.toLowerCase() === inputValue.toLowerCase()
        );
        
        if (exactMatch) {
            // Exact match found - update everything
            // First, clear existing options and add the selected country
            selectElement.innerHTML = '';
            const option = document.createElement('option');
            option.value = exactMatch.country;
            option.textContent = exactMatch.country;
            option.selected = true;
            selectElement.appendChild(option);
            
            flagDisplay.textContent = exactMatch.flag;
            updateCurrencyField(exactMatch.currency);
            suggestionsContainer.classList.remove('show');
            countryInput.classList.add('valid');
            countryInput.classList.remove('invalid');
            console.log('Exact match found:', exactMatch.country); // Debug log
            console.log('Select element value set to:', selectElement.value); // Debug log
            
            // Trigger change event to ensure form validation updates
            selectElement.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (matches.length > 0) {
            // Partial matches found - show suggestions
            showSuggestions(matches, inputValue, selectElement, countryInput, flagDisplay, suggestionsContainer);
            countryInput.classList.remove('valid', 'invalid');
        } else {
            // No matches found
            selectElement.value = '';
            flagDisplay.textContent = '🌍';
            updateCurrencyField('');
            suggestionsContainer.classList.remove('show');
            countryInput.classList.add('invalid');
            countryInput.classList.remove('valid');
        }
    });
    
    // Handle focus events
    countryInput.addEventListener('focus', function() {
        if (this.value.trim().length > 0) {
            const matches = COUNTRIES_CURRENCIES.filter(country => 
                country.country.toLowerCase().includes(this.value.toLowerCase())
            );
            if (matches.length > 0) {
                showSuggestions(matches, this.value, selectElement, countryInput, flagDisplay, suggestionsContainer);
            }
        }
    });
    
    // Handle blur events
    countryInput.addEventListener('blur', function() {
        // Delay hiding suggestions to allow for clicks
        setTimeout(() => {
            suggestionsContainer.classList.remove('show');
        }, 200);
    });
    
    // Handle keyboard navigation
    countryInput.addEventListener('keydown', function(event) {
        const suggestions = suggestionsContainer.querySelectorAll('.country-suggestion');
        const activeSuggestion = suggestionsContainer.querySelector('.country-suggestion.active');
        
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (activeSuggestion) {
                activeSuggestion.classList.remove('active');
                const next = activeSuggestion.nextElementSibling;
                if (next) {
                    next.classList.add('active');
                } else {
                    suggestions[0]?.classList.add('active');
                }
            } else {
                suggestions[0]?.classList.add('active');
            }
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (activeSuggestion) {
                activeSuggestion.classList.remove('active');
                const prev = activeSuggestion.previousElementSibling;
                if (prev) {
                    prev.classList.add('active');
                } else {
                    suggestions[suggestions.length - 1]?.classList.add('active');
                }
            } else {
                suggestions[suggestions.length - 1]?.classList.add('active');
            }
        } else if (event.key === 'Enter') {
            event.preventDefault();
            if (activeSuggestion) {
                activeSuggestion.click();
            }
        } else if (event.key === 'Escape') {
            suggestionsContainer.classList.remove('show');
        }
    });
}

// Show country suggestions
function showSuggestions(matches, inputValue, selectElement, countryInput, flagDisplay, suggestionsContainer) {
    suggestionsContainer.innerHTML = '';
    
    // Limit to top 5 matches
    const limitedMatches = matches.slice(0, 5);
    
    limitedMatches.forEach((country, index) => {
        const suggestion = document.createElement('div');
        suggestion.className = 'country-suggestion';
        suggestion.innerHTML = `
            <span class="suggestion-flag">${country.flag}</span>
            <span class="suggestion-name">${highlightMatch(country.country, inputValue)}</span>
            <span class="suggestion-currency">${country.currency}</span>
        `;
        
        suggestion.addEventListener('click', function() {
            selectCountryFromSuggestion(country, selectElement, countryInput, flagDisplay, suggestionsContainer);
        });
        
        suggestionsContainer.appendChild(suggestion);
    });
    
    suggestionsContainer.classList.add('show');
}

// Highlight matching text in suggestions
function highlightMatch(text, query) {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<strong>$1</strong>');
}

// Select country from suggestion
function selectCountryFromSuggestion(countryData, selectElement, countryInput, flagDisplay, suggestionsContainer) {
    countryInput.value = countryData.country;
    
    // Clear existing options and add the selected country
    selectElement.innerHTML = '';
    const option = document.createElement('option');
    option.value = countryData.country;
    option.textContent = countryData.country;
    option.selected = true;
    selectElement.appendChild(option);
    
    flagDisplay.textContent = countryData.flag;
    updateCurrencyField(countryData.currency);
    suggestionsContainer.classList.remove('show');
    countryInput.classList.add('valid');
    countryInput.classList.remove('invalid');
    
    // Trigger change event
    selectElement.dispatchEvent(new Event('change'));
}

// Update currency field
function updateCurrencyField(currencyCode) {
    const currencySelect = document.getElementById('currency');
    if (currencySelect && currencyCode) {
        currencySelect.value = currencyCode;
    } else if (currencySelect) {
        currencySelect.value = '';
    }
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
    
    // Validate country selection
    const countryValue = form.country.value;
    console.log('Country value:', countryValue); // Debug log
    console.log('Form country element:', form.country); // Debug log
    
    if (!countryValue || countryValue.trim() === '') {
        showError(errorMessage, 'Please select a valid country');
        return;
    }
    
    // Validate that the country exists in our list
    const isValidCountry = COUNTRIES_CURRENCIES.some(country => 
        country.country === countryValue
    );
    
    if (!isValidCountry) {
        showError(errorMessage, 'Please select a valid country from the list');
        return;
    }
    
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
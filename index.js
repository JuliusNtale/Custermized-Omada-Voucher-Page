// Custom Captive Portal for Internet Bundle Purchase
// Browser Compatibility Fixes
if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function(searchElement) {
        for (var i = 0; i < this.length; i++) {
            if (this[i] === searchElement) return i;
        }
        return -1;
    };
}

if (!String.prototype.trim) {
    String.prototype.trim = function() {
        return this.replace(/^\s+|\s+$/g, '');
    };
}

// Configuration - Call Me Bot WhatsApp API
var CALLMEBOT_API_URL = 'https://api.callmebot.com/whatsapp.php';
var ADMIN_WHATSAPP = '+255XXXXXXXXX'; // Replace with your WhatsApp number (Tanzania: +255)
var CALLMEBOT_APIKEY = 'YOUR_API_KEY_HERE'; // Get this from Call Me Bot activation process

// Global variables
var clientMac = getQueryStringKey("clientMac");
var apMac = getQueryStringKey("apMac");
var gatewayMac = getQueryStringKey("gatewayMac") || undefined;
var ssidName = getQueryStringKey("ssidName") || undefined;
var radioId = !!getQueryStringKey("radioId") ? Number(getQueryStringKey("radioId")) : undefined;
var vid = !!getQueryStringKey("vid") ? Number(getQueryStringKey("vid")) : undefined;
var originUrl = getQueryStringKey("originUrl");

// Utility functions
function getQueryStringKey(key) {
    return getQueryStringAsObject()[key];
}

function getQueryStringAsObject() {
    var result = {};
    var queryString = window.location.search.substring(1);
    var pairs = queryString.split('&');
    
    for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i].split('=');
        if (pair.length === 2) {
            result[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
        }
    }
    return result;
}

// AJAX utility with timeout and better error handling
var Ajax = {
    post: function (url, data, fn, timeout) {
        var xhr = new XMLHttpRequest();
        var timeoutId;
        
        // Set default timeout to 15 seconds
        var requestTimeout = timeout || 15000;
        
        xhr.open("POST", url, true);
        xhr.setRequestHeader("Content-Type", "application/json");
        
        // Set up timeout
        timeoutId = setTimeout(function() {
            xhr.abort();
            fn.call(this, null, 'timeout');
        }, requestTimeout);
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                clearTimeout(timeoutId);
                if (xhr.status === 200 || xhr.status === 304) {
                    fn.call(this, xhr.responseText, null);
                } else {
                    fn.call(this, null, 'error');
                }
            }
        };
        
        xhr.onerror = function() {
            clearTimeout(timeoutId);
            fn.call(this, null, 'network');
        };
        
        try {
            xhr.send(data);
        } catch (e) {
            clearTimeout(timeoutId);
            fn.call(this, null, 'send_error');
        }
    }
};

// Screen management
function showScreen(screenId) {
    var screens = ['initial-screen', 'voucher-screen', 'purchase-screen', 'verification-screen'];
    for (var i = 0; i < screens.length; i++) {
        var element = document.getElementById(screens[i]);
        if (element) {
            element.style.display = screens[i] === screenId ? 'table' : 'none';
        }
    }
}

// Bundle data
var bundles = {
    'day': { price: 1000, duration: '1 Day', description: 'Daily Package' },
    'week': { price: 6000, duration: '1 Week', description: 'Weekly Package' },
    'month': { price: 20000, duration: '1 Month', description: 'Monthly Package' }
};

// Initialize the page
function initializePage() {
    showScreen('initial-screen');
    setupEventListeners();
    
    // Set hidden form values
    if (document.getElementById('cMac')) {
        document.getElementById('cMac').value = clientMac || '';
    }
}

// Setup event listeners
function setupEventListeners() {
    // Initial screen buttons
    var haveVoucherBtn = document.getElementById('have-voucher-btn');
    var buyVoucherBtn = document.getElementById('buy-voucher-btn');
    
    if (haveVoucherBtn) {
        haveVoucherBtn.onclick = function() {
            showScreen('voucher-screen');
        };
    }
    
    if (buyVoucherBtn) {
        buyVoucherBtn.onclick = function() {
            showScreen('purchase-screen');
        };
    }
    
    // Voucher screen buttons
    var voucherLoginBtn = document.getElementById('voucher-login-btn');
    var backToMainBtn = document.getElementById('back-to-main-btn');
    
    if (voucherLoginBtn) {
        voucherLoginBtn.onclick = handleVoucherLogin;
    }
    
    if (backToMainBtn) {
        backToMainBtn.onclick = function() {
            showScreen('initial-screen');
        };
    }
    
    // Purchase screen buttons
    var submitPurchaseBtn = document.getElementById('submit-purchase-btn');
    var backToMainPurchaseBtn = document.getElementById('back-to-main-purchase-btn');
    
    if (submitPurchaseBtn) {
        submitPurchaseBtn.onclick = handlePurchaseSubmit;
    }
    
    if (backToMainPurchaseBtn) {
        backToMainPurchaseBtn.onclick = function() {
            showScreen('initial-screen');
        };
    }
    
    // Bundle selection change - with fallback for older browsers
    if (document.querySelectorAll) {
        var bundleRadios = document.querySelectorAll('input[name="bundle"]');
        for (var i = 0; i < bundleRadios.length; i++) {
            bundleRadios[i].onchange = function() {
                updatePurchaseButton();
            };
        }
    } else {
        // Fallback for older browsers
        var inputs = document.getElementsByTagName('input');
        for (var i = 0; i < inputs.length; i++) {
            if (inputs[i].name === 'bundle') {
                inputs[i].onchange = function() {
                    updatePurchaseButton();
                };
            }
        }
    }
}

// Handle voucher login
function handleVoucherLogin() {
    var voucherCode = document.getElementById('voucherCode').value;
    if (voucherCode.trim) {
        voucherCode = voucherCode.trim();
    } else {
        // Fallback for older browsers
        voucherCode = voucherCode.replace(/^\s+|\s+$/g, '');
    }
    
    if (!voucherCode) {
        showError('Please enter a voucher code', 'voucher-screen');
        return;
    }
    
    // Show loading
    var button = document.getElementById('voucher-login-btn');
    var originalText = button.innerHTML;
    button.innerHTML = 'Connecting...';
    button.disabled = true;
    
    // Clear any previous errors on voucher screen
    var voucherHintElement = document.getElementById('voucher-hint');
    if (voucherHintElement) {
        voucherHintElement.style.display = 'none';
    }
    
    // Set timeout to reset button if something goes wrong
    var resetButtonTimeout = setTimeout(function() {
        button.innerHTML = originalText;
        button.disabled = false;
        showError('Connection timeout. Please try again.', 'voucher-screen');
    }, 20000); // 20 second timeout
    
    // Prepare data for Omada authentication
    var authData = {
        authType: 3, // Voucher access type
        clientMac: clientMac,
        apMac: apMac,
        gatewayMac: gatewayMac,
        ssidName: ssidName,
        radioId: radioId,
        vid: vid,
        voucherCode: voucherCode
    };
    
    // Submit to Omada portal
    Ajax.post('/portal/auth', JSON.stringify(authData), function(response, error) {
        // Clear the timeout since we got a response
        clearTimeout(resetButtonTimeout);
        
        if (error) {
            // Handle different types of errors
            var errorMessage = 'Connection error. Please try again.';
            if (error === 'timeout') {
                errorMessage = 'Request timed out. Please check your connection and try again.';
            } else if (error === 'network') {
                errorMessage = 'Network error. Please check your connection.';
            }
            
            showError(errorMessage, 'voucher-screen');
            button.innerHTML = originalText;
            button.disabled = false;
            return;
        }
        
        try {
            var result = JSON.parse(response);
            
            if (result.errorCode === 0) {
                // Success - redirect to euraltale.com
                button.innerHTML = 'Connected! Redirecting...';
                setTimeout(function() {
                    window.location.href = 'https://www.neuraltale.com';
                }, 1000);
            } else {
                // Handle specific error codes
                var errorMessage = 'Invalid voucher code. Please try again.';
                
                if (result.errorCode === 1) {
                    errorMessage = 'Voucher code has already been used.';
                } else if (result.errorCode === 2) {
                    errorMessage = 'Voucher code has expired.';
                } else if (result.errorCode === 3) {
                    errorMessage = 'Invalid voucher format.';
                } else if (result.errorCode === 4) {
                    errorMessage = 'Authentication failed. Please try again.';
                } else if (result.message) {
                    errorMessage = result.message;
                }
                
                showError(errorMessage, 'voucher-screen');
                button.innerHTML = originalText;
                button.disabled = false;
            }
        } catch (e) {
            showError('Invalid response from server. Please try again.', 'voucher-screen');
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }, 15000); // 15 second AJAX timeout
}

// Handle purchase submission
function handlePurchaseSubmit() {
    var button = document.getElementById('submit-purchase-btn');
    var originalText = button.innerHTML;
    
    // Disable button and show loading
    button.disabled = true;
    button.innerHTML = 'Processing...';
    
    var selectedBundle = null;
    
    // Find selected bundle with fallback for older browsers
    if (document.querySelector) {
        selectedBundle = document.querySelector('input[name="bundle"]:checked');
    } else {
        var inputs = document.getElementsByTagName('input');
        for (var i = 0; i < inputs.length; i++) {
            if (inputs[i].name === 'bundle' && inputs[i].checked) {
                selectedBundle = inputs[i];
                break;
            }
        }
    }
    
    var customerPhone = document.getElementById('customerPhone').value.trim();
    var paymentReference = document.getElementById('paymentReference').value.trim();
    
    // Validation
    if (!selectedBundle) {
        showError('Please select an internet bundle', 'purchase-screen');
        button.innerHTML = originalText;
        button.disabled = false;
        return;
    }
    
    if (!customerPhone) {
        showError('Please enter your phone number', 'purchase-screen');
        button.innerHTML = originalText;
        button.disabled = false;
        return;
    }
    
    if (!paymentReference) {
        showError('Please enter your payment reference number', 'purchase-screen');
        button.innerHTML = originalText;
        button.disabled = false;
        return;
    }
    
    // Validate phone number format (Tanzanian format)
    var phoneRegex = /^(0[6-7][0-9]{8}|255[6-7][0-9]{8})$/;
    if (!phoneRegex.test(customerPhone.replace(/\s/g, ''))) {
        showError('Please enter a valid Tanzanian phone number (e.g., 0712345678)', 'purchase-screen');
        button.innerHTML = originalText;
        button.disabled = false;
        return;
    }
    
    // Get bundle details
    var bundleData = bundles[selectedBundle.value];
    
    // Show processing feedback
    button.innerHTML = 'Sending request...';
    
    // Prepare message for WhatsApp
    var message = createWhatsAppMessage(customerPhone, paymentReference, bundleData);
    
    // Simulate API call with timeout handling
    setTimeout(function() {
        try {
            // Send to WhatsApp (this would need actual WhatsApp API integration)
            sendToWhatsApp(message);
            
            // Show success feedback
            button.innerHTML = 'Request sent!';
            showSuccess('Purchase request sent! Your voucher will be sent via WhatsApp once payment is confirmed.', 'purchase-screen');
            
            // Redirect to initial screen after short delay so user can enter voucher
            setTimeout(function() {
                // Reset form
                document.getElementById('customerPhone').value = '';
                document.getElementById('paymentReference').value = '';
                var bundleInputs = document.getElementsByName('bundle');
                for (var i = 0; i < bundleInputs.length; i++) {
                    bundleInputs[i].checked = false;
                }
                
                // Reset button
                button.innerHTML = originalText;
                button.disabled = false;
                
                // Go back to initial screen so user can enter voucher when received
                showScreen('initial-screen');
                showSuccess('Your request has been sent! You will receive your voucher via WhatsApp once payment is confirmed. You can then enter it using "I Have a Voucher" option.', 'initial-screen');
            }, 3000);
            
        } catch (error) {
            // Handle any errors
            showError('Failed to send request. Please try again.', 'purchase-screen');
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }, 1500); // Small delay to show processing state
}

// Create WhatsApp message
function createWhatsAppMessage(phone, reference, bundle) {
    var timestamp = new Date().toLocaleString();
    
    var message = "🔔 NEW INTERNET BUNDLE PURCHASE REQUEST\n\n";
    message += "📅 Time: " + timestamp + "\n";
    message += "📱 Customer Phone: " + phone + "\n";
    message += "💰 Payment Reference: " + reference + "\n";
    message += "📦 Package: " + bundle.description + "\n";
    message += "💵 Amount: " + bundle.price + " TZS\n";
    message += "⏰ Duration: " + bundle.duration + "\n\n";
    message += "🌐 Network Details:\n";
    message += "📡 SSID: " + (ssidName || 'N/A') + "\n";
    message += "🔗 Client MAC: " + (clientMac || 'N/A') + "\n\n";
    message += "Please verify payment and create voucher for customer.";
    
    return message;
}

// Send message to WhatsApp using Call Me Bot API
function sendToWhatsApp(message) {
    console.log('Sending WhatsApp message via Call Me Bot API:', message);
    
    // Check if API key is configured
    if (!CALLMEBOT_APIKEY || CALLMEBOT_APIKEY === 'YOUR_API_KEY_HERE') {
        console.error('❌ Call Me Bot API key not configured');
        alert('WhatsApp API not configured. Please set up Call Me Bot API key first.');
        return false;
    }
    
    try {
        // Prepare API URL with parameters
        var encodedMessage = encodeURIComponent(message);
        var apiUrl = CALLMEBOT_API_URL + 
                    '?phone=' + encodeURIComponent('+' + ADMIN_WHATSAPP) +
                    '&text=' + encodedMessage +
                    '&apikey=' + CALLMEBOT_APIKEY;
        
        console.log('🔄 Sending message via Call Me Bot API...');
        
        // Create image element to trigger the API call (cross-origin friendly)
        var img = new Image();
        
        img.onload = function() {
            console.log('✅ WhatsApp message sent successfully');
            alert('✅ Purchase request sent successfully via WhatsApp!\n\nYou should receive your voucher shortly after payment verification.');
        };
        
        img.onerror = function() {
            console.log('� API call completed (response type varies)');
            // Call Me Bot API often returns non-image response, so this is normal
            alert('📱 Purchase request sent via WhatsApp!\n\nPlease check WhatsApp for confirmation. You will receive your voucher after payment verification.');
        };
        
        // Trigger the API call
        img.src = apiUrl;
        
        // Fallback timeout
        setTimeout(function() {
            if (!img.complete) {
                console.log('⏱️ API call timeout - showing fallback message');
                alert('📱 Purchase request processing...\n\nIf you don\'t receive a WhatsApp message within 2 minutes, please contact support.');
            }
        }, 10000); // 10 second timeout
        
        return true;
        
    } catch (error) {
        console.error('🚨 Failed to send WhatsApp message:', error);
        
        // Fallback: Show manual instructions
        var fallbackMessage = 'Unable to send WhatsApp message automatically.\n\n';
        fallbackMessage += 'Please send this message manually to +' + ADMIN_WHATSAPP + ':\n\n';
        fallbackMessage += message;
        
        alert(fallbackMessage);
        
        return false;
    }
}

// Update purchase button text
function updatePurchaseButton() {
    var selectedBundle = null;
    
    // Find selected bundle with fallback for older browsers
    if (document.querySelector) {
        selectedBundle = document.querySelector('input[name="bundle"]:checked');
    } else {
        var inputs = document.getElementsByTagName('input');
        for (var i = 0; i < inputs.length; i++) {
            if (inputs[i].name === 'bundle' && inputs[i].checked) {
                selectedBundle = inputs[i];
                break;
            }
        }
    }
    
    var button = document.getElementById('submit-purchase-btn');
    
    if (selectedBundle && button) {
        var bundleData = bundles[selectedBundle.value];
        button.innerHTML = 'Submit Payment Details (' + bundleData.price + ' TZS)';
    }
}

// Show error message on specific screen
function showError(message, screenId) {
    var hintElement;
    
    // Determine which hint element to use based on current screen
    if (screenId === 'voucher-screen') {
        hintElement = document.getElementById('voucher-hint');
    } else if (screenId === 'purchase-screen') {
        hintElement = document.getElementById('purchase-hint');
    } else {
        hintElement = document.getElementById('oper-hint');
    }
    
    if (hintElement) {
        hintElement.innerHTML = '⚠️ ' + message;
        hintElement.style.display = 'block';
        hintElement.style.color = '#ff4444';
        hintElement.style.backgroundColor = 'rgba(255, 68, 68, 0.1)';
        hintElement.style.padding = '10px';
        hintElement.style.borderRadius = '5px';
        hintElement.style.border = '1px solid #ff4444';
        hintElement.style.marginBottom = '15px';
        
        // Hide error after 7 seconds
        setTimeout(function() {
            hintElement.style.display = 'none';
        }, 7000);
    } else {
        alert('Error: ' + message);
    }
}

// Show success message on specific screen
function showSuccess(message, screenId) {
    var hintElement;
    
    // Determine which hint element to use based on current screen
    if (screenId === 'voucher-screen') {
        hintElement = document.getElementById('voucher-hint');
    } else if (screenId === 'purchase-screen') {
        hintElement = document.getElementById('purchase-hint');
    } else {
        hintElement = document.getElementById('oper-hint');
    }
    
    if (hintElement) {
        hintElement.innerHTML = '✅ ' + message;
        hintElement.style.display = 'block';
        hintElement.style.color = '#00A870';
        hintElement.style.backgroundColor = 'rgba(0, 168, 112, 0.1)';
        hintElement.style.padding = '10px';
        hintElement.style.borderRadius = '5px';
        hintElement.style.border = '1px solid #00A870';
        hintElement.style.marginBottom = '15px';
        
        // Hide success message after 5 seconds
        setTimeout(function() {
            hintElement.style.display = 'none';
        }, 5000);
    }
}

// Redirect back to portal
function redirectToPortal() {
    if (originUrl) {
        window.location.href = originUrl;
    } else {
        // Redirect to the default portal login page
        window.location.href = '/portal/login';
    }
}

// Initialize when page loads - Multiple methods for compatibility
function initializePortal() {
    initializePage();
}

// Try multiple initialization methods for maximum compatibility
if (document.readyState === 'complete') {
    initializePortal();
} else if (document.addEventListener) {
    document.addEventListener('DOMContentLoaded', initializePortal);
} else if (document.attachEvent) {
    document.attachEvent('onreadystatechange', function() {
        if (document.readyState === 'complete') {
            initializePortal();
        }
    });
}

// Fallback for very old browsers
window.onload = function() {
    initializePortal();
};

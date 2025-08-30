# WhatsApp Integration Guide for Omada Portal

## Current Status
✅ **Option 1 is now active**: WhatsApp Web URL method (opens WhatsApp with pre-filled message)

## Integration Options (Choose One)

### **Option 1: WhatsApp Web URL (ACTIVE - Simplest)**
**What it does**: Opens WhatsApp Web with message pre-filled
**Pros**: Easy to implement, works immediately
**Cons**: Requires manual clicking "Send" in WhatsApp

**How it works**:
1. User purchases bundle → Portal opens WhatsApp Web
2. Message is pre-filled with purchase details
3. You manually click "Send" in WhatsApp
4. Customer gets voucher separately

**No additional setup needed** - this is already working!

---

### **Option 2: WhatsApp Business API (Most Professional)**

**Requirements**:
1. WhatsApp Business Account
2. Facebook Business Manager
3. WhatsApp Business API access
4. Server to handle webhooks

**Steps**:
1. **Get WhatsApp Business API**:
   - Apply at: https://business.whatsapp.com/
   - Verify your business
   - Get API credentials

2. **Setup Server Endpoint** (PHP/Node.js/Python):
```javascript
// Example Node.js endpoint
app.post('/api/send-whatsapp', async (req, res) => {
    const { phone, message } = req.body;
    
    const response = await fetch('https://graph.facebook.com/v17.0/YOUR_PHONE_ID/messages', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer YOUR_ACCESS_TOKEN',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: phone,
            type: 'text',
            text: { body: message }
        })
    });
    
    res.json({ success: response.ok });
});
```

3. **Update Portal JavaScript**:
```javascript
function sendToWhatsApp(message) {
    fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            phone: ADMIN_WHATSAPP, 
            message: message 
        })
    })
    .then(response => response.json())
    .then(data => {
        if (!data.success) throw new Error('API failed');
    });
}
```

---

### **Option 3: Twilio WhatsApp API (Easiest API)**

**Requirements**:
1. Twilio account (free trial available)
2. WhatsApp Sandbox or approved number

**Steps**:
1. **Sign up at Twilio**: https://twilio.com
2. **Get Twilio credentials**: Account SID, Auth Token
3. **Setup WhatsApp Sandbox**:
   - Go to Console → Messaging → Try it out → Send a WhatsApp message
   - Follow sandbox setup instructions

4. **Create Server Endpoint**:
```php
<?php
// send-whatsapp.php
require_once 'vendor/autoload.php';
use Twilio\Rest\Client;

$account_sid = 'YOUR_TWILIO_SID';
$auth_token = 'YOUR_TWILIO_TOKEN';
$twilio_whatsapp = 'whatsapp:+14155238886'; // Twilio sandbox number

$client = new Client($account_sid, $auth_token);

$phone = $_POST['phone'];
$message = $_POST['message'];

$client->messages->create(
    'whatsapp:+' . $phone,
    [
        'from' => $twilio_whatsapp,
        'body' => $message
    ]
);

echo json_encode(['success' => true]);
?>
```

5. **Update Portal JavaScript**:
```javascript
function sendToWhatsApp(message) {
    fetch('/send-whatsapp.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'phone=' + ADMIN_WHATSAPP + '&message=' + encodeURIComponent(message)
    });
}
```

---

### **Option 4: Webhook to Your Server (Custom)**

**Requirements**:
1. Web server (PHP/Node.js/Python)
2. Your own WhatsApp automation tool

**Steps**:
1. **Create webhook endpoint**:
```php
<?php
// webhook.php
$data = json_decode(file_get_contents('php://input'), true);

$phone = $data['phone'];
$message = $data['message'];
$timestamp = $data['timestamp'];

// Log to file or database
file_put_contents('purchase_requests.txt', 
    date('Y-m-d H:i:s') . " - $phone - $message\n", 
    FILE_APPEND
);

// Send email notification
mail('your@email.com', 'New Bundle Purchase', $message);

echo json_encode(['success' => true]);
?>
```

2. **Update Portal JavaScript**:
```javascript
function sendToWhatsApp(message) {
    fetch('https://yourserver.com/webhook.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            phone: ADMIN_WHATSAPP,
            message: message,
            timestamp: new Date().toISOString()
        })
    });
}
```

---

## **Recommended Implementation Steps**

### **Step 1: Test Current Method (Option 1)**
1. Upload the current ZIP file
2. Test bundle purchase
3. Verify WhatsApp Web opens with message

### **Step 2: Choose Advanced Method**
- **For small business**: Stick with Option 1 or use Option 4
- **For professional setup**: Use Option 2 or 3

### **Step 3: Implementation**
1. Set up chosen method
2. Update the `sendToWhatsApp` function
3. Test thoroughly
4. Upload new ZIP file

---

## **Current Message Format**

The system sends this format:
```
🔔 NEW INTERNET BUNDLE PURCHASE REQUEST

📅 Time: [timestamp]
📱 Customer Phone: [phone]
💰 Payment Reference: [reference]
📦 Package: [bundle type]
💵 Amount: [price] TZS
⏰ Duration: [duration]

🌐 Network Details:
📡 SSID: [network name]
🔗 Client MAC: [device]

Please verify payment and create voucher for customer.
```

---

## **Need Help?**
1. Start with Option 1 (already working)
2. For professional setup, I recommend Option 3 (Twilio)
3. Let me know which option you want to implement!

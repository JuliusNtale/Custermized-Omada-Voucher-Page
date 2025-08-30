// WhatsApp Integration Example
// This file shows how to implement the WhatsApp functionality

// Example 1: Using WhatsApp Business API (Recommended for production)
function sendToWhatsAppBusinessAPI(message) {
    var whatsappData = {
        messaging_product: "whatsapp",
        to: ADMIN_WHATSAPP,
        type: "text",
        text: {
            body: message
        }
    };
    
    fetch('https://graph.facebook.com/v17.0/+255653520829/messages', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer YOUR_ACCESS_TOKEN',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(whatsappData)
    })
    .then(response => response.json())
    .then(data => {
        console.log('WhatsApp message sent:', data);
    })
    .catch(error => {
        console.error('Error sending WhatsApp message:', error);
    });
}

// Example 2: Using a webhook to your server
function sendToWhatsAppViaWebhook(message) {
    var webhookData = {
        phone: ADMIN_WHATSAPP,
        message: message,
        timestamp: new Date().toISOString()
    };
    
    fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(webhookData)
    })
    .then(response => response.json())
    .then(data => {
        console.log('Webhook response:', data);
    })
    .catch(error => {
        console.error('Error sending to webhook:', error);
    });
}

// Example 3: Using Twilio WhatsApp API
function sendToWhatsAppViaTwilio(message) {
    var twilioData = {
        From: 'whatsapp:+14155238886', // Twilio sandbox number
        To: 'whatsapp:' + ADMIN_WHATSAPP,
        Body: message
    };
    
    // This would typically be done from your server, not client-side
    fetch('/api/twilio-whatsapp', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(twilioData)
    })
    .then(response => response.json())
    .then(data => {
        console.log('Twilio message sent:', data);
    })
    .catch(error => {
        console.error('Error sending via Twilio:', error);
    });
}

// Example 4: Simple webhook endpoint (PHP example for your server)
/*
<?php
// webhook-whatsapp.php - Place this on your server

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['phone']) || !isset($input['message'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields']);
    exit;
}

$phone = $input['phone'];
$message = $input['message'];

// Log the request
$logData = [
    'timestamp' => date('Y-m-d H:i:s'),
    'phone' => $phone,
    'message' => $message
];
file_put_contents('whatsapp_requests.log', json_encode($logData) . "\n", FILE_APPEND);

// Here you would integrate with your chosen WhatsApp API
// For example, using WhatsApp Business API:

$whatsappApiUrl = 'https://graph.facebook.com/v17.0/YOUR_PHONE_NUMBER_ID/messages';
$accessToken = 'YOUR_ACCESS_TOKEN';

$data = [
    'messaging_product' => 'whatsapp',
    'to' => $phone,
    'type' => 'text',
    'text' => ['body' => $message]
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $whatsappApiUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $accessToken,
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 200) {
    echo json_encode(['success' => true, 'response' => json_decode($response, true)]);
} else {
    echo json_encode(['success' => false, 'error' => $response]);
}
?>
*/

// To implement: Replace the sendToWhatsApp function in index.js with one of the above examples
// Make sure to update the ADMIN_WHATSAPP variable and any API credentials

// Instructions:
// 1. Choose one of the integration methods above
// 2. Set up your WhatsApp Business API account or webhook server
// 3. Replace the sendToWhatsApp function in index.js with your chosen implementation
// 4. Test thoroughly before deploying to production

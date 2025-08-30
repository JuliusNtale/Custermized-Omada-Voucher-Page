<?php
/**
 * WhatsApp Purchase Notification Webhook
 * Place this file on your web server (e.g., yourserver.com/webhook/purchase-notification.php)
 */

// Enable CORS for Omada portal requests
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Get the JSON data
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}

// Extract purchase details
$message = $data['message'] ?? '';
$phone = $data['phone'] ?? '';
$timestamp = $data['timestamp'] ?? date('Y-m-d H:i:s');
$clientMac = $data['clientMac'] ?? 'Unknown';

// Log the purchase request
$logFile = 'purchase_requests.log';
$logEntry = date('Y-m-d H:i:s') . " | Phone: $phone | MAC: $clientMac\n";
$logEntry .= "Message: $message\n";
$logEntry .= str_repeat('-', 80) . "\n";
file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);

// Method 1: Send Email Notification (Most Reliable)
$to = 'your-email@example.com';  // Replace with your email
$subject = 'New Internet Bundle Purchase Request';
$emailMessage = "New purchase request received:\n\n";
$emailMessage .= "Time: $timestamp\n";
$emailMessage .= "Admin Phone: $phone\n";
$emailMessage .= "Client MAC: $clientMac\n\n";
$emailMessage .= "Details:\n$message\n\n";
$emailMessage .= "Please verify payment and create voucher.";

$headers = 'From: portal@yourserver.com' . "\r\n" .
           'Reply-To: portal@yourserver.com' . "\r\n" .
           'X-Mailer: PHP/' . phpversion();

$emailSent = mail($to, $subject, $emailMessage, $headers);

// Method 2: Twilio WhatsApp (if you have Twilio account)
function sendTwilioWhatsApp($phone, $message) {
    $account_sid = 'YOUR_TWILIO_SID';        // Replace with your Twilio SID
    $auth_token = 'YOUR_TWILIO_AUTH_TOKEN';  // Replace with your auth token
    $twilio_number = 'whatsapp:+14155238886'; // Twilio WhatsApp number
    
    if ($account_sid === 'YOUR_TWILIO_SID') {
        return false; // Not configured
    }
    
    $url = "https://api.twilio.com/2010-04-01/Accounts/$account_sid/Messages.json";
    
    $data = [
        'From' => $twilio_number,
        'To' => "whatsapp:+$phone",
        'Body' => $message
    ];
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_USERPWD, "$account_sid:$auth_token");
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    return $httpCode === 201;
}

// Try to send WhatsApp via Twilio (optional)
$whatsappSent = false;
if (!empty($phone)) {
    $whatsappSent = sendTwilioWhatsApp($phone, $message);
}

// Method 3: Telegram Bot (Alternative notification)
function sendTelegram($message) {
    $bot_token = 'YOUR_TELEGRAM_BOT_TOKEN';    // Replace with your bot token
    $chat_id = 'YOUR_TELEGRAM_CHAT_ID';        // Replace with your chat ID
    
    if ($bot_token === 'YOUR_TELEGRAM_BOT_TOKEN') {
        return false; // Not configured
    }
    
    $url = "https://api.telegram.org/bot$bot_token/sendMessage";
    $data = [
        'chat_id' => $chat_id,
        'text' => $message,
        'parse_mode' => 'HTML'
    ];
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    return $httpCode === 200;
}

// Try Telegram notification (optional)
$telegramSent = sendTelegram($message);

// Prepare response
$response = [
    'success' => true,
    'timestamp' => $timestamp,
    'methods' => [
        'logged' => true,
        'email' => $emailSent,
        'whatsapp' => $whatsappSent,
        'telegram' => $telegramSent
    ]
];

// Return success response
echo json_encode($response);
?>

<?php
/**
 * Simple Email Notification Webhook for Omada Portal
 * Upload this to your web server at: yourserver.com/email-notification.php
 */

// Enable CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Get purchase data
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid data']);
    exit;
}

// Extract details
$message = $data['message'] ?? '';
$timestamp = $data['timestamp'] ?? date('Y-m-d H:i:s');
$clientMac = $data['clientMac'] ?? 'Unknown';

// YOUR EMAIL ADDRESS - CHANGE THIS!
$your_email = 'juliusntale30@gmail.com';  // ← CHANGE THIS TO YOUR EMAIL

// Create email
$subject = '🔔 New Internet Bundle Purchase Request';
$email_body = "NEW PURCHASE REQUEST RECEIVED\n\n";
$email_body .= "Time: $timestamp\n";
$email_body .= "Client MAC: $clientMac\n\n";
$email_body .= "PURCHASE DETAILS:\n";
$email_body .= str_repeat("=", 50) . "\n";
$email_body .= $message . "\n";
$email_body .= str_repeat("=", 50) . "\n\n";
$email_body .= "NEXT STEPS:\n";
$email_body .= "1. Verify mobile money payment to 0653520829\n";
$email_body .= "2. Create voucher in Omada Controller\n";
$email_body .= "3. Send voucher to customer\n\n";
$email_body .= "This email was sent automatically from your Omada Portal.";

$headers = 'From: portal@' . $_SERVER['HTTP_HOST'] . "\r\n" .
           'Reply-To: portal@' . $_SERVER['HTTP_HOST'] . "\r\n" .
           'X-Mailer: Omada Portal';

// Send email
$email_sent = mail($your_email, $subject, $email_body, $headers);

// Log the request (optional)
$log_entry = date('Y-m-d H:i:s') . " | Email: " . ($email_sent ? 'SENT' : 'FAILED') . " | MAC: $clientMac\n";
file_put_contents('purchase_log.txt', $log_entry, FILE_APPEND | LOCK_EX);

// Return response
echo json_encode([
    'success' => true,
    'email_sent' => $email_sent,
    'timestamp' => $timestamp
]);
?>

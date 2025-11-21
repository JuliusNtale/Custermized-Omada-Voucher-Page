#!/usr/bin/env node

/**
 * Omada Controller WhatsApp Integration Backend
 * This script should be integrated with your Omada Controller
 * to handle WhatsApp API calls from the captive portal
 */

const https = require('https');
const http = require('http');
const url = require('url');
const querystring = require('querystring');

// Configuration (should match your frontend config)
const CONFIG = {
    CALLMEBOT_API_URL: 'https://api.callmebot.com/whatsapp.php',
    ADMIN_WHATSAPP: '+255653520829',
    CALLMEBOT_APIKEY: '9445949',
    CONTROLLER_PORT: 8080, // Port for the webhook service
    LOG_FILE: '/var/log/omada-whatsapp.log'
};

// Log function
function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    
    // Also write to file if possible
    try {
        require('fs').appendFileSync(CONFIG.LOG_FILE, logMessage + '\n');
    } catch (e) {
        // Ignore file writing errors
    }
}

// Send WhatsApp message via Call Me Bot API
function sendWhatsAppMessage(message, callback) {
    const params = querystring.stringify({
        phone: CONFIG.ADMIN_WHATSAPP,
        text: message,
        apikey: CONFIG.CALLMEBOT_APIKEY
    });
    
    const options = {
        hostname: 'api.callmebot.com',
        path: '/whatsapp.php?' + params,
        method: 'GET',
        timeout: 15000
    };
    
    log(`Sending WhatsApp message to ${CONFIG.ADMIN_WHATSAPP}`);
    
    const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            log(`WhatsApp API response: ${res.statusCode} - ${data}`);
            callback(null, { success: true, statusCode: res.statusCode, response: data });
        });
    });
    
    req.on('error', (error) => {
        log(`WhatsApp API error: ${error.message}`);
        callback(error, null);
    });
    
    req.on('timeout', () => {
        log('WhatsApp API timeout');
        req.destroy();
        callback(new Error('Request timeout'), null);
    });
    
    req.end();
}

// HTTP server to handle requests from captive portal
const server = http.createServer((req, res) => {
    // Enable CORS for captive portal requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    const parsedUrl = url.parse(req.url, true);
    
    // Handle WhatsApp requests
    if (req.method === 'POST' && parsedUrl.pathname === '/portal/whatsapp') {
        let body = '';
        
        req.on('data', (chunk) => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                
                log(`Received WhatsApp request from client: ${data.clientMac}`);
                
                if (data.action === 'sendWhatsApp' && data.message) {
                    sendWhatsAppMessage(data.message, (error, result) => {
                        res.setHeader('Content-Type', 'application/json');
                        
                        if (error) {
                            log(`Failed to send WhatsApp: ${error.message}`);
                            res.writeHead(500);
                            res.end(JSON.stringify({
                                success: false,
                                error: error.message,
                                timestamp: new Date().toISOString()
                            }));
                        } else {
                            log('WhatsApp message sent successfully');
                            res.writeHead(200);
                            res.end(JSON.stringify({
                                success: true,
                                message: 'WhatsApp message sent successfully',
                                timestamp: new Date().toISOString(),
                                apiResponse: result
                            }));
                        }
                    });
                } else {
                    res.writeHead(400);
                    res.end(JSON.stringify({
                        success: false,
                        error: 'Invalid request format',
                        timestamp: new Date().toISOString()
                    }));
                }
            } catch (error) {
                log(`JSON parse error: ${error.message}`);
                res.writeHead(400);
                res.end(JSON.stringify({
                    success: false,
                    error: 'Invalid JSON',
                    timestamp: new Date().toISOString()
                }));
            }
        });
    } 
    // Health check endpoint
    else if (req.method === 'GET' && parsedUrl.pathname === '/health') {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            config: {
                phone: CONFIG.ADMIN_WHATSAPP,
                apiConfigured: !!CONFIG.CALLMEBOT_APIKEY
            }
        }));
    }
    // Test endpoint
    else if (req.method === 'GET' && parsedUrl.pathname === '/test') {
        const testMessage = `🧪 Omada Controller WhatsApp Test - ${new Date().toLocaleString()}`;
        
        sendWhatsAppMessage(testMessage, (error, result) => {
            res.setHeader('Content-Type', 'application/json');
            
            if (error) {
                res.writeHead(500);
                res.end(JSON.stringify({
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                }));
            } else {
                res.writeHead(200);
                res.end(JSON.stringify({
                    success: true,
                    message: 'Test message sent successfully',
                    timestamp: new Date().toISOString()
                }));
            }
        });
    }
    else {
        res.writeHead(404);
        res.end(JSON.stringify({
            error: 'Not found',
            timestamp: new Date().toISOString()
        }));
    }
});

// Start the server
server.listen(CONFIG.CONTROLLER_PORT, () => {
    log(`Omada WhatsApp Integration Server running on port ${CONFIG.CONTROLLER_PORT}`);
    log(`Health check: http://localhost:${CONFIG.CONTROLLER_PORT}/health`);
    log(`Test endpoint: http://localhost:${CONFIG.CONTROLLER_PORT}/test`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    log('Shutting down Omada WhatsApp Integration Server...');
    server.close(() => {
        log('Server shut down gracefully');
        process.exit(0);
    });
});

module.exports = { server, sendWhatsAppMessage, CONFIG };

# Custom Omada Captive Portal - Internet Bundle Purchase Page

This is a customized captive portal for TP-Link Omada controller that allows customers to either:
1. Enter a voucher code if they already have one
2. Purchase internet bundles through mobile money payment

## Features

### Customer Features:
- **Voucher Entry**: Users with existing vouchers can enter their code and connect immediately
- **Bundle Purchase**: Users can select from three internet packages:
  - Daily Package: 1,000 TZS (24 hours)
  - Weekly Package: 6,000 TZS (7 days)  
  - Monthly Package: 20,000 TZS (30 days)
- **Payment Integration**: Customers enter their phone number and payment reference after paying to 0653520829
- **Automatic Notification**: Payment details are automatically sent to admin via WhatsApp
- **Loading Screen**: Shows "Verifying your payment..." message for 10 seconds before redirecting

### Admin Features:
- **WhatsApp Notifications**: Receive detailed payment requests including:
  - Customer phone number
  - Payment reference
  - Selected package details
  - Network information (SSID, Client MAC)
  - Timestamp

## Setup Instructions

### 1. Prepare the Portal Files
1. Ensure all files are in the same directory:
   - `index.html`
   - `index.css`
   - `index.js`
   - `jquery.min.js`
   - `background.png`
   - `logo.png`
   - `img/` folder with icons

### 2. Configure WhatsApp Integration

**IMPORTANT**: The current implementation has a placeholder for WhatsApp integration. You need to implement one of these options:

#### Option A: WhatsApp Business API (Recommended)
1. Sign up for WhatsApp Business API
2. Get your API credentials
3. Replace the `sendToWhatsApp()` function in `index.js` with actual API calls

#### Option B: Webhook Integration
1. Create a webhook endpoint on your server
2. Update the `sendToWhatsApp()` function to send data to your webhook
3. Have your webhook forward messages to WhatsApp

#### Option C: Third-party Service (Twilio, etc.)
1. Sign up for a service like Twilio
2. Update the integration code accordingly

### 3. Customize Settings
Edit these variables in `index.js`:
- `ADMIN_WHATSAPP`: Your WhatsApp number (currently set to 255653520829)
- Bundle prices and descriptions in the `bundles` object
- Payment phone number in the HTML (currently 0653520829)

### 4. Upload to Omada Controller
1. Zip all files together
2. In Omada Controller, go to:
   - Settings → Authentication → Portal
   - Upload Custom Portal
   - Select your zip file

### 5. Configure Omada Settings
1. Set authentication type to "Voucher"
2. Enable the custom portal
3. Configure your voucher settings for the packages you offer

## How It Works

### For Customers with Vouchers:
1. Customer connects to WiFi
2. Redirected to custom portal
3. Clicks "I Have a Voucher"
4. Enters voucher code
5. Authenticated through Omada's voucher system
6. Gains internet access

### For New Customers:
1. Customer connects to WiFi
2. Redirected to custom portal
3. Clicks "Buy Internet Bundle"
4. Selects desired package
5. Sees payment instructions (pay to 0653520829)
6. Enters phone number and payment reference
7. Clicks submit
8. Admin receives WhatsApp notification
9. Customer sees verification screen
10. After 10 seconds, redirected back to portal
11. Admin manually verifies payment and creates voucher
12. Customer can then use voucher to connect

## Technical Details

### Files Structure:
- **index.html**: Main portal interface with multiple screens
- **index.css**: Styling including bundle selection and responsive design
- **index.js**: JavaScript handling screen navigation, form validation, and Omada integration
- **jquery.min.js**: jQuery library for DOM manipulation

### Screen Flow:
1. **Initial Screen**: Choice between voucher entry and bundle purchase
2. **Voucher Screen**: Enter existing voucher code
3. **Purchase Screen**: Select bundle, enter payment details
4. **Verification Screen**: Loading animation and redirect

### Security Notes:
- Phone number validation for Tanzanian format
- Input sanitization for payment references
- Proper error handling and user feedback

## Troubleshooting

### Common Issues:
1. **WhatsApp messages not sending**: Implement proper WhatsApp API integration
2. **Voucher authentication failing**: Check Omada controller voucher settings
3. **Styling issues**: Ensure all CSS files and images are included
4. **JavaScript errors**: Check browser console for errors

### Testing:
1. Test voucher authentication with valid vouchers
2. Test bundle selection and form validation
3. Test screen navigation and error messages
4. Verify mobile responsiveness

## Support

For technical support with Omada configuration or portal customization, please refer to:
- TP-Link Omada documentation
- Omada community forums
- Your network administrator

## License

This portal template is provided as-is for educational and commercial use. Modify as needed for your specific requirements.

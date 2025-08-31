# 🌐 Custom Omada Captive Portal with WhatsApp Integration

A professional captive portal solution for TP-Link Omada controllers with automated WhatsApp notifications for internet bundle sales.

## 🎯 **Features**

✅ **Professional Captive Portal** - Custom-branded portal for Omada controllers  
✅ **Internet Bundle Sales** - Daily, Weekly, Monthly packages with pricing  
✅ **WhatsApp Integration** - Automated purchase notifications via Call Me Bot API  
✅ **Mobile Responsive** - Touch-friendly design for all devices  
✅ **Secure Configuration** - Template files protect sensitive data  
✅ **Easy Deployment** - Simple ZIP upload to Omada Controller  

---

## 📱 **Bundle Pricing**

| Package | Duration | Price (TZS) |
|---------|----------|-------------|
| Daily   | 1 Day    | 1,000       |
| Weekly  | 1 Week   | 6,000       |
| Monthly | 1 Month  | 20,000      |

---

## 🚀 **Quick Start**

### **Step 1: Set Up Call Me Bot (2 minutes)**

1. **Add Contact**: +34 694 25 79 52 (name it "CallMeBot")
2. **Send Activation**: "I allow callmebot to send me messages"
3. **Get API Key**: Wait for reply with your unique API key
4. **Save Key**: You'll need this for configuration

### **Step 2: Configure Portal (1 minute)**

1. **Open** `config.production.js`
2. **Update Settings**:
   ```javascript
   var ADMIN_WHATSAPP = '+255653520829';     // Your WhatsApp number
   var CALLMEBOT_APIKEY = 'YOUR_API_KEY';    // From Step 1
   ```
3. **Copy to** `index.js` for deployment
4. **Create ZIP** with all portal files

### **Step 3: Deploy to Omada**

1. **Upload ZIP** to Omada Controller
2. **Configure Portal**: Settings → Authentication → Portal
3. **Test**: Connect device and try purchasing a bundle

---

## 📋 **How It Works**

### **Customer Experience:**
1. **Connects to WiFi** → Gets redirected to your portal
2. **Chooses bundle** → Selects Daily/Weekly/Monthly package
3. **Enters details** → Phone number + M-Pesa payment reference
4. **Submits request** → Gets confirmation message
5. **Waits for voucher** → Receives voucher after payment verification

### **Your Workflow:**
1. **📱 Get WhatsApp notification** → Instant message with purchase details
2. **💰 Verify payment** → Check M-Pesa to your number
3. **🎫 Create voucher** → Generate in Omada Controller
4. **📱 Send voucher** → Reply to customer with voucher code

### **WhatsApp Message Format:**
```
🔔 NEW INTERNET BUNDLE PURCHASE REQUEST

📅 Time: 31/08/2025, 01:08:16
📱 Customer Phone: 0712345678
💰 Payment Reference: MP240831001
📦 Package: Weekly Package
💵 Amount: 6000 TZS
⏰ Duration: 1 Week

🌐 Network Details:
📡 SSID: YourWiFiName
🔗 Client MAC: B4-45-06-98-0C-40

Please verify payment and create voucher for customer.
```

---

## 🔧 **Installation & Configuration**

### **Prerequisites:**
- TP-Link Omada Controller
- WhatsApp account for notifications
- Call Me Bot API activation

### **Files Structure:**
```
📁 Portal Files
├── 🌐 index.html          # Main portal interface
├── 🎨 index.css           # Responsive styling
├── ⚡ index.js            # Portal functionality & API integration
├── 📚 jquery.min.js       # JavaScript library
├── 🖼️ logo.png           # Your logo
├── 🖼️ background.png     # Background image
├── 📁 img/               # UI icons and images
└── 📋 config.production.js # Your private configuration
```

### **Omada Controller Setup:**

#### **Portal Configuration:**
```
Settings → Authentication → Portal
├── Portal Type: External Portal Server
├── Upload Portal Files: [Your ZIP file]
├── Free Authentication: Optional (for limited access)
├── Success Redirect: [Leave blank]
└── Authentication Method: Voucher + Portal
```

#### **Optional: Limited Internet Access**
If you want customers to have brief internet access:
```
Free Authentication Settings:
├── Time Limit: 5-10 minutes
├── Bandwidth Down: 2 Mbps
├── Bandwidth Up: 1 Mbps
└── Concurrent Users: 50
```

---

## 🔒 **Security & Configuration**

### **Template vs Production Files:**

#### **🔓 Template Files (In Git Repository):**
- Safe placeholder values
- Can be shared publicly
- Used for development and updates

#### **🔒 Production Files (Local Only):**
- Real API keys and phone numbers
- Kept private on your local machine
- Used for actual deployment

### **Configuration Files:**

#### **For Development (Template):**
```javascript
// index.js - Template version
var ADMIN_WHATSAPP = '+255XXXXXXXXX';        // Placeholder
var CALLMEBOT_APIKEY = 'YOUR_API_KEY_HERE';   // Placeholder
```

#### **For Deployment (Production):**
```javascript
// config.production.js - Your real settings
var ADMIN_WHATSAPP = '+255653520829';     // Your actual number
var CALLMEBOT_APIKEY = '9445949';         // Your actual API key
```

### **Deployment Workflow:**
1. Update `index.js` with values from `config.production.js`
2. Create deployment ZIP file
3. Upload to Omada Controller
4. Reset `index.js` to template values (for Git security)

---

## 🛠️ **Customization**

### **Update Bundle Pricing:**
Edit `index.js` around line 180-190:
```javascript
var bundleOptions = {
    'daily': { price: 1000, duration: '1 Day', days: 1 },
    'weekly': { price: 6000, duration: '1 Week', days: 7 },
    'monthly': { price: 20000, duration: '1 Month', days: 30 }
};
```

### **Change Styling:**
- **Colors**: Edit CSS variables in `index.css`
- **Logo**: Replace `logo.png` with your logo
- **Background**: Replace `background.png` with your image

### **Update Contact Information:**
- **WhatsApp Number**: Update in `config.production.js`
- **WiFi Name**: Update SSID in portal configuration

---

## 📱 **Call Me Bot API**

### **Why Call Me Bot?**
✅ **Free for personal use** - No monthly fees  
✅ **Reliable delivery** - Messages always arrive  
✅ **No customer internet needed** - API works server-side  
✅ **Real-time notifications** - Instant business alerts  
✅ **Simple setup** - Just one activation message  

### **API Limits:**
- **Personal Use**: Unlimited messages
- **Rate Limit**: ~1 message per second
- **Commercial Use**: Upgrade to [TextMeBot.com](https://textmebot.com) if needed

### **Test Your API:**
```
https://api.callmebot.com/whatsapp.php?phone=+255653520829&text=Test+message&apikey=YOUR_API_KEY
```

---

## 🚨 **Troubleshooting**

### **Common Issues:**

#### **"API key not configured" error**
- ✅ Check `config.production.js` has correct API key
- ✅ Copy API key to `index.js` for deployment
- ✅ Verify no extra spaces in API key

#### **No WhatsApp messages received**
- ✅ Test API manually with browser URL
- ✅ Check phone number format: `+255653520829`
- ✅ Verify Call Me Bot activation completed

#### **Portal not loading**
- ✅ Check ZIP file contains all required files
- ✅ Verify Omada portal configuration
- ✅ Test with different device/browser

#### **Purchase form errors**
- ✅ Ensure all form fields are filled
- ✅ Check payment reference format
- ✅ Verify phone number is valid

### **Support Resources:**
- **Call Me Bot Support**: [@callmebot_com](https://t.me/callmebot_com)
- **Omada Documentation**: TP-Link official guides
- **Repository Issues**: GitHub issues section

---

## 🎯 **Business Benefits**

### **Automated Workflow:**
✅ **Instant Notifications** - Know immediately when someone purchases  
✅ **Professional Image** - Custom-branded portal experience  
✅ **Mobile-First Design** - Works perfectly on smartphones  
✅ **Secure Transactions** - Template protects your credentials  
✅ **Easy Management** - Simple voucher generation workflow  

### **Customer Benefits:**
✅ **Easy Purchase Process** - Intuitive form interface  
✅ **Multiple Payment Options** - Flexible bundle selection  
✅ **Mobile Optimized** - Touch-friendly on all devices  
✅ **Clear Pricing** - Transparent cost structure  
✅ **Quick Access** - Fast voucher delivery  

---

## 📄 **License**

This project is provided as-is for educational and personal use. Feel free to customize and adapt for your internet business needs.

---

## 🤝 **Contributing**

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open Pull Request**

---

## 📞 **Contact**

- **Repository**: [JuliusNtale/Custermized-Omada-Voucher-Page](https://github.com/JuliusNtale/Custermized-Omada-Voucher-Page)
- **Issues**: GitHub Issues section
- **Discussions**: GitHub Discussions

---

## 🎉 **Ready to Launch!**

**Your professional internet bundle business portal is ready for deployment!**

1. ✅ **Set up Call Me Bot API**
2. ✅ **Configure your settings**  
3. ✅ **Upload to Omada Controller**
4. ✅ **Start selling internet bundles**

**Transform your WiFi network into a profitable internet business! 🚀**
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

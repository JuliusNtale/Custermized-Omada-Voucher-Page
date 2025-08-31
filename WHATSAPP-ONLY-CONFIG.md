# Omada Configuration: WhatsApp Web Access Only

## 🎯 SOLUTION: Limited Internet for WhatsApp Web During Purchase

**Strategy**: Give customers 5-10 minutes of limited internet access specifically to send WhatsApp messages after purchasing bundles.

## 📋 Simple Omada Setup (Recommended)

### **Step 1: Enable Free Authentication**
1. Open Omada Controller
2. Go to **Settings** → **Authentication** → **Portal**
3. Configure:
   - **Portal Type**: `External Portal Server`
   - **Upload your custom portal ZIP file**
   - **Free Authentication**: ✅ **Enable**
   - **Time Limit**: `10 minutes`
   - **Bandwidth Down**: `2 Mbps`
   - **Bandwidth Up**: `1 Mbps`
   - **Concurrent Users**: `50`
   - **Success Redirect**: Leave blank (portal handles redirect)

### **Step 2: Test the Flow**
1. Customer connects to WiFi
2. Gets redirected to your portal
3. Customer selects bundle and enters details
4. Clicks "Submit Purchase Request"
5. **Gets 10 minutes of internet access**
6. **WhatsApp Web opens automatically** with pre-filled message
7. Customer clicks "Send" in WhatsApp
8. Internet access expires after 10 minutes

---

## 🔧 **Purchase Workflow**

### **Customer Experience:**
1. **Select bundle** → Choose Daily/Weekly/Monthly
2. **Enter details** → Phone number + payment reference
3. **Submit request** → Click "Submit Purchase Request"
4. **Get internet access** → 10 minutes of limited connectivity
5. **WhatsApp opens** → Pre-filled with purchase details
6. **Send message** → Click "Send" in WhatsApp
7. **Wait for voucher** → Receive voucher after payment verification

### **Your Experience:**
1. **📱 Get WhatsApp message** → Direct from customer
2. **💰 Verify payment** → Check mobile money to 0653520829
3. **🎫 Create voucher** → Generate in Omada Controller
4. **📱 Send voucher** → Reply with voucher code

---

## ⚡ **Benefits of This Approach**

✅ **Direct communication** - Customer sends message directly to you  
✅ **No server setup needed** - No webhooks or email configuration  
✅ **Real-time notification** - Get WhatsApp message immediately  
✅ **Simple Omada config** - Just enable free authentication  
✅ **Customer-friendly** - Familiar WhatsApp interface  
✅ **No technical dependencies** - Works with basic internet access  

---

## 🎯 **WhatsApp Message Format**

Customers will send you messages like this:

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

## 🚨 **Troubleshooting**

### **WhatsApp doesn't open?**
- Check if popup blocker is enabled
- Verify customer has internet access
- Increase free authentication time limit

### **Message not received?**
- Check your WhatsApp number in portal config (line 16 in index.js)
- Verify customer clicked "Send" in WhatsApp
- Check if customer's internet access expired

### **Customer can't access other websites?**
- This is normal - they only get limited internet for WhatsApp
- Internet access expires after time limit
- They need to purchase a voucher for full access

---

## 🔧 **Omada Configuration Summary**

```
Settings → Authentication → Portal
├── Portal Type: External Portal Server
├── Custom Portal: [Upload your ZIP file]
├── Free Authentication: ✅ Enabled
├── Time Limit: 10 minutes
├── Bandwidth: 2 Mbps Down / 1 Mbps Up
├── Concurrent Users: 50
└── Success Redirect: [Leave blank]
```

**That's it! Simple and effective.**

The customer gets just enough internet to:
- Complete the purchase form
- Open WhatsApp Web
- Send you the purchase message
- Nothing else (limited time/bandwidth)

**This is the cleanest solution - direct WhatsApp communication with minimal Omada configuration!**

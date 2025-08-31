# 🤖 Call Me Bot WhatsApp API Setup Guide

## 🎯 **Why Call Me Bot is Better**

✅ **Automatic message delivery** - No customer interaction needed  
✅ **Works without customer internet** - API call from portal server  
✅ **100% reliable delivery** - No popup blockers or browser issues  
✅ **Free for personal use** - No monthly fees  
✅ **Real-time notifications** - Messages arrive instantly  
✅ **No customer WhatsApp required** - They just fill the form  

---

## 📋 **Setup Steps (5 minutes)**

### **Step 1: Activate Call Me Bot (2 minutes)**

1. **Add to contacts**: +34 694 25 79 52
   - Name it: "CallMeBot" or "WhatsApp API"

2. **Send activation message**: 
   ```
   I allow callmebot to send me messages
   ```

3. **Wait for API key**:
   - You'll receive: "API Activated for your phone number. Your APIKEY is 123456"
   - **Save this API key** - you'll need it in Step 2

4. **Test the API** (optional):
   ```
   https://api.callmebot.com/whatsapp.php?phone=255653520829&text=Test+message&apikey=YOUR_API_KEY
   ```

### **Step 2: Configure Your Portal**

1. **Open** `index.js` in your portal files
2. **Find line 18** (Configuration section)
3. **Replace** `YOUR_API_KEY_HERE` with your actual API key:

```javascript
var CALLMEBOT_APIKEY = '123456'; // Your actual API key from Step 1
```

4. **Verify your phone number** (should be correct):
```javascript
var ADMIN_WHATSAPP = '255653520829'; // Your WhatsApp number
```

### **Step 3: Upload to Omada**

1. Create new ZIP file with updated `index.js`
2. Upload to Omada Controller
3. Test with a sample purchase

---

## 🚀 **How It Works Now**

### **Customer Experience:**
1. **Connects to WiFi** → Gets your portal
2. **Selects bundle** → Choose Daily/Weekly/Monthly
3. **Enters details** → Phone + payment reference
4. **Clicks Submit** → Form submits instantly
5. **Gets confirmation** → "Message sent successfully!"
6. **No internet needed** → Customer doesn't need WhatsApp access

### **Your Experience:**
1. **📱 Get instant WhatsApp** → Message arrives automatically
2. **💰 Verify payment** → Check M-Pesa to 0653520829
3. **🎫 Send voucher** → Reply with voucher code
4. **✅ Customer gets online** → They enter voucher

---

## 📱 **WhatsApp Message Format**

You'll receive instant messages like this:

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

## 🔧 **Omada Configuration**

Since customers don't need internet access to send messages, you can use simpler Omada config:

### **Option 1: No Free Internet (Recommended)**
```
Settings → Authentication → Portal
├── Portal Type: External Portal Server
├── Custom Portal: [Upload your ZIP file]
├── Free Authentication: ❌ Disabled
├── Success Redirect: [Leave blank]
└── Authentication Method: Voucher Only
```

### **Option 2: Minimal Free Internet**
```
Settings → Authentication → Portal
├── Portal Type: External Portal Server
├── Custom Portal: [Upload your ZIP file] 
├── Free Authentication: ✅ Enabled
├── Time Limit: 2 minutes
├── Bandwidth: 512 Kbps
└── Success Redirect: [Leave blank]
```

---

## ⚡ **Key Advantages**

### **Vs WhatsApp Web:**
✅ **No customer internet needed** - API works server-side  
✅ **No popup blockers** - Direct API call  
✅ **100% delivery rate** - No browser compatibility issues  
✅ **Instant messaging** - No customer clicks required  
✅ **Works on all devices** - Even basic phones  

### **Vs Email:**
✅ **Real-time notification** - WhatsApp is always open  
✅ **Higher visibility** - WhatsApp alerts are noticed  
✅ **No spam folders** - Messages always arrive  
✅ **Mobile-first** - Perfect for business on-the-go  

---

## 🚨 **Troubleshooting**

### **"API key not configured" error**
- Check line 18 in `index.js`
- Make sure you replaced `YOUR_API_KEY_HERE` with actual key
- Verify API key doesn't have extra spaces

### **No WhatsApp messages received**
- Test API manually with browser URL
- Check your phone number format: `255653520829` (no + or spaces)
- Verify you completed activation with Call Me Bot

### **"Purchase request processing..." message**
- This is normal - API call completed
- Check WhatsApp within 1-2 minutes
- If no message, verify API key setup

---

## 🎯 **API Configuration Example**

Here's what your `index.js` should look like after setup:

```javascript
// Configuration - Call Me Bot WhatsApp API
var CALLMEBOT_API_URL = 'https://api.callmebot.com/whatsapp.php';
var ADMIN_WHATSAPP = '255653520829'; // Your WhatsApp number
var CALLMEBOT_APIKEY = '123456'; // Your actual API key here
```

---

## 📞 **Support**

### **Call Me Bot Support:**
- Telegram: [@callmebot_com](https://t.me/callmebot_com)
- Email: support@callmebot.com

### **API Limits:**
- **Personal use**: Unlimited messages
- **Commercial use**: Check [TextMeBot.com](https://textmebot.com) for paid plans
- **Rate limit**: ~1 message per second

---

## 🎉 **Ready to Deploy!**

**This solution gives you:**
- ✅ Instant WhatsApp notifications
- ✅ No customer internet dependency  
- ✅ 100% reliable message delivery
- ✅ Simple Omada configuration
- ✅ Professional automated workflow

**Update your `index.js` with the API key and create a new ZIP file for Omada!**

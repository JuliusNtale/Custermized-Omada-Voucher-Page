# Omada Configuration: Allow WhatsApp Access During Purchase

## 🎯 SOLUTION: Limited Internet for WhatsApp Only

**The Strategy**: Configure Omada to allow access to WhatsApp domains during the purchase process, while keeping everything else blocked.

## 📋 Step-by-Step Omada Configuration

### **Option A: Bandwidth Control (Recommended)**

#### Step 1: Create Special Bandwidth Profile
1. Open Omada Controller
2. Go to **Settings** → **Bandwidth Control**
3. Click **+ Add** to create new profile
4. Configure:
   - **Name**: `Portal Purchase Access`
   - **Download**: `1 Mbps` (enough for WhatsApp)
   - **Upload**: `1 Mbps`
   - **Time Limit**: `10 minutes` (enough to complete purchase)

#### Step 2: Create Access Control Rule
1. Go to **Settings** → **Access Control** 
2. Click **+ Add Rule**
3. Configure:
   - **Name**: `WhatsApp Purchase Access`
   - **Action**: `Allow`
   - **Targets**: 
     - `web.whatsapp.com`
     - `wa.me`
     - `*.whatsapp.net`
     - `*.whatsapp.com`
     - `*.facebook.com` (WhatsApp servers)
   - **Schedule**: `Always`

#### Step 3: Configure Portal Authentication
1. Go to **Settings** → **Authentication** → **Portal**
2. Set **Portal Type**: `External Portal Server`
3. **External Portal Server**: Your portal URL
4. **Portal Customization**: Upload your custom portal ZIP
5. **Free Authentication**: 
   - ✅ Enable **Free Authentication**
   - **Bandwidth Profile**: `Portal Purchase Access`
   - **Time Limit**: `10 minutes`
   - **Access Policy**: `WhatsApp Purchase Access`

---

### **Option B: Firewall Rules (Advanced)**

#### Step 1: Create Firewall Group
1. Go to **Settings** → **Firewall** → **Groups**
2. Create **IP Group**:
   - **Name**: `WhatsApp Servers`
   - **IPs**: 
     - `157.240.0.0/16` (Facebook/WhatsApp range)
     - `31.13.24.0/21` (WhatsApp range)
     - `69.171.224.0/19` (Facebook range)

#### Step 2: Create Domain Group  
1. Create **Domain Group**:
   - **Name**: `WhatsApp Domains`
   - **Domains**:
     - `*.whatsapp.com`
     - `*.whatsapp.net`
     - `web.whatsapp.com`
     - `wa.me`

#### Step 3: Configure Access Rules
1. Go to **Settings** → **Firewall** → **Access Control**
2. Create rules in this order:

**Rule 1: Allow WhatsApp**
- **Name**: `Allow WhatsApp Purchase`
- **Action**: `Accept`
- **Source**: `Portal Users` (create this group)
- **Destination**: `WhatsApp Servers` + `WhatsApp Domains`
- **Service**: `HTTP/HTTPS`
- **Schedule**: `Always`

**Rule 2: Block Other Internet**
- **Name**: `Block Other Internet`
- **Action**: `Drop`
- **Source**: `Portal Users`
- **Destination**: `Any`
- **Service**: `Any`
- **Schedule**: `Always`

---

### **Option C: Simple Time-Based Access (Easiest)**

#### Step 1: Configure Free Authentication
1. Go to **Settings** → **Authentication** → **Portal**
2. Enable **Free Authentication**:
   - **Time Limit**: `5 minutes`
   - **Bandwidth**: `1 Mbps Down/Up`
   - **Concurrent Users**: `50`

#### Step 2: Configure Redirect
1. **Success URL**: `https://web.whatsapp.com`
2. **Redirect Delay**: `0 seconds`
3. This gives users 5 minutes of limited internet access

---

## 🔧 **Portal Workflow with Limited Access**

### **What Happens:**
1. **Customer connects** → Gets portal page
2. **Customer selects bundle** → Fills purchase form
3. **Customer clicks "Submit"** → Gets 5-10 minutes internet access
4. **WhatsApp Web opens automatically** → Message pre-filled
5. **Customer sends WhatsApp** → Purchase complete
6. **Internet access expires** → Customer waits for voucher

### **Your Workflow:**
1. **📱 Get WhatsApp message** → Customer sent it directly
2. **💰 Verify payment** → Check mobile money to 0653520829
3. **🎫 Create voucher** → Generate in Omada Controller
4. **📱 Send voucher** → WhatsApp/SMS to customer

---

## 🎯 **Recommended Configuration**

**For simplicity, use Option C:**

```
Settings → Authentication → Portal
├── Portal Type: External Portal Server
├── Free Authentication: ✅ Enabled
├── Time Limit: 5 minutes
├── Bandwidth: 1 Mbps
├── Success Redirect: https://web.whatsapp.com
└── Portal Files: [Your custom ZIP]
```

**This gives customers just enough internet to:**
- ✅ Complete the purchase form
- ✅ Open WhatsApp Web
- ✅ Send the purchase message
- ❌ Browse other websites (limited time/bandwidth)

---

## 🚀 **Updated Portal Features**

The new portal code:
1. **Tests WhatsApp connectivity** first
2. **Opens WhatsApp Web** if accessible  
3. **Sends email backup** always
4. **Provides WhatsApp link** in email for manual sending
5. **Handles all failure cases** gracefully

## ⚡ **Result**

**Perfect hybrid solution:**
- ✅ Customer can send WhatsApp directly (if access allowed)
- ✅ You get email notification (always)
- ✅ Email includes WhatsApp link (for manual sending)
- ✅ No customer frustration
- ✅ Reliable purchase notifications

**This gives you the best of both worlds!**

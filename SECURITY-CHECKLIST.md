# Security Configuration for Git Repository

## 🔒 SECURITY CHECKLIST

### ✅ **What to Secure Before Git Push:**

1. **API Keys** - Replace with placeholder values
2. **Phone Numbers** - Use example numbers  
3. **Personal Information** - Remove real data
4. **Configuration Files** - Use template versions

---

## 🛡️ **Files to Secure:**

### **index.js (Line 20-21):**
**Current (SENSITIVE):**
```javascript
var ADMIN_WHATSAPP = '+255653520829'; // Your actual number
var CALLMEBOT_APIKEY = '9445949'; // Your actual API key
```

**Git Version (SAFE):**
```javascript
var ADMIN_WHATSAPP = '+255XXXXXXXXX'; // Replace with your WhatsApp number
var CALLMEBOT_APIKEY = 'YOUR_API_KEY_HERE'; // Get from Call Me Bot activation
```

---

## 🔧 **Recommended Approach:**

### **Option 1: Environment Variables (Best Practice)**
1. Create `config.js` (add to .gitignore)
2. Use placeholder values in main files
3. Load actual config at runtime

### **Option 2: Template Files**
1. Keep `index.js` with placeholder values
2. Create `index.production.js` locally (not in Git)
3. Use production version for deployment

### **Option 3: Post-Clone Configuration**
1. Push template files to Git
2. Document configuration steps in README
3. Update values after cloning

---

## 📁 **Files Status:**

### **Safe to Push:**
✅ `index.html` - No sensitive data
✅ `index.css` - Styling only  
✅ `jquery.min.js` - Library file
✅ `background.png` - Image asset
✅ `logo.png` - Image asset
✅ `img/` folder - Image assets
✅ Documentation files (.md)

### **Needs Security Review:**
⚠️ `index.js` - Contains API key and phone number
⚠️ `simple-email-webhook.php` - May contain credentials

---

## 🔒 **Git Security Best Practices:**

### **Create .gitignore:**
```
# Local configuration files
config.local.js
*.production.js
.env
.env.local

# Sensitive data
*secret*
*private*
*key*

# Deployment files
deployment/
live/

# System files
.DS_Store
Thumbs.db
```

### **Use Git Secrets Detection:**
- Install git-secrets: `git secrets --install`
- Scan for sensitive data: `git secrets --scan`

---

## 🚀 **Recommended Git Workflow:**

1. **Create secure template version**
2. **Add .gitignore file**  
3. **Commit template files**
4. **Keep production config local**
5. **Document setup process**

Would you like me to create the secure template versions for Git?

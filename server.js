// =====================================================
// SOLARA 2026 - Midnight Nebula Edition
// Production-Ready Solar Platform
// =====================================================

const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

// =====================================================
// SECURITY: Helmet.js with Flexible CSP
// =====================================================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'", 
        "'unsafe-inline'", 
        "'unsafe-eval'",
        "https://unpkg.com", 
        "https://cdn.jsdelivr.net",
        "https://cdn.tailwindcss.com",
        "https://cdnjs.cloudflare.com",
        "https://fonts.googleapis.com"
      ],
      styleSrc: [
        "'self'", 
        "'unsafe-inline'", 
        "https://fonts.googleapis.com",
        "https://cdn.tailwindcss.com",
        "https://cdnjs.cloudflare.com"
      ],
      fontSrc: [
        "'self'", 
        "https://fonts.gstatic.com",
        "https://cdnjs.cloudflare.com"
      ],
      imgSrc: [
        "'self'", 
        "data:", 
        "https:", 
        "https://images.unsplash.com",
        "https://cdnjs.cloudflare.com"
      ],
      connectSrc: ["'self'", "https:"],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "https:"],
      frameAncestors: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
}));

// Performance
app.use(compression());

// Middleware
app.use(cors());
app.use(express.json());

// Static files
app.use(express.static('public', {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

// =====================================================
// RATE LIMITING
// =====================================================
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests' }
});

const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many submissions' }
});

app.use('/api/', apiLimiter);

// =====================================================
// DATABASE
// =====================================================
const DB_PATH = path.join(__dirname, 'data', 'solera.db');

const fs = require('fs');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);
console.log('✅ Database: solera.db');

// Create table
db.exec(`
  CREATE TABLE IF NOT EXISTS inquiries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    city TEXT,
    type TEXT DEFAULT 'Residential',
    message TEXT,
    date DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

console.log('✅ Table: inquiries');

// =====================================================
// VALIDATION
// =====================================================
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone) {
  return /^(05|06|07)[0-9]{8}$/.test(phone);
}

function sanitizeString(str, maxLength = 500) {
  if (typeof str !== 'string') return '';
  return str.replace(/['";\\]/g, '').substring(0, maxLength).trim();
}

// =====================================================
// TELEGRAM BOT CONFIG (User must get their PERSONAL Chat ID)
// =====================================================
// IMPORTANT: To fix "Forbidden" / "bots can't send to bots" error:
// 1. Go to @userinfobot on Telegram
// 2. Click "User" button to get YOUR personal Chat ID
// 3. Replace CHAT_ID below with YOUR personal ID (not the bot's ID!)
// =====================================================
const TELEGRAM_TOKEN = '7213360352:AAFe63TcXjWT8yo09rsUtPcy2FTte1kzuRw';
const CHAT_ID = 'YOUR_PERSONAL_CHAT_ID_HERE'; // ⚠️ Replace with your PERSONAL ID from @userinfobot

// =====================================================
// TELEGRAM NOTIFICATION FUNCTION (With Forbidden Error Handling)
// =====================================================
function sendTelegramMessage(leadData) {
  // Check if Telegram is configured
  if (TELEGRAM_TOKEN === 'YOUR_BOT_TOKEN_HERE' || CHAT_ID === 'YOUR_PERSONAL_CHAT_ID_HERE') {
    console.log('⚠️ Telegram not configured - skipping notification');
    console.log('💡 To fix: Get your personal Chat ID from @userinfobot');
    return;
  }
  
  console.log('📤 Sending Telegram notification...');
  
  const { name, phone, city, type, savings } = leadData;
  
  // Determine project type emoji
  const typeEmoji = type === 'Commercial' ? '🏢' : type === 'Industrial' ? '🏭' : '🏠';
  
  const message = `🔔 *طلب جديد من سولارا 2026!*

${typeEmoji} *النوع:* ${type || 'سكني'}
👤 *الاسم:* ${name}
📞 *الهاتف:* ${phone}
📍 *الولاية:* ${city || 'غير محدد'}
💰 *الوفر السنوي:* ${savings || '0'} د.ج

---
✨ تم الإرسال من موقع SOLERA الرسمي`;
  
  const encodedMessage = encodeURIComponent(message);
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${encodedMessage}&parse_mode=Markdown`;
  
  const req = https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        if (result.ok) {
          console.log('✅ Telegram notification sent successfully');
        } else {
          // Handle specific errors
          if (result.error_code === 403) {
            console.log('❌ Forbidden Error:');
            console.log('   Bots cannot send messages to bots!');
            console.log('   💡 Solution: Use your PERSONAL Chat ID from @userinfobot');
            console.log('   📱 Click "User" button to get your personal ID');
          } else if (result.error_code === 400) {
            console.log('❌ Bad Request: Check your Chat ID');
          } else {
            console.log('⚠️ Telegram API error:', result.description);
          }
        }
      } catch (e) {
        console.log('⚠️ Telegram response parse error');
      }
    });
  });
  
  req.on('error', (err) => {
    console.log('⚠️ Telegram notification failed:', err.message);
  });
  
  req.end();
}

// =====================================================
// API ROUTES
// =====================================================

// POST: Submit lead
app.post('/api/v1/leads', submitLimiter, (req, res) => {
  try {
    const { name, email, phone, city, type, message } = req.body;
    
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'الاسم مطلوب' });
    }
    
    if (!phone || !validatePhone(phone)) {
      return res.status(400).json({ success: false, message: 'رقم الهاتف غير صالح' });
    }
    
    if (email && !validateEmail(email)) {
      return res.status(400).json({ success: false, message: 'البريد الإلكتروني غير صالح' });
    }
    
    const validTypes = ['Residential', 'Commercial', 'Industrial'];
    const inquiryType = validTypes.includes(type) ? type : 'Residential';
    
    const stmt = db.prepare(`
      INSERT INTO inquiries (name, email, phone, city, type, message)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      sanitizeString(name, 100),
      sanitizeString(email, 100),
      sanitizeString(phone, 20),
      sanitizeString(city, 50),
      inquiryType,
      sanitizeString(message, 1000)
    );
    
    // Calculate potential savings for Telegram notification
    const savings = Math.round(2000 * 12 * 0.85); // Default estimate
    
    // Send Telegram notification (non-blocking)
    sendTelegramMessage({
      name: sanitizeString(name, 100),
      phone: sanitizeString(phone, 20),
      city: sanitizeString(city, 50),
      savings: savings
    });
    
    res.status(201).json({
      success: true,
      message: 'تم إرسال طلبك بنجاح!',
      data: { id: result.lastInsertRowid }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

// HIDDEN: Fetch all data
app.get('/api/v1/vault/secure-data-7721', (req, res) => {
  try {
    const leads = db.prepare('SELECT * FROM inquiries ORDER BY date DESC').all();
    const stats = {
      total: db.prepare('SELECT COUNT(*) as count FROM inquiries').get().count,
      residential: db.prepare("SELECT COUNT(*) as count FROM inquiries WHERE type = 'Residential'").get().count,
      commercial: db.prepare("SELECT COUNT(*) as count FROM inquiries WHERE type = 'Commercial'").get().count,
      industrial: db.prepare("SELECT COUNT(*) as count FROM inquiries WHERE type = 'Industrial'").get().count
    };
    
    res.json({ success: true, data: { leads, stats } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في جلب البيانات' });
  }
});

// =====================================================
// PAGE ROUTES
// =====================================================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin-panel', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// =====================================================
// ERROR HANDLERS
// =====================================================
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).send('<h1>خطأ في الخادم</h1>');
});

app.use((req, res) => {
  res.status(404).send('<h1>404 - الصفحة غير موجودة</h1>');
});

// =====================================================
// START
// =====================================================
app.listen(PORT, () => {
  console.log('╔═══════════════════════════════════════╗');
  console.log('║   🚀 SOLARA 2026 Running            ║');
  console.log('║   URL: http://localhost:' + PORT + '           ║');
  console.log('╚═══════════════════════════════════════╝');
});

const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Firebase Admin SDK (Placeholder logic till credentials provided)
// Firebase Admin SDK Initialization
try {
    const serviceAccountPath = require('path').join(__dirname, '../serviceAccountKey.json');
    if (require('fs').existsSync(serviceAccountPath)) {
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('✅ Firebase Admin initialized with serviceAccountKey.json');
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        // Fallback to env var
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('✅ Firebase Admin initialized via ENV variable');
    } else {
        console.log('\x1b[33m%s\x1b[0m', '⚠️  Firebase Credentials not found. Starting in MOCK MODE.');
        console.log('\x1b[33m%s\x1b[0m', '    - Database: Local Persistent File (quotes.json)');
        console.log('\x1b[33m%s\x1b[0m', '    - Auth: Bypassed (Dev only)');
    }
} catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error.message);
}

// Health Check
app.get('/api/health', (req, res) => {
    res.status(200).send('Quote Compare App Backend is running!');
});

const quoteRoutes = require('./routes/quote.routes');

// Routes
// app.use('/api/auth', authRoutes);
app.use('/api/quotes', quoteRoutes);

// --- SERVE FRONTEND (Production) ---
const path = require('path');
// Serve static files from the "public/browser" directory (Angular's build output)
app.use(express.static(path.join(__dirname, '../public/browser')));

// Catch-all route: for any request NOT starting with /api, serve index.html
app.get(/.*/, (req, res) => {
    if (!req.url.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '../public/browser/index.html'));
    }
});

/* Only start server if run directly (not in tests) */
if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}

module.exports = app;

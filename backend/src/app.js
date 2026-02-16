const express = require('express');
// Force IPv4 for DNS resolution to avoid IPv6 connectivity issues on some cloud providers (Node 17+)
require('dns').setDefaultResultOrder('ipv4first');
// const admin = require('firebase-admin'); // Removed for Supabase migration
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Supabase Initialization
const supabase = require('./config/supabase');
console.log('✅ Supabase Client initialized.');

// Health Check
app.get('/api/health', (req, res) => {
    res.status(200).send('Quote Compare App Backend is running!');
});

const quoteRoutes = require('./routes/quote.routes');
const adminRoutes = require('./routes/admin.routes');

// Routes
// app.use('/api/auth', authRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/admin', adminRoutes);

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

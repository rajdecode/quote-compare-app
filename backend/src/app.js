const express = require('express');
// Force IPv4 for DNS resolution to avoid IPv6 connectivity issues on some cloud providers (Node 17+)
require('dns').setDefaultResultOrder('ipv4first');
// const admin = require('firebase-admin'); // Removed for Supabase migration
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware - restrict CORS to known frontend origins
// ALLOWED_ORIGINS can be comma-separated, e.g. "http://localhost:4200,https://myapp.onrender.com"
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:4200,https://quote-compare-app.onrender.com')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (Postman, server-to-server, same-origin browser requests)
        if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS policy: origin ${origin} not allowed`));
        }
    },
    credentials: true
}));
app.use(bodyParser.json());

// Enable trust proxy if behind Render's load balancer so IP limits work correctly
app.set('trust proxy', 1);

// Import and apply Global Rate Limiter
const { apiLimiter } = require('./middleware/rateLimit.middleware');
app.use('/api/', apiLimiter);

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

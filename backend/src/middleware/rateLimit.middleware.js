const rateLimit = require('express-rate-limit');

// 1. Global API Limiter (Standard Protection)
exports.apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 150, // Limit each IP to 150 requests per `window` (here, per 15 minutes)
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests from this IP, please try again after 15 minutes' }
});

// 2. Strict Limiter for Quote Submissions (Prevent spam bots)
exports.quoteSubmissionLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: 20, // Limit each IP to 20 quote submissions per hour
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many quotes submitted from this IP, please try again after an hour' }
});

// 3. Strict Limiter for Auth Routes (Mitigate brute force attacks)
exports.authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // Limit each IP to 30 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login attempts from this IP, please try again after 15 minutes' }
});

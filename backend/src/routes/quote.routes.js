const express = require('express');
const router = express.Router();
const quoteController = require('../controllers/quote.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Create a quote (Buyer or Guest)
router.post('/', authMiddleware.verifyTokenOptional, quoteController.createQuote);

// Get quotes (All authenticated users, filtered by role in controller)
router.get('/', authMiddleware.verifyToken, quoteController.getQuotes);

// Get single quote by ID (Public/Guest access allowed for tracking)
router.get('/:id', authMiddleware.verifyTokenOptional, quoteController.getQuoteById);

// Respond to quote (Vendor only)
router.post('/:quoteId/respond', authMiddleware.verifyToken, authMiddleware.checkRole(['vendor']), quoteController.respondToQuote);

// Update existing response (Vendor only)
router.put('/:quoteId/respond', authMiddleware.verifyToken, authMiddleware.checkRole(['vendor']), quoteController.updateResponse);

// Update response status (Buyer only) - Accept/Negotiate
router.patch('/:quoteId/responses/:vendorId/status', authMiddleware.verifyToken, authMiddleware.checkRole(['buyer']), quoteController.updateResponseStatus);

// Complete Job / Upload Invoice (Vendor only)
router.post('/:quoteId/complete', authMiddleware.verifyToken, authMiddleware.checkRole(['vendor']), quoteController.completeJob);

module.exports = router;

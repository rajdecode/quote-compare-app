const admin = require('firebase-admin');
const Quote = require('../models/quote.model');
const emailService = require('../services/email.service');

// Mock storage
// Mock storage
const mockQuotes = global.mockQuotes || [
    {
        id: 'mock-seed-1',
        buyerId: 'mock-buyer-1',
        serviceType: 'heat-pump',
        postalCode: '2000',
        details: 'Need a 5kW heat pump installed for a 3-bedroom house.',
        status: 'responded',
        createdAt: new Date(),
        responses: [
            {
                vendorId: 'mock-vendor-1',
                vendorName: 'Super Solar & Heat',
                price: 4500,
                message: 'We can install a premium Mitsubishi system for this price. inclusive of GST.',
                createdAt: new Date()
            }
        ]
    },
    {
        id: 'mock-seed-2',
        buyerId: 'mock-buyer-2',
        serviceType: 'solar',
        postalCode: '3000',
        details: 'Looking for 6.6kW solar system quotes.',
        status: 'open',
        createdAt: new Date(Date.now() - 86400000) // Yesterday
    }
];
// Clear global to force reset on restart if needed, or just let it persist in memory
if (!global.mockQuotes) global.mockQuotes = mockQuotes;

// Helper to safely get DB or throw
const getDb = () => {
    try {
        if (!admin.apps.length) throw new Error('Firebase Admin not initialized');
        return admin.firestore();
    } catch (e) {
        throw new Error('Firestore unavailable: ' + e.message);
    }
};

// Create a new quote request
exports.createQuote = async (req, res) => {
    const { serviceType, postalCode, details, email } = req.body;

    // Determine user or guest
    let buyerId = 'guest';
    let contactEmail = email;

    if (req.user) {
        buyerId = req.user.uid;
        contactEmail = req.user.email || email; // Prefer auth email, fallback to body
    }

    if (!contactEmail) {
        return res.status(400).json({ error: 'Email is required for guest quotes.' });
    }

    const newQuote = {
        buyerId,
        contactEmail,
        serviceType,
        postalCode,
        details,
        status: 'open',
        createdAt: new Date() // Use JS Date for compatibility
    };

    try {
        // Try Firestore
        const db = getDb();
        // Use serverTimestamp only if we have a DB connection
        const quoteToSave = {
            ...newQuote,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await db.collection('quotes').add(quoteToSave);
        console.log('Quote saved to Firestore:', docRef.id);

        // Send Confirmation Email (Non-blocking)
        emailService.sendQuoteReceivedEmail(contactEmail, docRef.id, newQuote)
            .catch(err => console.error('Failed to send email in background:', err));

        res.status(201).json({ id: docRef.id, ...newQuote });
    } catch (error) {
        console.warn('Backend falling back to MOCK store due to:', error.message);

        // Fallback to Local Persistent DB
        try {
            const mockId = 'local-' + Date.now();
            const savedQuote = { id: mockId, ...newQuote };

            dbService.saveQuote(savedQuote);

            console.log('Quote saved to Local Persistent DB:', mockId);

            // Send Confirmation Email (Mock/Local)
            await emailService.sendQuoteReceivedEmail(contactEmail, mockId, newQuote);

            res.status(201).json(savedQuote);
        } catch (mockError) {
            console.error('Critical error saving to local DB:', mockError);
            res.status(500).json({ error: 'Failed to create quote (Critical)' });
        }
    }
};

const dbService = require('../services/db.service');

// Get quotes (filters based on user role)
exports.getQuotes = async (req, res) => {
    try {
        const quotes = [];

        // Try Firestore first (if configured)
        try {
            if (admin.apps.length) {
                const db = admin.firestore();
                const quotesRef = db.collection('quotes');
                let snapshot;

                if (req.user && req.user.role === 'buyer') {
                    // Optimized query (requires index) - falling back to simple filter if needed
                    // snapshot = await quotesRef.where('buyerId', '==', req.user.uid).orderBy('createdAt', 'desc').get();
                    snapshot = await quotesRef.where('buyerId', '==', req.user.uid).get();
                } else {
                    snapshot = await quotesRef.orderBy('createdAt', 'desc').get();
                }

                snapshot.forEach(doc => {
                    const data = doc.data();

                    // Transform timestamps in responses array
                    const responses = data.responses ? data.responses.map(r => ({
                        ...r,
                        // Convert Firestore Timestamp to JS Date if exists, or keep as is
                        createdAt: r.createdAt && r.createdAt.toDate ? r.createdAt.toDate() : r.createdAt
                    })) : [];

                    quotes.push({
                        id: doc.id,
                        ...data,
                        createdAt: data.createdAt && data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt,
                        responses: responses
                    });
                });
                return res.status(200).json(quotes);
            }
        } catch (dbError) {
            console.error('❌ Firestore Query Failed:', dbError);
            // Common error: Missing Index. Check console for URL to create index.
        }

        // Fallback to Local Persistent JSON DB
        console.log('Serving from Local Persistent DB');
        const localQuotes = dbService.getQuotes();

        // Filter logic for Buyer/Vendor
        const userQuotes = req.user.role === 'buyer'
            ? localQuotes.filter(q => q.buyerId === req.user.uid || q.buyerId.startsWith('mock-'))
            : localQuotes;

        // Sort by date desc
        userQuotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.status(200).json(userQuotes);
    } catch (error) {
        console.error('Error fetching quotes:', error);
        res.status(500).json({ error: 'Failed to fetch quotes' });
    }
};

// Get single quote by ID (Public/Protected mixed)
exports.getQuoteById = async (req, res) => {
    try {
        const { id } = req.params;
        let quote = null;

        // 1. Try Firestore
        try {
            if (admin.apps.length) {
                const doc = await admin.firestore().collection('quotes').doc(id).get();
                if (doc.exists) {
                    const data = doc.data();
                    quote = {
                        id: doc.id,
                        ...data,
                        createdAt: data.createdAt && data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt
                    };
                }
            }
        } catch (e) {
            console.warn('Firestore fetch failed:', e.message);
        }

        // 2. Fallback to Local DB
        if (!quote) {
            const localQuotes = dbService.getQuotes();
            quote = localQuotes.find(q => q.id === id);
        }

        if (!quote) {
            return res.status(404).json({ error: 'Quote not found' });
        }

        // Security/Privacy Filter
        // If user is guest (no auth), hide full vendor details? 
        // For now, we return basic info. If sensitive, we should filter.
        // Assuming public tracking is allowed via ID (security by obscurity of ID).

        res.status(200).json(quote);

    } catch (error) {
        console.error('Error fetching quote:', error);
        res.status(500).json({ error: 'Failed to fetch quote' });
    }
};

// Respond to a quote (Vendor only)
exports.respondToQuote = async (req, res) => {
    try {
        const { quoteId } = req.params;
        const { price, message } = req.body;
        const vendorId = req.user.uid;
        const vendorName = req.user.name || req.user.email || 'Vendor'; // Fallback name

        const response = {
            vendorId,
            vendorName,
            price: Number(price),
            message,
            createdAt: new Date()
        };

        // 1. Try Firestore (Real Sync)
        try {
            if (admin.apps.length) {
                const db = admin.firestore();
                const quoteRef = db.collection('quotes').doc(quoteId);

                // Use runTransaction to ensure atomicity
                await db.runTransaction(async (t) => {
                    const doc = await t.get(quoteRef);
                    if (!doc.exists) throw new Error('Quote not found in Firestore');

                    // We must use arrayUnion for cleaner updates, but manually appending is safer for transaction read/write consistency
                    const currentResponses = doc.data().responses || [];
                    const updatedResponses = [...currentResponses, response];

                    t.update(quoteRef, {
                        responses: updatedResponses,
                        status: 'responded'
                    });
                });

                console.log('✅ Response saved to Firestore:', quoteId);

                // Try to notify buyer email
                try {
                    const quoteDoc = await quoteRef.get();
                    if (quoteDoc.exists) {
                        const quoteData = quoteDoc.data();
                        if (quoteData.contactEmail) {
                            await emailService.sendEmail(
                                quoteData.contactEmail,
                                'New Quote Response!',
                                `You have received a new quote from ${vendorName} for $${response.price}. Log in to view details.`
                            );
                        }
                    }
                } catch (notifyError) {
                    console.warn('Failed to send notification email:', notifyError.message);
                }

                return res.status(200).json({ message: 'Quote response submitted (Firestore)', response });
            }
        } catch (dbError) {
            console.warn('❌ Firestore write failed, trying local fallback:', dbError.message);
        }

        // 2. Mock Store Fallback (Persistent)
        const localQuotes = dbService.getQuotes();
        const quoteIndex = localQuotes.findIndex(q => q.id === quoteId);

        if (quoteIndex !== -1) {
            const quote = localQuotes[quoteIndex];
            if (!quote.responses) quote.responses = [];

            quote.responses.push(response);
            quote.status = 'responded';

            dbService.updateQuote(quote); // Save back to file

            console.log('Response saved to Local DB:', quoteId);
            res.status(200).json({ message: 'Quote response submitted (Local DB)', response });
        } else {
            res.status(404).json({ error: 'Quote not found (Local DB)' });
        }

    } catch (error) {
        console.error('Error submitting response:', error);
        res.status(500).json({ error: 'Failed to submit response' });
    }
};
// Update a response (Vendor only) - Support for Edit & History
exports.updateResponse = async (req, res) => {
    try {
        const { quoteId } = req.params;
        const { price, message } = req.body;
        const vendorId = req.user.uid;

        // 1. Try Firestore
        try {
            if (admin.apps.length) {
                const db = admin.firestore();
                const quoteRef = db.collection('quotes').doc(quoteId);

                await db.runTransaction(async (t) => {
                    const doc = await t.get(quoteRef);
                    if (!doc.exists) throw new Error('Quote not found');

                    const data = doc.data();
                    const responses = data.responses || [];
                    const responseIndex = responses.findIndex(r => r.vendorId === vendorId);

                    if (responseIndex === -1) throw new Error('Response not found');

                    const oldResponse = responses[responseIndex];

                    // Create history entry
                    const historyEntry = {
                        price: oldResponse.price,
                        message: oldResponse.message,
                        archivedAt: new Date()
                    };

                    // Update response
                    const updatedResponse = {
                        ...oldResponse,
                        price: Number(price),
                        message,
                        updatedAt: new Date(),
                        history: [...(oldResponse.history || []), historyEntry]
                    };

                    responses[responseIndex] = updatedResponse;

                    t.update(quoteRef, { responses });
                });

                console.log('✅ Response updated in Firestore:', quoteId);
                return res.status(200).json({ message: 'Quote response updated' });
            }
        } catch (dbError) {
            console.warn('❌ Firestore update failed, trying local fallback:', dbError.message);
        }

        // 2. Local Fallback
        const localQuotes = dbService.getQuotes();
        const quote = localQuotes.find(q => q.id === quoteId);

        if (quote) {
            const response = quote.responses?.find(r => r.vendorId === vendorId);
            if (response) {
                // Archive history
                if (!response.history) response.history = [];
                response.history.push({
                    price: response.price,
                    message: response.message,
                    archivedAt: new Date()
                });

                // Update fields
                response.price = Number(price);
                response.message = message;
                response.updatedAt = new Date();

                dbService.updateQuote(quote);
                res.status(200).json({ message: 'Quote response updated (Local)' });
            } else {
                res.status(404).json({ error: 'Response not found' });
            }
        } else {
            res.status(404).json({ error: 'Quote not found' });
        }

    } catch (error) {
        console.error('Error updating response:', error);
        res.status(500).json({ error: 'Failed to update response' });
    }
};

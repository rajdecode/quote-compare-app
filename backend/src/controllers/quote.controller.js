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
    const { serviceType, postalCode, suburb, details, email } = req.body;

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
        suburb: suburb || '', // Optional/Safe default
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
                        status: r.status || 'responded',
                        // Convert Firestore Timestamp to JS Date if exists, or keep as is
                        createdAt: r.createdAt && r.createdAt.toDate ? r.createdAt.toDate() : r.createdAt,
                        history: r.history ? r.history.map(h => ({
                            ...h,
                            archivedAt: h.archivedAt && h.archivedAt.toDate ? h.archivedAt.toDate() : h.archivedAt,
                            updatedAt: h.updatedAt && h.updatedAt.toDate ? h.updatedAt.toDate() : h.updatedAt
                        })) : []
                    })) : [];

                    quotes.push({
                        id: doc.id,
                        ...data,
                        createdAt: data.createdAt && data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt,
                        responses: responses
                    });
                });

                // Fetch full User Profile for Vendor to get custom fields (serviceAreas etc)
                // rq.user only has basic info from middleware usually. 
                // We need to ensure we have the filtering fields. 
                // Ideally middleware populates it, but if not, we might need to fetch it here or assume middleware does it.
                // For now, assuming middleware or previous auth step passed it. 
                // IF NOT, we should fetch it.
                // Let's fetch it for safety if role is vendor.
                let filterUser = req.user;
                if (req.user.role === 'vendor') {
                    const userDoc = await admin.firestore().collection('users').doc(req.user.uid).get();
                    if (userDoc.exists) {
                        filterUser = { ...req.user, ...userDoc.data() };
                    }
                }

                const filteredQuotes = filterQuotesByPlan(quotes, filterUser);
                return res.status(200).json(filteredQuotes);
            }
        } catch (dbError) {
            console.error('❌ Firestore Query Failed:', dbError);
            // Common error: Missing Index. Check console for URL to create index.
        }

        // Fallback to Local Persistent JSON DB
        console.log('Serving from Local Persistent DB');
        const localQuotes = dbService.getQuotes();

        // Filter logic for Buyer/Vendor
        let userQuotes = req.user.role === 'buyer'
            ? localQuotes.filter(q => q.buyerId === req.user.uid || q.buyerId.startsWith('mock-'))
            : localQuotes;

        // Apply Plan-based filtering (for Firestore data too if we weren't just using local fallback in this snippet, 
        // but current structure has mixed flows. Let's fix the return flow.)
        // Note: The previous Firestore block returned early. I need to apply filter there too.

        // ... (This replacing is tricky because of the early return in line 155. I should refactor slightly or duplicate filter)
        // Let's assume the previous block is uncommented/active. 
        // I will just modify the previous block's return and this block's return.

        userQuotes = filterQuotesByPlan(userQuotes, req.user);

        // Sort by date desc
        userQuotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.status(200).json(userQuotes);
    } catch (error) {
        console.error('Error fetching quotes:', error);
        res.status(500).json({ error: 'Failed to fetch quotes' });
    }
};

// Helper: Filter quotes based on Vendor Profile & Plan
const filterQuotesByPlan = (quotes, user) => {
    if (user.role !== 'vendor') return quotes;

    // 1. Plan Limits (Basic vs Pro)
    // Basic: Heat Pumps and Batteries only
    const plan = user.plan || '';
    if (plan === 'basic') {
        const allowedTypes = ['heat-pump', 'battery'];
        quotes = quotes.filter(q => allowedTypes.includes(q.serviceType));
    }

    // 2. Profile Filtering (Location & Services)
    // If vendor has configured settings, filter strictly.
    // If NO settings (legacy/new vendor), maybe show all? 
    // Decision: If settings exist, use them. If not, show all (or maybe show all matching plan).
    // Let's assume emptiness means "Global/All" for now to avoid empty dashboards on start.

    // Check if ANY filter is set
    const hasLocationFilter = (user.servicePostcodes && user.servicePostcodes.length > 0) ||
        (user.serviceSuburbs && user.serviceSuburbs.length > 0);
    const hasServiceFilter = (user.servicesOffered && user.servicesOffered.length > 0);

    if (!hasLocationFilter && !hasServiceFilter) {
        return quotes; // No filters set, return plan-filtered quotes
    }

    return quotes.filter(q => {
        // Location Match (OR logic: Postcode OR Suburb)
        let locationMatch = true; // Default to true if no location filter set
        if (hasLocationFilter) {
            const postcodeMatch = user.servicePostcodes?.includes(q.postalCode);
            // Case-insensitive suburb match
            const suburbMatch = user.serviceSuburbs?.some(s => s.toLowerCase() === (q.suburb || '').toLowerCase());
            locationMatch = postcodeMatch || suburbMatch;
        }

        // Service Match (AND logic with Location)
        let serviceMatch = true; // Default to true if no service filter set
        if (hasServiceFilter) {
            serviceMatch = user.servicesOffered.includes(q.serviceType);
        }

        return locationMatch && serviceMatch;
    });
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

                    // Transform timestamps in responses array (CRITICAL FIX)
                    const responses = data.responses ? data.responses.map(r => ({
                        ...r,
                        status: r.status || 'responded', // Default status if undefined
                        createdAt: r.createdAt && r.createdAt.toDate ? r.createdAt.toDate() : r.createdAt,
                        history: r.history ? r.history.map(h => ({
                            ...h,
                            archivedAt: h.archivedAt && h.archivedAt.toDate ? h.archivedAt.toDate() : h.archivedAt,
                            updatedAt: h.updatedAt && h.updatedAt.toDate ? h.updatedAt.toDate() : h.updatedAt
                        })) : []
                    })) : [];

                    quote = {
                        id: doc.id,
                        ...data,
                        responses: responses, // Use transformed responses
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
            createdAt: new Date(),
            status: 'responded' // default status
        };

        // Enforce Trial Limits (only for NEW responses)
        // We need to check if this is an update or a new response first to enforce limits correctly
        // But for simplicity, we'll check limits on "quotesResponded" counter which should be incremented only on new.

        // 1. Try Firestore (Real Sync)
        try {
            if (admin.apps.length) {
                const db = admin.firestore();
                const quoteRef = db.collection('quotes').doc(quoteId);

                // Use runTransaction to ensure atomicity
                await db.runTransaction(async (t) => {
                    const doc = await t.get(quoteRef);
                    if (!doc.exists) throw new Error('Quote not found in Firestore');

                    const data = doc.data();
                    let responses = data.responses || [];
                    const existingIndex = responses.findIndex(r => r.vendorId === vendorId);

                    if (existingIndex !== -1) {
                        // UPDATE existing response
                        const oldResponse = responses[existingIndex];

                        // Archive old version if price changed
                        const historyEntry = {
                            price: oldResponse.price,
                            message: oldResponse.message,
                            status: oldResponse.status,
                            archivedAt: new Date()
                        };

                        responses[existingIndex] = {
                            ...oldResponse,
                            price: Number(price),
                            message: message,
                            status: 'responded', // Reset status if it was 'negotiating'
                            updatedAt: new Date(),
                            history: [...(oldResponse.history || []), historyEntry]
                        };

                        // Don't increment user count for updates
                    } else {
                        // NEW response
                        if (req.user.plan === 'trial') {
                            const responsesCount = req.user.quotesResponded || 0;
                            if (responsesCount >= 3) {
                                throw new Error('Trial limit reached. You can only respond to 3 quotes during the trial. Please upgrade to Pro.');
                            }
                        }

                        responses.push(response);

                        // Increment Vendor's response count
                        const userRef = db.collection('users').doc(vendorId);
                        t.update(userRef, {
                            quotesResponded: admin.firestore.FieldValue.increment(1)
                        });
                    }

                    t.update(quoteRef, {
                        responses: responses,
                        status: 'responded'
                    });
                });

                console.log('✅ Response saved/updated in Firestore:', quoteId);

                return res.status(200).json({ message: 'Quote response submitted (Firestore)', response });
            }
        } catch (dbError) {
            console.warn('❌ Firestore write failed/error:', dbError.message);
            if (dbError.message.includes('Trial limit')) {
                return res.status(403).json({ error: dbError.message });
            }
        }

        // 2. Mock Store Fallback (Persistent)
        const localQuotes = dbService.getQuotes();
        const quoteIndex = localQuotes.findIndex(q => q.id === quoteId);

        if (quoteIndex !== -1) {
            const quote = localQuotes[quoteIndex];
            if (!quote.responses) quote.responses = [];

            const existingIndex = quote.responses.findIndex(r => r.vendorId === vendorId);

            if (existingIndex !== -1) {
                // Update Local
                quote.responses[existingIndex] = {
                    ...quote.responses[existingIndex],
                    price: Number(price),
                    message: message,
                    status: 'responded',
                    updatedAt: new Date()
                };
            } else {
                // Insert Local
                quote.responses.push(response);
            }

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

// Update response status (Buyer only) - Accept/Negotiate/Reject
exports.updateResponseStatus = async (req, res) => {
    try {
        const { quoteId, vendorId } = req.params;
        const { status, message } = req.body; // status: 'accepted', 'negotiating', 'rejected'
        const buyerId = req.user.uid;

        if (!['accepted', 'negotiating', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // 1. Try Firestore
        try {
            if (admin.apps.length) {
                const db = admin.firestore();
                const quoteRef = db.collection('quotes').doc(quoteId);

                await db.runTransaction(async (t) => {
                    const doc = await t.get(quoteRef);
                    if (!doc.exists) throw new Error('Quote not found');

                    const data = doc.data();

                    // Verify buyer ownership
                    if (data.buyerId !== buyerId) throw new Error('Unauthorized');

                    const responses = data.responses || [];
                    const responseIndex = responses.findIndex(r => r.vendorId === vendorId);

                    if (responseIndex === -1) throw new Error('Response not found');

                    const oldResponse = responses[responseIndex];

                    // Update response status
                    const updatedResponse = {
                        ...oldResponse,
                        status: status,
                        buyerMessage: message || '',
                        statusUpdatedAt: new Date()
                    };

                    responses[responseIndex] = updatedResponse;

                    t.update(quoteRef, { responses });
                });

                console.log(`✅ Response ${status} in Firestore:`, quoteId);
                return res.status(200).json({ message: `Quote response ${status}` });
            }
        } catch (dbError) {
            console.warn('❌ Firestore update status failed:', dbError.message);
            if (dbError.message === 'Unauthorized') return res.status(403).json({ error: 'Unauthorized' });
        }

        // 2. Local Fallback
        const localQuotes = dbService.getQuotes();
        const quote = localQuotes.find(q => q.id === quoteId);

        if (quote) {
            if (quote.buyerId !== buyerId && !quote.buyerId.startsWith('mock-')) {
                return res.status(403).json({ error: 'Unauthorized' });
            }

            const response = quote.responses?.find(r => r.vendorId === vendorId);
            if (response) {
                response.status = status;
                response.buyerMessage = message || '';
                response.statusUpdatedAt = new Date();

                dbService.updateQuote(quote);
                res.status(200).json({ message: `Quote response ${status} (Local)` });
            } else {
                res.status(404).json({ error: 'Response not found' });
            }
        } else {
            res.status(404).json({ error: 'Quote not found' });
        }

    } catch (error) {
        console.error('Error updating response status:', error);
        res.status(500).json({ error: 'Failed to update response status' });
    }
};

// Complete Job (Vendor only) - Upload Invoice URL
exports.completeJob = async (req, res) => {
    try {
        const { quoteId } = req.params;
        const { invoiceUrl } = req.body;
        const vendorId = req.user.uid;

        if (!invoiceUrl) {
            return res.status(400).json({ error: 'Invoice URL is required' });
        }

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

                    if (oldResponse.status !== 'accepted') {
                        throw new Error('Quote must be accepted before completing');
                    }

                    // Update response
                    const updatedResponse = {
                        ...oldResponse,
                        status: 'completed',
                        invoiceUrl: invoiceUrl,
                        completedAt: new Date()
                    };

                    responses[responseIndex] = updatedResponse;

                    t.update(quoteRef, { responses });
                });

                console.log(`✅ Job completed in Firestore:`, quoteId);
                return res.status(200).json({ message: 'Job completed and invoice saved' });
            }
        } catch (dbError) {
            console.warn('❌ Firestore complete job failed:', dbError.message);
            if (dbError.message.includes('Quote must be accepted')) return res.status(400).json({ error: dbError.message });
        }

        // 2. Local Fallback
        const localQuotes = dbService.getQuotes();
        const quote = localQuotes.find(q => q.id === quoteId);

        if (quote) {
            const response = quote.responses?.find(r => r.vendorId === vendorId);
            if (response) {
                if (response.status !== 'accepted') {
                    return res.status(400).json({ error: 'Quote must be accepted before completing' });
                }

                response.status = 'completed';
                response.invoiceUrl = invoiceUrl;
                response.completedAt = new Date();

                dbService.updateQuote(quote);
                res.status(200).json({ message: 'Job completed (Local)' });
            } else {
                res.status(404).json({ error: 'Response not found' });
            }
        } else {
            res.status(404).json({ error: 'Quote not found' });
        }

    } catch (error) {
        console.error('Error completing job:', error);
        res.status(500).json({ error: 'Failed to complete job' });
    }
};

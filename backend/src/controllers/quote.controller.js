const supabase = require('../config/supabase');
const emailService = require('../services/email.service');
const crypto = require('crypto');

// ... mockQuotes removed ...

// Create a new quote request
exports.createQuote = async (req, res) => {
    const { serviceType, postalCode, suburb, details, email } = req.body;

    // Determine user or guest
    let buyerId = null; // null for guest in SQL if nullable, or strictly enforce auth? schema says buyer_id references profiles.
    // Schema: buyer_id uuid references public.profiles(id).
    // If guest, we might need a "guest" profile or allow null?
    // Let's assume for now we Require Auth for V1 migration or handle guest later.
    // If req.user exists, use it.

    let contactEmail = email;

    if (req.user) {
        buyerId = req.user.uid;
        contactEmail = req.user.email || email;
    } else {
        // Guest mode not easily supported with strict FK to profiles(id) unless we have a guest profile.
        // For migration simplicity, let's treat guests as NULL buyer_id if schema allows, or just error if schema enforces NOT NULL.
        // My schema: buyer_id ... (implied nullable).
    }

    // Correction: In Supabase/Postgres, referencing a UUID must exist.
    // If buyerId is null, that's fine if column is nullable.

    // Generate a short alphanumeric ID for easier tracking
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = crypto.randomBytes(4);
    let shortId = '';
    for (let i = 0; i < 8; i++) {
        shortId += chars[bytes[i % bytes.length] % chars.length];
    }

    const newQuote = {
        buyer_id: buyerId,
        service_type: serviceType,
        postal_code: postalCode,
        suburb: suburb || '',
        details,
        email: contactEmail,
        status: 'open',
        short_id: shortId,
        attachments: req.body.attachments || []
    };

    try {
        const { data, error } = await supabase
            .from('quotes')
            .insert([newQuote])
            .select()
            .single();

        if (error) throw error;

        console.log(`Quote saved to Supabase (Short ID: ${shortId}, UUID: ${data.id})`);

        if (contactEmail) {
            // Get origin from request header, fallback to environment var, or localhost
            const requestOrigin = req.headers.origin || req.protocol + '://' + req.get('host');
            emailService.sendQuoteReceivedEmail(contactEmail, shortId, newQuote, requestOrigin)
                .catch(err => console.error('Failed to send email:', err));
        }

        res.status(201).json({ ...data, id: shortId }); // Return shortId as 'id' to frontend for backward compatibility

    } catch (error) {
        console.error('Supabase Create Error:', error);
        res.status(500).json({ error: 'Failed to create quote' });
    }
};

// Get quotes (filters based on user role)
exports.getQuotes = async (req, res) => {
    try {
        let query = supabase
            .from('quotes')
            .select('*, quote_responses(*)'); // Join responses

        // Role-based filtering
        if (req.user && req.user.role === 'buyer') {
            query = query.eq('buyer_id', req.user.uid);
        } else {
            // Vendor or Admin
            // Vendors can theoretically see all open quotes (or filtered by service area)
            // We fetch all here and filter in memory for complex logic, OR use RPC for advanced filtering.
            // Given the "State/Exclude" logic, fetching all (or limiting by status) and filtering in JS is safer for migration speed.
        }

        // Output order
        query = query.order('created_at', { ascending: false });

        const { data: quotes, error } = await query;

        if (error) throw error;

        // Transform for frontend stats (if needed)
        // Frontend expects "responses" array. Supabase returns "quote_responses".
        // Map it back to "responses" property.
        const mappedQuotes = quotes.map(q => ({
            ...q,
            responses: q.quote_responses || []
        }));

        // Fetch Vendor Profile for filtering (Service Areas)
        let filterUser = req.user;
        if (req.user.role === 'vendor') {
            // Retrieve profile from 'profiles' table
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', req.user.uid).single();
            if (profile) {
                filterUser = { ...req.user, ...profile };
                // Map snake_case DB fields to camelCase if controller logic depends on camelCase
                // My filterQuotesByPlan uses camelCase (serviceStates, etc.)
                // I should map them:
                filterUser.serviceStates = profile.service_states;
                filterUser.servicePostcodes = profile.service_postcodes;
                filterUser.serviceSuburbs = profile.service_suburbs;
                filterUser.excludedPostcodes = profile.excluded_postcodes;
                filterUser.excludedSuburbs = profile.excluded_suburbs;
                filterUser.servicesOffered = profile.services_offered;
            }
        }

        const filteredQuotes = filterQuotesByPlan(mappedQuotes, filterUser);

        return res.status(200).json(filteredQuotes);

    } catch (error) {
        console.error('Supabase Get Error:', error);
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
        (user.serviceSuburbs && user.serviceSuburbs.length > 0) ||
        (user.serviceStates && user.serviceStates.length > 0);
    const hasServiceFilter = (user.servicesOffered && user.servicesOffered.length > 0);

    if (!hasLocationFilter && !hasServiceFilter) {
        return quotes; // No filters set, return plan-filtered quotes
    }

    return quotes.filter(q => {
        return locationMatch && serviceMatch;
    });
};

// Helper: Get State from Postcode (AU Simple)
const getStateFromPostcode = (postcode) => {
    const pc = parseInt(postcode, 10);
    if (!pc) return 'UNKNOWN';

    if ((pc >= 1000 && pc <= 2599) || (pc >= 2619 && pc <= 2899) || (pc >= 2921 && pc <= 2999)) return 'NSW';
    if ((pc >= 200 && pc <= 299) || (pc >= 2600 && pc <= 2618) || (pc >= 2900 && pc <= 2920)) return 'ACT';
    if ((pc >= 3000 && pc <= 3999) || (pc >= 8000 && pc <= 8999)) return 'VIC';
    if ((pc >= 4000 && pc <= 4999) || (pc >= 9000 && pc <= 9999)) return 'QLD';
    if ((pc >= 5000 && pc <= 5799) || (pc >= 5800 && pc <= 5999)) return 'SA';
    if ((pc >= 6000 && pc <= 6797) || (pc >= 6800 && pc <= 6999)) return 'WA';
    if ((pc >= 7000 && pc <= 7799) || (pc >= 7800 && pc <= 7999)) return 'TAS';
    if ((pc >= 800 && pc <= 899) || (pc >= 900 && pc <= 999)) return 'NT';

    return 'UNKNOWN';
};

// Get single quote by ID (Public/Protected mixed)
exports.getQuoteById = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if ID is UUID (36 chars) or short_id (8 chars)
        const isUuid = id.length > 20;

        let query = supabase
            .from('quotes')
            .select(`
                *,
                quote_responses (
                    *,
                    profiles (
                        company_name,
                        contact_name,
                        email
                    )
                )
            `);

        if (isUuid) {
            query = query.eq('id', id);
        } else {
            query = query.eq('short_id', id);
        }

        const { data: quote, error } = await query.single();

        if (error || !quote) {
            return res.status(404).json({ error: 'Quote not found' });
        }

        // Auto-claim orphaned quotes if a registered Buyer views them via their private tracking link
        if (!quote.buyer_id && req.user && req.user.role === 'buyer') {
            const { error: claimError } = await supabase
                .from('quotes')
                .update({ buyer_id: req.user.uid })
                .eq('id', quote.id);

            if (!claimError) {
                quote.buyer_id = req.user.uid;
                console.log(`Quote ${quote.short_id} automatically claimed by newly registered Buyer: ${req.user.uid}`);
            }
        }

        // Map quote_responses to responses and flatten vendor info
        const isOwner = req.user && quote.buyer_id === req.user.uid;
        const isAdmin = req.user && req.user.role === 'admin';

        const responseData = {
            ...quote,
            responses: (quote.quote_responses || []).map(r => ({
                ...r,
                vendor_name: r.profiles?.company_name || r.profiles?.contact_name || 'Unknown Vendor',
                // Only expose vendor email to the quote owner (buyer) or admin
                vendor_email: (isOwner || isAdmin) ? r.profiles?.email : undefined
            }))
        };

        // Remove raw profiles join data from response
        responseData.responses.forEach(r => delete r.profiles);

        res.status(200).json(responseData);

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

        // Validate price
        const parsedPrice = Number(price);
        if (isNaN(parsedPrice) || parsedPrice < 0 || parsedPrice > 10_000_000) {
            return res.status(400).json({ error: 'Invalid price value. Must be a positive number under 10,000,000.' });
        }

        // Ensure vendor profile exists or name is set (not critical for logic but nice)

        const newResponse = {
            quote_id: quoteId,
            vendor_id: vendorId,
            price: Number(price),
            message,
            status: 'responded',
            history: [] // Start empty
        };

        // Insert into quote_responses
        // Supabase/Postgres doesn't automatically nest inside Quote. It's a separate table.
        // We also need to check "Trial Limits" if we want to keep that logic.
        // For now, let's just do the insertion.

        const { data, error } = await supabase
            .from('quote_responses')
            .insert([newResponse])
            .select()
            .single();

        if (error) throw error;

        return res.status(200).json({ message: 'Quote response submitted', response: data });

    } catch (error) {
        console.error('Error submitting response:', error);
        res.status(500).json({ error: 'Failed to submit response: ' + error.message });
    }
};
// Update a response (Vendor only)
exports.updateResponse = async (req, res) => {
    try {
        const { quoteId } = req.params;
        const { price, message } = req.body;
        const vendorId = req.user.uid;

        // Fetch existing response to verify ownership and handle history
        const { data: existingResponse, error: fetchError } = await supabase
            .from('quote_responses')
            .select('*')
            .eq('quote_id', quoteId)
            .eq('vendor_id', vendorId)
            .single();

        if (fetchError || !existingResponse) {
            return res.status(404).json({ error: 'Response not found' });
        }

        // Archive history
        const historyEntry = {
            price: existingResponse.price,
            message: existingResponse.message,
            status: existingResponse.status,
            archivedAt: new Date()
        };

        const currentHistory = existingResponse.history ? existingResponse.history : [];
        const newHistory = [...currentHistory, historyEntry];

        // Update
        const { error: updateError } = await supabase
            .from('quote_responses')
            .update({
                price: Number(price),
                message: message,
                history: newHistory,
                status: 'responded' // Reset status to responded so it moves to "Awaiting Response"
            })
            .eq('id', existingResponse.id);

        if (updateError) throw updateError;

        return res.status(200).json({ message: 'Quote response updated' });

    } catch (error) {
        console.error('Error updating response:', error);
        res.status(500).json({ error: 'Failed to update response' });
    }
};

// Update response status (Buyer only)
exports.updateResponseStatus = async (req, res) => {
    try {
        const { quoteId, vendorId } = req.params;
        const { status, message } = req.body;
        const buyerId = req.user.uid;

        // Whitelist allowed status values
        const ALLOWED_STATUSES = ['accepted', 'negotiating', 'rejected'];
        if (!status || !ALLOWED_STATUSES.includes(status)) {
            return res.status(400).json({ error: `Invalid status. Must be one of: ${ALLOWED_STATUSES.join(', ')}` });
        }

        const isUuid = quoteId.length > 20;

        // Verify Buyer owns the Quote first and get the real UUID if short_id was provided
        let query = supabase.from('quotes').select('id, buyer_id');
        if (isUuid) {
            query = query.eq('id', quoteId);
        } else {
            query = query.eq('short_id', quoteId);
        }

        const { data: quote, error: quoteError } = await query.single();

        // Auto-claim the quote if it has no buyer_id (e.g. from Guest creation)
        if (!quoteError && quote && !quote.buyer_id) {
            const { error: claimError } = await supabase
                .from('quotes')
                .update({ buyer_id: buyerId })
                .eq('id', quote.id);
            if (!claimError) {
                quote.buyer_id = buyerId;
                console.log(`Quote ${quote.short_id || quote.id} automatically claimed during status update by newly registered Buyer: ${buyerId}`);
            }
        }

        if (quoteError || !quote || quote.buyer_id !== buyerId) {
            return res.status(403).json({ error: 'Unauthorized or Quote not found' });
        }

        // Update the response from specific vendor using the actual quote UUID
        const { error: updateError } = await supabase
            .from('quote_responses')
            .update({
                status: status,
                buyer_message: message || ''
            })
            .eq('quote_id', quote.id)
            .eq('vendor_id', vendorId);

        if (updateError) throw updateError;

        res.status(200).json({ message: `Quote response ${status}` });

    } catch (error) {
        console.error('Error updating response status:', error);
        res.status(500).json({ error: 'Failed to update response status' });
    }
};

// Complete Job (Vendor only)
exports.completeJob = async (req, res) => {
    try {
        const { quoteId } = req.params;
        const { invoiceUrl } = req.body;
        const vendorId = req.user.uid;

        if (!invoiceUrl) {
            return res.status(400).json({ error: 'Invoice URL is required' });
        }

        const { error } = await supabase
            .from('quote_responses')
            .update({
                status: 'completed',
                // invoiceUrl: invoiceUrl // Add invoice_url to schema if needed
            })
            .eq('quote_id', quoteId)
            .eq('vendor_id', vendorId)
            .eq('status', 'accepted'); // Must be accepted first

        if (error) throw error;

        res.status(200).json({ message: 'Job completed' });

    } catch (error) {
        console.error('Error completing job:', error);
        res.status(500).json({ error: 'Failed to complete job' });
    }
};

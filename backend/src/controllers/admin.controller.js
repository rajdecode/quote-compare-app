const supabase = require('../config/supabase');

// Get all users (Buyers & Vendors)
exports.getUsers = async (req, res) => {
    try {
        const { data: users, error } = await supabase
            .from('profiles')
            .select('*');

        if (error) throw error;

        const mappedUsers = users.map(user => ({
            uid: user.id, // Map id to uid for frontend compatibility
            email: user.email,
            displayName: user.contact_name || user.company_name || user.email,
            role: user.role,
            plan: 'free', // detailed plan info not in profiles yet
            status: user.status || 'active',
            createdAt: user.created_at,
            quotesResponded: 0 // Calculation requires complex join/query, skipping for performance
        }));

        res.status(200).json(mappedUsers);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

// Toggle User Status (Block/Unblock)
exports.updateUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'active' or 'blocked'

        // Update profile status
        const { error: profileError } = await supabase
            .from('profiles')
            .update({ status })
            .eq('id', id);

        if (profileError) throw profileError;

        // Optionally ban in Auth (if supported by your plan/logic)
        // For now, we rely on the profile status which should be checked in middleware
        if (status === 'blocked') {
            await supabase.auth.admin.updateUserById(id, { ban_duration: '876000h' }); // Block for ~100 years
        } else {
            await supabase.auth.admin.updateUserById(id, { ban_duration: 'none' }); // Unban
        }

        res.status(200).json({ message: `User ${status} successfully.` });
    } catch (error) {
        console.error('Error updating user status:', error);
        res.status(500).json({ error: 'Failed to update user status' });
    }
};

// Get Analytics Stats
exports.getStats = async (req, res) => {
    try {
        // Parallel fetch counts
        const { count: totalUsers, error: usersError } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });

        const { count: totalQuotes, error: quotesError } = await supabase
            .from('quotes')
            .select('*', { count: 'exact', head: true });

        // Vendor/Buyer counts
        const { count: vendors } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'vendor');

        const { count: buyers } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'buyer');

        // Completed quotes (status = responded or accepted or completed)
        const { count: completedQuotes } = await supabase
            .from('quotes')
            .select('*', { count: 'exact', head: true })
            .in('status', ['responded', 'accepted', 'completed']);

        // Revenue Mock
        // In a real app, query payments or sum subscription costs based on 'vendors' count
        const revenue = vendors ? vendors * 99 : 0;

        if (usersError || quotesError) throw usersError || quotesError;

        res.status(200).json({
            totalUsers: totalUsers || 0,
            vendors: vendors || 0,
            buyers: buyers || 0,
            totalQuotes: totalQuotes || 0,
            completedQuotes: completedQuotes || 0,
            revenue
        });

    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
};

// Get Specific User Stats (for Modal)
exports.getUserStats = async (req, res) => {
    try {
        const { id } = req.params;
        const { start, end } = req.query;

        // Fetch User Profile
        const { data: user, error: userError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single();

        if (userError || !user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Date Filtering setup
        const startDate = start ? new Date(start).toISOString() : new Date(0).toISOString();
        const endDate = end ? new Date(end).toISOString() : new Date().toISOString();

        // Metrics & Details container
        let metrics = {
            requestsSent: 0,
            quotesReceived: 0,
            quotesResponded: 0,
            leadsAvailableInPeriod: 0
        };

        let details = {
            requestsSent: [],
            quotesReceived: [],
            quotesResponded: [],
            leadsAvailableInPeriod: []
        };

        if (user.role === 'buyer') {
            // Count quotes created by this buyer
            const { data: quotes, error: quotesError } = await supabase
                .from('quotes')
                .select('*')
                .eq('buyerId', id)
                .gte('created_at', startDate)
                .lte('created_at', endDate);

            if (quotesError) throw quotesError;

            metrics.requestsSent = quotes.length;

            quotes.forEach(quote => {
                const quoteSummary = {
                    id: quote.id,
                    productId: quote.productId || quote.product_id, // handle case variations
                    createdAt: quote.created_at,
                    status: quote.status
                };

                details.requestsSent.push(quoteSummary);

                if (quote.responses && Array.isArray(quote.responses)) {
                    metrics.quotesReceived += quote.responses.length;
                    quote.responses.forEach(res => {
                        details.quotesReceived.push({
                            quoteId: quote.id,
                            vendorId: res.vendorId,
                            price: res.price,
                            createdAt: res.date || new Date().toISOString()
                        });
                    });
                }
            });

        } else if (user.role === 'vendor') {
            // Fetch ALL quotes in range to scan for this vendor's interactions
            // Note: This is inefficient for large datasets. 
            // Better approach: 'quote_responses' table or JSONB containment query
            const { data: allQuotes, error: allQuotesError } = await supabase
                .from('quotes')
                .select('*')
                .gte('created_at', startDate)
                .lte('created_at', endDate);

            if (allQuotesError) throw allQuotesError;

            allQuotes.forEach(quote => {
                // Check if vendor responded
                const response = quote.responses && Array.isArray(quote.responses)
                    ? quote.responses.find(r => r.vendorId === id)
                    : null;

                if (response) {
                    metrics.quotesResponded++;
                    details.quotesResponded.push({
                        id: quote.id,
                        productId: quote.productId || quote.product_id,
                        price: response.price,
                        createdAt: response.date || new Date().toISOString()
                    });
                }

                // Check leads available (Status 'open')
                if (quote.status === 'open') {
                    metrics.leadsAvailableInPeriod++;
                    if (!response) {
                        details.leadsAvailableInPeriod.push({
                            id: quote.id,
                            productId: quote.productId || quote.product_id,
                            createdAt: quote.created_at,
                            status: quote.status
                        });
                    }
                }
            });
        }

        res.status(200).json({
            uid: id,
            role: user.role,
            metrics,
            details
        });

    } catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({ error: 'Failed to fetch user stats' });
    }
};

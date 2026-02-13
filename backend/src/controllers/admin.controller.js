const admin = require('firebase-admin');

// Helper to safely get DB
const getDb = () => {
    if (!admin.apps.length) throw new Error('Firebase Admin not initialized');
    return admin.firestore();
};

// Get all users (Buyers & Vendors)
exports.getUsers = async (req, res) => {
    try {
        const db = getDb();
        const snapshot = await db.collection('users').get();
        const users = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            // Exclude sensitive info if necessary, but admins usually see email/name
            users.push({
                uid: doc.id,
                email: data.email,
                displayName: data.displayName,
                role: data.role,
                plan: data.plan || 'free',
                status: data.disabled ? 'blocked' : 'active',
                createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt) : null,
                quotesResponded: data.quotesResponded || 0
            });
        });

        res.status(200).json(users);
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

        const disabled = status === 'blocked';

        // Update in Authentication (to prevent login)
        await admin.auth().updateUser(id, {
            disabled: disabled
        });

        // Update in Firestore (for display)
        const db = getDb();
        await db.collection('users').doc(id).set({
            disabled: disabled
        }, { merge: true });

        res.status(200).json({ message: `User ${status} successfully.` });
    } catch (error) {
        console.error('Error updating user status:', error);
        res.status(500).json({ error: 'Failed to update user status' });
    }
};

// Get Analytics Stats
exports.getStats = async (req, res) => {
    try {
        const db = getDb();

        // Parallel fetch for speed
        const [usersSnap, quotesSnap] = await Promise.all([
            db.collection('users').get(),
            db.collection('quotes').get()
        ]);

        let totalUsers = 0;
        let vendors = 0;
        let buyers = 0;

        usersSnap.forEach(doc => {
            totalUsers++;
            if (doc.data().role === 'vendor') vendors++;
            else buyers++;
        });

        let totalQuotes = 0;
        let completedQuotes = 0;
        let revenue = 0; // Mock revenue calculation

        quotesSnap.forEach(doc => {
            totalQuotes++;
            const data = doc.data();
            if (data.status === 'responded') completedQuotes++;
        });

        // Mock revenue: Assume $99 for basic, $199 for pro. 
        // In real app, we'd query payments collection.
        // For now, let's just calc based on active vendor plans.
        usersSnap.forEach(doc => {
            const plan = doc.data().plan;
            if (plan === 'basic') revenue += 99;
            if (plan === 'pro') revenue += 199;
        });

        res.status(200).json({
            totalUsers,
            vendors,
            buyers,
            totalQuotes,
            completedQuotes,
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
        const db = getDb();

        const userDoc = await db.collection('users').doc(id).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = userDoc.data();

        // Date Filtering
        const startDate = start ? new Date(start) : new Date(0); // Default to epoch
        const endDate = end ? new Date(end) : new Date(); // Default to now
        // End date should include the whole day
        endDate.setHours(23, 59, 59, 999);

        // Metrics container
        let metrics = {
            requestsSent: 0,
            quotesReceived: 0,
            quotesResponded: 0,
            leadsAvailableInPeriod: 0
        };

        if (user.role === 'buyer') {
            // Count quotes created by this buyer
            const quotesSnap = await db.collection('quotes')
                .where('buyerId', '==', id)
                .where('createdAt', '>=', startDate)
                .where('createdAt', '<=', endDate)
                .get();

            metrics.requestsSent = quotesSnap.size;

            quotesSnap.forEach(doc => {
                const data = doc.data();
                if (data.responses && data.responses.length > 0) {
                    metrics.quotesReceived += data.responses.length;
                }
            });

        } else if (user.role === 'vendor') {
            // For vendors, we have to scan quotes to see their responses
            // Firestore doesn't support array-contains-any with object fields easily for complex queries
            // So we fetch relevant quotes and filter in memory, or fetch all quotes in date range (if optimized)

            // 1. Quotes Responded: Quotes where responses array contains object with vendorId == id
            // Optimization: Filter by date first
            const allQuotesSnap = await db.collection('quotes')
                .where('createdAt', '>=', startDate)
                .where('createdAt', '<=', endDate)
                .get();

            allQuotesSnap.forEach(doc => {
                const data = doc.data();

                // Check if vendor responded
                const hasResponded = data.responses && data.responses.some(r => r.vendorId === id);
                if (hasResponded) {
                    metrics.quotesResponded++;
                }

                // Check leads available (Status 'open' and typically matching category, but here just open)
                if (data.status === 'open') {
                    metrics.leadsAvailableInPeriod++;
                }
            });
        }

        res.status(200).json({
            uid: id,
            role: user.role,
            metrics
        });

    } catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({ error: 'Failed to fetch user stats' });
    }
};

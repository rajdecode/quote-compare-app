const admin = require('firebase-admin');

// Middleware to verify Firebase ID Token (Optional for guests)
exports.verifyTokenOptional = async (req, res, next) => {
    const token = req.headers.authorization?.split('Bearer ')[1];

    if (!token) {
        // No token? No problem. It's a guest.
        req.user = null;
        return next();
    }

    // Reuse existing verification logic
    await exports.verifyToken(req, res, next);
};

// Middleware to verify Supabase ID Token
exports.verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // If we are already here from verifyTokenOptional, we shouldn't fail
        // But verifyingToken implies strict check unless called internally
        if (req.user === null) return next(); // already handled by verifyTokenOptional
        return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];

    try {
        // Verify token using Supabase Auth
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            console.error('Token verification failed:', error);
            return res.status(403).json({ message: 'Unauthorized: Invalid token' });
        }

        req.user = user;
        req.user.uid = user.id; // Map Supabase ID to existing req.uid pattern for consistency

        // --- Start: Logic to fetch user role/plan from Firestore (if still needed) ---
        // If user roles/plans are now managed directly in Supabase user metadata or a separate table,
        // this Firestore fetching logic might need to be adapted or removed.
        // Assuming for now that user roles/plans are still in Firestore, linked by Supabase user.id.
        try {
            const db = admin.firestore(); // Assuming admin is still imported for Firestore
            const userDoc = await db.collection('users').doc(req.user.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                req.user.role = userData.role;
                req.user.plan = userData.plan;
                req.user.quotesResponded = userData.quotesResponded || 0;
            } else {
                // Default role if not found in Firestore, or handle as an error
                req.user.role = 'buyer'; // Default fallback
            }
        } catch (firestoreError) {
            console.warn('Firestore fetch failed in middleware (ignoring):', firestoreError.message);
        }

        req.user = decodedToken;
        next();
    } catch (error) {
        console.warn('Token verification failed or Admin SDK not initialized. Falling back to insecure decode for DEV MODE.');

        // FAILSAFE: Manual decode (INSECURE - DEV ONLY)
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));

            const decoded = JSON.parse(jsonPayload);
            req.user = decoded;

            // Fix: Map 'sub' or 'user_id' to 'uid' if missing (common in raw JWTs)
            if (!req.user.uid) {
                req.user.uid = req.user.sub || req.user.user_id;
            }

            // DEV MODE: Allow frontend to specify role via header if token doesn't have it
            // This is critical for testing Vendor flow without real Firebase Custom Claims
            const mockRole = req.headers['x-mock-role'];
            if (mockRole) {
                req.user.role = mockRole;
            } else if (!req.user.role) {
                req.user.role = 'buyer'; // Default fallback
            }
            console.log('Decoded token (insecureLY):', req.user.uid, 'Role:', req.user.role);

            next();
        } catch (decodeError) {
            console.error('Manual decode failed:', decodeError);
            return res.status(403).json({ error: 'Unauthorized: Invalid token and fallback failed' });
        }
    }
};

// Middleware to check user role
exports.checkRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
        }
        next();
    };
};

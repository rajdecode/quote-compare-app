const supabase = require('../config/supabase');

// Middleware to verify Supabase ID Token (Optional for guests)
exports.verifyTokenOptional = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        req.user = null;
        return next();
    }

    const token = authHeader.split('Bearer ')[1];

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            req.user = null; // Treat invalid token as guest
            return next();
        }

        req.user = user;
        req.user.uid = user.id; // Map Supabase ID

        // Fetch user role from profiles
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile) {
            req.user.role = profile.role;
        } else {
            // Fallback or guest logic
            req.user.role = 'guest'; // or 'buyer' default?
        }

        // Mock Role for Dev/Testing if passed in header (Optional)
        if (req.headers['x-mock-role']) {
            req.user.role = req.headers['x-mock-role'];
        }

        next();
    } catch (err) {
        req.user = null;
        next();
    }
};

// Middleware to verify Supabase ID Token (Strict)
exports.verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            console.error('Token verification failed:', error);
            if (token) console.error('Token length:', token.length);
            return res.status(403).json({ message: 'Unauthorized: Invalid token' });
        }

        req.user = user;
        req.user.uid = user.id;

        // Fetch user role from profiles
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile) {
            req.user.role = profile.role;
        } else {
            console.warn('User has no profile/role, defaulting to buyer');
            req.user.role = 'buyer';
        }

        // Mock Role (Dev Only - remove in strict prod if needed, but useful for now)
        if (req.headers['x-mock-role']) {
            req.user.role = req.headers['x-mock-role'];
        }

        next();
    } catch (error) {
        console.error('Auth Middleware Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
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

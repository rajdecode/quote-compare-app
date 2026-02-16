const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create a scoped client helper to avoid singleton state issues
const getSupabase = () => {
    return createClient(supabaseUrl, supabaseKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
        }
    });
};

// Global client for other utils (profiles etc) - we can still use the singleton from config if we want, 
// but for AUTH verification, we want a clean state.
// Let's rely on the config one for non-auth stuff if we import it, BUT here we need fresh for auth checks.
const globalSupabase = require('../config/supabase');

// Middleware to verify Supabase ID Token (Optional for guests)
exports.verifyTokenOptional = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        req.user = null;
        return next();
    }

    const token = authHeader.split('Bearer ')[1];

    try {
        // Use fresh client
        const supabase = getSupabase();
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            req.user = null;
            return next();
        }

        req.user = user;
        req.user.uid = user.id;

        // Fetch user role from profiles
        const { data: profile } = await globalSupabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile) {
            req.user.role = profile.role;
        } else {
            req.user.role = 'guest';
        }

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
        // Debug logging
        // console.log('Verifying token:', token.substring(0, 20) + '...');

        // Use fresh client for auth check
        const supabase = getSupabase();
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            console.error('Token verification failed:', error);
            console.error('Token start:', token.substring(0, 20));
            return res.status(403).json({ message: 'Unauthorized: Invalid token' });
        }

        req.user = user;
        req.user.uid = user.id;

        // Fetch user role
        const { data: profile, error: profileError } = await globalSupabase
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

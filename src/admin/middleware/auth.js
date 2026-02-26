import bcrypt from 'bcrypt';
import { CONFIG } from '../../config/constants.js';

export function requireAuth(req, res, next) {
    if (req.session && req.session.isAuthenticated) {
        return next();
    }

    // API requests return 401, page requests redirect to login
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    return res.redirect('/admin/login');
}

export function redirectIfAuthenticated(req, res, next) {
    if (req.session && req.session.isAuthenticated) {
        return res.redirect('/admin');
    }
    next();
}

export async function validateCredentials(username, password) {
    if (!CONFIG.ADMIN.PASSWORD_HASH) {
        throw new Error('ADMIN_PASSWORD_HASH not configured');
    }

    try {
        // Use dummy hash for invalid usernames to prevent timing attacks
        const hashToCompare = username === CONFIG.ADMIN.USERNAME
            ? CONFIG.ADMIN.PASSWORD_HASH
            : '$2b$10$dummy.hash.for.timing.attack.prevention.XXXXXXXXXXXXXXXXXXXXX';
        return await bcrypt.compare(password, hashToCompare);
    } catch (error) {
        throw new Error('Authentication validation failed');
    }
}

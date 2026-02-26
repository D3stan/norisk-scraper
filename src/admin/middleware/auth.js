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

    if (username !== CONFIG.ADMIN.USERNAME) {
        return false;
    }

    return await bcrypt.compare(password, CONFIG.ADMIN.PASSWORD_HASH);
}

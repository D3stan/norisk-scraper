import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validateCredentials, redirectIfAuthenticated } from '../middleware/auth.js';
import { CONFIG } from '../../config/constants.js';

const router = Router();

// Rate limiter for login attempts
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: { error: 'Too many login attempts. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

// Serve login page
router.get('/login', redirectIfAuthenticated, (req, res) => {
    res.sendFile('login.html', { root: './src/admin/public' });
});

// Handle login
router.post('/api/login', loginLimiter, async (req, res) => {
    const { username, password, rememberMe } = req.body;

    try {
        const isValid = await validateCredentials(username, password);

        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Set session
        req.session.isAuthenticated = true;
        req.session.username = username;

        // Set cookie expiry
        if (rememberMe) {
            req.session.cookie.maxAge = CONFIG.ADMIN.COOKIE_MAX_AGE_REMEMBER;
        } else {
            req.session.cookie.maxAge = CONFIG.ADMIN.COOKIE_MAX_AGE;
        }

        res.json({ success: true });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

// Handle logout
router.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.json({ success: true });
    });
});

export default router;

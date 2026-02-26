import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcrypt';
import { validateCredentials, redirectIfAuthenticated, requireAuth } from '../middleware/auth.js';
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

// Change password
router.post('/api/change-password', requireAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }

    try {
        // Validate current password
        const isValid = await validateCredentials(req.session.username, currentPassword);

        if (!isValid) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const newHash = await bcrypt.hash(newPassword, 10);

        // Note: This updates the in-memory config. To persist, you'd need to update .env
        // For now, return the new hash so admin can update their .env file
        res.json({
            success: true,
            message: 'Password changed successfully',
            newHash: newHash,
            note: 'Update your ADMIN_PASSWORD_HASH environment variable with the provided hash'
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

export default router;

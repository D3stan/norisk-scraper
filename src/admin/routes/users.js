import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/auth.js';
import {
    getUsers,
    countUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    setUserAdminStatus
} from '../../utils/db.js';

const router = Router();

// Rate limiter for user management
const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60,
    message: { error: 'Too many requests. Please try again later.' }
});

// Get all users (paginated)
router.get('/api/users', requireAuth, apiLimiter, (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const isAdmin = req.query.isAdmin !== undefined
            ? req.query.isAdmin === 'true'
            : undefined;

        const filters = {
            limit,
            offset,
            search: search.length > 100 ? search.substring(0, 100) : search
        };

        if (isAdmin !== undefined) {
            filters.isAdmin = isAdmin;
        }

        const users = getUsers(filters);
        const total = countUsers(filters);

        res.json({
            success: true,
            users: users.map(u => ({
                ...u,
                isAdmin: !!u.is_admin
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasMore: offset + users.length < total
            }
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Get single user
router.get('/api/users/:id', requireAuth, apiLimiter, (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        const user = getUserById(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            user: {
                ...user,
                isAdmin: !!user.is_admin
            }
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// Create new user
router.post('/api/users', requireAuth, apiLimiter, (req, res) => {
    try {
        const { email, nomeCognome, isAdmin } = req.body;

        if (!email || !email.includes('@')) {
            return res.status(400).json({ error: 'Valid email is required' });
        }

        const id = createUser({
            email: email.toLowerCase().trim(),
            nomeCognome: nomeCognome?.trim(),
            isAdmin: !!isAdmin
        });

        const user = getUserById(id);

        res.json({
            success: true,
            user: {
                ...user,
                isAdmin: !!user.is_admin
            },
            message: 'User created successfully'
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// Update user
router.put('/api/users/:id', requireAuth, apiLimiter, (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        const { nomeCognome, isAdmin } = req.body;
        const updates = {};

        if (nomeCognome !== undefined) updates.nomeCognome = nomeCognome?.trim();
        if (isAdmin !== undefined) updates.isAdmin = !!isAdmin;

        const success = updateUser(id, updates);

        if (!success) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = getUserById(id);

        res.json({
            success: true,
            user: {
                ...user,
                isAdmin: !!user.is_admin
            },
            message: 'User updated successfully'
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// Toggle admin status
router.post('/api/users/:id/toggle-admin', requireAuth, apiLimiter, (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        const user = getUserById(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const newStatus = !user.is_admin;
        const success = setUserAdminStatus(id, newStatus);

        if (!success) {
            return res.status(500).json({ error: 'Failed to update admin status' });
        }

        const updatedUser = getUserById(id);

        res.json({
            success: true,
            user: {
                ...updatedUser,
                isAdmin: !!updatedUser.is_admin
            },
            message: newStatus ? 'User promoted to admin' : 'User removed from admins'
        });
    } catch (error) {
        console.error('Error toggling admin status:', error);
        res.status(500).json({ error: 'Failed to toggle admin status' });
    }
});

// Delete user
router.delete('/api/users/:id', requireAuth, apiLimiter, (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        const success = deleteUser(id);

        if (!success) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

export default router;

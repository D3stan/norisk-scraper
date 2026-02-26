import { Router } from 'express';
import { getSubmissions, countSubmissions } from '../../utils/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Get submissions with pagination and filters
router.get('/api/submissions', requireAuth, (req, res) => {
    try {
        const {
            search = '',
            dateFrom = '',
            dateTo = '',
            page = 1,
            limit = 20
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const filters = {
            search: search || undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
            limit: parseInt(limit),
            offset
        };

        const submissions = getSubmissions(filters);
        const total = countSubmissions({
            search: search || undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined
        });

        res.json({
            success: true,
            data: submissions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Error fetching submissions:', error);
        res.status(500).json({ error: 'Failed to fetch submissions' });
    }
});

export default router;

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { getSubmissions, countSubmissions } from '../../utils/db.js';
import { requireAuth } from '../middleware/auth.js';
import { Parser } from 'json2csv';

const router = Router();

// Rate limiter for API requests
const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60,
    message: { error: 'Too many requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

// Validate and sanitize query parameters
function validateQueryParams(req, res, next) {
    let { page = '1', limit = '20', search = '', dateFrom = '', dateTo = '' } = req.query;

    // Parse and validate page
    page = parseInt(page, 10);
    if (isNaN(page) || page < 1) {
        page = 1;
    }

    // Parse and validate limit
    limit = parseInt(limit, 10);
    if (isNaN(limit) || limit < 1) {
        limit = 20;
    } else if (limit > 100) {
        limit = 100; // Cap at 100 to prevent abuse
    }

    // Sanitize search (remove any potential SQL injection patterns)
    if (search) {
        search = search.toString().trim().substring(0, 100); // Limit length
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (dateFrom && !dateRegex.test(dateFrom)) {
        dateFrom = '';
    }
    if (dateTo && !dateRegex.test(dateTo)) {
        dateTo = '';
    }

    // Attach validated params to request
    req.validatedQuery = { page, limit, search, dateFrom, dateTo };
    next();
}

// Get submissions with pagination and filters
router.get('/api/submissions', apiLimiter, requireAuth, validateQueryParams, (req, res) => {
    try {
        const { page, limit, search, dateFrom, dateTo } = req.validatedQuery;
        const offset = (page - 1) * limit;

        const filters = {
            search: search || undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
            limit,
            offset
        };

        const submissions = getSubmissions(filters);
        const total = countSubmissions({
            search: search || undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined
        });

        // Map database columns (snake_case) to frontend expected names (camelCase)
        const mappedSubmissions = submissions.map(row => ({
            id: row.id,
            name: row.nome_cognome,
            companyName: row.ragione_sociale,
            vatNumber: row.partita_iva,
            email: row.email,
            phone: row.telefono,
            quoteCode: row.codice_preventivo,
            eventType: row.event_type,
            eventDate: row.event_date,
            premiumAmount: row.premium_amount,
            currency: row.currency,
            createdAt: row.created_at
        }));

        res.json({
            success: true,
            submissions: mappedSubmissions,
            total,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching submissions:', error);
        res.status(500).json({ error: 'Failed to fetch submissions' });
    }
});

export default router;

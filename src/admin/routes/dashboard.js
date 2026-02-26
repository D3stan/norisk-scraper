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

// Export submissions as CSV
router.get('/api/submissions/export', apiLimiter, requireAuth, (req, res) => {
    try {
        const { search = '', dateFrom = '', dateTo = '' } = req.query;

        // Get all submissions (no pagination for export)
        const filters = {
            search: search || undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
            limit: 10000, // Reasonable max
            offset: 0
        };

        const submissions = getSubmissions(filters);

        // Map to CSV-friendly format
        const mappedSubmissions = submissions.map(row => ({
            'ID': row.id,
            'Data Richiesta': new Date(row.created_at).toLocaleDateString('it-IT'),
            'Nome Cognome': row.nome_cognome || '',
            'Ragione Sociale': row.ragione_sociale || '',
            'Partita IVA': row.partita_iva || '',
            'Email': row.email || '',
            'Telefono': row.telefono || '',
            'Codice Preventivo': row.codice_preventivo || '',
            'Tipo Evento': row.event_type || '',
            'Data Evento': row.event_date || '',
            'Premio': row.premium_amount || '',
            'Valuta': row.currency || 'EUR'
        }));

        // Generate CSV
        const fields = [
            'ID', 'Data Richiesta', 'Nome Cognome', 'Ragione Sociale',
            'Partita IVA', 'Email', 'Telefono', 'Codice Preventivo',
            'Tipo Evento', 'Data Evento', 'Premio', 'Valuta'
        ];

        const parser = new Parser({ fields, delimiter: ';' });
        const csv = parser.parse(mappedSubmissions);

        // Set headers for download
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="submissions_${new Date().toISOString().split('T')[0]}.csv"`);

        res.send(csv);

    } catch (error) {
        console.error('Error exporting submissions:', error);
        res.status(500).json({ error: 'Failed to export submissions' });
    }
});

export default router;

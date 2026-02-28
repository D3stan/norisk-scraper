import express from 'express';
import dotenv from 'dotenv';
import logger from './utils/logger.js';
import { mapFormData, validateFormData } from './utils/dataMapper.js';
import { automateFormSubmission } from './automation/scraper.js';
import { sendQuoteToUser } from './utils/emailSender.js';
import { getQuoteRecord } from './utils/storage.js';
import { CONFIG } from './config/constants.js';
import { startEmailPolling } from './utils/emailReceiver.js';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import SQLiteStoreFactory from 'better-sqlite3-session-store';
import { initDatabase, getDatabase } from './utils/db.js';
import loginRoutes from './admin/routes/login.js';
import dashboardRoutes from './admin/routes/dashboard.js';
import usersRoutes from './admin/routes/users.js';
import { requireAuth } from './admin/middleware/auth.js';
import Database from 'better-sqlite3';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SQLiteStore = SQLiteStoreFactory(session);

// Load environment variables
dotenv.config();

// Initialize SQLite database
try {
    initDatabase();
    console.log('✅ Database initialized');
} catch (error) {
    logger.error('Failed to initialize database', { error: error.message });
    console.error('❌ Database initialization failed:', error.message);
    process.exit(1);
}

// Ensure database directory exists for sessions
const dbDir = path.join(__dirname, '../database');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Create session database connection
const sessionDb = new Database(path.join(dbDir, 'sessions.db'));

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy when behind reverse proxy (Cloudflare, Dokploy, etc.)
// This is required for secure cookies to work behind a proxy.
// Use explicit hop count (not boolean true) to avoid permissive trust-proxy behavior.
const trustProxyHops = Number.parseInt(process.env.TRUST_PROXY_HOPS || '1', 10);
app.set('trust proxy', Number.isNaN(trustProxyHops) ? 1 : trustProxyHops);

// Health check endpoint for debugging
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        env: process.env.NODE_ENV,
        secure: req.secure,
        protocol: req.protocol,
        'x-forwarded-proto': req.headers['x-forwarded-proto'],
        'x-forwarded-for': req.headers['x-forwarded-for'],
        ip: req.ip
    });
});

// Middleware
app.use(express.json());

app.use(cors({
    origin: [process.env.DOMAIN, process.env.DOMAIN.replace('://', '://api.')]
}));

if (process.env.NODE_ENV === 'development') {
    app.use('/debug/screenshots', express.static(path.join(__dirname, '../screenshots')));
}

// Request logging middleware
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent')
    });
    next();
});

// Session middleware for admin
const isProduction = process.env.NODE_ENV === 'production';
app.use(session({
    store: new SQLiteStore({
        client: sessionDb,
        expired: {
            clear: true,
            intervalMs: 900000 // 15 minutes
        }
    }),
    secret: CONFIG.ADMIN.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    name: 'norisk.admin.session',
    proxy: true,
    cookie: {
        secure: isProduction,
        httpOnly: true,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: CONFIG.ADMIN.COOKIE_MAX_AGE
    }
}));

/**
 * Main automation endpoint
 * Accepts Italian form data and returns proposal HTML
 */
app.post('/api/quote', async (req, res) => {
    const startTime = Date.now();
    logger.info('Received quote request', { 
        body: { 
            eventType: req.body.eventType,
            country: req.body.country,
            email: req.body.email 
        }
    });
    
    try {
        // Validate input
        const validation = validateFormData(req.body);
        if (!validation.valid) {
            logger.warn('Validation failed', { errors: validation.errors });
            return res.status(400).json({
                success: false,
                errors: validation.errors
            });
        }
        
        // Map Italian data to Dutch backend format
        const mappedData = mapFormData(req.body);
        
        // Execute automation
        logger.info('Starting automation process');
        const result = await automateFormSubmission(mappedData);
        
        const duration = Date.now() - startTime;
        
        if (result.success) {
            logger.info('Quote request completed successfully', {
                duration: `${duration}ms`,
                quoteKey: result.quoteKey,
                status: result.status
            });

            return res.json({
                success: true,
                quoteKey: result.quoteKey,
                proposalUrl: result.proposalUrl,
                pricing: result.pricing,
                status: result.status,
                htmlContent: result.htmlContent,
                pdfPath: result.pdfPath,
                message: result.message,
                duration: `${duration}ms`
            });
        } else {
            logger.error('Quote request failed', { 
                duration: `${duration}ms`,
                error: result.error 
            });
            
            return res.status(500).json({
                success: false,
                error: result.error,
                message: 'Automation process failed. Check logs for details.'
            });
        }
        
    } catch (error) {
        const duration = Date.now() - startTime;
        logger.error('Unexpected error in quote endpoint', { 
            error: error.message,
            stack: error.stack,
            duration: `${duration}ms`
        });
        
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

/**
 * Send quote PDF to user endpoint
 * Retrieves stored PDF and emails it to the user
 */
app.post('/api/quote/send', async (req, res) => {
    const startTime = Date.now();
    const { quoteKey } = req.body;

    logger.info('Received send quote to user request', { quoteKey });

    if (!quoteKey) {
        logger.warn('Send quote request missing quoteKey');
        return res.status(400).json({
            success: false,
            error: 'quoteKey is required'
        });
    }

    try {
        // Check if quote exists and has PDF
        const record = getQuoteRecord(quoteKey);
        if (!record) {
            return res.status(404).json({
                success: false,
                error: 'Quote not found'
            });
        }

        // Send PDF to user
        logger.info('Sending PDF to user', { quoteKey, userEmail: record.userEmail });
        const result = await sendQuoteToUser(quoteKey);

        const duration = Date.now() - startTime;

        if (result.success) {
            logger.info('Quote PDF sent to user successfully', {
                duration: `${duration}ms`,
                quoteKey,
                sentTo: result.sentTo
            });

            return res.json({
                success: true,
                message: 'Preventivo inviato con successo via email',
                sentTo: result.sentTo,
                duration: `${duration}ms`
            });
        } else {
            throw new Error('Failed to send email');
        }

    } catch (error) {
        const duration = Date.now() - startTime;
        logger.error('Error sending quote to user', {
            error: error.message,
            stack: error.stack,
            duration: `${duration}ms`
        });

        return res.status(500).json({
            success: false,
            error: error.message,
            message: 'Errore durante l\'invio del preventivo. Riprova più tardi.'
        });
    }
});

/**
 * Get quote status endpoint
 */
app.get('/api/quote/:quoteKey/status', (req, res) => {
    const { quoteKey } = req.params;
    logger.info('Checking quote status', { quoteKey });

    const record = getQuoteRecord(quoteKey);
    if (!record) {
        return res.status(404).json({
            success: false,
            error: 'Quote not found'
        });
    }

    return res.json({
        success: true,
        quoteKey,
        status: record.status,
        hasPdf: !!record.pdfPath,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt
    });
});

// Admin routes (only if admin is enabled)
if (CONFIG.ADMIN.ENABLED) {
    app.use('/admin', loginRoutes);
    app.use('/admin', dashboardRoutes);
    app.use('/admin', usersRoutes);

    // Serve admin static files
    app.use('/admin/static', express.static(path.join(__dirname, 'admin/public')));

    // Admin dashboard page (protected)
    app.get('/admin', requireAuth, (req, res) => {
        res.sendFile('index.html', { root: './src/admin/public' });
    });
}

/**
 * Error handling middleware
 */
app.use((err, req, res, next) => {
    logger.error('Unhandled error', { 
        error: err.message,
        stack: err.stack,
        path: req.path 
    });
    
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

/**
 * Start server
 */
app.listen(PORT, () => {
    logger.info(`NoRisk Proxy Server started`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        headless: process.env.HEADLESS || 'false',
        completed: CONFIG.COMPLETED,
        imapConfigured: !!CONFIG.IMAP.HOST,
        smtpConfigured: !!CONFIG.SMTP.HOST
    });

    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`🔐 Admin dashboard: http://localhost:${PORT}/admin`);
    console.log(`🎯 Quote endpoint: POST http://localhost:${PORT}/api/quote`);
    console.log(`📧 Send quote: POST http://localhost:${PORT}/api/quote/send`);
    console.log(`📊 Quote status: GET http://localhost:${PORT}/api/quote/:quoteKey/status`);

    if (CONFIG.COMPLETED) {
        console.log(`\n✅ COMPLETED mode: Auto-submit enabled`);
    } else {
        console.log(`\n⏸️  DRAFT mode: Manual confirmation required`);
    }

    if (CONFIG.IMAP.HOST) {
        console.log(`📥 Email reception: Enabled (${CONFIG.IMAP.HOST})`);
        // Start background email polling
        startEmailPolling();
    } else {
        console.log(`📥 Email reception: Disabled (IMAP not configured)`);
    }

    if (CONFIG.SMTP.HOST) {
        console.log(`📤 Email sending: Enabled (${CONFIG.SMTP.HOST})`);
    } else {
        console.log(`📤 Email sending: Disabled (SMTP not configured)`);
    }
    console.log('');
});

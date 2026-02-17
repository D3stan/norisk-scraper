import express from 'express';
import dotenv from 'dotenv';
import logger from './utils/logger.js';
import { mapFormData, validateFormData } from './utils/dataMapper.js';
import { automateFormSubmission } from './automation/scraper.js';
import cors from 'cors';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

app.use(cors({
    origin: [process.env.DOMAIN, process.env.DOMAIN.replace('://', '://api.')]
}));

// Request logging middleware
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, { 
        ip: req.ip,
        userAgent: req.get('user-agent') 
    });
    next();
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

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
                quoteKey: result.quoteKey 
            });
            
            return res.json({
                success: true,
                quoteKey: result.quoteKey,
                proposalUrl: result.proposalUrl,
                htmlContent: result.htmlContent,
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
        headless: process.env.HEADLESS || 'false'
    });
    
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📝 Health check: http://localhost:${PORT}/health`);
    console.log(`🎯 Quote endpoint: POST http://localhost:${PORT}/api/quote\n`);
});

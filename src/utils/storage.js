import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { CONFIG } from '../config/constants.js';
import logger from './logger.js';

const STORAGE_FILE = join(CONFIG.STORAGE_DIR, 'quotes.json');

// Ensure storage directories exist
function ensureDirectories() {
    if (!existsSync(CONFIG.STORAGE_DIR)) {
        mkdirSync(CONFIG.STORAGE_DIR, { recursive: true });
        logger.debug('Created storage directory', { path: CONFIG.STORAGE_DIR });
    }
    if (!existsSync(CONFIG.PDF_STORAGE_DIR)) {
        mkdirSync(CONFIG.PDF_STORAGE_DIR, { recursive: true });
        logger.debug('Created PDF storage directory', { path: CONFIG.PDF_STORAGE_DIR });
    }
}

// Initialize storage file if it doesn't exist
function initStorage() {
    ensureDirectories();
    if (!existsSync(STORAGE_FILE)) {
        writeFileSync(STORAGE_FILE, JSON.stringify({}, null, 2));
        logger.debug('Created storage file', { path: STORAGE_FILE });
    }
}

/**
 * Reads the entire storage
 */
function readStorage() {
    initStorage();
    try {
        const data = readFileSync(STORAGE_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        logger.error('Failed to read storage', { error: error.message });
        return {};
    }
}

/**
 * Writes data to storage
 */
function writeStorage(data) {
    ensureDirectories();
    try {
        writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        logger.error('Failed to write storage', { error: error.message });
        throw error;
    }
}

/**
 * Creates a new quote record
 * @param {string} quoteKey  - NR code (e.g. NR000053118) used as the primary storage key
 * @param {string} userEmail
 * @param {Object} formData
 * @param {string} [urlKey]  - Internal UUID used by NoRisk for page navigation
 */
export function createQuoteRecord(quoteKey, userEmail, formData, urlKey) {
    const storage = readStorage();

    storage[quoteKey] = {
        quoteKey,
        urlKey: urlKey || quoteKey, // UUID for NoRisk navigation (may equal quoteKey if NR code unavailable)
        userEmail,
        formData: {
            initials: formData.initials,
            lastName: formData.last_name,
            eventName: formData.title,
            eventType: formData.type,
        },
        status: 'pending', // pending, submitted, email_received, sent, error
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pdfPath: null,
        emailReceivedAt: null,
        sentAt: null,
        error: null,
    };

    writeStorage(storage);
    logger.info('Created quote record', { quoteKey, userEmail });
    return storage[quoteKey];
}

/**
 * Gets a quote record by key
 */
export function getQuoteRecord(quoteKey) {
    const storage = readStorage();
    return storage[quoteKey] || null;
}

/**
 * Updates a quote record
 */
export function updateQuoteRecord(quoteKey, updates) {
    const storage = readStorage();

    if (!storage[quoteKey]) {
        logger.warn('Quote record not found for update', { quoteKey });
        return null;
    }

    storage[quoteKey] = {
        ...storage[quoteKey],
        ...updates,
        updatedAt: new Date().toISOString(),
    };

    writeStorage(storage);
    logger.debug('Updated quote record', { quoteKey, updates: Object.keys(updates) });
    return storage[quoteKey];
}

/**
 * Updates status of a quote
 */
export function updateQuoteStatus(quoteKey, status, error = null) {
    const updates = { status };
    if (error) updates.error = error;
    return updateQuoteRecord(quoteKey, updates);
}

/**
 * Stores PDF path for a quote
 */
export function storePdfPath(quoteKey, pdfPath) {
    return updateQuoteRecord(quoteKey, {
        pdfPath,
        status: 'email_received',
        emailReceivedAt: new Date().toISOString(),
    });
}

/**
 * Marks quote as sent to user
 */
export function markQuoteSent(quoteKey) {
    return updateQuoteRecord(quoteKey, {
        status: 'sent',
        sentAt: new Date().toISOString(),
    });
}

/**
 * Gets all pending quotes (for cleanup)
 */
export function getPendingQuotes() {
    const storage = readStorage();
    return Object.values(storage).filter(q => q.status === 'pending');
}

/**
 * Gets all quotes awaiting email reception
 */
export function getAwaitingEmailQuotes() {
    const storage = readStorage();
    return Object.values(storage).filter(q =>
        q.status === 'submitted' || q.status === 'pending'
    );
}

/**
 * Cleans up old quote records (older than 7 days)
 */
export function cleanupOldQuotes(maxAgeDays = 7) {
    const storage = readStorage();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - maxAgeDays);

    let cleaned = 0;
    for (const [key, record] of Object.entries(storage)) {
        if (new Date(record.createdAt) < cutoff) {
            // Delete associated PDF if exists
            if (record.pdfPath && existsSync(record.pdfPath)) {
                try {
                    unlinkSync(record.pdfPath);
                    logger.debug('Deleted old PDF', { path: record.pdfPath });
                } catch (error) {
                    logger.warn('Failed to delete old PDF', { error: error.message });
                }
            }
            delete storage[key];
            cleaned++;
        }
    }

    if (cleaned > 0) {
        writeStorage(storage);
        logger.info('Cleaned up old quote records', { count: cleaned });
    }

    return cleaned;
}

/**
 * Saves a PDF buffer to storage
 */
export function savePdf(quoteKey, pdfBuffer, filename) {
    ensureDirectories();

    const pdfPath = join(CONFIG.PDF_STORAGE_DIR, `${quoteKey}_${filename}`);

    try {
        writeFileSync(pdfPath, pdfBuffer);
        logger.info('Saved PDF to storage', { quoteKey, path: pdfPath });
        return pdfPath;
    } catch (error) {
        logger.error('Failed to save PDF', { quoteKey, error: error.message });
        throw error;
    }
}

/**
 * Gets PDF buffer from storage
 */
export function getPdf(quoteKey) {
    const record = getQuoteRecord(quoteKey);

    if (!record || !record.pdfPath) {
        logger.warn('PDF not found', { quoteKey });
        return null;
    }

    if (!existsSync(record.pdfPath)) {
        logger.error('PDF file missing from disk', { quoteKey, path: record.pdfPath });
        return null;
    }

    try {
        return readFileSync(record.pdfPath);
    } catch (error) {
        logger.error('Failed to read PDF', { quoteKey, error: error.message });
        return null;
    }
}

// Initialize on module load
initStorage();

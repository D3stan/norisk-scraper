import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { CONFIG } from '../config/constants.js';
import logger from './logger.js';
import { savePdf, updateQuoteStatus, getAwaitingEmailQuotes } from './storage.js';

/**
 * Creates IMAP connection
 */
function createImapConnection() {
    return new Imap({
        host: CONFIG.IMAP.HOST,
        port: CONFIG.IMAP.PORT,
        tls: CONFIG.IMAP.TLS,
        user: CONFIG.IMAP.USER,
        password: CONFIG.IMAP.PASS,
        connTimeout: 30000,
        authTimeout: 30000,
    });
}

/**
 * Opens inbox and searches for unread emails
 */
function searchEmails(imap, criteria) {
    return new Promise((resolve, reject) => {
        imap.openBox('INBOX', false, (err, box) => {
            if (err) return reject(err);

            imap.search(criteria, (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });
    });
}

/**
 * Fetches and parses a single email
 */
function fetchEmail(imap, uid) {
    return new Promise((resolve, reject) => {
        const fetch = imap.fetch(uid, { bodies: '' });
        let emailData = null;

        fetch.on('message', (msg) => {
            msg.on('body', (stream) => {
                simpleParser(stream, (err, parsed) => {
                    if (err) return reject(err);
                    emailData = parsed;
                });
            });
        });

        fetch.on('end', () => {
            resolve(emailData);
        });

        fetch.on('error', reject);
    });
}

/**
 * Marks email as seen
 */
function markAsSeen(imap, uid) {
    return new Promise((resolve, reject) => {
        imap.addFlags(uid, '\\Seen', (err) => {
            if (err) return reject(err);
            resolve();
        });
    });
}

/**
 * Extracts quote key from email subject or body
 * Looking for patterns like "Quote: ABC123" or "Reference: ABC123"
 */
function extractQuoteKey(email) {
    const subject = email.subject || '';
    const text = email.text || '';

    // Try to find quote key in subject
    // Patterns: "Quote: ABC123", "Reference: ABC123", "Key: ABC123"
    const subjectMatch = subject.match(/(?:Quote|Reference|Key|Nr)[\s#:]*([A-Z0-9-]{5,})/i);
    if (subjectMatch) {
        return subjectMatch[1];
    }

    // Try to find in body
    const bodyMatch = text.match(/(?:Quote|Reference|Key|Nr)[\s#:]*([A-Z0-9-]{5,})/i);
    if (bodyMatch) {
        return bodyMatch[1];
    }

    return null;
}

/**
 * Checks if email is from NoRisk
 */
function isNoRiskEmail(email) {
    const from = email.from?.text?.toLowerCase() || '';
    const subject = email.subject?.toLowerCase() || '';

    // Check sender domain
    const isFromNoRisk = from.includes('norisk') || from.includes('verzekeren.norisk');

    // Check subject keywords
    const hasQuoteKeywords = subject.includes('quote') ||
                            subject.includes('proposal') ||
                            subject.includes('insurance') ||
                            subject.includes('policy');

    return isFromNoRisk || hasQuoteKeywords;
}

/**
 * Checks for new emails and processes PDFs
 */
export async function checkForQuoteEmails() {
    // Skip if IMAP not configured
    if (!CONFIG.IMAP.HOST || !CONFIG.IMAP.USER) {
        logger.debug('IMAP not configured, skipping email check');
        return [];
    }

    const imap = createImapConnection();
    const processedPdfs = [];

    return new Promise((resolve, reject) => {
        imap.once('ready', async () => {
            try {
                logger.debug('Checking for quote emails');

                // Get list of awaiting quote keys
                const awaitingQuotes = getAwaitingEmailQuotes();
                if (awaitingQuotes.length === 0) {
                    logger.debug('No quotes awaiting email reception');
                    imap.end();
                    resolve([]);
                    return;
                }

                const quoteKeys = awaitingQuotes.map(q => q.quoteKey);
                logger.debug('Awaiting quotes', { quoteKeys });

                // Search for unread emails
                const results = await searchEmails(imap, ['UNSEEN']);

                if (results.length === 0) {
                    logger.debug('No new emails found');
                    imap.end();
                    resolve([]);
                    return;
                }

                logger.info(`Found ${results.length} unread emails`);

                // Process each email
                for (const uid of results) {
                    try {
                        const email = await fetchEmail(imap, uid);

                        if (!isNoRiskEmail(email)) {
                            logger.debug('Skipping non-NoRisk email', {
                                from: email.from?.text,
                                subject: email.subject
                            });
                            continue;
                        }

                        // Extract quote key
                        const quoteKey = extractQuoteKey(email);

                        if (!quoteKey || !quoteKeys.includes(quoteKey)) {
                            logger.debug('Quote key not found or not awaiting', {
                                extracted: quoteKey,
                                subject: email.subject
                            });
                            continue;
                        }

                        logger.info('Found email for quote', { quoteKey });

                        // Look for PDF attachments
                        if (email.attachments && email.attachments.length > 0) {
                            for (const attachment of email.attachments) {
                                if (attachment.contentType === 'application/pdf') {
                                    logger.info('Found PDF attachment', {
                                        quoteKey,
                                        filename: attachment.filename,
                                        size: attachment.size
                                    });

                                    // Save PDF
                                    const pdfPath = savePdf(
                                        quoteKey,
                                        attachment.content,
                                        attachment.filename || `${quoteKey}.pdf`
                                    );

                                    // Update record
                                    const { storePdfPath } = await import('./storage.js');
                                    storePdfPath(quoteKey, pdfPath);

                                    processedPdfs.push({
                                        quoteKey,
                                        pdfPath,
                                        filename: attachment.filename
                                    });
                                }
                            }
                        } else {
                            logger.warn('No PDF attachments found in email', { quoteKey });
                        }

                        // Mark as seen
                        await markAsSeen(imap, uid);

                    } catch (error) {
                        logger.error('Error processing email', { uid, error: error.message });
                    }
                }

                imap.end();
                resolve(processedPdfs);

            } catch (error) {
                logger.error('IMAP operation failed', { error: error.message });
                imap.end();
                reject(error);
            }
        });

        imap.once('error', (err) => {
            logger.error('IMAP connection error', { error: err.message });
            reject(err);
        });

        imap.connect();
    });
}

/**
 * Waits for an email with PDF for a specific quote key
 * Polls IMAP until email arrives or timeout
 */
export async function waitForQuoteEmail(quoteKey, maxWaitMs = CONFIG.IMAP.MAX_WAIT_TIME) {
    const startTime = Date.now();
    const checkInterval = CONFIG.IMAP.CHECK_INTERVAL;

    logger.info('Waiting for quote email', { quoteKey, maxWaitMs, checkInterval });

    while (Date.now() - startTime < maxWaitMs) {
        try {
            const results = await checkForQuoteEmails();

            // Check if our quote was processed
            const ourPdf = results.find(r => r.quoteKey === quoteKey);
            if (ourPdf) {
                logger.info('Quote email received', { quoteKey, pdfPath: ourPdf.pdfPath });
                return ourPdf;
            }

            // Wait before next check
            logger.debug('Quote email not yet received, waiting...', {
                quoteKey,
                elapsed: Date.now() - startTime
            });
            await new Promise(r => setTimeout(r, checkInterval));

        } catch (error) {
            logger.error('Error checking for email', { quoteKey, error: error.message });
            // Continue polling despite errors
            await new Promise(r => setTimeout(r, checkInterval));
        }
    }

    logger.warn('Timeout waiting for quote email', { quoteKey, elapsed: Date.now() - startTime });
    throw new Error(`Timeout waiting for email for quote ${quoteKey}`);
}

/**
 * Starts background polling for emails (optional)
 */
export function startEmailPolling(intervalMs = CONFIG.IMAP.CHECK_INTERVAL) {
    logger.info('Starting email polling', { intervalMs });

    const poll = async () => {
        try {
            await checkForQuoteEmails();
        } catch (error) {
            logger.error('Email polling error', { error: error.message });
        }
    };

    // Run immediately, then on interval
    poll();
    return setInterval(poll, intervalMs);
}

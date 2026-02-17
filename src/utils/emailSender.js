import nodemailer from 'nodemailer';
import { CONFIG } from '../config/constants.js';
import logger from './logger.js';
import { getPdf, getQuoteRecord, markQuoteSent } from './storage.js';

/**
 * Creates SMTP transporter
 */
function createTransporter() {
    if (!CONFIG.SMTP.HOST || !CONFIG.SMTP.USER) {
        logger.error('SMTP not configured');
        return null;
    }

    return nodemailer.createTransporter({
        host: CONFIG.SMTP.HOST,
        port: CONFIG.SMTP.PORT,
        secure: CONFIG.SMTP.SECURE,
        auth: {
            user: CONFIG.SMTP.USER,
            pass: CONFIG.SMTP.PASS,
        },
    });
}

/**
 * Sends quote PDF to user via email
 */
export async function sendQuoteToUser(quoteKey) {
    logger.info('Sending quote PDF to user', { quoteKey });

    // Get quote record
    const record = getQuoteRecord(quoteKey);
    if (!record) {
        throw new Error(`Quote record not found: ${quoteKey}`);
    }

    if (!record.userEmail) {
        throw new Error(`No user email for quote: ${quoteKey}`);
    }

    // Get PDF
    const pdfBuffer = getPdf(quoteKey);
    if (!pdfBuffer) {
        throw new Error(`PDF not found for quote: ${quoteKey}`);
    }

    const transporter = createTransporter();
    if (!transporter) {
        throw new Error('SMTP not configured');
    }

    // Build email
    const userName = `${record.formData.initials} ${record.formData.lastName}`.trim();
    const eventName = record.formData.eventName || 'Il tuo evento';

    const mailOptions = {
        from: `"NoRisk Assicurazioni" <${CONFIG.SMTP.FROM}>`,
        to: record.userEmail,
        subject: `Preventivo Assicurazione - ${eventName}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1a1a1a;">Gentile ${userName || 'Cliente'},</h2>

                <p>In allegato trova il preventivo completo per l'assicurazione del suo evento:</p>

                <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Evento:</strong> ${eventName}</p>
                    <p><strong>Riferimento:</strong> ${quoteKey}</p>
                </div>

                <p>Per qualsiasi domanda o per confermare il preventivo, non esiti a contattarci.</p>

                <p>Cordiali saluti,<br>
                <strong>Team NoRisk Assicurazioni</strong><br>
                Via Golinucci</p>

                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

                <p style="font-size: 12px; color: #666;">
                    Questa email è stata inviata automaticamente. Per assistenza, risponda a questa email o contatti il nostro ufficio.
                </p>
            </div>
        `,
        attachments: [
            {
                filename: `Preventivo_${quoteKey}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf',
            },
        ],
    };

    try {
        const result = await transporter.sendMail(mailOptions);
        logger.info('Quote PDF sent to user', {
            quoteKey,
            to: record.userEmail,
            messageId: result.messageId,
        });

        // Mark as sent
        markQuoteSent(quoteKey);

        return {
            success: true,
            messageId: result.messageId,
            sentTo: record.userEmail,
        };
    } catch (error) {
        logger.error('Failed to send quote PDF', { quoteKey, error: error.message });
        throw error;
    }
}

/**
 * Sends confirmation that quote request was received (optional)
 */
export async function sendQuoteReceivedConfirmation(userEmail, quoteKey, formData) {
    const transporter = createTransporter();
    if (!transporter) {
        logger.debug('SMTP not configured, skipping confirmation email');
        return null;
    }

    const eventName = formData.title || 'Il tuo evento';

    const mailOptions = {
        from: `"NoRisk Assicurazioni" <${CONFIG.SMTP.FROM}>`,
        to: userEmail,
        subject: `Richiesta Preventivo Ricevuta - ${eventName}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1a1a1a;">Gentile Cliente,</h2>

                <p>Abbiamo ricevuto la sua richiesta di preventivo per l'assicurazione del suo evento.</p>

                <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Evento:</strong> ${eventName}</p>
                    <p><strong>Riferimento:</strong> ${quoteKey}</p>
                </div>

                <p>Le invieremo il preventivo completo via email non appena sarà pronto.</p>

                <p>Cordiali saluti,<br>
                <strong>Team NoRisk Assicurazioni</strong></p>
            </div>
        `,
    };

    try {
        const result = await transporter.sendMail(mailOptions);
        logger.info('Confirmation email sent', { to: userEmail, quoteKey });
        return result;
    } catch (error) {
        logger.error('Failed to send confirmation', { error: error.message });
        return null;
    }
}

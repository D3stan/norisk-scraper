import { chromium } from 'playwright';
import logger from '../utils/logger.js';
import { CONFIG } from '../config/constants.js';
import { fillFormFields, selectCoverages, fillGuestInfoPage, fillProposalForm } from './formFiller.js';
import { createQuoteRecord, updateQuoteStatus, storePdfPath } from '../utils/storage.js';
import { saveSubmission } from '../utils/db.js';
import { waitForQuoteEmail } from '../utils/emailReceiver.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');
const screenshotsDir = join(projectRoot, 'screenshots');

// Ensure screenshots directory exists
if (!existsSync(screenshotsDir)) {
  mkdirSync(screenshotsDir, { recursive: true });
}

/**
 * Takes a screenshot for debugging purposes
 */
async function takeScreenshot(page, name) {
    try {
        const timestamp = Date.now();
        const filename = `${name}-${timestamp}.png`;
        const filepath = join(screenshotsDir, filename);
        await page.screenshot({ path: filepath, fullPage: true });
        logger.debug(`Screenshot saved: ${filename}`);
        return filepath;
    } catch (error) {
        logger.error('Failed to take screenshot', { error: error.message });
    }
}

/**
 * Performs login to NoRisk agent portal
 * @param {Page} page - The Playwright page
 * @returns {Promise<boolean>} True if login successful
 */
async function performLogin(page) {
    logger.info('Starting login process', { url: CONFIG.LOGIN_URL });
    
    try {
        // Navigate to login page
        await page.goto(CONFIG.LOGIN_URL, {
            waitUntil: 'load',
            timeout: CONFIG.NAVIGATION_TIMEOUT
        });
        
        logger.debug('Login page loaded');
        await takeScreenshot(page, 'login-page');
        
        // Wait for login form elements
        await page.waitForSelector(CONFIG.SELECTORS.LOGIN_EMAIL, { state: 'visible', timeout: 10000 });
        await page.waitForSelector(CONFIG.SELECTORS.LOGIN_PASSWORD, { state: 'visible', timeout: 10000 });
        
        // Check if credentials are configured
        if (!CONFIG.NORISK_EMAIL || !CONFIG.NORISK_PASSWORD) {
            throw new Error('NORISK_EMAIL and NORISK_PASSWORD must be set in environment variables');
        }
        
        // Fill login form
        logger.debug('Filling login credentials');
        await page.fill(CONFIG.SELECTORS.LOGIN_EMAIL, CONFIG.NORISK_EMAIL);
        await page.fill(CONFIG.SELECTORS.LOGIN_PASSWORD, CONFIG.NORISK_PASSWORD);
        
        await takeScreenshot(page, 'login-filled');
        
        // Submit login form
        logger.debug('Submitting login form');
        await Promise.all([
            page.waitForLoadState('load', { timeout: CONFIG.NAVIGATION_TIMEOUT }),
            page.click(CONFIG.SELECTORS.LOGIN_SUBMIT)
        ]);
        
        // Wait for page to stabilize
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1000);
        
        await takeScreenshot(page, 'after-login');
        
        // Verify login success by checking for _token hidden input
        logger.debug('Verifying login success');
        const tokenInput = await page.locator(CONFIG.SELECTORS.TOKEN).count();
        
        if (tokenInput > 0) {
            const currentUrl = page.url();
            logger.info('Login successful', { url: currentUrl });
            return true;
        } else {
            // Check if we're still on the login page (login failed)
            const emailInput = await page.locator(CONFIG.SELECTORS.LOGIN_EMAIL).count();
            if (emailInput > 0) {
                logger.error('Login failed - still on login page');
                
                // Try to extract error messages
                const errorMessages = await page.locator('.text-red-500, .text-red-600, .error, [class*="error"]').allTextContents();
                if (errorMessages.length > 0) {
                    logger.error('Login error messages', { errors: errorMessages });
                }
                
                throw new Error('Login failed - invalid credentials or login error');
            }
            
            logger.warn('Login verification inconclusive - no token found but not on login page');
            return true; // Assume success if we're not on login page
        }
    } catch (error) {
        logger.error('Login process failed', { error: error.message });
        throw error;
    }
}


/**
 * Extracts CSRF token from the page or frame
 * @param {Page|Frame|Locator} context - The page, frame, or locator context
 */
async function extractCsrfToken(context) {
    logger.debug('Extracting CSRF token');
    
    try {
        // Context is already scoped to main, just find the token
        const tokenInput = context.locator(CONFIG.SELECTORS.TOKEN).first();
        const token = await tokenInput.getAttribute('value');
        
        if (!token) {
          throw new Error('CSRF token not found or empty');
        }
        
        logger.debug('CSRF token extracted', { tokenPreview: token.substring(0, 10) + '...' });
        return token;
    } catch (error) {
        logger.error('Failed to extract CSRF token', { error: error.message });
        throw error;
    }
}

/**
 * Parses pricing information from "Your Proposal" page
 * @param {Page|Frame} context - The page or frame context
 * @returns {Object} Pricing data
 */
async function parsePricingData(context) {
    logger.info('Parsing pricing data from "Your Proposal" page');
    
    try {
        const pricing = {
            sumExcl: null,
            policyCosts: null,
            insuranceTax: null,
            toPay: null
        };
        
        // Helper function to extract price value from a dd element following a dt
        const extractPriceFromDD = async (labelText) => {
            try {
                // Find the dt element containing the label
                const dtElement = context.locator(`dt:has-text("${labelText}")`).first();
                
                if (await dtElement.count() === 0) {
                    logger.warn(`Could not find dt element with text: ${labelText}`);
                    return null;
                }
                
                // Get the next sibling dd element
                const ddElement = dtElement.locator('xpath=following-sibling::dd[1]');
                
                if (await ddElement.count() === 0) {
                    logger.warn(`Could not find dd element after: ${labelText}`);
                    return null;
                }
                
                // Get the text content from the dd
                const text = await ddElement.textContent();
                logger.debug(`Found ${labelText}`, { rawText: text });
                
                // Extract just the price part (remove €, spaces)
                const match = text.match(/€\s*([\d.,]+)/);
                return match ? match[1] : text.trim();
            } catch (error) {
                logger.warn(`Failed to extract ${labelText}`, { error: error.message });
                return null;
            }
        };
        
        // Extract each price field
        pricing.sumExcl = await extractPriceFromDD('Sum excl.');
        pricing.policyCosts = await extractPriceFromDD('Policy costs');
        pricing.insuranceTax = await extractPriceFromDD('Insurance tax');
        pricing.toPay = await extractPriceFromDD('To pay');
        
        logger.info('Pricing data parsed successfully', pricing);
        return pricing;
        
    } catch (error) {
        logger.warn('Failed to parse pricing data', { error: error.message });
        // Return empty pricing data if parsing fails
        return {
            sumExcl: null,
            policyCosts: null,
            insuranceTax: null,
            toPay: null
        };
    }
}

/**
 * Main automation function
 * Navigates through the form, fills data, and returns the proposal HTML
 */
export async function automateFormSubmission(mappedData) {
    logger.info('Starting NoRisk form automation');
    
    let browser;
    let context;
    let page;
    
    try {
        // Launch browser
        logger.debug('Launching browser', { 
            headless: CONFIG.HEADLESS,
            slowMo: CONFIG.SLOW_MO 
        });
        
        browser = await chromium.launch({
            headless: CONFIG.HEADLESS,
            slowMo: CONFIG.SLOW_MO,
            args: ['--disable-blink-features=AutomationControlled']
        });
        
        context = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            extraHTTPHeaders: {
              'Accept-Language': 'en-US,en;q=0.9'
            }
        });
        
        page = await context.newPage();
        
        // Set default timeout
        page.setDefaultTimeout(CONFIG.DEFAULT_TIMEOUT);
        
        // ========================================
        // STEP 1: Perform Login
        // ========================================
        await performLogin(page);
        
        // ========================================
        // STEP 2: Navigate to form with parameters
        // ========================================
        const formUrl = `${CONFIG.FORM_URL}?tp=${CONFIG.TP_PARAM}`;
        logger.info('Navigating to form page', { url: formUrl });
        await page.goto(formUrl, { 
            waitUntil: 'load',
            timeout: CONFIG.NAVIGATION_TIMEOUT 
        });
        
        // Wait for page to be fully loaded
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1000);
        
        // Try to handle cookie consent if it appears
        try {
            const cookieButton = page.locator('#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowallSelection');
            await cookieButton.click({ timeout: 3000 });
            logger.debug('Clicked cookie consent button');
        } catch (error) {
            logger.debug('No cookie consent banner detected or already accepted');
        }

        // Wait for main content area to be loaded
        await page.waitForSelector('main', { state: 'attached', timeout: 10000 });
        logger.debug('Main content area detected');
        
        // Create main context to scope all selectors (avoids header/footer elements)
        const mainContext = page.locator('main');
        
        // Wait for form to be loaded (token is hidden, so wait for 'attached' not 'visible')
        await mainContext.locator(CONFIG.SELECTORS.TOKEN).waitFor({ state: 'attached', timeout: 10000 });
        logger.debug('Form loaded and CSRF token field detected');
        
        await takeScreenshot(page, 'form-loaded');
        
        // Extract CSRF token
        const csrfToken = await extractCsrfToken(mainContext);
        logger.info('Session initialized with CSRF token');
        
        await takeScreenshot(page, 'initial-page');
        
        // ========================================
        // STEP 3: Fill form fields
        // ========================================
        // Note: On "About the Event" page, adviser data is pre-filled, so we skip it
        // We only fill event details and location
        await fillFormFields(mainContext, mappedData, { skipPersonalDetails: true });
        await takeScreenshot(page, 'form-filled');
        
        // ========================================
        // STEP 5: Submit form to proceed to coverages page
        // ========================================
        logger.info('Submitting form to proceed to coverage selection');
        
        // Click submit button and wait for navigation
        logger.debug('Clicking submit button');
        const submitButton = mainContext.locator(CONFIG.SELECTORS.SUBMIT_BUTTON);
        
        // Wait for page to navigate to coverages page
        await Promise.all([
            page.waitForURL('**/coverages**', { 
              timeout: CONFIG.NAVIGATION_TIMEOUT 
            }),
            submitButton.click()
        ]);
        
        logger.debug('Navigated to coverages page');
        
        // Give page time to fully load
        await page.waitForLoadState('load');
        await page.waitForTimeout(1000);
        
        logger.info('On coverage page');
        await takeScreenshot(page, 'coverages-page');
        
        // Re-establish main context after navigation
        const mainContextCoverage = page.locator('main');
        
        // ========================================
        // STEP 6: Select coverage options
        // ========================================
        await selectCoverages(mainContextCoverage, mappedData.coverages);
        await takeScreenshot(page, 'coverages-selected');
        
        // ========================================
        // STEP 7: Submit coverages and handle possible intermediate pages
        // ========================================
        logger.info('Submitting coverages');
        
        // Take screenshot before submit
        await takeScreenshot(page, 'before-coverage-submit');
        
        // Check for validation errors before submitting
        const validationErrors = await mainContextCoverage.locator('.text-red-500, .text-red-600, .error, [class*="error"]').count();
        if (validationErrors > 0) {
          const errorTexts = await mainContextCoverage.locator('.text-red-500, .text-red-600, .error, [class*="error"]').allTextContents();
          logger.warn('Validation errors detected before submit', { errors: errorTexts });
        }
        
        // Click next/submit button
        const coverageSubmitButton = mainContextCoverage.locator(CONFIG.SELECTORS.SUBMIT_BUTTON);
        await coverageSubmitButton.scrollIntoViewIfNeeded();
        
        logger.debug('Clicking coverage submit button');
        
        try {
            // Click and wait for navigation
            await coverageSubmitButton.click();
            logger.debug('Coverage submit button clicked, waiting for navigation...');
            
            // Wait for page to load completely
            await page.waitForLoadState('load', { timeout: CONFIG.NAVIGATION_TIMEOUT });
            await page.waitForLoadState('domcontentloaded', { timeout: CONFIG.NAVIGATION_TIMEOUT });
            await page.waitForLoadState('networkidle', { timeout: CONFIG.NAVIGATION_TIMEOUT }).catch(() => {
                logger.debug('Network idle timeout - continuing anyway');
            });
            
            logger.debug('Page load completed after coverage submit');
        } catch (error) {
            // Check if there are validation errors after click
            await takeScreenshot(page, 'coverage-submit-error');
            const postClickErrors = await mainContextCoverage.locator('.text-red-500, .text-red-600, .error, [class*="error"]').allTextContents();
            if (postClickErrors.length > 0) {
                logger.error('Form validation failed', { errors: postClickErrors });
                throw new Error(`Coverage form validation failed: ${postClickErrors.join(', ')}`);
            }
            // Re-throw original error if no validation errors found
            throw error;
        }
        
        const currentUrl = await page.evaluate(() => window.location.href);
        logger.debug('Current URL after coverage submit', { url: currentUrl });
        
        // ========================================
        // STEP 8: Handle Guest Info Page (if cancellation_non_appearance selected)
        // ========================================
        const hasNonAppearance = mappedData.coverages?.cancellation_non_appearance;
        const guests = mappedData.coverages?.non_appearance_guests;
        
        if (hasNonAppearance && guests && guests.length > 0) {
            logger.info('Detected cancellation_non_appearance with guests, checking for guest info page');
            
            // Re-establish main context after navigation
            const mainContextGuest = page.locator('main');
            
            // Check if we're on the guest info page by looking for guest name input
            const guestNameInput = mainContextGuest.locator(CONFIG.SELECTORS.GUEST_FIELDS.GUEST_NAME(0));
            const isGuestPage = await guestNameInput.count() > 0;
            
            if (isGuestPage) {
                logger.info('Guest info page detected, filling guest information');
                await takeScreenshot(page, 'guest-info-page');
                
                await fillGuestInfoPage(mainContextGuest, guests);
                await takeScreenshot(page, 'guest-info-filled');
                
                // Submit guest info form
                logger.debug('Submitting guest info form');
                const guestSubmitButton = mainContextGuest.locator(CONFIG.SELECTORS.SUBMIT_BUTTON).last();
                await guestSubmitButton.click();
                
                // Wait for navigation after guest submit
                await page.waitForLoadState('load', { timeout: CONFIG.NAVIGATION_TIMEOUT });
                await page.waitForLoadState('domcontentloaded', { timeout: CONFIG.NAVIGATION_TIMEOUT });
                await page.waitForLoadState('networkidle', { timeout: CONFIG.NAVIGATION_TIMEOUT }).catch(() => {
                    logger.debug('Network idle timeout after guest submit - continuing anyway');
                });
                
                logger.info('Guest info submitted successfully');
            } else {
                logger.warn('Expected guest info page but it was not found, continuing');
            }
        }
        
        // ========================================
        // STEP 9: Handle "Your Proposal" Price Quote Page (REQUIRED)
        // ========================================
        logger.info('Looking for "Your Proposal" price quote page');
        
        // Re-establish main context after navigation
        const mainContextProposal = page.locator('main');
        
        // Wait for either button to appear (give it time to load)
        try {
            logger.debug('Waiting for proposal page elements to appear...');
            
            // Wait for the pricing grid to be visible (this confirms we're on the right page)
            await mainContextProposal.locator('dl.grid.grid-cols-2 dt').filter({ hasText: 'To pay' }).waitFor({
                timeout: 20000,
                state: 'visible'
            });
            
            logger.debug('Proposal page pricing elements detected');
        } catch (error) {
            logger.error('Timeout waiting for proposal page pricing elements', { error: error.message });
            await takeScreenshot(page, 'proposal-page-timeout');
            
            // Log current URL
            const currentUrl = await page.evaluate(() => window.location.href);
            logger.debug('Current URL', { url: currentUrl });
            
            // Log what's actually on the page
            const pageText = await page.textContent('body');
            logger.debug('Page content preview', { preview: pageText.substring(0, 500) });
            
            throw new Error('Failed to reach "Your Proposal" price quote page - cannot extract pricing information');
        }
        
        await takeScreenshot(page, 'your-proposal-price-page');
        
        // Parse pricing data BEFORE clicking through
        const pricing = await parsePricingData(mainContextProposal);
        
        // Validate that we got pricing data
        if (!pricing.toPay) {
            logger.warn('Failed to parse "To pay" amount from proposal page');
        }
        
        // Now look for the "Quote via email" link (it's an <a> tag, not a button)
        logger.debug('Looking for "Quote via email" link');
        const quoteEmailLink = mainContextProposal.locator(CONFIG.SELECTORS.PROPOSAL_PRICE.QUOTE_EMAIL_LINK);
        
        const hasQuoteLink = await quoteEmailLink.count() > 0;
        
        if (!hasQuoteLink) {
            logger.error('"Quote via email" link not found');
            await takeScreenshot(page, 'quote-link-not-found');
            throw new Error('"Quote via email" link not found - cannot proceed to Your Details');
        }
        
        logger.info('"Quote via email" link found', { count: await quoteEmailLink.count() });
        
        // Click "Quote via email" link to proceed to "Your Details" page
        logger.debug('Clicking "Quote via email" to proceed to Your Details');
        
        await quoteEmailLink.click();
        logger.debug('Link clicked, waiting for navigation...');
        
        // Wait for navigation to Your Details
        await page.waitForLoadState('load', { timeout: CONFIG.NAVIGATION_TIMEOUT });
        await page.waitForLoadState('domcontentloaded', { timeout: CONFIG.NAVIGATION_TIMEOUT });
        await page.waitForLoadState('networkidle', { timeout: CONFIG.NAVIGATION_TIMEOUT }).catch(() => {
            logger.debug('Network idle timeout after quote email click - continuing anyway');
        });
        
        logger.debug('Your Details page loaded');
        
        const detailsUrl = await page.evaluate(() => window.location.href);
        logger.info('Navigated to "Your Details" page', { url: detailsUrl });
        
        // Extract internal UUID from URL (needed for NoRisk site navigation)
        const urlParams = new URL(detailsUrl).searchParams;
        const urlKey = urlParams.get('key');
        logger.info('URL key extracted', { urlKey });

        // Temporarily use urlKey as quote key until we get the actual NR code after submission
        let quoteKey = urlKey;
        logger.info('Initial quote key (will be updated after submission)', { quoteKey });

        // Re-establish main context after navigation
        const mainContextDetails = page.locator('main');

        // ========================================
        // STEP 10: Fill "Your Details" Form
        // ========================================
        logger.info('Filling "Your Details" form');
        await fillProposalForm(mainContextDetails, mappedData);
        await takeScreenshot(page, 'your-details-filled');

        // ========================================
        // STEP 11: Submit Proposal and Extract NR Quote Code
        // ========================================
        // Check GDPR checkbox
        logger.debug('Checking GDPR checkbox');
        const gdprCheckbox = mainContextDetails.locator('input[type="checkbox"][name="gdpr"]');
        if (await gdprCheckbox.count() > 0) {
            const isChecked = await gdprCheckbox.isChecked();
            if (!isChecked) {
                await gdprCheckbox.check();
                logger.debug('GDPR checkbox checked');
            }
        }

        // Click Mail proposal button
        logger.debug('Clicking Mail proposal button');
        const mailButton = mainContextDetails.locator('button[type="submit"]');
        await mailButton.click();

        logger.debug('Waiting for submission to process...');
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(2000);

        await takeScreenshot(page, 'proposal-submitted');

        // ========================================
        // STEP 12: Navigate to agents page to extract NR quote code
        // ========================================
        logger.info('Navigating to agents page to extract NR quote code');
        try {
            await page.goto('https://verzekeren.norisk.eu/agents', {
                waitUntil: 'load',
                timeout: CONFIG.NAVIGATION_TIMEOUT
            });
            await page.waitForLoadState('domcontentloaded');
            await page.waitForTimeout(2000);

            // Extract NR code robustly. Some proposal links now have label text like "Download PDF".
            // Accept only values that match NR code format, otherwise keep URL key fallback.
            const nrCodePattern = /^NR\d+$/i;
            const quoteLinks = page.locator('a[href*="/proposal/"]');
            const linkCount = await quoteLinks.count();

            let extractedNrCode = null;
            for (let i = 0; i < linkCount; i++) {
                const link = quoteLinks.nth(i);
                const linkText = ((await link.textContent()) || '').trim();
                const href = (await link.getAttribute('href')) || '';

                if (nrCodePattern.test(linkText)) {
                    extractedNrCode = linkText.toUpperCase();
                    break;
                }

                const hrefMatch = href.match(/(NR\d+)/i);
                if (hrefMatch?.[1]) {
                    extractedNrCode = hrefMatch[1].toUpperCase();
                    break;
                }
            }

            if (extractedNrCode) {
                logger.info('NR quote code extracted', { nrCode: extractedNrCode });
                quoteKey = extractedNrCode;
            } else {
                logger.warn('NR quote code not found on agents page, using URL key as fallback');
            }
        } catch (extractError) {
            logger.warn('Failed to extract NR quote code, using URL key as fallback', { error: extractError.message });
        }

        // Create quote record with the actual NR code (or fallback to URL key)
        createQuoteRecord(quoteKey, mappedData.email, mappedData);
        updateQuoteStatus(quoteKey, 'submitted');

        // Save to database
        try {
            saveSubmission({
                nomeCognome: `${mappedData.name || ''} ${mappedData.surname || ''}`.trim(),
                ragioneSociale: mappedData.companyName || null,
                partitaIva: mappedData.vatNumber || null,
                email: mappedData.email,
                telefono: mappedData.phone,
                codicePreventivo: quoteKey,
                eventType: mappedData.eventType,
                eventDate: mappedData.eventDate,
                premiumAmount: pricing?.toPay ? parseFloat(pricing.toPay.replace(/[,.]/g, '')) : null,
                currency: 'EUR'
            });
            logger.info('Submission saved to database', { quoteKey });
        } catch (dbError) {
            logger.error('Failed to save submission to database', { error: dbError.message, quoteKey });
        }

        // ========================================
        // STEP 13: Handle COMPLETED mode (wait for email or not)
        // ========================================
        if (CONFIG.COMPLETED && CONFIG.IMAP.HOST) {
            logger.info('COMPLETED mode enabled - waiting for quote email with PDF');
            try {
                const emailResult = await waitForQuoteEmail(quoteKey);
                logger.info('Quote email received', {
                    quoteKey,
                    pdfPath: emailResult.pdfPath
                });

                return {
                    success: true,
                    quoteKey,
                    proposalUrl: detailsUrl,
                    pricing,
                    status: 'email_received',
                    pdfPath: emailResult.pdfPath,
                    message: 'Quote submitted and PDF received via email'
                };
            } catch (error) {
                logger.error('Failed to receive quote email', { quoteKey, error: error.message });
                updateQuoteStatus(quoteKey, 'error', error.message);

                // Return success but with warning
                return {
                    success: true,
                    quoteKey,
                    proposalUrl: detailsUrl,
                    pricing,
                    status: 'submitted_waiting_email',
                    warning: 'Quote submitted but PDF not yet received via email'
                };
            }
        } else {
            // COMPLETED=false or IMAP not configured - just return after submission
            if (!CONFIG.COMPLETED) {
                logger.info('COMPLETED mode disabled - proposal submitted, not waiting for email');
            } else {
                logger.info('IMAP not configured, skipping email wait');
            }
            return {
                success: true,
                quoteKey,
                proposalUrl: detailsUrl,
                pricing,
                status: 'submitted',
                message: 'Quote submitted successfully'
            };
        }
        
    } catch (error) {
        logger.error('Automation failed', { 
            error: error.message,
            stack: error.stack 
        });
        
        // Take error screenshot if page exists
        if (page) {
            await takeScreenshot(page, 'error-state');
            
            // Log current URL for debugging
            try {
                const currentUrl = page.url();
                logger.error('Error occurred at URL', { url: currentUrl });
            } catch {}
        }
        
        return {
            success: false,
            error: error.message,
            stack: error.stack
        };

    } finally {
        // Cleanup
        if (browser) {
            logger.debug('Closing browser');
            await browser.close();
        }
    }
}

/**
 * Submits the email quote request by checking GDPR and clicking Mail proposal
 * @param {string} quoteKey - The quote key from the previous submission
 * @returns {Promise<Object>} Result of the email submission
 */
export async function submitEmailQuote(quoteKey) {
    logger.info('Starting email quote submission', { quoteKey });

    let browser;
    let context;
    let page;

    try {
        // Launch browser
        logger.debug('Launching browser for email submission', {
            headless: CONFIG.HEADLESS,
            slowMo: CONFIG.SLOW_MO
        });

        browser = await chromium.launch({
            headless: CONFIG.HEADLESS,
            slowMo: CONFIG.SLOW_MO,
            args: ['--disable-blink-features=AutomationControlled']
        });

        context = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            extraHTTPHeaders: {
                'Accept-Language': 'en-US,en;q=0.9'
            }
        });

        page = await context.newPage();
        page.setDefaultTimeout(CONFIG.DEFAULT_TIMEOUT);

        // ========================================
        // STEP 1: Perform Login
        // ========================================
        await performLogin(page);

        // ========================================
        // STEP 2: Navigate directly to Your Details page using quote key
        // ========================================
        // quoteKey is the UUID from the URL (e.g. a1b2c3d4-...)
        const detailsUrl = `${CONFIG.FORM_URL.replace(/\?.*$/, '').replace(/\/event$/, '')}/your-details?key=${quoteKey}`;
        logger.info('Navigating to Your Details page', { url: detailsUrl, quoteKey });

        await page.goto(detailsUrl, {
            waitUntil: 'load',
            timeout: CONFIG.NAVIGATION_TIMEOUT
        });

        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1000);

        await takeScreenshot(page, 'your-details-for-email');

        // Re-establish main context
        const mainContext = page.locator('main');

        // ========================================
        // STEP 3: Check if GDPR checkbox exists and check it
        // ========================================
        logger.debug('Looking for GDPR checkbox');

        const gdprCheckbox = mainContext.locator('input[type="checkbox"][name="gdpr"]');
        const gdprCount = await gdprCheckbox.count();

        if (gdprCount > 0) {
            logger.info('GDPR checkbox found, checking it');

            // Check if already checked
            const isChecked = await gdprCheckbox.isChecked();

            if (!isChecked) {
                await gdprCheckbox.check();
                logger.debug('GDPR checkbox checked');
            } else {
                logger.debug('GDPR checkbox already checked');
            }
        } else {
            logger.warn('GDPR checkbox not found');
        }

        await takeScreenshot(page, 'gdpr-checked');

        // ========================================
        // STEP 4: Click Mail proposal button
        // ========================================
        logger.debug('Looking for Mail proposal button');

        // Look for the submit button (type="submit")
        const mailButton = mainContext.locator('button[type="submit"]').filter({ hasText: /mail|proposal|send/i });
        const buttonCount = await mailButton.count();

        if (buttonCount === 0) {
            // Try alternative selectors
            const altButton = mainContext.locator('button:has-text("Mail"), button:has-text("Proposal"), button:has-text("Send"), input[type="submit"]');
            const altCount = await altButton.count();

            if (altCount === 0) {
                logger.error('Mail proposal button not found');
                throw new Error('Mail proposal button not found on Your Details page');
            }

            logger.info('Found alternative submit button, clicking it');
            await altButton.first().click();
        } else {
            logger.info('Found Mail proposal button, clicking it');
            await mailButton.first().click();
        }

        logger.debug('Mail proposal button clicked, waiting for response...');

        // ========================================
        // STEP 5: Wait for confirmation
        // ========================================
        try {
            // Wait for page to process the submission
            await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
                logger.debug('Network idle timeout - checking for success indicators');
            });

            await page.waitForTimeout(2000);

            await takeScreenshot(page, 'email-submission-complete');

            // Check for success indicators
            const pageContent = await page.textContent('body');
            const hasSuccessMessage = /success|sent|confirm|thank/i.test(pageContent);
            const hasErrorMessage = /error|fail|invalid/i.test(pageContent);

            if (hasErrorMessage && !hasSuccessMessage) {
                logger.error('Error detected after email submission');
                throw new Error('Email submission failed - error message detected on page');
            }

            logger.info('Email quote submission completed successfully');

            return {
                success: true,
                quoteKey,
                message: 'Proposal email sent successfully'
            };

        } catch (error) {
            logger.error('Error waiting for email submission confirmation', { error: error.message });
            throw error;
        }

    } catch (error) {
        logger.error('Email quote submission failed', {
            error: error.message,
            stack: error.stack
        });

        if (page) {
            await takeScreenshot(page, 'email-submission-error');
        }

        return {
            success: false,
            error: error.message
        };

    } finally {
        // Cleanup
        if (browser) {
            logger.debug('Closing browser');
            await browser.close();
        }
    }
}

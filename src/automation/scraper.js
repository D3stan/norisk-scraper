import { chromium } from 'playwright';
import logger from '../utils/logger.js';
import { CONFIG } from '../config/constants.js';
import { fillFormFields, selectCoverages, fillGuestInfoPage, fillProposalForm } from './formFiller.js';
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
 * @param {Page|Frame} context - The page or frame context
 */
async function extractCsrfToken(context) {
    logger.debug('Extracting CSRF token');
    
    try {
        // Multiple _token inputs may exist (logout form + main form)
        // Target the one in the main content area, not the logout form
        const tokenInput = context.getByRole('main').locator(CONFIG.SELECTORS.TOKEN).first();
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

        // Wait for form to be loaded (token is hidden, so wait for 'attached' not 'visible')
        await page.waitForSelector(CONFIG.SELECTORS.TOKEN, { state: 'attached', timeout: 10000 });
        logger.debug('Form loaded and CSRF token field detected');
        
        await takeScreenshot(page, 'form-loaded');
        
        // Extract CSRF token
        const csrfToken = await extractCsrfToken(page);
        logger.info('Session initialized with CSRF token');
        
        // ========================================
        // STEP 3: Skip "About the Event" page (pre-filled)
        // ========================================
        logger.info('Checking if we are on "About the Event" page');
        
        // Check if we're on the "About the Event" page by looking for specific text or URL
        const pageContent = await page.textContent('body');
        const isAboutEventPage = pageContent.includes('About the event') || 
                                 pageContent.includes('Over het evenement') ||
                                 await page.locator('h1, h2, h3').filter({ hasText: /About the event|Over het evenement/i }).count() > 0;
        
        if (isAboutEventPage) {
            logger.info('"About the Event" page detected - skipping (fields are pre-filled)');
            await takeScreenshot(page, 'about-event-page-skip');
            
            // Click Next/Submit to proceed to event details
            const submitButton = page.locator(CONFIG.SELECTORS.SUBMIT_BUTTON);
            await submitButton.click();
            
            // Wait for navigation
            await page.waitForLoadState('load', { timeout: CONFIG.NAVIGATION_TIMEOUT });
            await page.waitForTimeout(1000);
            
            logger.info('Skipped "About the Event" page, proceeding to next step');
            await takeScreenshot(page, 'after-about-event-skip');
        } else {
            logger.info('Not on "About the Event" page, continuing with form');
        }
        
        await takeScreenshot(page, 'initial-page');
        
        // ========================================
        // STEP 4: Fill form fields
        // ========================================
        await fillFormFields(page, mappedData);
        await takeScreenshot(page, 'form-filled');
        
        // ========================================
        // STEP 5: Submit form to proceed to coverages page
        // ========================================
        logger.info('Submitting form to proceed to coverage selection');
        
        // Click submit button and wait for navigation
        logger.debug('Clicking submit button');
        const submitButton = page.locator(CONFIG.SELECTORS.SUBMIT_BUTTON);
        
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
        
        // ========================================
        // STEP 6: Select coverage options
        // ========================================
        await selectCoverages(page, mappedData.coverages);
        await takeScreenshot(page, 'coverages-selected');
        
        // ========================================
        // STEP 5: Submit coverages and handle possible intermediate pages
        // ========================================
        logger.info('Submitting coverages');
        
        // Take screenshot before submit
        await takeScreenshot(page, 'before-coverage-submit');
        
        // Check for validation errors before submitting
        const validationErrors = await page.locator('.text-red-500, .text-red-600, .error, [class*="error"]').count();
        if (validationErrors > 0) {
          const errorTexts = await page.locator('.text-red-500, .text-red-600, .error, [class*="error"]').allTextContents();
          logger.warn('Validation errors detected before submit', { errors: errorTexts });
        }
        
        // Click next/submit button
        const coverageSubmitButton = page.locator('button[type="submit"]');
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
            const postClickErrors = await page.locator('.text-red-500, .text-red-600, .error, [class*="error"]').allTextContents();
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
        // STEP 6: Handle Guest Info Page (if cancellation_non_appearance selected)
        // ========================================
        const hasNonAppearance = mappedData.coverages?.cancellation_non_appearance;
        const guests = mappedData.coverages?.non_appearance_guests;
        
        if (hasNonAppearance && guests && guests.length > 0) {
            logger.info('Detected cancellation_non_appearance with guests, checking for guest info page');
            
            // Check if we're on the guest info page by looking for guest name input
            const guestNameInput = page.locator('input[type="text"][name="cancellation_non_appearance[0][name]"]');
            const isGuestPage = await guestNameInput.count() > 0;
            
            if (isGuestPage) {
                logger.info('Guest info page detected, filling guest information');
                await takeScreenshot(page, 'guest-info-page');
                
                await fillGuestInfoPage(page, guests);
                await takeScreenshot(page, 'guest-info-filled');
                
                // Submit guest info form
                logger.debug('Submitting guest info form');
                const guestSubmitButton = page.locator('button[type="submit"]').last();
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
        // STEP 7: Handle "Your Proposal" Price Quote Page (REQUIRED)
        // ========================================
        logger.info('Looking for "Your Proposal" price quote page');
        
        // Wait for either button to appear (give it time to load)
        try {
            logger.debug('Waiting for proposal page elements to appear...');
            
            // Wait for the pricing grid to be visible (this confirms we're on the right page)
            await page.waitForSelector('dl.grid.grid-cols-2 dt:has-text("To pay")', {
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
        const pricing = await parsePricingData(page);
        
        // Validate that we got pricing data
        if (!pricing.toPay) {
            logger.warn('Failed to parse "To pay" amount from proposal page');
        }
        
        // Now look for the "Quote via email" link (it's an <a> tag, not a button)
        logger.debug('Looking for "Quote via email" link');
        const quoteEmailLink = page.locator('a:has-text("Quote via email")');
        
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
        
        // Extract quote key from URL
        const urlParams = new URL(detailsUrl).searchParams;
        const quoteKey = urlParams.get('key');
        logger.info('Quote key extracted', { quoteKey });
        
        await takeScreenshot(page, 'your-details-page');
        
        // ========================================
        // STEP 8: Fill "Your Details" Form
        // ========================================
        logger.info('Filling "Your Details" form');
        await fillProposalForm(page, mappedData);
        await takeScreenshot(page, 'your-details-filled');
        
        // ========================================
        // STEP 9: Extract full HTML (STOPPED - no final submission)
        // ========================================
        logger.info('Extracting full HTML from "Your Details" page');
        const htmlContent = await page.content();
        
        logger.info('Automation completed successfully', {
            quoteKey,
            pricing,
            htmlLength: htmlContent.length,
            finalUrl: detailsUrl
        });
        
        return {
            success: true,
            quoteKey,
            proposalUrl: detailsUrl,
            pricing,
            htmlContent,
            csrfToken
        };
        
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

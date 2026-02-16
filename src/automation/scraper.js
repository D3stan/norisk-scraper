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
 * Extracts CSRF token from the page or frame
 * @param {Page|Frame} context - The page or frame context
 */
async function extractCsrfToken(context) {
    logger.debug('Extracting CSRF token');
    
    try {
        const tokenInput = context.locator(CONFIG.SELECTORS.TOKEN);
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
        
        // Helper function to extract price value from text
        const extractPrice = (text) => {
            if (!text) return null;
            // Match patterns like "€ 150,00" or "€ 15,00"
            const match = text.match(/€\s*([\d.,]+)/);
            return match ? match[1] : null;
        };
        
        // Find "Sum excl." and get the next cell value
        const sumExclRow = context.locator('text="Sum excl."').first();
        if (await sumExclRow.count() > 0) {
            const parent = sumExclRow.locator('xpath=ancestor::*[contains(@class, "flex") or contains(@class, "grid")]').first();
            const text = await parent.textContent();
            pricing.sumExcl = extractPrice(text);
            logger.debug('Found Sum excl.', { value: pricing.sumExcl });
        }
        
        // Find "Policy costs"
        const policyCostsRow = context.locator('text="Policy costs"').first();
        if (await policyCostsRow.count() > 0) {
            const parent = policyCostsRow.locator('xpath=ancestor::*[contains(@class, "flex") or contains(@class, "grid")]').first();
            const text = await parent.textContent();
            pricing.policyCosts = extractPrice(text);
            logger.debug('Found Policy costs', { value: pricing.policyCosts });
        }
        
        // Find "Insurance tax"
        const insuranceTaxRow = context.locator('text="Insurance tax"').first();
        if (await insuranceTaxRow.count() > 0) {
            const parent = insuranceTaxRow.locator('xpath=ancestor::*[contains(@class, "flex") or contains(@class, "grid")]').first();
            const text = await parent.textContent();
            pricing.insuranceTax = extractPrice(text);
            logger.debug('Found Insurance tax', { value: pricing.insuranceTax });
        }
        
        // Find "To pay"
        const toPayRow = context.locator('text="To pay"').first();
        if (await toPayRow.count() > 0) {
            const parent = toPayRow.locator('xpath=ancestor::*[contains(@class, "flex") or contains(@class, "grid")]').first();
            const text = await parent.textContent();
            pricing.toPay = extractPrice(text);
            logger.debug('Found To pay', { value: pricing.toPay });
        }
        
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
        // STEP 1: Navigate to form and extract token
        // ========================================
        logger.info('Navigating to form page', { url: CONFIG.BASE_URL });
        await page.goto(CONFIG.BASE_URL, { 
            waitUntil: 'load', // Changed from 'networkidle' to 'load' for pages with ongoing requests
            timeout: CONFIG.NAVIGATION_TIMEOUT 
        });
        
        // Try to handle cookie consent if it appears
        try {
            const cookieButton = page.locator('#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowallSelection');
            await cookieButton.click({ timeout: 3000 });
            logger.debug('Clicked cookie consent button');
            // await page.waitForTimeout(1000);
        } catch (error) {
            logger.debug('No cookie consent banner detected or already accepted');
        }

        // Wait for iframe to load
        logger.debug('Waiting for iframe to load');
        const frameElement = await page.waitForSelector('iframe', { timeout: 10000 });

        // Get iframe context
        const frame = await frameElement.contentFrame();

        if (!frame) {
            throw new Error('Failed to get iframe content frame');
        }
        
        logger.info('Switched to iframe context');
        
        // Wait for form to be loaded inside iframe (token is hidden, so wait for 'attached' not 'visible')
        await frame.waitForSelector(CONFIG.SELECTORS.TOKEN, { state: 'attached', timeout: 10000 });
        logger.debug('Form loaded and CSRF token field detected inside iframe');
        
        await takeScreenshot(page, 'initial-page');
        
        // Extract CSRF token from iframe
        const csrfToken = await extractCsrfToken(frame);
        logger.info('Session initialized with CSRF token');
        
        // ========================================
        // STEP 2: Fill form fields (inside iframe)
        // ========================================
        await fillFormFields(frame, mappedData);
        await takeScreenshot(page, 'form-filled');
        
        // ========================================
        // STEP 3: Submit form to proceed to coverages page
        // ========================================
        logger.info('Submitting form to proceed to coverage selection');
        
        // Click submit button inside iframe and wait for navigation
        logger.debug('Clicking submit button inside iframe');
        const submitButton = frame.locator(CONFIG.SELECTORS.SUBMIT_BUTTON);
        
        // Wait for iframe to navigate to coverages page
        await Promise.all([
            frame.waitForURL('**/coverages**', { 
              timeout: CONFIG.NAVIGATION_TIMEOUT 
            }),
            submitButton.click()
        ]);
        
        logger.debug('Iframe navigated to coverages page');
        
        // Give iframe content time to fully load
        await frame.waitForLoadState('load');
        await frame.waitForTimeout(1000);
        
        // We can continue using the same frame reference - iframe context persists
        const coverageFrame = frame;
        
        logger.info('Using iframe context on coverage page');
        await takeScreenshot(page, 'coverages-page');
        
        // ========================================
        // STEP 4: Select coverage options
        // ========================================
        await selectCoverages(coverageFrame, mappedData.coverages);
        await takeScreenshot(page, 'coverages-selected');
        
        // ========================================
        // STEP 5: Submit coverages and handle possible intermediate pages
        // ========================================
        logger.info('Submitting coverages');
        
        // Take screenshot before submit
        await takeScreenshot(page, 'before-coverage-submit');
        
        // Check for validation errors before submitting
        const validationErrors = await coverageFrame.locator('.text-red-500, .text-red-600, .error, [class*="error"]').count();
        if (validationErrors > 0) {
          const errorTexts = await coverageFrame.locator('.text-red-500, .text-red-600, .error, [class*="error"]').allTextContents();
          logger.warn('Validation errors detected before submit', { errors: errorTexts });
        }
        
        // Click next/submit button inside iframe
        const coverageSubmitButton = coverageFrame.locator('button[type="submit"]');
        await coverageSubmitButton.scrollIntoViewIfNeeded();
        
        logger.debug('Clicking coverage submit button');
        
        try {
            // Click and wait for navigation
            await coverageSubmitButton.click();
            logger.debug('Coverage submit button clicked, waiting for navigation...');
            
            // Wait for page to load
            await coverageFrame.waitForLoadState('load', { timeout: CONFIG.NAVIGATION_TIMEOUT });
            await coverageFrame.waitForLoadState('domcontentloaded', { timeout: CONFIG.NAVIGATION_TIMEOUT });
            
            // Give page extra time to settle and render (important for dynamic content)
            await coverageFrame.waitForTimeout(2000);
            
            logger.debug('Page load completed after coverage submit');
        } catch (error) {
            // Check if there are validation errors after click
            await takeScreenshot(page, 'coverage-submit-error');
            const postClickErrors = await coverageFrame.locator('.text-red-500, .text-red-600, .error, [class*="error"]').allTextContents();
            if (postClickErrors.length > 0) {
                logger.error('Form validation failed', { errors: postClickErrors });
                throw new Error(`Coverage form validation failed: ${postClickErrors.join(', ')}`);
            }
            // Re-throw original error if no validation errors found
            throw error;
        }
        
        const currentUrl = await coverageFrame.evaluate(() => window.location.href);
        logger.debug('Current URL after coverage submit', { url: currentUrl });
        
        // ========================================
        // STEP 6: Handle Guest Info Page (if cancellation_non_appearance selected)
        // ========================================
        const hasNonAppearance = mappedData.coverages?.cancellation_non_appearance;
        const guests = mappedData.coverages?.non_appearance_guests;
        
        if (hasNonAppearance && guests && guests.length > 0) {
            logger.info('Detected cancellation_non_appearance with guests, checking for guest info page');
            
            // Check if we're on the guest info page by looking for guest name input
            const guestNameInput = coverageFrame.locator('input[type="text"][name="cancellation_non_appearance[0][name]"]');
            const isGuestPage = await guestNameInput.count() > 0;
            
            if (isGuestPage) {
                logger.info('Guest info page detected, filling guest information');
                await takeScreenshot(page, 'guest-info-page');
                
                await fillGuestInfoPage(coverageFrame, guests);
                await takeScreenshot(page, 'guest-info-filled');
                
                // Submit guest info form
                logger.debug('Submitting guest info form');
                const guestSubmitButton = coverageFrame.locator('button[type="submit"]').last();
                await guestSubmitButton.click();
                
                // Wait for navigation after guest submit
                await coverageFrame.waitForLoadState('load', { timeout: CONFIG.NAVIGATION_TIMEOUT });
                await coverageFrame.waitForLoadState('domcontentloaded', { timeout: CONFIG.NAVIGATION_TIMEOUT });
                await coverageFrame.waitForTimeout(2000);
                
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
            
            // Wait for any of these indicators that we're on the proposal page
            await coverageFrame.waitForSelector('text="To pay", button:has-text("view proposal"), button:has-text("Next step"), a:has-text("Quote via email")', {
                timeout: 15000,
                state: 'visible'
            });
            
            logger.debug('Proposal page elements detected');
        } catch (error) {
            logger.error('Timeout waiting for proposal page elements', { error: error.message });
            await takeScreenshot(page, 'proposal-page-timeout');
            
            // Log what's actually on the page
            const pageText = await coverageFrame.textContent('body');
            logger.debug('Page content preview', { preview: pageText.substring(0, 500) });
            
            throw new Error('Failed to reach "Your Proposal" price quote page - cannot extract pricing information');
        }
        
        await takeScreenshot(page, 'your-proposal-price-page');
        
        // Now check which buttons are present
        const quoteEmailButton = coverageFrame.locator(CONFIG.SELECTORS.PROPOSAL_PRICE.QUOTE_EMAIL_BUTTON);
        // Look for the submit button more broadly
        const takeOutButton = coverageFrame.locator('button[type="submit"]').last(); // Use the last submit button on the page
        
        const hasQuoteButton = await quoteEmailButton.count() > 0;
        const hasTakeOutButton = await takeOutButton.count() > 0;
        
        logger.info('"Your Proposal" page confirmed', { 
            hasQuoteButton, 
            hasTakeOutButton 
        });
        
        // Parse pricing data
        const pricing = await parsePricingData(coverageFrame);
        
        // Validate that we got pricing data
        if (!pricing.toPay) {
            logger.warn('Failed to parse "To pay" amount from proposal page');
        }
        
        // Click "Take out insurance" button to proceed to "Your Details" page
        logger.debug('Clicking "Take out insurance" to proceed to Your Details');
        
        if (hasTakeOutButton) {
            await takeOutButton.click();
            logger.debug('Button clicked, waiting for navigation...');
            
            // Wait for navigation to Your Details
            await coverageFrame.waitForLoadState('load', { timeout: CONFIG.NAVIGATION_TIMEOUT });
            await coverageFrame.waitForLoadState('domcontentloaded', { timeout: CONFIG.NAVIGATION_TIMEOUT });
            await coverageFrame.waitForTimeout(2000);
            
            logger.debug('Your Details page loaded');
        } else {
            logger.error('Could not find "Take out insurance" button to proceed');
            throw new Error('"Take out insurance" button not found - cannot proceed to Your Details');
        }
        
        const detailsUrl = await coverageFrame.evaluate(() => window.location.href);
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
        await fillProposalForm(coverageFrame, mappedData);
        await takeScreenshot(page, 'your-details-filled');
        
        // ========================================
        // STEP 9: Extract full HTML (STOPPED - no final submission)
        // ========================================
        logger.info('Extracting full HTML from "Your Details" page');
        const htmlContent = await coverageFrame.content();
        
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

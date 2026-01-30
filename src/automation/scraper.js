import { chromium } from 'playwright';
import logger from '../utils/logger.js';
import { CONFIG } from '../config/constants.js';
import { fillFormFields, selectCoverages } from './formFiller.js';
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
        // STEP 5: Proceed to proposal page (STOP HERE - no final submission)
        // ========================================
        logger.info('Submitting coverages (will stop at proposal page, before final send)');
        
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
            // Click and wait for navigation with timeout
            await Promise.all([
                coverageFrame.waitForURL('**/proposal**', { 
                  timeout: CONFIG.NAVIGATION_TIMEOUT 
                }),
                coverageSubmitButton.click()
            ]);

            logger.debug('Iframe navigated to proposal page');
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
        
        // Wait for proposal content to load
        await coverageFrame.waitForLoadState('load');
        await coverageFrame.waitForTimeout(1000);
        
        const proposalUrl = await coverageFrame.evaluate(() => window.location.href);
        logger.info('Reached proposal page', { url: proposalUrl });
        
        // Extract quote key from URL
        const urlParams = new URL(proposalUrl).searchParams;
        const quoteKey = urlParams.get('key');
        logger.info('Quote key extracted', { quoteKey });
        
        await takeScreenshot(page, 'proposal-page');
        
        // ========================================
        // STEP 6: Fill proposal form (final page fields)
        // ========================================
        logger.info('Filling proposal form fields');
        const { fillProposalForm } = await import('./formFiller.js');
        await fillProposalForm(coverageFrame, mappedData);
        await takeScreenshot(page, 'proposal-form-filled');
        
        // ========================================
        // STEP 6: Extract full HTML (STOPPED - no final submission)
        // ========================================
        logger.info('Extracting full HTML from proposal page (iframe content)');
        const htmlContent = await coverageFrame.content();
        
        logger.info('Automation completed successfully', {
            quoteKey,
            htmlLength: htmlContent.length,
            finalUrl: proposalUrl
        });
        
        return {
            success: true,
            quoteKey,
            proposalUrl,
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

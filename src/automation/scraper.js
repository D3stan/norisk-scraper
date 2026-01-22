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
    });
    
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
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
    
    // Wait for iframe to load
    logger.debug('Waiting for iframe to load');
    await page.waitForSelector('iframe', { timeout: 10000 });
    
    // Get iframe context
    const frameElement = await page.waitForSelector('iframe');
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
    await Promise.all([
      page.waitForURL(CONFIG.URL_PATTERNS.COVERAGES, { 
        timeout: CONFIG.NAVIGATION_TIMEOUT 
      }),
      frame.locator(CONFIG.SELECTORS.SUBMIT_BUTTON).click()
    ]);
    
    // Wait for page to load
    await page.waitForLoadState('load');
    
    // Get new iframe context after navigation
    const coverageFrameElement = await page.waitForSelector('iframe', { timeout: 10000 });
    const coverageFrame = await coverageFrameElement.contentFrame();
    
    if (!coverageFrame) {
      throw new Error('Failed to get iframe content frame on coverage page');
    }
    // ========================================
    await selectCoverages(coverageFrame, mappedData.coverages);
    logger.debug('Switched to new iframe context on coverage page');
    
    const coveragesUrl = page.url();
    logger.info('Navigated to coverages page', { url: coveragesUrl });
    await takeScreenshot(page, 'coverages-page');
    
    // ========================================
    // STEP 4: Select coverage options
    // ========================================
    await selectCoverages(page, mappedData.coverages);
    await takeScreenshot(page, 'coverages-selected');
    
    // ========================================
    // STEP 5: Proceed to proposal page
    // ========================================
    // Click next button and wait for navigation
    await Promise.all([
      page.waitForURL(CONFIG.URL_PATTERNS.PROPOSAL, { 
        timeout: CONFIG.NAVIGATION_TIMEOUT 
      }),
      page.locator(CONFIG.SELECTORS.COVERAGE_NEXT).click()
    ]);
    
    // Wait for page to load
    await page.waitForLoadState('load', { 
      timeout: CONFIG.NAVIGATION_TIMEOUT 
    });
    
    const proposalUrl = page.url();
    logger.info('Navigated to proposal page', { url: proposalUrl });
    
    // Extract quote key from URL
    const urlParams = new URL(proposalUrl).searchParams;
    const quoteKey = urlParams.get('key');
    logger.info('Quote key extracted', { quoteKey });
    
    await takeScreenshot(page, 'proposal-page');
    
    // ========================================
    // STEP 6: Extract full HTML (STOP HERE - no final submission)
    // ========================================
    logger.info('Extracting full HTML from proposal page');
    const htmlContent = await page.content();
    
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

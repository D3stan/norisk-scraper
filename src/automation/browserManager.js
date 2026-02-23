import { chromium } from 'playwright';
import logger from '../utils/logger.js';
import { CONFIG } from '../config/constants.js';

// Module-level browser instance (singleton pattern)
let browser = null;

/**
 * Initializes the shared browser instance
 * Returns existing browser if already initialized
 * @returns {Promise<Browser>} The Playwright browser instance
 */
export async function initBrowser() {
    if (browser) {
        logger.debug('Browser already initialized, returning existing instance');
        return browser;
    }

    logger.info('Initializing browser', {
        headless: CONFIG.HEADLESS,
        slowMo: CONFIG.SLOW_MO
    });

    browser = await chromium.launch({
        headless: CONFIG.HEADLESS,
        slowMo: CONFIG.SLOW_MO,
        args: ['--disable-blink-features=AutomationControlled']
    });

    logger.info('Browser initialized successfully');
    return browser;
}

/**
 * Gets the current browser instance
 * Throws error if browser not initialized
 * @returns {Browser} The Playwright browser instance
 * @throws {Error} If browser is not initialized
 */
export function getBrowser() {
    if (!browser) {
        throw new Error('Browser not initialized. Call initBrowser() first.');
    }
    return browser;
}

/**
 * Closes the browser instance and cleans up
 */
export async function closeBrowser() {
    if (browser) {
        logger.info('Closing browser');
        await browser.close();
        browser = null;
        logger.info('Browser closed');
    }
}

// Process exit handlers to ensure browser cleanup
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, closing browser');
    await closeBrowser();
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('SIGINT received, closing browser');
    await closeBrowser();
    process.exit(0);
});

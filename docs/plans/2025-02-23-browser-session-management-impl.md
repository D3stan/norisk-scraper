# Browser Session Management Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace "new browser per request" with "single browser + tab-per-request" for better performance.

**Architecture:** Create a singleton browser manager that initializes once on server startup. Each request opens a new page (tab), performs automation, then closes the tab. Add screenshot rotation to prevent disk bloat.

**Tech Stack:** Node.js, Express, Playwright, ES Modules

---

## Prerequisites

- Review `docs/plans/2025-02-23-browser-session-management-design.md`
- Review existing `src/automation/scraper.js` to understand current browser launch pattern

---

## Task 1: Create Browser Manager (Singleton)

**Files:**
- Create: `src/automation/browserManager.js`

**Step 1: Create the browser manager module**

```javascript
import { chromium } from 'playwright';
import logger from '../utils/logger.js';
import { CONFIG } from '../config/constants.js';

let browser = null;

/**
 * Initialize the shared browser instance
 * Called once on server startup
 */
export async function initBrowser() {
    if (browser) {
        logger.debug('Browser already initialized');
        return browser;
    }

    logger.info('Initializing shared browser instance');
    browser = await chromium.launch({
        headless: CONFIG.HEADLESS,
        slowMo: CONFIG.SLOW_MO,
        args: ['--disable-blink-features=AutomationControlled']
    });
    logger.info('Browser initialized successfully');
    return browser;
}

/**
 * Get the shared browser instance
 * @returns {Promise<Browser>} The shared browser
 * @throws {Error} If browser not initialized
 */
export async function getBrowser() {
    if (!browser) {
        throw new Error('Browser not initialized. Call initBrowser() first.');
    }
    return browser;
}

/**
 * Close the shared browser instance
 * Called on server shutdown
 */
export async function closeBrowser() {
    if (browser) {
        logger.info('Closing shared browser instance');
        await browser.close();
        browser = null;
    }
}

// Graceful cleanup on process exit
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, closing browser');
    closeBrowser().then(() => process.exit(0));
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, closing browser');
    closeBrowser().then(() => process.exit(0));
});
```

**Step 2: Commit**

```bash
git add src/automation/browserManager.js
git commit -m "feat: add browser manager singleton for shared browser instance"
```

---

## Task 2: Create Screenshot Manager with Rotation

**Files:**
- Create: `src/utils/screenshotManager.js`

**Step 1: Create the screenshot manager module**

```javascript
import fs from 'fs/promises';
import path from 'path';
import logger from './logger.js';

const SCREENSHOT_CONFIG = {
    maxScreenshots: 25,
    directory: './screenshots/errors'
};

// Track screenshot files for rotation
let screenshotFiles = [];

/**
 * Initialize screenshot directory
 * Loads existing screenshots to maintain rotation count
 */
async function initializeScreenshotTracking() {
    try {
        await fs.mkdir(SCREENSHOT_CONFIG.directory, { recursive: true });
        const files = await fs.readdir(SCREENSHOT_CONFIG.directory);
        screenshotFiles = files
            .filter(f => f.endsWith('.png'))
            .map(f => path.join(SCREENSHOT_CONFIG.directory, f))
            .sort();
        logger.debug(`Screenshot tracking initialized: ${screenshotFiles.length} existing screenshots`);
    } catch (error) {
        logger.warn('Failed to initialize screenshot tracking', { error: error.message });
        screenshotFiles = [];
    }
}

/**
 * Capture a screenshot with automatic rotation
 * Maintains max 25 screenshots (FIFO)
 * @param {Page} page - Playwright page
 * @param {string} context - Optional context for filename
 * @returns {Promise<string|null>} Screenshot filepath or null on failure
 */
export async function captureErrorScreenshot(page, context = '') {
    try {
        // Initialize tracking on first use
        if (screenshotFiles.length === 0) {
            await initializeScreenshotTracking();
        }

        // Remove oldest screenshot if at max
        if (screenshotFiles.length >= SCREENSHOT_CONFIG.maxScreenshots) {
            const oldest = screenshotFiles.shift();
            try {
                await fs.unlink(oldest);
                logger.debug(`Removed old screenshot: ${oldest}`);
            } catch {
                // Ignore errors removing old file
            }
        }

        // Generate filename with context and timestamp
        const timestamp = Date.now();
        const contextPart = context ? `-${context}` : '';
        const filename = `error-${timestamp}${contextPart}.png`;
        const filepath = path.join(SCREENSHOT_CONFIG.directory, filename);

        // Take screenshot
        await page.screenshot({ path: filepath, fullPage: true });
        screenshotFiles.push(filepath);

        logger.debug(`Screenshot saved: ${filename}`);
        return filepath;
    } catch (error) {
        logger.error('Failed to capture screenshot', { error: error.message });
        return null;
    }
}

/**
 * Get list of current screenshot files
 * @returns {string[]} Array of screenshot file paths
 */
export function getScreenshotFiles() {
    return [...screenshotFiles];
}

/**
 * Clear all screenshots
 */
export async function clearScreenshots() {
    for (const filepath of screenshotFiles) {
        try {
            await fs.unlink(filepath);
        } catch {
            // Ignore errors
        }
    }
    screenshotFiles = [];
    logger.info('All screenshots cleared');
}
```

**Step 2: Commit**

```bash
git add src/utils/screenshotManager.js
git commit -m "feat: add screenshot manager with max 25 rotation"
```

---

## Task 3: Modify Scraper to Use Shared Browser (Part 1 - automateFormSubmission)

**Files:**
- Modify: `src/automation/scraper.js:1-15` (imports)
- Modify: `src/automation/scraper.js:214-250` (remove browser launch)
- Modify: `src/automation/scraper.js:656-685` (error handling and cleanup)

**Step 1: Update imports at top of file**

Add to existing imports:
```javascript
// Add these imports
import { getBrowser } from './browserManager.js';
import { captureErrorScreenshot } from '../utils/screenshotManager.js';
```

**Step 2: Remove browser launch from automateFormSubmission**

Replace lines 214-250 (approximately):
```javascript
// BEFORE:
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
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            extraHTTPHeaders: {
              'Accept-Language': 'en-US,en;q=0.9'
            }
        });

        page = await context.newPage();
```

With:
```javascript
// AFTER:
export async function automateFormSubmission(mappedData) {
    logger.info('Starting NoRisk form automation');

    let page;

    try {
        // Get shared browser and create new page (tab)
        const browser = await getBrowser();
        page = await browser.newPage({
            viewport: { width: 1920, height: 1080 },
            extraHTTPHeaders: {
                'Accept-Language': 'en-US,en;q=0.9'
            }
        });

        logger.debug('Created new page for request');
```

**Step 3: Update error handling and cleanup**

Replace the finally block (lines 656-685 approximately):
```javascript
// BEFORE:
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
```

With:
```javascript
// AFTER:
    } catch (error) {
        logger.error('Automation failed', {
            error: error.message,
            stack: error.stack
        });

        // Take error screenshot if page exists
        if (page) {
            await captureErrorScreenshot(page, 'automateFormSubmission');

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
        // Close page (tab), not browser
        if (page) {
            logger.debug('Closing page');
            await page.close();
        }
    }
```

**Step 4: Commit**

```bash
git add src/automation/scraper.js
git commit -m "refactor: use shared browser in automateFormSubmission"
```

---

## Task 4: Modify Scraper to Use Shared Browser (Part 2 - submitEmailQuote)

**Files:**
- Modify: `src/automation/scraper.js:693-730` (remove browser launch)
- Modify: `src/automation/scraper.js:842-864` (error handling and cleanup)

**Step 1: Remove browser launch from submitEmailQuote**

Replace the browser launch section:
```javascript
// BEFORE:
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
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            extraHTTPHeaders: {
                'Accept-Language': 'en-US,en;q=0.9'
            }
        });

        page = await context.newPage();
        page.setDefaultTimeout(CONFIG.DEFAULT_TIMEOUT);
```

With:
```javascript
// AFTER:
export async function submitEmailQuote(quoteKey) {
    logger.info('Starting email quote submission', { quoteKey });

    let page;

    try {
        // Get shared browser and create new page (tab)
        const browser = await getBrowser();
        page = await browser.newPage({
            viewport: { width: 1920, height: 1080 },
            extraHTTPHeaders: {
                'Accept-Language': 'en-US,en;q=0.9'
            }
        });
        page.setDefaultTimeout(CONFIG.DEFAULT_TIMEOUT);

        logger.debug('Created new page for email submission');
```

**Step 2: Update error handling and cleanup**

Replace the catch and finally blocks:
```javascript
// BEFORE:
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
```

With:
```javascript
// AFTER:
    } catch (error) {
        logger.error('Email quote submission failed', {
            error: error.message,
            stack: error.stack
        });

        if (page) {
            await captureErrorScreenshot(page, 'submitEmailQuote');
        }

        return {
            success: false,
            error: error.message
        };

    } finally {
        // Close page (tab), not browser
        if (page) {
            logger.debug('Closing page');
            await page.close();
        }
    }
```

**Step 3: Commit**

```bash
git add src/automation/scraper.js
git commit -m "refactor: use shared browser in submitEmailQuote"
```

---

## Task 5: Modify Server to Initialize Browser on Startup

**Files:**
- Modify: `src/index.js:1-15` (imports)
- Modify: `src/index.js:245-281` (startup logic)

**Step 1: Add import for browser manager**

Add to existing imports:
```javascript
// Add this import
import { initBrowser } from './automation/browserManager.js';
```

**Step 2: Modify server startup to initialize browser**

Replace the app.listen callback:
```javascript
// BEFORE:
app.listen(PORT, () => {
    logger.info(`NoRisk Proxy Server started`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        // ...
    });
    // ... console logs ...
});
```

With:
```javascript
// AFTER:
app.listen(PORT, async () => {
    // Initialize browser on startup
    try {
        await initBrowser();
        logger.info('Browser initialized and ready');
    } catch (error) {
        logger.error('Failed to initialize browser', { error: error.message });
        process.exit(1);
    }

    logger.info(`NoRisk Proxy Server started`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        headless: process.env.HEADLESS || 'false',
        completed: CONFIG.COMPLETED,
        imapConfigured: !!CONFIG.IMAP.HOST,
        smtpConfigured: !!CONFIG.SMTP.HOST
    });

    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📝 Health check: http://localhost:${PORT}/health`);
    console.log(`🎯 Quote endpoint: POST http://localhost:${PORT}/api/quote`);
    console.log(`📧 Send quote: POST http://localhost:${PORT}/api/quote/send`);
    console.log(`📊 Quote status: GET http://localhost:${PORT}/api/quote/:quoteKey/status`);
    console.log(`🎭 Browser: Shared instance (tab-per-request)`);

    if (CONFIG.COMPLETED) {
        console.log(`\n✅ COMPLETED mode: Auto-submit enabled`);
    } else {
        console.log(`\n⏸️  DRAFT mode: Manual confirmation required`);
    }

    if (CONFIG.IMAP.HOST) {
        console.log(`📥 Email reception: Enabled (${CONFIG.IMAP.HOST})`);
        startEmailPolling();
    } else {
        console.log(`📥 Email reception: Disabled (IMAP not configured)`);
    }

    if (CONFIG.SMTP.HOST) {
        console.log(`📤 Email sending: Enabled (${CONFIG.SMTP.HOST})`);
    } else {
        console.log(`📤 Email sending: Disabled (SMTP not configured)`);
    }
    console.log('');
});
```

**Step 3: Commit**

```bash
git add src/index.js
git commit -m "feat: initialize browser on server startup"
```

---

## Task 6: Test the Implementation

**Files:**
- No file changes, manual testing

**Step 1: Start the server**

```bash
npm start
```

**Expected output:**
```
🚀 Server running on http://localhost:3000
...
🎭 Browser: Shared instance (tab-per-request)
```

**Step 2: Test health endpoint**

```bash
curl http://localhost:3000/health
```

**Expected:** `{"status":"ok",...}`

**Step 3: Test quote endpoint (single request)**

Make a POST request to `/api/quote` with valid form data.

**Expected:** Successful response with quoteKey

**Step 4: Test concurrent requests**

Open two terminals and simultaneously send requests:

Terminal 1:
```bash
curl -X POST http://localhost:3000/api/quote \
  -H "Content-Type: application/json" \
  -d '{"eventType":"17","visitors":"100",...}' &
```

Terminal 2:
```bash
curl -X POST http://localhost:3000/api/quote \
  -H "Content-Type: application/json" \
  -d '{"eventType":"18","visitors":"200",...}' &
```

**Expected:** Both requests complete successfully (parallel execution)

**Step 5: Verify screenshot rotation**

Trigger 30+ errors and verify only 25 screenshots exist:

```bash
ls screenshots/errors/ | wc -l
```

**Expected:** Maximum 25 files

**Step 6: Commit (if tests pass)**

```bash
git commit --allow-empty -m "test: verify browser session management works"
```

---

## Task 7: Clean Up (Remove Old Screenshot Logic)

**Files:**
- Modify: `src/automation/scraper.js:20-35` (remove old takeScreenshot function)

**Step 1: Review if old takeScreenshot is still needed**

The old `takeScreenshot` function (lines 20-35) was used for debug screenshots. We now use `captureErrorScreenshot` for errors.

If debug screenshots are still desired, keep it. Otherwise remove.

**Step 2: Commit if changes made**

```bash
git add src/automation/scraper.js
git commit -m "chore: remove obsolete screenshot function"
```

---

## Summary of Changes

| File | Action | Lines Changed |
|------|--------|---------------|
| `src/automation/browserManager.js` | Create | ~80 lines |
| `src/utils/screenshotManager.js` | Create | ~90 lines |
| `src/automation/scraper.js` | Modify | ~40 lines (imports + cleanup) |
| `src/index.js` | Modify | ~15 lines (startup) |

---

## Verification Checklist

- [ ] Server starts and initializes browser
- [ ] Single `/api/quote` request succeeds
- [ ] Multiple concurrent requests succeed
- [ ] Error screenshots are captured on failure
- [ ] Only max 25 screenshots are kept
- [ ] Pages are closed after each request (check with logging)
- [ ] Browser stays running between requests
- [ ] Server shutdown closes browser gracefully

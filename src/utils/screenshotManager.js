import fs from 'fs/promises';
import path from 'path';
import logger from './logger.js';

const SCREENSHOT_CONFIG = {
    maxScreenshots: 25,
    directory: './screenshots/errors'
};

let screenshotFiles = [];
let initialized = false;

async function initializeScreenshotTracking() {
    if (initialized) return;

    try {
        await fs.mkdir(SCREENSHOT_CONFIG.directory, { recursive: true });

        const files = await fs.readdir(SCREENSHOT_CONFIG.directory);
        screenshotFiles = files
            .filter(file => file.endsWith('.png'))
            .map(file => path.join(SCREENSHOT_CONFIG.directory, file))
            .sort();

        logger.info(`Screenshot tracking initialized. Found ${screenshotFiles.length} existing screenshots.`);
        initialized = true;
    } catch (error) {
        logger.error(`Failed to initialize screenshot tracking: ${error.message}`);
        throw error;
    }
}

export async function captureErrorScreenshot(page, context = '') {
    try {
        await initializeScreenshotTracking();

        if (screenshotFiles.length >= SCREENSHOT_CONFIG.maxScreenshots) {
            const oldestFile = screenshotFiles.shift();
            try {
                await fs.unlink(oldestFile);
                logger.debug(`Removed oldest screenshot: ${path.basename(oldestFile)}`);
            } catch (error) {
                logger.warn(`Failed to remove old screenshot ${oldestFile}: ${error.message}`);
            }
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const contextSuffix = context ? `-${context}` : '';
        const filename = `error-${timestamp}${contextSuffix}.png`;
        const filepath = path.join(SCREENSHOT_CONFIG.directory, filename);

        await page.screenshot({
            path: filepath,
            fullPage: true
        });

        screenshotFiles.push(filepath);
        logger.info(`Screenshot captured: ${filename}`);

        return filepath;
    } catch (error) {
        logger.error(`Failed to capture screenshot: ${error.message}`);
        return null;
    }
}

export function getScreenshotFiles() {
    return [...screenshotFiles];
}

export async function clearScreenshots() {
    try {
        await initializeScreenshotTracking();

        for (const filepath of screenshotFiles) {
            try {
                await fs.unlink(filepath);
            } catch (error) {
                logger.warn(`Failed to delete screenshot ${filepath}: ${error.message}`);
            }
        }

        const count = screenshotFiles.length;
        screenshotFiles = [];
        logger.info(`Cleared ${count} screenshots from ${SCREENSHOT_CONFIG.directory}`);
    } catch (error) {
        logger.error(`Failed to clear screenshots: ${error.message}`);
        throw error;
    }
}

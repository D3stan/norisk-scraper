import logger from '../utils/logger.js';
import { CONFIG } from '../config/constants.js';

/**
 * Fills a text input field
 * @param {Page|Frame} context - The page or frame context
 */
async function fillInput(context, selector, value, fieldName) {
  if (!value) {
    logger.debug(`Skipping empty field: ${fieldName}`);
    return;
  }
  
  try {
    await context.fill(selector, String(value), { timeout: 5000 });
    logger.debug(`Filled field: ${fieldName}`, { value });
  } catch (error) {
    logger.error(`Failed to fill field: ${fieldName}`, { selector, error: error.message });
    throw error;
  }
}

/**
 * Selects an option from a dropdown
 * @param {Page|Frame} context - The page or frame context
 */
async function selectDropdown(context, selector, value, fieldName) {
  if (!value) {
    logger.debug(`Skipping empty dropdown: ${fieldName}`);
    return;
  }
  
  try {
    await context.selectOption(selector, String(value), { timeout: 5000 });
    logger.debug(`Selected dropdown: ${fieldName}`, { value });
  } catch (error) {
    logger.error(`Failed to select dropdown: ${fieldName}`, { selector, error: error.message });
    throw error;
  }
}

/**
 * @param {Page|Frame} context - The page or frame context
 */
export async function fillFormFields(context, mappedData) {
  logger.info('Starting form field population');
  
  try {
    // Step 1: Personal Details
    logger.debug('Filling personal details section');
    await fillInput(context, CONFIG.SELECTORS.INITIALS, mappedData.initials, 'Initials');
    await fillInput(context, CONFIG.SELECTORS.PREPOSITION, mappedData.preposition, 'Preposition');
    await fillInput(context, CONFIG.SELECTORS.LAST_NAME, mappedData.last_name, 'Last Name');
    await fillInput(context, CONFIG.SELECTORS.PHONE, mappedData.phone, 'Phone');
    await fillInput(context, CONFIG.SELECTORS.EMAIL, mappedData.email, 'Email');
    await selectDropdown(context, CONFIG.SELECTORS.ROLE, mappedData.role, 'Role');
    
    // Step 2: Event Details
    logger.debug('Filling event details section');
    await fillInput(context, CONFIG.SELECTORS.EVENT_NAME, mappedData.title, 'Event Name');
    await selectDropdown(context, CONFIG.SELECTORS.EVENT_TYPE, mappedData.type, 'Event Type');
    await fillInput(context, CONFIG.SELECTORS.START_DATE, mappedData.start, 'Start Date');
    await fillInput(context, CONFIG.SELECTORS.DAYS, mappedData.days, 'Days');
    await fillInput(context, CONFIG.SELECTORS.VISITORS, mappedData.visitors, 'Visitors');
    await fillInput(context, CONFIG.SELECTORS.DESCRIPTION, mappedData.description, 'Description');
    
    // Step 3: Location
    logger.debug('Filling location details section');
    await fillInput(context, CONFIG.SELECTORS.VENUE_DESCRIPTION, mappedData.venue_description, 'Venue Description');
    await fillInput(context, CONFIG.SELECTORS.ADDRESS, mappedData.address, 'Address');
    await fillInput(context, CONFIG.SELECTORS.HOUSE_NUMBER, mappedData.house_number, 'House Number');
    await fillInput(context, CONFIG.SELECTORS.ZIPCODE, mappedData.zipcode, 'Zipcode');
    await fillInput(context, CONFIG.SELECTORS.CITY, mappedData.city, 'City');
    await selectDropdown(context, CONFIG.SELECTORS.REGION, mappedData.region, 'Country/Region');
    await selectDropdown(context, CONFIG.SELECTORS.ENVIRONMENT, mappedData.environment, 'Environment');
    
    logger.info('All form fields filled successfully');
  } catch (error) {
    logger.error('Form filling failed', { error: error.message, stack: error.stack });
    throw error;
  }
}

/**
 * Handles coverage selection on the second page
 * @param {Page|Frame} context - The page or frame context
 */
export async function selectCoverages(context, coverages) {
  logger.info('Selecting coverage options', { coverages });
  
  try {
    // Small delay to ensure dynamic content loads
    await context.waitForTimeout(1000);
    
    // Look for coverage checkboxes (names may vary, will need to inspect actual page)
    // Common patterns: input[type="checkbox"][name*="liability"]
    const coverageMap = {
      liability: 'input[type="checkbox"][name*="liability"], input[type="checkbox"][id*="liability"]',
      accidents: 'input[type="checkbox"][name*="accident"], input[type="checkbox"][id*="accident"]',
      equipment: 'input[type="checkbox"][name*="equipment"], input[type="checkbox"][id*="equipment"]',
      cancellation: 'input[type="checkbox"][name*="cancellation"], input[type="checkbox"][id*="cancellation"]'
    };
    
    for (const [coverageType, selector] of Object.entries(coverageMap)) {
      if (coverages[coverageType]) {
        try {
          const checkbox = context.locator(selector).first();
          if (await checkbox.count() > 0) {
            await checkbox.check({ timeout: 5000 });
            logger.debug(`Checked coverage: ${coverageType}`);
          } else {
            logger.warn(`Coverage checkbox not found: ${coverageType}`);
          }
        } catch (error) {
          logger.warn(`Failed to check coverage: ${coverageType}`, { error: error.message });
        }
      }
    }
    
    logger.info('Coverage selection completed');
  } catch (error) {
    logger.error('Coverage selection failed', { error: error.message });
    throw error;
  }
}

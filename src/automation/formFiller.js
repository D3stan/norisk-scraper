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
        // Add configurable delay before filling
        if (CONFIG.FIELD_DELAY > 0) {
            await context.waitForTimeout(CONFIG.FIELD_DELAY);
        }
        
        const element = context.locator(selector).first();
        const count = await element.count();
        
        if (count === 0) {
            logger.warn(`Field not found: ${fieldName}`, { selector });
            return;
        }
        
        // Check if element is hidden
        const isHidden = await element.evaluate(el => {
            return el.type === 'hidden' || el.hasAttribute('data-flux-hidden');
        });
        
        if (isHidden) {
            // For hidden fields, set value directly via JavaScript
            logger.debug(`Setting hidden field via JS: ${fieldName}`);
            await element.evaluate((el, val) => {
                el.value = val;
                // Dispatch input and change events to trigger Livewire
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }, String(value));
        } else {
            // For visible fields, use normal fill
            await context.fill(selector, String(value), { timeout: 5000 });
        }
        
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
        // Add configurable delay before selecting
        if (CONFIG.FIELD_DELAY > 0) {
            await context.waitForTimeout(CONFIG.FIELD_DELAY);
        }
        
        const element = context.locator(selector).first();
        const count = await element.count();
        
        if (count > 0) {
            // Standard select element found
            await context.selectOption(selector, String(value), { timeout: 5000 });
            logger.debug(`Selected dropdown: ${fieldName}`, { value });
            return;
        }
        
        // Not found, try alternative approaches for custom UI components
        logger.debug(`Standard select not found, trying custom UI approach: ${fieldName}`);
        
        // Extract field name from selector
        const fieldNameMatch = selector.match(/name="([^"]+)"/);
        const fieldId = fieldNameMatch ? fieldNameMatch[1] : null;
        
        if (!fieldId) {
            logger.warn(`Could not extract field ID from selector: ${selector}`);
            return;
        }
        
        // Try to find and click on custom select trigger (Flux UI pattern)
        // For ui-select components, the trigger is the text input, not the button
        const customSelectTriggers = [
            `ui-select#${fieldId} input[role="combobox"]`,
            `ui-select[name="${fieldId}"] input[role="combobox"]`,
            `button[data-flux-control="${fieldId}"]`,
            `[data-field="${fieldId}"] button`,
            `button[aria-controls*="${fieldId}"]`,
            `div[data-flux-text] button`, // Generic Flux button
        ];
        
        for (const triggerSelector of customSelectTriggers) {
            const trigger = context.locator(triggerSelector).first();
            if (await trigger.count() > 0) {
                logger.debug(`Found custom select trigger: ${triggerSelector}`);
                
                // Click to open dropdown
                await trigger.click();
                await context.waitForTimeout(500);
                
                // Wait for options container to be visible
                const optionsVisible = await context.locator('ui-options[role="listbox"]').isVisible().catch(() => false);
                if (!optionsVisible) {
                    logger.warn('Options container not visible after clicking trigger');
                }
                
                // Try to find and click the option by value attribute first
                const optionSelectors = [
                    `ui-option[value="${value}"]`,
                    `[role="option"][value="${value}"]`,
                    `[role="option"][data-value="${value}"]`,
                    `[role="option"]:has-text("${value}")`,
                    `li[data-value="${value}"]`,
                    `button:has-text("${value}")`,
                ];
                
                for (const optionSelector of optionSelectors) {
                    const option = context.locator(optionSelector).first();
                    if (await option.count() > 0) {
                        // Scroll into view if needed
                        await option.scrollIntoViewIfNeeded().catch(() => {});
                        await context.waitForTimeout(200);
                        
                        // Click the option
                        await option.click();
                        logger.debug(`Selected custom dropdown option: ${fieldName}`, { value });
                        await context.waitForTimeout(300);
                        return;
                    }
                }
                
                logger.warn(`Could not find option "${value}" in custom dropdown`);
                // Close dropdown by pressing Escape
                await context.keyboard.press('Escape');
                return;
            }
        }
        
        logger.warn(`Could not find dropdown (standard or custom): ${fieldName}, skipping`);
    } catch (error) {
        logger.warn(`Failed to select dropdown: ${fieldName}`, { selector, error: error.message });
        // Don't throw, just warn - some fields might be optional or handle differently
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
 * @param {Object} coverages - Coverage options to select
 */
export async function selectCoverages(context, coverages = {}) {
    logger.info('Selecting coverage options', { coverages });
    
    try {
        // Wait for coverage form to be ready
        await context.waitForTimeout(CONFIG.FIELD_DELAY || 500);
        
        // Available coverage checkboxes with exact field names from actual form
        const coverageFields = {
            cancellation_costs: 'input[type="checkbox"][name="cancellation_costs"]',
            cancellation_non_appearance: 'input[type="checkbox"][name="cancellation_non_appearance"]',
            cancellation_weather: 'input[type="checkbox"][name="cancellation_weather"]',
            cancellation_income: 'input[type="checkbox"][name="cancellation_income"]',
            liability: 'input[type="checkbox"][name="liability"]',
            equipment: 'input[type="checkbox"][name="equipment"]',
            money: 'input[type="checkbox"][name="money"]',
            accident: 'input[type="checkbox"][name="accident"]'
        };
        
        // Select coverages based on provided data
        for (const [fieldName, selector] of Object.entries(coverageFields)) {
            // Check if this coverage is requested (flexible matching)
            const shouldSelect = coverages[fieldName] || 
                                coverages[fieldName.replace(/_/g, '')] || 
                                (fieldName.includes('liability') && coverages.liability) ||
                                (fieldName.includes('accident') && coverages.accidents) ||
                                (fieldName.includes('cancellation') && coverages.cancellation);
            
            if (shouldSelect) {
                try {
                    const checkbox = context.locator(selector);
                    const count = await checkbox.count();
                    
                    if (count > 0) {
                        await checkbox.check({ timeout: 5000 });
                        logger.debug(`Checked coverage: ${fieldName}`);
                        
                        // Handle conditional sub-fields that appear when checkbox is checked
                        await handleConditionalFields(context, fieldName, coverages);
                        
                        // Add delay after handling conditional fields to slow down automation
                        await context.waitForTimeout(CONFIG.FIELD_DELAY || 500);
                    } else {
                        logger.warn(`Coverage checkbox not found: ${fieldName}`);
                    }
                } catch (error) {
                    logger.warn(`Failed to check coverage: ${fieldName}`, { error: error.message });
                }
            }
        }
        
        logger.info('Coverage selection completed');
    } catch (error) {
        logger.error('Coverage selection failed', { error: error.message });
        throw error;
    }
}

/**
 * Handles conditional sub-fields that appear when coverage checkbox is checked
 * @param {Page|Frame} context - The page or frame context
 * @param {string} coverageType - The coverage type that was checked
 * @param {Object} coverages - Coverage data including sub-field values
 */
async function handleConditionalFields(context, coverageType, coverages) {
    try {
        // Wait for conditional fields to appear (Alpine.js x-show)
        await context.waitForTimeout(300);
        
        switch (coverageType) {
            case 'cancellation_costs':
                // Budget field appears
                if (coverages.budget) {
                    await fillInput(context, 'input[name="budget"]', coverages.budget, 'Budget');
                    await context.waitForTimeout(CONFIG.FIELD_DELAY || 500);
                }
                break;
              
            case 'cancellation_income':
                // Income estimate field appears
                if (coverages.cancellation_income_estimate) {
                    await fillInput(context, 'input[name="cancellation_income_estimate"]', 
                                   coverages.cancellation_income_estimate, 'Income Estimate');
                    await context.waitForTimeout(CONFIG.FIELD_DELAY || 500);
                }
                break;
              
            case 'liability':
                // Radio buttons for liability amount appear
                if (coverages.higher_liability) {
                    const amount = coverages.higher_liability;
                    await context.locator(`input[name="higher_liability"][value="${amount}"]`).check();
                    logger.debug(`Selected liability amount: €${amount}`);
                    await context.waitForTimeout(CONFIG.FIELD_DELAY || 500);
                }
                break;
              
            case 'equipment':
                // Equipment value field appears
                if (coverages.equipment_value) {
                    await fillInput(context, 'input[name="equipment_value"]', 
                                   coverages.equipment_value, 'Equipment Value');
                    await context.waitForTimeout(CONFIG.FIELD_DELAY || 500);
                }
                break;
              
            case 'money':
                // Money value field appears
                if (coverages.money_value) {
                    await fillInput(context, 'input[name="money_value"]', 
                                   coverages.money_value, 'Money Value');
                    await context.waitForTimeout(CONFIG.FIELD_DELAY || 500);
                }
                break;
              
            case 'accident':
                // Multiple accident-related fields appear
                if (coverages.accident_man_days) {
                    await context.locator('select[name="accident_man_days"]')
                        .selectOption(coverages.accident_man_days);
                    logger.debug(`Selected accident man days: ${coverages.accident_man_days}`);
                    await context.waitForTimeout(CONFIG.FIELD_DELAY || 500);
                }
                if (coverages.accident_man_days_participants) {
                    await context.locator('select[name="accident_man_days_participants"]')
                        .selectOption(coverages.accident_man_days_participants);
                    logger.debug(`Selected accident participants: ${coverages.accident_man_days_participants}`);
                    await context.waitForTimeout(CONFIG.FIELD_DELAY || 500);
                }
                if (coverages.accident_man_days_participants_sport) {
                    await context.locator('input[name="accident_man_days_participants_sport"]').check();
                    logger.debug('Checked sport coverage for participants');
                    await context.waitForTimeout(CONFIG.FIELD_DELAY || 500);
                }
                break;
        }
    } catch (error) {
        logger.warn(`Failed to fill conditional fields for ${coverageType}`, { error: error.message });
        // Don't throw - conditional fields might not be needed
    }
}

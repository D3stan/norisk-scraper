import logger from '../utils/logger.js';
import { CONFIG } from '../config/constants.js';

/**
 * Gets the page object from context (handles Page, Frame, or Locator)
 */
function getPage(context) {
    // If context has a page() method (Locator), use it
    if (typeof context.page === 'function') {
        return context.page();
    }
    // If context has waitForTimeout (Page or Frame), it's already a page-like object
    if (typeof context.waitForTimeout === 'function') {
        return context;
    }
    throw new Error('Unable to get page from context');
}

/**
 * Fills a text input field
 * @param {Page|Frame|Locator} context - The page, frame, or locator context
 */
async function fillInput(context, selector, value, fieldName) {
    if (!value) {
        logger.debug(`Skipping empty field: ${fieldName}`);
        return;
    }
    
    try {
        // Add configurable delay before filling
        if (CONFIG.FIELD_DELAY > 0) {
            const page = getPage(context);
            await page.waitForTimeout(CONFIG.FIELD_DELAY);
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
            // For visible fields, use fill on the element
            await element.fill(String(value), { timeout: 5000 });
        }
        
        logger.debug(`Filled field: ${fieldName}`, { value });
    } catch (error) {
        logger.error(`Failed to fill field: ${fieldName}`, { selector, error: error.message });
        throw error;
    }
}

/**
 * Selects an option from a dropdown
 * @param {Page|Frame|Locator} context - The page, frame, or locator context
 */
async function selectDropdown(context, selector, value, fieldName) {
    if (!value) {
        logger.debug(`Skipping empty dropdown: ${fieldName}`);
        return;
    }
    
    try {
        // Add configurable delay before selecting
        if (CONFIG.FIELD_DELAY > 0) {
            const page = getPage(context);
            await page.waitForTimeout(CONFIG.FIELD_DELAY);
        }
        
        const element = context.locator(selector).first();
        const count = await element.count();
        
        if (count > 0) {
            // Standard select element found
            await element.selectOption(String(value), { timeout: 5000 });
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
                
                const page = getPage(context);
                
                // Click to open dropdown
                await trigger.click();
                await page.waitForTimeout(500);
                
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
                        const page = getPage(context);
                        // Scroll into view if needed
                        await option.scrollIntoViewIfNeeded().catch(() => {});
                        await page.waitForTimeout(200);
                        
                        // Click the option
                        await option.click();
                        logger.debug(`Selected custom dropdown option: ${fieldName}`, { value });
                        await page.waitForTimeout(300);
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
 * @param {Object} mappedData - The mapped form data
 * @param {Object} options - Options for filling
 * @param {boolean} options.skipPersonalDetails - Skip personal details (for pre-filled pages)
 */
export async function fillFormFields(context, mappedData, options = {}) {
    logger.info('Starting form field population', { skipPersonalDetails: options.skipPersonalDetails });

    try {
        // Step 1: Personal Details (skip if already pre-filled)
        if (!options.skipPersonalDetails) {
            logger.debug('Filling personal details section');
            await fillInput(context, CONFIG.SELECTORS.INITIALS, mappedData.initials, 'Initials');
            await fillInput(context, CONFIG.SELECTORS.PREPOSITION, mappedData.preposition, 'Preposition');
            await fillInput(context, CONFIG.SELECTORS.LAST_NAME, mappedData.last_name, 'Last Name');
            await fillInput(context, CONFIG.SELECTORS.PHONE, mappedData.phone, 'Phone');
            await fillInput(context, CONFIG.SELECTORS.EMAIL, mappedData.email, 'Email');
            await selectDropdown(context, CONFIG.SELECTORS.ROLE, mappedData.role, 'Role');
            
            // Handle conditional role fields (intermediary/proxy)
            await handleRoleConditionalFields(context, mappedData);
        } else {
            logger.info('Skipping personal details section (pre-filled)');
        }
        
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
 * @param {Page|Frame|Locator} context - The page, frame, or locator context
 * @param {Object} coverages - Coverage options to select
 */
export async function selectCoverages(context, coverages = {}) {
    logger.info('Selecting coverage options', { coverages });
    
    try {
        const page = getPage(context);
        // Wait for coverage form to be ready
        await page.waitForTimeout(CONFIG.FIELD_DELAY || 500);
        
        // Available coverage checkboxes with exact field names from actual form
        const coverageFields = CONFIG.SELECTORS.COVERAGE_CHECKBOXES;
        
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
                        await page.waitForTimeout(CONFIG.FIELD_DELAY || 500);
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
 * Handles conditional fields that appear based on role selection
 * @param {Page|Frame} context - The page or frame context
 * @param {Object} mappedData - The mapped form data
 */
async function handleRoleConditionalFields(context, mappedData) {
    const role = mappedData.role;
    
    // Only intermediary and proxy roles require additional fields
    if (role !== 'intermediary' && role !== 'proxy') {
        return;
    }
    
    try {
        const page = getPage(context);
        // Wait for conditional fields to appear (Alpine.js/Livewire)
        await page.waitForTimeout(300);
        
        // Fill company name
        if (mappedData.role_company) {
            await fillInput(context, CONFIG.SELECTORS.COMPANY_NAME, mappedData.role_company, 'Role Company Name');
        } else {
            logger.warn(`Company name not provided for role: ${role}`);
        }
        
        // Fill AFM/verification number
        if (mappedData.role_verification) {
            await fillInput(context, CONFIG.SELECTORS.AFM_NUMBER, mappedData.role_verification, 'AFM/Verification Number');
        } else {
            logger.warn(`Verification number not provided for role: ${role}`);
        }
        
        logger.debug(`Filled conditional fields for role: ${role}`);
    } catch (error) {
        logger.error(`Failed to fill role conditional fields for ${role}`, { error: error.message });
        // Don't throw - these might be optional in some scenarios
    }
}

/**
 * Handles conditional sub-fields that appear when coverage checkbox is checked
 * @param {Page|Frame|Locator} context - The page, frame, or locator context
 * @param {string} coverageType - The coverage type that was checked
 * @param {Object} coverages - Coverage data including sub-field values
 */
async function handleConditionalFields(context, coverageType, coverages) {
    logger.debug(`handleConditionalFields called for: ${coverageType}`);
    try {
        const page = getPage(context);
        // Wait for conditional fields to appear (Alpine.js x-show)
        await page.waitForTimeout(300);
        
        switch (coverageType) {
            case 'cancellation_costs':
                // Budget field appears
                if (coverages.budget) {
                    await fillInput(context, CONFIG.SELECTORS.CONDITIONAL_FIELDS.BUDGET, coverages.budget, 'Budget');
                    await page.waitForTimeout(CONFIG.FIELD_DELAY || 500);
                }
                break;
              
            case 'cancellation_income':
                // Income estimate field appears
                if (coverages.cancellation_income_estimate) {
                    await fillInput(context, CONFIG.SELECTORS.CONDITIONAL_FIELDS.INCOME_ESTIMATE, 
                                   coverages.cancellation_income_estimate, 'Income Estimate');
                    await page.waitForTimeout(CONFIG.FIELD_DELAY || 500);
                }
                break;
              
            case 'liability':
                logger.debug('Handling liability conditional fields');
                // Radio buttons for liability amount appear (€2.5M or €5M)
                // Default to 2500000 (€2.5M) if no amount specified
                const liabilityAmount = coverages.higher_liability || coverages.liability?.amount || '2500000';
                logger.debug(`Liability amount to select: ${liabilityAmount}`);
                if (liabilityAmount) {
                    // Try multiple selector patterns
                    const selectorsToTry = [
                        `${CONFIG.SELECTORS.CONDITIONAL_FIELDS.HIGHER_LIABILITY}[value="${liabilityAmount}"]`,
                        `input[name="higher_liability"][value="${liabilityAmount}"]`,
                        `input[type="radio"][name="higher_liability"][value="${liabilityAmount}"]`,
                        // Try without the amount filter to see if any radio exists
                        CONFIG.SELECTORS.CONDITIONAL_FIELDS.HIGHER_LIABILITY
                    ];

                    let found = false;
                    for (const selector of selectorsToTry) {
                        logger.debug(`Trying selector: ${selector}`);
                        const radio = context.locator(selector);
                        const radioCount = await radio.count();
                        logger.debug(`Found ${radioCount} elements`);

                        if (radioCount > 0) {
                            if (selector === CONFIG.SELECTORS.CONDITIONAL_FIELDS.HIGHER_LIABILITY) {
                                // Just logging what values exist
                                const values = await radio.evaluateAll(els => els.map(el => ({value: el.value, id: el.id, name: el.name})));
                                logger.debug('Available radio buttons:', values);
                            } else {
                                await radio.first().check();
                                logger.debug(`Selected liability amount: €${liabilityAmount}`);
                                found = true;
                                break;
                            }
                        }
                    }

                    if (!found) {
                        logger.warn(`Liability radio button not found for amount: ${liabilityAmount}`);
                    }
                    await page.waitForTimeout(CONFIG.FIELD_DELAY || 500);
                }
                break;
              
            case 'equipment':
                // Equipment value field appears
                if (coverages.equipment_value) {
                    await fillInput(context, CONFIG.SELECTORS.CONDITIONAL_FIELDS.EQUIPMENT_VALUE, 
                                   coverages.equipment_value, 'Equipment Value');
                    await page.waitForTimeout(CONFIG.FIELD_DELAY || 500);
                }
                break;
              
            case 'money':
                // Money value field appears
                if (coverages.money_value) {
                    await fillInput(context, CONFIG.SELECTORS.CONDITIONAL_FIELDS.MONEY_VALUE, 
                                   coverages.money_value, 'Money Value');
                    await page.waitForTimeout(CONFIG.FIELD_DELAY || 500);
                }
                break;
              
            case 'accident':
                // Multiple accident-related fields appear inside an Alpine.js x-show div.
                // We must wait for each select to be visible before interacting,
                // because Alpine.js processes the checkbox change asynchronously.
                if (coverages.accident_man_days) {
                    const manDaysSelect = context.locator(CONFIG.SELECTORS.CONDITIONAL_FIELDS.ACCIDENT_MAN_DAYS).first();
                    await manDaysSelect.waitFor({ state: 'visible', timeout: 10000 });
                    await manDaysSelect.selectOption(String(coverages.accident_man_days), { timeout: 5000 });
                    logger.debug(`Selected accident man days: ${coverages.accident_man_days}`);
                    await page.waitForTimeout(CONFIG.FIELD_DELAY || 500);
                }
                if (coverages.accident_man_days_participants) {
                    const participantsSelect = context.locator(CONFIG.SELECTORS.CONDITIONAL_FIELDS.ACCIDENT_PARTICIPANTS).first();
                    await participantsSelect.waitFor({ state: 'visible', timeout: 10000 });
                    await participantsSelect.selectOption(String(coverages.accident_man_days_participants), { timeout: 5000 });
                    logger.debug(`Selected accident participants: ${coverages.accident_man_days_participants}`);
                    await page.waitForTimeout(CONFIG.FIELD_DELAY || 500);
                }
                if (coverages.accident_man_days_participants_sport) {
                    await context.locator(CONFIG.SELECTORS.CONDITIONAL_FIELDS.ACCIDENT_SPORT).check();
                    logger.debug('Checked sport coverage for participants');
                    await page.waitForTimeout(CONFIG.FIELD_DELAY || 500);
                }
                break;
        }
    } catch (error) {
        logger.warn(`Failed to fill conditional fields for ${coverageType}`, { error: error.message });
        // Don't throw - conditional fields might not be needed
    }
}

/**
 * Fills guest information page for cancellation_non_appearance
 * @param {Page|Frame} context - The page or frame context
 * @param {Array} guests - Array of guest objects with name, birthdate, artist fields
 */
export async function fillGuestInfoPage(context, guests = []) {
    if (!guests || guests.length === 0) {
        logger.warn('No guests provided for cancellation_non_appearance page');
        return;
    }
    
    logger.info(`Filling guest information for ${guests.length} guest(s)`);
    
    try {
        // Wait for the first guest name field to be visible
        await context.locator('input[type="text"][name="cancellation_non_appearance[0][name]"]').waitFor({
            timeout: 5000,
            state: 'visible'
        });
        
        for (let i = 0; i < guests.length; i++) {
            const guest = guests[i];
            logger.debug(`Filling guest ${i + 1}`, { name: guest.name });
            
            // Fill guest name
            if (guest.name) {
                const nameSelector = CONFIG.SELECTORS.GUEST_FIELDS.GUEST_NAME(i);
                await fillInput(context, nameSelector, guest.name, `Guest ${i + 1} Name`);
            }
            
            // Fill guest birthdate (DD-MM-YYYY format)
            if (guest.birthdate) {
                const birthdateSelector = CONFIG.SELECTORS.GUEST_FIELDS.GUEST_BIRTHDATE(i);
                await fillInput(context, birthdateSelector, guest.birthdate, `Guest ${i + 1} Birthdate`);
            }
            
            // Check artist checkbox if applicable
            if (guest.artist) {
                const artistSelector = CONFIG.SELECTORS.GUEST_FIELDS.GUEST_ARTIST(i);
                const checkbox = context.locator(artistSelector);
                if (await checkbox.count() > 0) {
                    await checkbox.check();
                    logger.debug(`Checked artist checkbox for guest ${i + 1}`);
                }
            }
            
            // If there are more guests, click "Add Person" button
            if (i < guests.length - 1) {
                logger.debug('Clicking "Add Person" button');
                const addButton = context.locator(CONFIG.SELECTORS.GUEST_FIELDS.ADD_PERSON_BUTTON).last();
                if (await addButton.count() > 0) {
                    await addButton.click();
                    
                    // Wait for the next guest's name field to appear
                    const nextGuestSelector = CONFIG.SELECTORS.GUEST_FIELDS.GUEST_NAME(i + 1);
                    await context.locator(nextGuestSelector).waitFor({
                        timeout: 5000,
                        state: 'visible'
                    });
                    logger.debug(`Guest ${i + 2} fields appeared`);
                } else {
                    logger.warn('Add Person button not found');
                }
            }
        }
        
        logger.info('Guest information filled successfully');
    } catch (error) {
        logger.error('Failed to fill guest information', { error: error.message, stack: error.stack });
        throw error;
    }
}

/**
 * Fills the "Your Details" form on the proposal page
 * @param {Page|Frame} context - The page or frame context
 * @param {Object} mappedData - The mapped form data
 */
export async function fillProposalForm(context, mappedData) {
    logger.info('Starting "Your Details" form population');
    
    try {
        // ========================================
        // STEP 1: Fill Personal Details (NEW FLOW)
        // ========================================
        // In the new flow, "Your Details" page contains personal information fields
        // that were previously pre-filled in "About the Event" page
        logger.debug('Checking for personal details fields on Your Details page');
        
        // Check if personal detail fields exist on this page
        const hasPersonalFields = await context.locator(CONFIG.SELECTORS.INITIALS).count() > 0;
        
        if (hasPersonalFields) {
            logger.debug('Personal details fields detected, filling them');
            
            // Fill personal information
            await fillInput(context, CONFIG.SELECTORS.INITIALS, mappedData.initials, 'Initials');
            
            // Preposition is optional
            if (mappedData.preposition) {
                await fillInput(context, CONFIG.SELECTORS.PREPOSITION, mappedData.preposition, 'Preposition');
            }
            
            await fillInput(context, CONFIG.SELECTORS.LAST_NAME, mappedData.last_name, 'Last Name');
            await fillInput(context, CONFIG.SELECTORS.PHONE, mappedData.phone, 'Phone');
            await fillInput(context, CONFIG.SELECTORS.EMAIL, mappedData.email, 'Email');
            
            logger.info('Personal details filled on Your Details page');
        }
        
        // ========================================
        // STEP 2: Check for Business Type Radio (if present)
        // ========================================
        // Wait for the business type radio buttons to be available (if they exist)
        logger.debug('Checking for business type radio buttons...');
        const hasBusinessType = await context.locator('input[type="radio"][name="is_business"]').count() > 0;
        
        if (hasBusinessType) {
            logger.debug('Business type radio buttons found');
            
            logger.debug('Selecting business type', { isBusiness: mappedData.is_business });
            
            if (mappedData.is_business === true || mappedData.is_business === 1 || mappedData.is_business === '1') {
                await context.locator(CONFIG.SELECTORS.YOUR_DETAILS.IS_BUSINESS_YES).check();
                logger.debug('Selected business entity');
            } else {
                await context.locator(CONFIG.SELECTORS.YOUR_DETAILS.IS_BUSINESS_NO).check();
                logger.debug('Selected individual entity');
            }
            
            // Wait for conditional fields to appear
            await getPage(context).waitForTimeout(500);
            
            // ========================================
            // STEP 3: Fill Common Address Fields
            // ========================================
            logger.debug('Filling common address fields');
            
            await fillInput(context, CONFIG.SELECTORS.YOUR_DETAILS.ADDRESS, mappedData.address, 'Address');
            await fillInput(context, CONFIG.SELECTORS.YOUR_DETAILS.HOUSE_NUMBER, mappedData.house_number, 'House Number');
            await fillInput(context, CONFIG.SELECTORS.YOUR_DETAILS.ZIPCODE, mappedData.zipcode, 'Zipcode');
            await fillInput(context, CONFIG.SELECTORS.YOUR_DETAILS.CITY, mappedData.city, 'City');
            
            // Country selector (custom UI component)
            await selectDropdown(context, CONFIG.SELECTORS.YOUR_DETAILS.COUNTRY, mappedData.country, 'Country');
            
            // ========================================
            // STEP 4: Fill Conditional Fields (Business/Individual)
            // ========================================
            if (mappedData.is_business === true || mappedData.is_business === 1 || mappedData.is_business === '1') {
                logger.debug('Filling business-specific fields');
                
                await fillInput(context, CONFIG.SELECTORS.YOUR_DETAILS.COMPANY_NAME, mappedData.company_name, 'Company Name');
                await fillInput(context, CONFIG.SELECTORS.YOUR_DETAILS.COMPANY_COMMERCIAL_NUMBER, mappedData.company_commercial_number, 'Commercial Number');
                
                // DUNS number is optional
                if (mappedData.company_duns_number) {
                    await fillInput(context, CONFIG.SELECTORS.YOUR_DETAILS.COMPANY_DUNS_NUMBER, mappedData.company_duns_number, 'DUNS Number');
                }
                
                // Legal form dropdown
                await selectDropdown(context, CONFIG.SELECTORS.YOUR_DETAILS.COMPANY_LEGAL_FORM, mappedData.company_legal_form, 'Legal Form');
                
            } else {
                logger.debug('Filling individual-specific fields');
                
                // Birthdate for individual
                await fillInput(context, CONFIG.SELECTORS.YOUR_DETAILS.BIRTHDATE, mappedData.birthdate, 'Birthdate');
            }
        }
        
        logger.info('"Your Details" form filled successfully');
    } catch (error) {
        logger.error('Failed to fill "Your Details" form', { error: error.message, stack: error.stack });
        throw error;
    }
}

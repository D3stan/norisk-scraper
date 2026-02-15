import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

export const CONFIG = {
    // URLs
    BASE_URL: process.env.TARGET_URL || 'https://google.com',
    
    // Timeouts (milliseconds)
    DEFAULT_TIMEOUT: parseInt(process.env.TIMEOUT) || 30000,
    NAVIGATION_TIMEOUT: 60000,
    
    // Playwright Options
    HEADLESS: process.env.HEADLESS === 'true',
    SLOW_MO: parseInt(process.env.SLOW_MO) || 0,
    FIELD_DELAY: parseInt(process.env.FIELD_DELAY) || 0,
    
    // Form Selectors
    SELECTORS: {
        // CSRF Token
        TOKEN: 'input[name="_token"]',

        // Step 1: Personal Details
        INITIALS: 'input[name="initials"]',
        PREPOSITION: 'input[name="preposition"]',
        LAST_NAME: 'input[name="last_name"]',
        PHONE: 'input[name="phone"]',
        EMAIL: 'input[name="email"]',
        ROLE: 'select[name="data[role]"]',
        COMPANY_NAME: 'input[name="data[role_company]"]',
        AFM_NUMBER: 'input[name="data[role_verification]"]',
      
        // Step 2: Event Details
        EVENT_NAME: 'input[name="title"]',
        EVENT_TYPE: 'select[name="type"]',
        START_DATE: 'input[name="start"]',
        DAYS: 'input[name="days"]',
        VISITORS: 'input[name="visitors"]',
        DESCRIPTION: 'textarea[name="description"]',

        // Step 3: Location
        VENUE_DESCRIPTION: 'textarea[name="venue_description"]',
        ADDRESS: 'input[name="address"]',
        HOUSE_NUMBER: 'input[name="house_number"]',
        ZIPCODE: 'input[name="zipcode"]',
        CITY: 'input[name="city"]',
        REGION: 'select[name="region"]',
        ENVIRONMENT: 'select[name="environment"]',

        // Submit Button
        SUBMIT_BUTTON: 'button[type="submit"]',

        // Coverage Page (Step 2 in workflow)
        COVERAGE_NEXT: 'button[type="submit"]', // Button to proceed to proposal

        // Coverage Checkboxes
        COVERAGE_CHECKBOXES: {
            cancellation_costs: 'input[type="checkbox"][name="cancellation_costs"]',
            cancellation_non_appearance: 'input[type="checkbox"][name="cancellation_non_appearance"]',
            cancellation_weather: 'input[type="checkbox"][name="cancellation_weather"]',
            cancellation_income: 'input[type="checkbox"][name="cancellation_income"]',
            liability: 'input[type="checkbox"][name="liability"]',
            equipment: 'input[type="checkbox"][name="equipment"]',
            money: 'input[type="checkbox"][name="money"]',
            accident: 'input[type="checkbox"][name="accident"]'
        },
    },

    // Expected URL Patterns
    URL_PATTERNS: {
        INITIAL_FORM: /event-int/,
        COVERAGES: /coverages/,
        PROPOSAL: /proposal/,
    }
};

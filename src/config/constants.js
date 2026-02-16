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

        // Conditional Fields (Step 2)
        CONDITIONAL_FIELDS: {
            BUDGET: 'input[name="budget"]',
            INCOME_ESTIMATE: 'input[name="cancellation_income_estimate"]',
            HIGHER_LIABILITY: 'input[name="higher_liability"]',
            EQUIPMENT_VALUE: 'input[name="equipment_value"]',
            MONEY_VALUE: 'input[name="money_value"]',
            ACCIDENT_MAN_DAYS: 'select[name="accident_man_days"]',
            ACCIDENT_PARTICIPANTS: 'select[name="accident_man_days_participants"]',
            ACCIDENT_SPORT: 'input[type="checkbox"][name="accident_man_days_participants_sport"]'
        },

        // Guest Info Page (for cancellation_non_appearance)
        GUEST_FIELDS: {
            GUEST_NAME: (index) => `input[type="text"][name="cancellation_non_appearance[${index}][name]"]`,
            GUEST_BIRTHDATE: (index) => `input[type="text"][name="cancellation_non_appearance[${index}][birthdate]"]`,
            GUEST_ARTIST: (index) => `input[type="checkbox"][name="cancellation_non_appearance[${index}][artist]"]`,
            ADD_PERSON_BUTTON: 'button[type="button"]'
        },

        // Your Proposal Page (Price Quote)
        PROPOSAL_PRICE: {
            SUM_EXCL: 'text="Sum excl."',
            POLICY_COSTS: 'text="Policy costs"',
            INSURANCE_TAX: 'text="Insurance tax"',
            TO_PAY: 'text="To pay"',
            // This is an <a> link, not a button - click it to proceed to "Your Details" (email) page
            QUOTE_EMAIL_LINK: 'a:has-text("Quote via email")'
        },

        // Your Details Page (Step 4 - Final Form)
        YOUR_DETAILS: {
            // Business type radio
            IS_BUSINESS_YES: 'input[type="radio"][name="is_business"][value="1"]',
            IS_BUSINESS_NO: 'input[type="radio"][name="is_business"][value="0"]',
            
            // Common fields (both business and individual)
            ADDRESS: 'input[type="text"][name="address"]',
            HOUSE_NUMBER: 'input[type="text"][name="house_number"]',
            ZIPCODE: 'input[type="text"][name="zipcode"]',
            CITY: 'input[type="text"][name="city"]',
            COUNTRY: 'ui-select#region input[role="combobox"]',
            
            // Business-specific fields
            COMPANY_NAME: 'input[type="text"][name="company_name"]',
            COMPANY_COMMERCIAL_NUMBER: 'input[type="text"][name="company_commercial_number"]',
            COMPANY_DUNS_NUMBER: 'input[type="text"][name="company_duns_number"]',
            COMPANY_LEGAL_FORM: 'select[name="company_legal_form"]',
            
            // Individual-specific fields
            BIRTHDATE: 'input[type="text"][name="birthdate"]',
            
            // Submit button
            SUBMIT: 'button[type="submit"]'
        },
    },

    // Expected URL Patterns
    URL_PATTERNS: {
        INITIAL_FORM: /event-int/,
        COVERAGES: /coverages/,
        PROPOSAL: /proposal/,
    }
};

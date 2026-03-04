#!/usr/bin/env node
/**
 * Test script for the NoRisk Scraper API
 * Pushes test data to the deployed app similar to the WordPress debug panel
 *
 * Usage:
 *   node scripts/test-api.js [command] [options]
 *
 * Commands:
 *   quote       Submit a quote request (default)
 *   status      Check status of a quote
 *   send        Send quote PDF to user
 *   health      Check server health
 *
 * Examples:
 *   node scripts/test-api.js quote                    # Submit minimal quote
 *   node scripts/test-api.js quote --full             # Submit quote with all coverages
 *   node scripts/test-api.js quote --url http://api.example.com
 *   node scripts/test-api.js status --key ABC-123
 *   node scripts/test-api.js send --key ABC-123
 */

import dotenv from 'dotenv';
dotenv.config();

const API_URL = (process.env.API_URL || 'http://localhost:3000').replace(/\/api$/, '');

// ANSI color codes for output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

function log(title, data = null, type = 'info') {
    const color = type === 'error' ? colors.red : type === 'success' ? colors.green : colors.blue;
    console.log(`${color}${colors.bright}[${title}]${colors.reset}`, data ? '' : '');
    if (data) {
        if (typeof data === 'object') {
            console.log(JSON.stringify(data, null, 2));
        } else {
            console.log(data);
        }
    }
}

function logSection(title) {
    console.log(`\n${colors.cyan}${colors.bright}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.cyan}${colors.bright}  ${title}${colors.reset}`);
    console.log(`${colors.cyan}${colors.bright}${'='.repeat(60)}${colors.reset}\n`);
}

// Minimal test data (similar to debug panel "Fill Fields")
const minimalTestData = {
    initials: 'Sig.',
    lastName: 'Rossi Mario',
    phone: '+39 0547 22351',
    email: 'mario.rossi@example.com',
    eventName: 'Concerto Test',
    eventType: '18', // Festival / Concerto
    startDate: getFutureDate(30), // 30 days from now
    days: 1,
    visitors: 500,
    description: 'Concerto di test per verifica API',
    venueDescription: 'Piazza principale',
    address: 'Via Roma',
    houseNumber: '1',
    zipcode: '00186',
    city: 'Roma',
    country: 'it',
    environment: 'outdoor',
    coverages: {
        liability: true
    }
};

// Full test data with all coverages (similar to debug panel mock data)
const fullTestData = {
    initials: 'Sig.',
    lastName: 'Ferri Paolo',
    phone: '054722351',
    email: 'paolo.ferri@example.com',
    role: 'event_organiser',

    // Business info
    isBusiness: true,
    company_name: 'Pro Loco Futuro',
    company_commercial_number: 'IT02394019203',
    company_legal_form: 'association',
    company_address: 'Via Roma',
    company_house_number: '3',
    company_zipcode: '47653',
    company_city: 'Cesena',
    company_country: 'it',

    // Event info
    eventName: 'Notte Bianca Festival',
    eventType: '18', // Festival / Concerto
    startDate: getFutureDate(45),
    days: 3,
    visitors: 2350,
    description: 'Festival musicale con concerti live, food trucks e aree relax',

    // Location
    venueDescription: 'Piazza principale e parco adiacente',
    address: 'Piazza Verdi',
    houseNumber: '3',
    zipcode: '47521',
    city: 'Cesena',
    country: 'it',
    environment: 'outdoor',

    // Coverages
    coverages: {
        // Cancellation
        cancellation_costs: true,
        budget: '20000',
        cancellation_weather: true,
        cancellation_non_appearance: false,
        cancellation_income: true,
        cancellation_income_estimate: '15000',

        // Liability
        liability: true,
        higher_liability: '5000000',

        // Equipment
        equipment: true,
        equipment_value: '25000',

        // Money
        money: true,
        money_value: '5000',

        // Accidents
        accident: true,
        accident_man_days: '1-50',
        accident_man_days_participants: '251-500',
        accident_man_days_participants_sport: false
    }
};

function getFutureDate(daysFromNow) {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString().split('T')[0];
}

async function submitQuote(useFullData = false) {
    logSection('SUBMIT QUOTE REQUEST');

    const data = useFullData ? fullTestData : minimalTestData;

    log('API Endpoint', `${API_URL}/api/quote`);
    log('Using Data', useFullData ? 'FULL (all coverages)' : 'MINIMAL (liability only)');
    log('Payload', data);

    const startTime = Date.now();

    try {
        const response = await fetch(`${API_URL}/api/quote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const duration = Date.now() - startTime;
        const result = await response.json();

        log('Response Time', `${duration}ms`);
        log('Status Code', response.status);

        if (response.ok && result.success) {
            log('SUCCESS', null, 'success');
            log('Quote Key', result.quoteKey);
            log('Status', result.status);

            if (result.pricing) {
                logSection('PRICING DETAILS');
                Object.entries(result.pricing).forEach(([key, value]) => {
                    log(key, value);
                });
            }

            if (result.proposalUrl) {
                log('Proposal URL', result.proposalUrl);
            }

            if (result.pdfPath) {
                log('PDF Path', result.pdfPath);
            }

            return result.quoteKey;
        } else {
            log('FAILED', null, 'error');
            log('Error', result.error || result.message || 'Unknown error', 'error');
            if (result.errors) {
                log('Validation Errors', result.errors, 'error');
            }
            return null;
        }
    } catch (error) {
        log('ERROR', null, 'error');
        log('Message', error.message, 'error');

        if (error.message.includes('ECONNREFUSED')) {
            log('Hint', `Is the server running at ${API_URL}?`, 'error');
        }
        return null;
    }
}

async function checkQuoteStatus(quoteKey) {
    logSection('CHECK QUOTE STATUS');

    if (!quoteKey) {
        log('ERROR', 'Quote key is required. Use --key <QUOTE_KEY>', 'error');
        return;
    }

    log('API Endpoint', `${API_URL}/api/quote/${quoteKey}/status`);
    log('Quote Key', quoteKey);

    try {
        const response = await fetch(`${API_URL}/api/quote/${quoteKey}/status`);
        const result = await response.json();

        if (response.ok && result.success) {
            log('SUCCESS', null, 'success');
            log('Status', result.status);
            log('Has PDF', result.hasPdf ? 'Yes' : 'No');
            log('Created At', result.createdAt);
            log('Updated At', result.updatedAt);
        } else {
            log('FAILED', null, 'error');
            log('Error', result.error || 'Unknown error', 'error');
        }
    } catch (error) {
        log('ERROR', error.message, 'error');
    }
}

async function sendQuoteToUser(quoteKey) {
    logSection('SEND QUOTE TO USER');

    if (!quoteKey) {
        log('ERROR', 'Quote key is required. Use --key <QUOTE_KEY>', 'error');
        return;
    }

    log('API Endpoint', `${API_URL}/api/quote/send`);
    log('Quote Key', quoteKey);

    try {
        const response = await fetch(`${API_URL}/api/quote/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ quoteKey })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            log('SUCCESS', null, 'success');
            log('Message', result.message);
            log('Sent To', result.sentTo);
        } else {
            log('FAILED', null, 'error');
            log('Error', result.error || result.message || 'Unknown error', 'error');
        }
    } catch (error) {
        log('ERROR', error.message, 'error');
    }
}

async function checkHealth() {
    logSection('SERVER HEALTH CHECK');

    log('API Endpoint', `${API_URL}/health`);

    try {
        const response = await fetch(`${API_URL}/health`);
        const result = await response.json();

        log('Status', result.status === 'ok' ? 'OK' : 'DEGRADED',
            result.status === 'ok' ? 'success' : 'error');
        log('Environment', result.env || 'unknown');
        log('Protocol', result.protocol);
        log('Secure', result.secure ? 'Yes' : 'No');
    } catch (error) {
        log('ERROR', `Cannot connect to ${API_URL}`, 'error');
        log('Message', error.message, 'error');
    }
}

function showHelp() {
    console.log(`
${colors.cyan}${colors.bright}NoRisk Scraper API Test Script${colors.reset}

${colors.yellow}Usage:${colors.reset}
  node scripts/test-api.js [command] [options]

${colors.yellow}Commands:${colors.reset}
  quote       Submit a quote request (default)
  status      Check status of a quote
  send        Send quote PDF to user
  health      Check server health

${colors.yellow}Options:${colors.reset}
  --full          Use full test data with all coverages
  --key <KEY>     Specify quote key for status/send commands
  --url <URL>     Override API URL (default: http://localhost:3000)
  --help          Show this help message

${colors.yellow}Environment Variables:${colors.reset}
  API_URL         Base URL for the API

${colors.yellow}Examples:${colors.reset}
  # Submit a minimal quote
  node scripts/test-api.js quote

  # Submit a full quote with all coverages
  node scripts/test-api.js quote --full

  # Check status of a quote
  node scripts/test-api.js status --key ABC-123-XYZ

  # Send quote PDF to user
  node scripts/test-api.js send --key ABC-123-XYZ

  # Use custom API URL
  node scripts/test-api.js quote --url https://api.example.com
`);
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0] || 'quote';

// Handle help
if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
}

// Parse flags
const useFullData = args.includes('--full');
const keyIndex = args.indexOf('--key');
const quoteKey = keyIndex !== -1 ? args[keyIndex + 1] : null;
const urlIndex = args.indexOf('--url');
if (urlIndex !== -1) {
    process.env.API_URL = args[urlIndex + 1];
}

// Execute command
switch (command) {
    case 'quote':
        submitQuote(useFullData).then(key => {
            if (key) {
                console.log(`\n${colors.green}Next steps:${colors.reset}`);
                console.log(`  Check status: node scripts/test-api.js status --key ${key}`);
                console.log(`  Send email:   node scripts/test-api.js send --key ${key}`);
            }
            process.exit(0);
        });
        break;

    case 'status':
        checkQuoteStatus(quoteKey).then(() => process.exit(0));
        break;

    case 'send':
        sendQuoteToUser(quoteKey).then(() => process.exit(0));
        break;

    case 'health':
        checkHealth().then(() => process.exit(0));
        break;

    default:
        log('ERROR', `Unknown command: ${command}`, 'error');
        console.log('Run with --help for usage information');
        process.exit(1);
}

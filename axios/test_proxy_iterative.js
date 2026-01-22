// test_proxy_iterative.js
const https = require('https');
const querystring = require('querystring');

// Configuration
const CONFIG = {
    hostname: 'verzekeren.norisk.eu',
    path: '/en/embed/product/event-int?key=73c7fe1a-5b9c-48bc-870d-61315d03a30c',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

// Global Session State
let session = {
    cookies: [],
    csrfToken: '',
    currentPath: CONFIG.path
};

// --- Helper Functions ---

function log(emoji, title, details = '') {
    console.log(`
${emoji} [${title}]`);
    if (details) console.log(`   ${details}`);
}

function updateCookies(headers) {
    if (headers['set-cookie']) {
        // Extract the cookie key=value part only
        const newCookies = headers['set-cookie'].map(c => c.split(';')[0]);
        // Merge with existing (simplified logic)
        session.cookies = [...session.cookies, ...newCookies]; 
        log('🍪', 'Updated Cookies', `${session.cookies.length} cookies active`);
    }
}

function extractToken(html) {
    const match = html.match(/name="_token" value="([^"]+)"/);
    if (match && match[1]) {
        session.csrfToken = match[1];
        log('🔑', 'Extracted CSRF Token', `${session.csrfToken.substring(0, 15)}...`);
        return true;
    }
    return false;
}

function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: CONFIG.hostname,
            path: path,
            method: method,
            headers: {
                'User-Agent': CONFIG.userAgent,
                'Cookie': session.cookies.join('; '),
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            }
        };

        if (data) {
            options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
            options.headers['Content-Length'] = Buffer.byteLength(data);
        }

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                updateCookies(res.headers);
                resolve({
                    statusCode: res.statusCode, 
                    headers: res.headers, 
                    body: body 
                });
            });
        });

        req.on('error', (e) => reject(e));
        if (data) req.write(data);
        req.end();
    });
}

// --- Main Flow ---

async function runFlow() {
    try {
        // ==========================================
        // 1. INITIALIZE (GET the Form)
        // ==========================================
        log('🚀', 'STEP 1: Initialization', `Fetching ${CONFIG.path}...`);
        const initResponse = await makeRequest('GET', CONFIG.path);
        
        if (!extractToken(initResponse.body)) {
            throw new Error('Failed to find initial CSRF token.');
        }

        // ==========================================
        // 2. SUBMIT DETAILS (POST Step 1)
        // ==========================================
        log('📝', 'STEP 2: Submitting Event Details', 'Sending Italian payload...');

        // Plausible Data
        const postData = querystring.stringify({
            '_token': session.csrfToken,
            // Personal
            'initials': 'M.R.',
            'preposition': '',
            'last_name': 'Rossi',
            'phone': '+393331234567',
            'email': 'mario.rossi.test@example.com',
            'data[role]': 'event_organiser',
            // Event
            'title': 'Grande Festa Aziendale Roma',
            'type': '17', // "Party"
            'start': '2026-08-15', // Future date
            'days': '2',
            'visitors': '150',
            'description': 'Festa annuale per dipendenti e partner.',
            // Location
            'venue_description': 'Centro Congressi Hotel Plaza',
            'address': 'Via del Corso',
            'house_number': '10',
            'zipcode': '00186',
            'city': 'Roma',
            'region': 'it', // Try IT code
            'environment': 'indoor'
        });

        const postResponse = await makeRequest('POST', CONFIG.path, postData);

        if (postResponse.statusCode === 302) {
            log('✅', 'Submission Accepted', `Server redirected to: ${postResponse.headers.location}`);
        } else {
            log('❌', 'Submission Failed', `Status: ${postResponse.statusCode}`);
            // Log snippet of error if any
            console.log(postResponse.body.substring(0, 500));
            return;
        }

        // ==========================================
        // 3. FOLLOW REDIRECT (GET Step 2)
        // ==========================================
        // The server redirects us to the NEXT step (usually Coverage/Premium calculation)
        const nextPath = postResponse.headers.location.replace('https://verzekeren.norisk.eu', '');
        log('🔄', 'STEP 3: Following Redirect', `Going to ${nextPath}...`);

        const step2Response = await makeRequest('GET', nextPath);

        // ==========================================
        // 4. ANALYZE STEP 2 (What are we looking at?)
        // ==========================================
        log('🕵️', 'STEP 4: Analyzing Result Page');
        
        // Check for specific keywords that confirm we progressed
        const hasPremium = step2Response.body.toLowerCase().includes('premium');
        const hasCoverage = step2Response.body.toLowerCase().includes('coverage');
        const hasStep2 = step2Response.body.includes('Step 2') || step2Response.body.includes('What to cover');

        if (hasStep2 || hasCoverage) {
            log('🎉', 'SUCCESS! We are on Step 2.', 'The server accepted our data and served the Coverage options.');
            
            // Extract next possible actions
            // (In a real app, you would parse these inputs to build your Italian "Step 2" form)
            const inputMatches = step2Response.body.match(/name="([^"]+)"/g) || [];
            const uniqueInputs = [...new Set(inputMatches.map(s => s.replace('name="', '').replace('"', '')))];
            
            log('📋', 'Available Fields on Step 2:', uniqueInputs.join(', '));
        } else {
            log('⚠️', 'Warning', 'We landed on a page, but it might be an error page or the same page.');
            console.log('Page Title snippet:', step2Response.body.match(/<title>(.*?)<\/title>/)?.[1]);
        }

    } catch (error) {
        log('💥', 'CRITICAL ERROR', error.message);
        console.error(error);
    }
}

runFlow();

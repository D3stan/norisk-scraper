// test_proxy_advanced.js
const https = require('https');
const querystring = require('querystring');

// Configuration
const CONFIG = {
    hostname: 'verzekeren.norisk.eu',
    path: '/en/embed/product/event-int?key=73c7fe1a-5b9c-48bc-870d-61315d03a30c',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

// Advanced Cookie Jar (Map ensures no duplicates)
const cookieJar = new Map();

// --- Helper Functions ---

function log(emoji, title, details = '') {
    console.log(`
${emoji} [${title}]`);
    if (details) console.log(`   ${details}`);
}

function updateCookies(headers) {
    if (headers['set-cookie']) {
        headers['set-cookie'].forEach(cookieStr => {
            const parts = cookieStr.split(';');
            const [key, value] = parts[0].split('=');
            if (key && value) {
                cookieJar.set(key.trim(), value.trim());
            }
        });
        log('🍪', 'Cookie Jar Updated', `${cookieJar.size} cookies stored`);
    }
}

function getCookieHeader() {
    return Array.from(cookieJar).map(([k, v]) => `${k}=${v}`).join('; ');
}

function extractToken(html) {
    const match = html.match(/name="_token" value="([^"]+)"/);
    return match ? match[1] : null;
}

function checkForErrors(html) {
    // Common Laravel/Tailwind error classes
    const errorMatches = html.match(/<p class="[^"]*text-red-[^"]*">([^<]+)<\/p>/g) || 
                         html.match(/<div class="[^"]*text-red-[^"]*">([^<]+)<\/div>/g) ||
                         html.match(/<span class="[^"]*error[^"]*">([^<]+)<\/span>/g);
    
    if (errorMatches) {
        log('⚠️', 'Validation Errors Detected', errorMatches.map(e => e.replace(/<[^>]+>/g, '').trim()).join('\n   - '));
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
                'Cookie': getCookieHeader(),
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Referer': `https://${CONFIG.hostname}${CONFIG.path}`,
                'Origin': `https://${CONFIG.hostname}`
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

const fs = require('fs');

// --- Main Flow ---

async function runFlow() {
    try {
        // 1. GET Request
        log('🚀', 'STEP 1: Initialization');
        const initResponse = await makeRequest('GET', CONFIG.path);
        const csrfToken = extractToken(initResponse.body);
        
        if (!csrfToken) throw new Error('Could not find CSRF token');
        log('🔑', 'Token Acquired', csrfToken.substring(0, 10) + '...');

        // 2. POST Request
        log('📝', 'STEP 2: Submitting Data');
        
        // Note: I reformatted the date to YYYY-MM-DD which is standard for HTML5 date inputs
        const postData = querystring.stringify({
            '_token': csrfToken,
            'initials': 'M.R.',
            'preposition': '',
            'last_name': 'Rossi',
            'phone': '+393331234567',
            'email': 'marrossi@gmail.com',
            'data[role]': 'event_organiser',
            'title': 'Festa Roma',
            'type': '17', // Party
            'start': '2026-08-15', // YYYY-MM-DD
            'days': '2',
            'visitors': '150',
            'description': 'Festa privata',
            'venue_description': 'Hotel',
            'address': 'Via Roma',
            'house_number': '10',
            'zipcode': '1012AB', // Valid Dutch Zip to be safe
            'city': 'Amsterdam',
            'region': 'nl ', // Note the space! 
            'environment': 'indoor'
        });

        const postResponse = await makeRequest('POST', CONFIG.path, postData);

        // 3. Handle Redirect
        if (postResponse.statusCode === 302) {
            const redirectUrl = postResponse.headers.location;
            log('✅', 'Redirect Received', redirectUrl);
            
            const nextPath = redirectUrl.replace('https://verzekeren.norisk.eu', '');
            
            // 4. Fetch Next Page
            log('🔄', 'STEP 3: Loading Next Page');
            const step2 = await makeRequest('GET', nextPath);
            
            // WRITE DEBUG FILE
            fs.writeFileSync('debug_step2.html', step2.body);
            log('💾', 'Debug File Saved', 'Check debug_step2.html to see what the server returned.');
            
            // 5. Deep Inspection
            log('🕵️', 'STEP 4: Inspection');
            
            const hasInitialsField = step2.body.includes('name="initials"');
            const hasErrors = checkForErrors(step2.body);

            if (hasErrors) {
                console.log('\n❌ FAILED: The server returned the form with errors.');
            } else if (hasInitialsField) {
                console.log('\n⚠️ STUCK: We are still on Step 1 (no explicit errors found).');
                console.log('   Possible cause: "region" code might need to be "it " (with space) or different date format.');
            } else {
                console.log('\n🎉 SUCCESS: "initials" field is GONE. We are truly on Step 2.');
                
                // Try to find Coverage/Premium fields
                const coverageMatches = step2.body.match(/name="coverage[^"]*"/g);
                if (coverageMatches) {
                    console.log('   Found Coverage Fields:', coverageMatches);
                } else {
                    console.log('   (Could not identify specific coverage fields, but the previous form is definitely gone)');
                }
            }

        } else {
            log('❌', 'Submission Error', `Status: ${postResponse.statusCode}`);
        }

    } catch (error) {
        console.error('CRITICAL ERROR:', error);
    }
}

runFlow();

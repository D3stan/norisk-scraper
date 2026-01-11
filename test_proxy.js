// test_proxy.js
// This script simulates your backend server.
// 1. It fetches the form to get a session + token.
// 2. It submits the data back with the correct cookies.

const https = require('https');

const HOST = 'verzekeren.norisk.eu';
const PATH = '/en/embed/product/event-int?key=73c7fe1a-5b9c-48bc-870d-61315d03a30c';

function getSessionAndToken() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: HOST,
            path: PATH,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            
            // 1. Capture Cookies (Critical!)
            // We need to keep these for the next request
            const rawCookies = res.headers['set-cookie'];
            
            // Simple helper to join cookies for the next request header
            const cookieHeader = rawCookies ? rawCookies.map(c => c.split(';')[0]).join('; ') : '';

            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                // 2. Scrape CSRF Token using Regex
                const tokenMatch = data.match(/name="_token" value="([^"]+)"/);
                if (tokenMatch && tokenMatch[1]) {
                    console.log('✅ Got Session Cookies:', cookieHeader.substring(0, 30) + '...');
                    console.log('✅ Scraped CSRF Token:', tokenMatch[1]);
                    resolve({ cookieHeader, token: tokenMatch[1] });
                } else {
                    reject('Could not find _token in HTML');
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.end();
    });
}

function submitForm(sessionData) {
    // 3. Prepare the Form Data
    const postData = new URLSearchParams({
        '_token': sessionData.token,
        'initials': 'M',
        'preposition': 'da',
        'last_name': 'Rossi',
        'phone': '0612345678',
        'email': 'mario.rossi@example.com',
        'data[role]': 'other', // Mimicking the select field
        'title': 'Test Evento Italiano',
        'type': '17', // Party
        'start': '2026-06-01',
        'days': '2',
        'visitors': '500',
        'description': 'Test description',
        'venue_description': 'Test venue',
        'address': 'Via Roma',
        'house_number': '1',
        'zipcode': '00100',
        'city': 'Roma',
        'region': 'it', // We try sending IT even though their form doesn't list it properly
        'environment': 'indoor'
    }).toString();

    const options = {
        hostname: HOST,
        path: PATH,
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData),
            'Cookie': sessionData.cookieHeader, // <--- CRITICAL: Sending back the cookies
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    };

    console.log('
🚀 Submitting Form...');
    
    const req = https.request(options, (res) => {
        console.log(`
📨 Status Code: ${res.statusCode}`);
        console.log(`📍 Redirect Location: ${res.headers.location || 'None'}`);
        
        let responseBody = '';
        res.on('data', (chunk) => { responseBody += chunk; });
        res.on('end', () => {
            if (res.statusCode === 302 || res.statusCode === 200) {
                console.log('🎉 SUCCESS! The server accepted the submission.');
            } else {
                console.log('❌ FAILED. Response body snippet:');
                console.log(responseBody.substring(0, 500));
            }
        });
    });

    req.on('error', (e) => console.error(e));
    req.write(postData);
    req.end();
}

// Run the flow
console.log('Starting Proxy Test...');
getSessionAndToken()
    .then(submitForm)
    .catch(console.error);

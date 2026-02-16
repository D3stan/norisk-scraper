# NoRisk Insurance Form Automation

Playwright-based backend proxy for automating NoRisk international event insurance form submissions. This system acts as an intermediary between an Italian frontend and the Dutch NoRisk backend.

## 🎯 Purpose

- Navigate NoRisk's multi-step insurance form
- Extract CSRF tokens and maintain session state
- Fill event, location, and coverage details
- Return proposal HTML without final submission
- Support headless and debug modes

## 🏗️ Architecture

```
Italian Frontend (IT) → Express API → Playwright Automation → NoRisk Backend (NL)
                                     ↓
                               Proposal HTML (returned)
```

## 📋 Prerequisites

- Node.js v18 or higher
- Windows/Linux/macOS
- Internet connection

## 🚀 Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Install Playwright browsers:**
```bash
npx playwright install chromium
```

3. **Create environment file:**
```bash
cp .env.example .env
```

4. **Configure `.env` file:**
```env
NODE_ENV=development
PORT=3000
TARGET_URL=https://verzekeren.norisk.eu/en/embed/product/event-int
HEADLESS=false
TIMEOUT=30000
SLOW_MO=100
LOG_LEVEL=debug
```

## 🧪 Testing

### Option 1: Manual Test Script (Recommended for first run)

```bash
npm test
```

This runs the automation without starting the server. Great for debugging.

### Option 2: Full Server Test

1. Start the server:
```bash
npm start
```

2. Send a POST request (using curl, Postman, or any HTTP client):
```bash
curl -X POST http://localhost:3000/api/quote \
  -H "Content-Type: application/json" \
  -d @tests/sample-data.json
```

Or use the provided sample data directly in your API client.

## 📝 API Endpoints

### `POST /api/quote`

Submits form data and returns proposal HTML.

**Request Body:**
```json
{
  "initials": "M",
  "lastName": "Rossi",
  "phone": "+39 06 1234567",
  "email": "mario.rossi@example.it",
  "role": "event_organiser",
  "eventName": "Festival Estivo Roma 2026",
  "eventType": "18",
  "startDate": "2026-06-15",
  "days": 3,
  "visitors": 500,
  "description": "Festival musicale all'aperto",
  "venueDescription": "Parco pubblico",
  "address": "Via dei Fori Imperiali",
  "houseNumber": "1",
  "zipcode": "00186",
  "city": "Roma",
  "country": "it",
  "environment": "outdoor",
  "coverages": {
    "liability": true,
    "accidents": true,
    "equipment": false,
    "cancellation": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "quoteKey": "73c7fe1a-5b9c-48bc-870d-61315d03a30c",
  "proposalUrl": "https://verzekeren.norisk.eu/en/embed/product/event-int/proposal?key=...",
  "htmlContent": "<!DOCTYPE html>...",
  "duration": "25340ms"
}
```

### `GET /health`

Health check endpoint.

## 🐛 Debug Mode

To run with visible browser window:

```bash
# In .env file
HEADLESS=false
SLOW_MO=500
LOG_LEVEL=debug
```

This will:
- Show the browser window in real-time
- Slow down actions for observation
- Output detailed logs to console
- Take screenshots at each major step

## 🔍 Workflow

1. **Session Initialization**: Navigate to form, extract CSRF token
2. **Step 1 - Personal Details**: Fill contact and role information
3. **Step 2 - Event Details**: Fill event type, dates, visitors
4. **Step 3 - Location**: Fill venue and address information
5. **Submit**: Proceed to coverage selection page
6. **Coverage Selection**: Toggle insurance modules based on input
7. **Proposal Page**: Navigate to quote page and extract HTML
8. **Stop**: Return full HTML (no final submission)

## 📊 Logging

Logs are written to:
- **Console**: Colored, human-readable format
- **logs/automation.log**: All log levels
- **logs/errors.log**: Error-level only

Log levels: `error`, `warn`, `info`, `debug`

## 🖼️ Screenshots

Automatic screenshots are taken at:
- Initial page load
- After form filling
- Coverages page
- After coverage selection
- Proposal page
- Error states

Screenshots saved to: `screenshots/`

## ⚠️ Important Notes

### Country Code Handling
The backend expects country codes with a trailing space (e.g., `"it "`, `"nl "`), except for `"us"` and `"gb"`. The `dataMapper.js` handles this automatically.

### Event Type IDs
Event types must match the IDs in `metadata.js`. See that file for the complete list of Italian↔English mappings.

### CSRF Token
The token is extracted fresh for each session. No manual intervention needed.

### Session Persistence
Playwright automatically handles cookies and session state through the browser context.

## 🚫 Known Limitations

- Does **not** perform final submission (by design)
- Coverage selectors may need adjustment based on actual NoRisk page structure
- Assumes English language form (adjust URL for other languages)

## 🔧 Troubleshooting

### "Element not found" errors
1. Set `HEADLESS=false` to see what's happening
2. Check screenshots in `screenshots/` folder
3. Verify selectors in `src/config/constants.js`

### "Navigation timeout" errors
1. Increase `TIMEOUT` in `.env`
2. Check internet connection
3. Verify NoRisk site is accessible

### CSRF token errors
1. Check logs for token extraction step
2. Verify form URL is correct
3. Ensure no CAPTCHA is blocking access

## 📄 License

MIT

## 👤 Author

Your Name / Organization

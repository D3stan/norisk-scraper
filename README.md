# NoRisk Insurance Form Automation

Playwright-based backend proxy for automating NoRisk international event insurance form submissions. This system acts as an intermediary between an Italian frontend and the Dutch NoRisk backend.

## 🎯 Purpose

- Navigate NoRisk's multi-step insurance form via agent portal
- Authenticate with NoRisk agent credentials
- Extract CSRF tokens and maintain session state
- Fill event, location, and coverage details
- Submit proposals and extract quote codes
- Receive PDFs via IMAP and forward to users via SMTP
- Provide admin dashboard for quote management
- Support headless and debug modes

## 🏗️ Architecture

```
Italian Frontend (IT) → Express API → Playwright Automation → NoRisk Agent Portal (NL)
                                     ↓
                               SQLite Database (quotes, sessions)
                                     ↓
                           IMAP (receive) / SMTP (send) Email
                                     ↓
                               Proposal HTML + PDF (returned)
```

## 📁 Project Structure

```
src/
├── index.js              # Main Express server entry point
├── config/
│   └── constants.js      # Configuration, selectors, environment variables
├── automation/
│   ├── scraper.js        # Main automation orchestration
│   └── formFiller.js     # Form filling utilities
├── utils/
│   ├── dataMapper.js     # Italian → Dutch data mapping & validation
│   ├── logger.js         # Winston logging configuration
│   ├── storage.js        # Quote persistence (SQLite)
│   ├── db.js             # Database initialization & queries
│   ├── emailSender.js    # SMTP email sending
│   └── emailReceiver.js  # IMAP email polling
└── admin/
    ├── middleware/
    │   └── auth.js       # Admin authentication middleware
    ├── routes/
    │   ├── login.js      # Admin login routes
    │   ├── dashboard.js  # Dashboard API routes
    │   └── users.js      # User management routes
    └── public/
        ├── index.html    # Admin dashboard UI
        └── admin.js      # Dashboard frontend JavaScript
```

## 📋 Prerequisites

- Node.js v18 or higher
- Windows/Linux/macOS
- Internet connection
- NoRisk agent account credentials
- IMAP/SMTP credentials (for email features)

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
# Server Configuration
NODE_ENV=development
PORT=3000
DOMAIN=http://localhost:3000

# NoRisk Agent Portal Authentication
NORISK_EMAIL=your_agent@example.com
NORISK_PASSWORD=your_password

# Target URLs
LOGIN_URL=https://verzekeren.norisk.eu/agents
FORM_URL=https://verzekeren.norisk.eu/en/agents/product/event-int
NORISK_TP_PARAM=30028

# Playwright Configuration
HEADLESS=false
TIMEOUT=30000
SLOW_MO=100
FIELD_DELAY=500

# Logging
LOG_LEVEL=debug

# Automation Mode
COMPLETED=false

# Email Reception (IMAP)
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_USER=your_email@example.com
IMAP_PASS=your_app_password
IMAP_TLS=true
IMAP_CHECK_INTERVAL=30000
IMAP_MAX_WAIT=300000

# Email Sending (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_app_password
SMTP_FROM=noreply@example.com
SMTP_SECURE=false

# Storage
STORAGE_DIR=./storage
PDF_STORAGE_DIR=./storage/pdfs

# Admin Dashboard
ADMIN_ENABLED=true
ADMIN_USER=admin
ADMIN_PASSWORD_HASH=
ADMIN_SESSION_SECRET=change-this-to-a-random-secret
```

## 🧪 Testing

### Manual Test Script

```bash
npm test
```

This runs the automation without starting the server. Great for debugging.

### Full Server Test

1. Start the server:
```bash
npm start
```

2. Send a POST request:
```bash
curl -X POST http://localhost:3000/api/quote \
  -H "Content-Type: application/json" \
  -d '{
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
      "accident": true
    }
  }'
```

## 📝 API Endpoints

### `POST /api/quote`

Submits form data and returns proposal information.

**Request Body:**
```json
{
  "initials": "M",
  "lastName": "Rossi",
  "phone": "+39 06 1234567",
  "email": "mario.rossi@example.it",
  "role": "event_organiser",
  "roleCompany": "",
  "roleVerification": "",
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
    "cancellation_costs": false,
    "cancellation_non_appearance": false,
    "cancellation_weather": false,
    "cancellation_income": false,
    "liability": true,
    "equipment": false,
    "money": false,
    "accident": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "quoteKey": "nr-12345678",
  "proposalUrl": "https://verzekeren.norisk.eu/en/agents/product/event-int/proposal?key=...",
  "pricing": {
    "sumExcl": "100.00",
    "policyCosts": "10.00",
    "insuranceTax": "11.00",
    "total": "121.00"
  },
  "status": "pending_email",
  "htmlContent": "<!DOCTYPE html>...",
  "pdfPath": "./storage/pdfs/quote-nr-12345678.pdf",
  "message": "Quote submitted. Waiting for PDF email...",
  "duration": "25340ms"
}
```

### `POST /api/quote/send`

Sends the stored PDF quote to the user's email address.

**Request Body:**
```json
{
  "quoteKey": "nr-12345678"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Preventivo inviato con successo via email",
  "sentTo": "mario.rossi@example.it",
  "duration": "1200ms"
}
```

### `GET /api/quote/:quoteKey/status`

Checks the status of a quote.

**Response:**
```json
{
  "success": true,
  "quoteKey": "nr-12345678",
  "status": "completed",
  "hasPdf": true,
  "createdAt": "2026-03-03T10:30:00.000Z",
  "updatedAt": "2026-03-03T10:35:00.000Z"
}
```

### `GET /health`

Health check endpoint with environment details.

### Admin Endpoints

When `ADMIN_ENABLED=true`:

- `GET /admin` - Admin dashboard (requires login)
- `POST /admin/login` - Admin authentication
- `POST /admin/logout` - Admin logout
- `GET /admin/api/stats` - Dashboard statistics
- `GET /admin/api/quotes` - List all quotes

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

1. **Session Initialization**: Navigate to NoRisk agent login, authenticate
2. **CSRF Token Extraction**: Extract token from the form page
3. **Step 1 - Personal Details**: Fill contact and role information
4. **Step 2 - Event Details**: Fill event type, dates, visitors, description
5. **Step 3 - Location**: Fill venue and address information
6. **Coverage Selection**: Navigate to coverage page, toggle insurance modules
7. **Proposal Page**: Extract pricing information and quote code
8. **Submission**: If `COMPLETED=true`, submit proposal and wait for email
9. **PDF Retrieval**: Poll IMAP for NoRisk PDF email
10. **Storage**: Save quote to SQLite database

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

## 💾 Storage

Quotes and their metadata are stored in SQLite:
- **Database**: `database/quotes.db`
- **PDFs**: `storage/pdfs/`
- **Sessions**: `database/sessions.db`

## ⚠️ Important Notes

### Country Code Handling
The backend expects country codes with a trailing space (e.g., `"it "`, `"nl "`), except for `"us"` and `"gb"`. The `dataMapper.js` handles this automatically.

### Event Type IDs
Event types must match the IDs expected by NoRisk. See the form page source or browser network tab for valid values.

### Role Types
- `event_organiser` - Default, no additional fields required
- `intermediary` - Requires `roleCompany` and `roleVerification`
- `proxy` - Requires `roleCompany` and `roleVerification`

### COMPLETED Mode
- `COMPLETED=false`: Stops after extracting quote code (manual review)
- `COMPLETED=true`: Submits proposal and waits for PDF email

### Admin Password Hash
Generate a bcrypt hash for the admin password:
```bash
node -e "console.log(require('bcrypt').hashSync('yourpassword', 10))"
```

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

### Email not received
1. Verify IMAP credentials
2. Check `IMAP_CHECK_INTERVAL` and `IMAP_MAX_WAIT`
3. Ensure NoRisk email is not in spam folder

## 📄 License

MIT

## 👤 Author

Your Name / Organization

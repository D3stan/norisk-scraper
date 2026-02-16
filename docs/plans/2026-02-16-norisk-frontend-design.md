# NoRisk Insurance Quote Frontend Design

## Overview
A WordPress page template for Golinucci Broker Assicurativo that allows users to request event insurance quotes through an automated form submission to the NoRisk backend.

---

## 1. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Golinucci WordPress Site                     │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐         ┌──────────────────────────┐  │
│  │  Existing Pages     │         │  Custom Page Template    │  │
│  │  (theme)            │         │  page-preventivo.php     │  │
│  │                     │         │                          │  │
│  │  - Homepage         │         │  - Form HTML/CSS/JS      │  │
│  │  - Services         │──────▶  │  - Fetch to automation   │  │
│  │  - About            │   btn   │  - Results display       │  │
│  └─────────────────────┘         └──────────┬───────────────┘  │
└──────────────────────────────────────────────┼──────────────────┘
                                               │
                                               ▼
                                    ┌──────────────────────┐
                                    │  Automation API      │
                                    │  (VPS-hosted)        │
                                    │  PORT: 3000          │
                                    └──────────┬───────────┘
                                               │
                                               ▼
                                    ┌──────────────────────┐
                                    │  NoRisk.nl           │
                                    │  (Insurance quote)   │
                                    └──────────────────────┘
```

**Key Decisions:**
- WordPress page template (not separate service) - users stay on golinucci.it
- Single PHP file with embedded CSS/JS for simplicity
- API endpoint configurable via constant at top of file

---

## 2. Components & File Structure

**Child Theme Location:**
```
wp-content/themes/royal-elementor-kit-child/
├── style.css              (child theme header + custom CSS)
├── page-preventivo.php    (main form template)
└── functions.php          (enqueue JS, add theme support)
```

**Form Sections (in page-preventivo.php):**

1. **Header Section**
   - Golinucci logo
   - Page title: "Richiedi Preventivo per il Tuo Evento"
   - Subtitle explaining the service

2. **Personal Information**
   - initials (text, 3 chars max)
   - lastName (text)
   - phone (tel)
   - email (email)
   - role (select: event_organiser, participant, company_representative)

3. **Event Information**
   - eventName (text)
   - eventType (select: mapped IDs from metadata.js)
   - startDate (date picker)
   - days (number, 1-30)
   - visitors (number)
   - description (textarea, 500 chars max)

4. **Location**
   - venueDescription (text)
   - address (text)
   - houseNumber (text)
   - zipcode (text)
   - city (text)
   - country (select: Italy, Netherlands, etc.)
   - environment (radio: indoor/outdoor)

5. **Coverage Options**
   - liability (checkbox)
   - accidents (checkbox)
   - equipment (checkbox)
   - cancellation (checkbox)

6. **Submit Section**
   - Submit button: "Richiedi Preventivo"
   - Privacy policy acceptance checkbox (required)

7. **Loading State**
   - Full-page overlay
   - Spinner animation
   - Message: "Stiamo elaborando il tuo preventivo..."
   - **Configurable timeout** (default: 30 seconds)

8. **Results Display**
   - Quote reference number
   - Price summary (if available)
   - Coverage details
   - Contact buttons

---

## 3. Data Flow

**User Journey:**
1. User clicks button from main site → arrives at `/richiedi-preventivo`
2. Form displays with Golinucci branding
3. User fills all required fields
4. Client-side validation prevents invalid submissions
5. User clicks submit
6. Loading overlay appears immediately
7. JavaScript `fetch()` sends POST to automation API
8. API processes (navigates NoRisk, fills forms, gets quote)
9. Response received → hide loading, display results
10. User sees formatted quote or error message

**API Request Format:**
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

**API Response Format:**
```json
{
  "success": true,
  "quoteKey": "73c7fe1a-5b9c-48bc-870d-61315d03a30c",
  "proposalUrl": "https://verzekeren.norisk.eu/...",
  "htmlContent": "<!DOCTYPE html>...",
  "duration": "25340ms"
}
```

---

## 4. Error Handling

| Scenario | User-Facing Message | Technical Action |
|----------|--------------------|------------------|
| API timeout | "Il servizio sta impiegando troppo tempo. Riprova piu tardi." | Abort fetch, reset form state, **timeout configurable via `API_TIMEOUT_MS`** |
| API error | Display error message from response | Log to console, show error alert |
| Missing required fields | HTML5 validation messages | Prevent submission, highlight fields |
| Invalid email format | "Inserisci un indirizzo email valido" | Pattern validation |
| Date in past | "La data dell'evento non puo essere nel passato" | min attribute on date input |
| Network offline | "Verifica la tua connessione internet" | Navigator.onLine check |
| CORS error | "Errore di connessione al server. Riprova." | Ensure API allows golinucci.it origin |

**Configurable Timeout:**
```javascript
// At top of script - easily tunable
const CONFIG = {
  API_URL: 'http://YOUR_VPS_IP:3000/api/quote',
  API_TIMEOUT_MS: 30000,  // <-- TUNABLE: 30 seconds default
  MAX_RETRIES: 1
};
```

---

## 5. Styling Requirements

**Extract from Golinucci website:**
- Primary color: `#1a1a1a` (dark) or brand blue if present
- Font: Lato (already loaded by Elementor)
- Form inputs: match Elementor form styling
- Buttons: same style as CTA buttons on main site
- Spacing: consistent with Elementor sections

**Responsive:**
- Mobile: single column, full-width inputs
- Tablet: two columns where appropriate
- Desktop: max-width 800px centered content

---

## 6. Security Considerations

- No API keys stored in frontend (public API endpoint)
- Input sanitization on automation backend
- HTTPS required for production
- Privacy checkbox required before submit (GDPR)

---

## 7. Testing Checklist

- [ ] Happy path: fill form → submit → see results
- [ ] Validation: empty form shows field errors
- [ ] Timeout: set timeout to 1ms, verify error message
- [ ] API error: simulate 500 response
- [ ] Mobile responsive: test on phone
- [ ] Cross-browser: Chrome, Firefox, Safari
- [ ] Accessibility: keyboard navigation, ARIA labels

---

## 8. Deployment Notes

1. Create child theme in WordPress
2. Copy `page-preventivo.php` to child theme
3. Update `API_URL` constant with VPS IP/domain
4. Create WordPress page, assign "Preventivo" template
5. Test end-to-end
6. Add button on main site linking to new page

---

## Approved

Design approved for implementation on 2026-02-16.

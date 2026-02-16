# NoRisk Scraper - New Implementation Plan

## Overview
This document outlines the implementation plan for adapting the NoRisk scraper to work with the new authenticated agent portal format.

## Key Changes from Previous Version

### Authentication Required
- **Previous**: Direct access to embedded form at `https://verzekeren.norisk.eu/en/embed/product/event-int`
- **New**: Must authenticate at `https://verzekeren.norisk.eu/agents` before accessing forms

### Different Entry Point
- **Previous**: Direct link to embedded form
- **New**: Navigate to `https://verzekeren.norisk.eu/en/agents/product/event-int?tp=30028` after login
- The `tp` parameter (30028) should be configurable via environment variable

### Form Flow Changes
The new workflow has a critical distinction in how personal details are handled.

## New Form Flow

### 1. Login Page
**URL**: `https://verzekeren.norisk.eu/agents`

**Credentials**: 
- Email address (from environment variable)
- Password (from environment variable)

**Login Form**:
- Email field: `input[name="email"]`
- Password field: `input[name="password"]`
- CSRF token: `input[name="_token"]`
- Submit button: `button[type="submit"]`

**Login Verification**: 
After login, verify success by checking for the presence of a hidden input with `name="_token"` in the current page HTML. This indicates we're in an authenticated session.

### 2. Navigate to Form
**Direct Navigation**: After successful login, navigate directly to:
`https://verzekeren.norisk.eu/en/agents/product/event-int?tp=30028`

No dropdown interaction needed - direct URL navigation replaces the dropdown selection.

### 3. About the Event Page
**Status**: Adviser data fields are **PRE-FILLED** by the system, Event and Location fields are **EMPTY**

**Adviser Data Section (DO NOT MODIFY)**:
- Initials
- Preposition
- Last Name
- Phone
- Email
- Role

**The Event Section (MUST FILL)**:
- Reference (title)
- Type of event
- First day (start date)
- Number of days
- Number of visitors
- Description

**The Location Section (MUST FILL)**:
- Venue
- Address
- Number
- Zipcode
- City
- Country
- Environment

**Action**: Fill only the event and location sections. Personal/adviser data is automatically populated by the system based on the logged-in agent's profile and should NOT be modified.

### 4. What to Cover Page
**Status**: Same as before - coverage selection page

**Action**: Select coverages based on API payload (liability, accidents, equipment, cancellation, etc.)

**Flow**: Continue with existing coverage selection logic.

### 5. Cancellation Due to Non-Appearance Page (Optional)
**Trigger**: Only appears if specific coverage type is selected

**Status**: Same as before

**Action**: Fill guest information if applicable.

### 6. Your Proposal Page
**Status**: Same as before - displays pricing information

**Action**: Extract pricing data and navigate to "Your Details" page.

### 7. Your Details Page ⚠️ CRITICAL CHANGE
**Status**: Fields are **EMPTY** and **MUST BE FILLED**

**Fields to Fill** (from API payload):
- Initials (required)
- Preposition (optional - only if provided in API)
- Last Name (required)
- Phone (required)
- Email (required)

**Data Source**: Use the personal details sent in the API request payload.

**Important**: This is where the personal information from the Italian frontend gets entered, NOT in "About the Event" page.

## API Payload Handling

### Current API Fields
The API accepts:
```
{
  "initials": "M",
  "preposition": "",  // optional
  "lastName": "Rossi",
  "phone": "+39 06 1234567",
  "email": "mario.rossi@example.it",
  "role": "event_organiser",
  // ... other event fields
}
```

### Field Mapping Strategy

**About the Event Page**: 
- Ignore all personal detail fields from API
- Do not attempt to fill or modify
- Just proceed to next step

**Your Details Page**:
- Use ALL personal detail fields from API payload
- Fill: initials, lastName, phone, email
- Fill preposition ONLY if provided (not empty/null)

## Environment Variables

### New Variables Required
```
NORISK_EMAIL=agent@example.com
NORISK_PASSWORD=secure_password
NORISK_TP_PARAM=30028
TARGET_URL=https://verzekeren.norisk.eu/agents
FORM_URL=https://verzekeren.norisk.eu/en/agents/product/event-int
```

### Configuration Approach
- `TARGET_URL`: Login page URL
- `FORM_URL`: Base URL for form (append `?tp=${NORISK_TP_PARAM}`)
- `NORISK_TP_PARAM`: Transaction parameter for form access
- Credentials stored securely in environment

## Implementation Phases

### Phase 1: Environment Setup
- Update `.env.example` with new variables
- Add email and password credential placeholders
- Add form URL and tp parameter
- Update constants.js to read new environment variables

### Phase 2: Selectors Update
- Add login page selectors (email, password, submit)
- Identify "About the Event" page selectors for detection
- Identify "Your Details" page selectors for detection
- Ensure distinction between the two pages is clear

### Phase 3: Authentication Implementation
- Create `performLogin(page, email, password)` function
- Handle CSRF token extraction on login page
- Submit credentials
- Verify login success by checking for `_token` hidden input
- Add error handling for failed login

### Phase 4: Navigation Flow
- After login, navigate to form URL with tp parameter
- Wait for form to load
- Detect "About the Event" page

### Phase 5: Page Flow Logic
- **About the Event**: Detect page, skip filling, click next
- **Coverage Selection**: Use existing logic
- **Optional Pages**: Use existing logic
- **Your Proposal**: Use existing logic
- **Your Details**: NEW - Fill personal details from API payload

### Phase 6: Your Details Page Implementation
- Detect "Your Details" page reliably
- Fill initials (required)
- Fill lastName (required)
- Fill phone (required)
- Fill email (required)
- Fill preposition (only if provided)
- Handle validation errors

### Phase 7: Testing & Validation
- Test with headless mode disabled for visual debugging
- Verify each page transition
- Ensure "About the Event" is properly skipped
- Ensure "Your Details" is properly filled
- Test with and without optional preposition field
- Validate end-to-end flow

## Critical Implementation Notes

### Page Detection Strategy
Must reliably distinguish between:
- "About the Event" page (has pre-filled personal data)
- "Your Details" page (has empty personal data fields)

Detection methods:
- Check page URL/path
- Check for specific heading text
- Check form field states (filled vs empty)
- Check for unique identifiers on each page

### Timing Considerations
- Login may take time to process
- Page redirects after login may require explicit waits
- Form loading may require iframe handling (check if still embedded)
- CSRF tokens need to be fresh for each form submission

### Error Handling
- Invalid login credentials
- Login page changes
- Page detection failures
- Field selector changes
- Network timeouts during authentication
- Session expiration

### Security Considerations
- Credentials stored in environment variables only
- Never log password in debug output
- Use secure connection (HTTPS)
- Handle session cookies appropriately

## Backward Compatibility
**This implementation is NOT backward compatible** with the previous direct-link approach. The old workflow is completely replaced.

## Success Criteria
1. Successful authentication with email/password
2. Direct navigation to form via URL
3. "About the Event" page skipped without modification
4. All other pages filled correctly
5. "Your Details" page filled with API payload data
6. Proposal HTML returned successfully
7. No errors in headless mode
8. Complete workflow logging

## Testing Strategy
1. Test with visible browser window first
2. Verify each page loads and transitions correctly
3. Check all fields are filled as expected
4. Verify "About the Event" is not modified
5. Verify "Your Details" is filled from API payload
6. Test edge cases (optional fields, validation errors)
7. Test in headless mode for production readiness

## Documentation Updates Needed
- README.md: Update workflow section
- README.md: Update environment variables section
- README.md: Update architecture diagram
- README.md: Update troubleshooting section
- Add authentication troubleshooting guide

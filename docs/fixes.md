# NoRisk Insurance Automation - Fixes & Improvements Tracking

## Overview

This document tracks ongoing improvements, bug fixes, and feature enhancements for the NoRisk Insurance Form Automation system. The project bridges Italian event organizers with NoRisk's Dutch/English-only insurance platform through automated browser automation and a native Italian WordPress frontend.

---

## High Priority Fixes

### 1. Quote Document Visual Enhancements

**Current Issue:** The generated quote documents lack visual elements that would make them more professional and easier to understand for clients.

**Required Changes:**
- **Add images to the printed quote document** - Include relevant event-type imagery or insurance graphics to enhance visual appeal
- Determine whether images should appear only in the printed/PDF version or also in the digital preview
- Consider adding broker logo to the quote header for branding consistency

**Open Questions:**
- What specific images should be included? (event type icons, insurance shield graphics, company logos)
- Should images be conditional based on event type (sports, concerts, conferences)?
- What are the file size constraints for email delivery?

---

### 2. Pricing Structure Modification

**Current Issue:** The final pricing calculation needs to include a fixed service fee that is currently missing from the quote total.

**Required Changes:**
- **Add a fixed €15 service fee** to the final cost calculation displayed to the user
- Determine if this fee should be displayed as a line item or incorporated into the total
- Update both the WordPress frontend display and any PDF/email communications

**Open Questions:**
- Should the €15 fee be configurable via WordPress admin settings?
- Is this fee taxable under Italian VAT regulations?
- Should the fee be displayed differently for B2B vs B2C customers?

---

### 3. Loss of Profit Field - Specific Amount Display

**Current Issue:** The "Loss of Profit" (Perdita di Profitto) coverage field currently displays a generic percentage range ("fino al 50%" - up to 50%) instead of the specific monetary amount that NoRisk actually calculates.

**Required Changes:**
- **Replace percentage text with specific monetary value** - In the example case, this should display "€3,000" instead of "fino al 50%"
- Extract the actual valued amount from the NoRisk response data
- Update the field mapping in `utils/dataMapper.js` to capture this value
- Ensure the specific amount is displayed consistently across all user-facing interfaces

**Technical Notes:**
- This requires inspecting the NoRisk API response or HTML to locate where the specific amount is returned
- May need to update the `extractProposalData()` function in the scraper

---

### 4. Quote Number Reference Format

**Current Issue:** The current quote number displays an internal long reference number that is confusing for customers and doesn't match NoRisk's actual quote numbering system.

**Required Changes:**
- **Replace internal long reference with actual NoRisk quote number** - Use "53094" format instead of the lengthy internal reference
- This makes it easier for customers to reference their quote when contacting NoRisk directly
- Improves traceability between our system and NoRisk's internal systems

**Technical Notes:**
- Need to identify where NoRisk exposes the actual quote number in their response
- Update database schema to store this official quote number separately from internal tracking ID

---

## Resource Links & Assets

### Terms and Conditions Document
- **URL:** https://golinucci.it/wp-content/uploads/2026/02/Terms-conditions-event-insurance-ITA.pdf
- **Purpose:** Official terms and conditions for event insurance policies
- **Action Required:** Update WordPress settings to reference this document

### Image Assets
- **Event Photo:** https://golinucci.it/wp-content/uploads/2026/02/WhatsApp-Image-2026-02-21-at-14.56.38.jpeg
- **Logo Asset:** https://golinucci.it/wp-content/uploads/2026/02/WhatsApp-Image-2026-02-21-at-14.56.38-1.jpeg
- **Purpose:** Visual assets for quote documents and branding

---

## WordPress Integration Improvements

### 1. Terms & Conditions Link Configuration

**Current Issue:** The terms and conditions link needs to be properly integrated into the WordPress admin settings for easy configuration by site administrators.

**Required Changes:**
- **Add dedicated Terms & Conditions URL field** to the WordPress settings page
- Ensure this is separate from the Privacy Policy field (currently may be conflated)
- Default to the provided URL: https://golinucci.it/wp-content/uploads/2026/02/Terms-conditions-event-insurance-ITA.pdf
- Make the link easily accessible from the quote form for user review

**Implementation Details:**
- Add new setting in `functions.php`
- Update `page-preventivo.php` to reference this dynamic setting
- Add validation to ensure the link is a valid PDF or page URL

---

### 2. Remove Duplicate API Timeout Setting

**Current Issue:** There is a duplicate "API Timeout" field in the WordPress settings that causes confusion for administrators.

**Required Changes:**
- **Identify and remove the duplicate API timeout field** from the WordPress admin settings
- Ensure only one authoritative timeout setting remains
- Verify that the remaining setting properly syncs with the Node.js backend expectations

**Testing Required:**
- Confirm that removing the duplicate doesn't break existing configurations
- Ensure the timeout value properly passes to the backend API calls

---

### 3. WordPress Admin Localization

**Current Issue:** The WordPress plugin settings page is currently in English, but the primary users are Italian administrators.

**Required Changes:**
- **Translate all WordPress admin settings to Italian**
- Include field labels, descriptions, help text, and error messages
- Maintain English fallback for international users
- Use WordPress internationalization (i18n) functions for proper localization support

**Translation Scope:**
- Settings page titles and sections
- Field labels and descriptions
- Success/error messages
- Help tooltips and documentation links

---

## Backend Automation Enhancements

### 1. Extract Official NoRisk Quote Code

**Current Issue:** The system doesn't currently capture or display the official NoRisk quote code that their system generates, which would be valuable for customer service and tracking.

**Required Changes:**
- **Implement extraction of the actual NoRisk-generated quote code**
- Display this code to the client in their quote summary
- Store it in the database for future reference and support inquiries
- Use this code when communicating with NoRisk support

**Technical Approach:**
- Inspect the NoRisk proposal page HTML for the quote code element
- Add extraction logic to `automation/scraper.js`
- Update the database schema and API response to include this field

**Open Questions:**
- Where exactly does NoRisk display the official quote code in their interface?
- Is this code available immediately or only after email confirmation?
- Should this replace or supplement our internal quote reference?

---

### 2. iCloud Notes Integration

**Current Issue:** There appears to be a need to integrate with iCloud Notes for some aspect of the workflow (possibly for manual tracking or client notes).

**Required Changes:**
- **Clarify and implement iCloud Notes integration**
- Determine if this is for internal tracking, client communication, or audit purposes
- Investigate Apple iCloud API capabilities for programmatic access

**Open Questions:**
- What specific data needs to be synced to iCloud Notes?
- Is this for automated logging or manual user notes?
- Are there authentication requirements for iCloud API access?
- Could this be replaced with a simpler internal notes system?

---

## Communication & Support Tasks

### 1. Respond to claudeusus Inquiry

**Current Issue:** There is a pending response needed to a user or entity referred to as "claudeusus".

**Required Changes:**
- **Respond to the claudeusus inquiry**
- Review previous communications to understand the context
- Provide appropriate technical or administrative response

**Action Items:**
- Locate the original message or request from claudeusus
- Determine the appropriate response channel (email, GitHub, internal system)
- Draft and send response with relevant information

---

## Questions for Further Expansion

To better prioritize and implement these fixes, please clarify the following:

### Priority & Business Logic
1. **What is the current priority ranking** of these fixes? Are any blocking production use?
2. **Should the €15 fee be visible as a separate line item** on the quote, or incorporated into the total price?
3. **Is the Loss of Profit amount always in euros**, or does it need currency conversion for international events?

### Technical Specifications
4. **Where in the NoRisk response can we find** the official quote number (53094 format)?
5. **What is the intended use case for iCloud Notes integration** - internal tracking or client-facing feature?
6. **Are there specific branding guidelines** for which images/logos should appear on quotes?

### User Experience
7. **Should the Terms & Conditions link open in a new tab** or download the PDF directly?
8. **Is there a need for quote expiration notifications** or follow-up automation?
9. **Should customers receive a copy** of the official NoRisk quote PDF, or only our formatted version?

### Administrative
10. **Who is "claudeusus" and what is the nature** of the pending inquiry?
11. **Are there compliance requirements** for how we display insurance pricing and terms in Italy?
12. **Should the WordPress settings include a "test mode"** flag for sandbox vs production API calls?

---

## Implementation Status Tracking

| Fix # | Description | Status | Assigned | Target Date |
|-------|-------------|--------|----------|-------------|
| 1 | Quote Document Images | Pending | TBD | TBD |
| 2 | €15 Service Fee | Pending | TBD | TBD |
| 3 | Loss of Profit Amount | Pending | TBD | TBD |
| 4 | Quote Number Format | Pending | TBD | TBD |
| 5 | Terms & Conditions Link | Pending | TBD | TBD |
| 6 | Remove Duplicate Timeout | Pending | TBD | TBD |
| 7 | WordPress Italian Translation | Pending | TBD | TBD |
| 8 | Extract NoRisk Quote Code | Pending | TBD | TBD |
| 9 | iCloud Notes Integration | Pending | TBD | TBD |
| 10 | Respond to claudeusus | Pending | TBD | TBD |

---

*Last Updated: February 22, 2026*
*Document Version: 2.0*

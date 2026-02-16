# Problem Definition: NoRisk International Event Insurance (Italian Localization)

## 1. Core Challenge
The objective is to replicate the "NoRisk International Event Insurance" application form to provide a native Italian user experience. This requires a complete reconstruction of the frontend interface and logic while strictly maintaining compatibility with an existing, third-party Dutch backend system.

## 2. Functional Requirements
The localized system must faithfully mirror the dynamic capabilities of the original application:

*   **Dynamic Premium Calculation**: The system must instantly calculate insurance premiums based on variable inputs (event type risk factors, duration, visitor volume) and selected add-ons.
*   **Complex Coverage Selection**: Users must be able to toggle and configure specific coverage modules (Cancellation, Liability, Equipment, Accidents, etc.) which independently affect the final premium.
*   **Multi-Step Workflow**: The application process involves a specific four-step progression (Event Details -> Coverage -> Proposal/Quote -> Personal Details) that must be preserved.

## 3. Technical Constraints
*   **No Public API**: The provider (NoRisk) does not offer a documented public API for data submission.
*   **Backend Dependency**: All data collected by the Italian form must be successfully ingested by the existing `verzekeren.norisk.eu` backend.
*   **Data Integrity**: The replication must ensure that all form fields, hidden tokens, and data structures match the specific expectations of the Dutch backend to prevent submission rejection.

## 4. Proposed Solution: Hybrid Proxy Architecture

To bypass the lack of Italian support and the complex security mechanisms (Livewire/CSRF) of the target system, a "Hybrid Proxy" approach is required.

### Architecture Overview
1.  **Custom Italian Frontend**: A standalone HTML/JS form hosted on the client's infrastructure. This provides the translated interface and mimics the user experience.
2.  **Backend Relay (The Proxy)**: An intermediate server-side component (e.g., in Node.js, PHP, or Python) that sits between the Italian Frontend and the NoRisk system.

### Workflow
1.  **User Interaction**: The user fills out the form in Italian (ONLY one time with all the necessary fields).
2.  **Internal Submission**: The data is sent to the Backend Relay, not the external provider.
3.  **Session Handshake**: The Backend Relay autonomously initiates a session with the NoRisk server (background GET request) to acquire a valid session cookie and specific CSRF security tokens (`_token`).
4.  **Authenticated Forwarding**: The Backend Relay constructs a mirrored POST request, combining the user's data with the scraped security tokens, and submits it to NoRisk.
5.  **Response Translation**: The result is captured by the Relay and returned to the Italian Frontend to display success or error messages.

## 5. Implementation Findings (Reverse Engineering)

### Security & Validation
*   **Token Handling**: The CSRF `_token` is hidden in the HTML (not just cookies). The proxy **must** scrape this value from the HTML response of the GET request before making a POST.
*   **Cookie Persistence**: The server strictly enforces session continuity. The proxy must capture `Set-Cookie` headers from the GET request and forward them exactly in the POST request headers.
*   **Strict Validation**: The backend performs rigorous validation (e.g., email format, country codes).
    *   **Region Code**: The country select field expects codes with a trailing space (e.g., `'nl '`, `'be '`), except for `'us'`. This inconsistency must be handled in the mapping layer.
    *   **Livewire Compatibility**: Standard POST requests work despite the frontend using Livewire, provided all required fields (including `_token`) are present. The `wire:snapshot` data is not mandatory for initial submission.

### Workflow Progression
*   **Step 1 (Details) -> Step 2 (Coverage)**: Successful submission results in a `302 Redirect` to `.../event-int/coverages?key=...`.
*   **Step 2 (Coverage)**: This page contains independent modules (Liability, Accidents, Equipment) that are toggled via checkboxes.
*   **Final Quote**: The pricing/premium is **not** returned in the API response but is rendered in the HTML of the subsequent page (`/proposal`). The proxy must fetch this redirect and scrape the HTML to extract the final price for the user.
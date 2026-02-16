# Browser Session Management & Optimization

## Current Implementation Analysis
*   **Inefficiency:** The current `automateFormSubmission` function launches a **fresh browser instance** (`chromium.launch`) and performs a **full login sequence** for *every single request*.
*   **Risk:** This pattern mimics a new user connecting for every transaction, which is:
    *   **Slow:** Adds significant latency (browser boot + login steps).
    *   **Risky:** Highly likely to be flagged by the NoRisk backend as spam or bot activity due to repeated login requests from the same IP.

## Proposed Architecture: Singleton Browser & State Reuse

To address these issues, we will refactor the application to use a **Singleton Browser Pattern** with **State Sharing**.

### 1. Global Browser Instance
*   **Strategy:** Launch the browser **once** when the Express server starts.
*   **Implementation:** Maintain a global `BrowserManager` instance that keeps the browser process alive for the server's lifetime.

### 2. Shared Authentication State (Storage State)
*   **Strategy:** Perform the login **one time** (on server startup).
*   **Mechanism:**
    *   Execute the login flow.
    *   Capture the **Storage State** (cookies, local storage, `_token`) using Playwright's `context.storageState()`.
    *   Cache this state in memory.

### 3. Request Handling (Context Reuse)
*   **Strategy:** Handle concurrent requests using lightweight Contexts/Pages.
*   **Flow:**
    *   **User A Request:** `BrowserManager` creates `Context A` -> Injects cached `Storage State` -> Opens `Page A`.
    *   **User B Request:** `BrowserManager` creates `Context B` -> Injects cached `Storage State` -> Opens `Page B`.
*   **Result:** Both sessions are instantly authenticated without hitting the login form.

## Benefits
*   **Performance:** Removes ~3-5 seconds of overhead per request.
*   **Scalability:** Supports concurrent users sharing underlying browser resources.
*   **Security:** Drastically reduces the frequency of login operations, lowering the ban risk.

## Implementation Plan

1.  **Create `src/automation/browserManager.js`**:
    *   Class to handle `chromium.launch`.
    *   Method `ensureLoggedIn()` to manage the initial auth and state caching.
    *   Method `getPage()` to return a ready-to-use, authenticated page.

2.  **Update `src/index.js`**:
    *   Initialize `BrowserManager` on server boot.
    *   Ensure graceful shutdown (close browser on process exit).

3.  **Refactor `src/automation/scraper.js`**:
    *   Remove local browser launch logic.
    *   Accept `page` object from `BrowserManager`.
    *   Focus solely on form navigation and filling.

# Browser Session Management Design

## Overview
Replace the current "new browser per request" model with a "single browser, multiple pages (tabs)" approach to improve performance and resource efficiency.

---

## Problem Statement

Currently, `src/automation/scraper.js` launches a new Playwright browser instance for every incoming request:

```javascript
// Current implementation (inefficient)
browser = await chromium.launch({...});
context = await browser.newContext({...});
page = await context.newPage();
// ... work ...
await browser.close();  // Browser destroyed after each request
```

This causes:
- High CPU/memory overhead per request
- Slow response times (browser launch ~2-5 seconds)
- Resource exhaustion under concurrent load

---

## Solution: Singleton Browser with Tab-per-Request

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Node.js Express Server                     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          Browser Manager (Singleton)                 │   │
│  │   ┌──────────────────────────────────────────┐       │   │
│  │   │      Single Browser Instance             │       │   │
│  │   │   (launched once at server startup)      │       │   │
│  │   └──────────────────────────────────────────┘       │   │
│  │                      │                               │   │
│  │         ┌────────────┼────────────┐                  │   │
│  │         ▼            ▼            ▼                  │   │
│  │      [Page 1]     [Page 2]     [Page 3]              │   │
│  │      Req #1       Req #2       Req #3                │   │
│  │      (isolated)   (isolated)   (isolated)            │   │
│  │                                                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Global singleton browser** | Single initialization cost, shared across all requests |
| **One page per request** | Isolation (cookies, CSRF tokens), clean lifecycle |
| **Parallel execution** | Multiple requests processed simultaneously |
| **Screenshot rotation (max 25)** | Prevent disk bloat, keep recent errors for debugging |
| **Process exit handlers** | Graceful browser cleanup on shutdown |

---

## File Changes

### 1. New: `src/automation/browserManager.js`
Singleton browser instance management.

**Responsibilities:**
- Initialize browser on server startup
- Provide shared browser instance to request handlers
- Handle graceful shutdown

**API:**
```javascript
initBrowser()  // Launch browser if not already running
getBrowser()   // Get shared browser instance
closeBrowser() // Cleanup on shutdown
```

### 2. New: `src/utils/screenshotManager.js`
Screenshot capture with rotation.

**Responsibilities:**
- Capture error screenshots during automation failures
- Maintain max 25 screenshots (FIFO rotation)
- Store in `./screenshots/errors/`

**API:**
```javascript
captureErrorScreenshot(page, context) // Save screenshot with rotation
```

### 3. Modify: `src/automation/scraper.js`
Use shared browser, open/close pages.

**Changes:**
- Remove `chromium.launch()` calls from `automateFormSubmission()`
- Remove `chromium.launch()` calls from `submitEmailQuote()`
- Replace with `getBrowser()` + `browser.newPage()`
- Replace `browser.close()` with `page.close()`
- Use `captureErrorScreenshot()` instead of inline screenshot logic

**Before:**
```javascript
browser = await chromium.launch({...});
context = await browser.newContext({...});
page = await context.newPage();
// ... work ...
await browser.close();
```

**After:**
```javascript
const browser = await getBrowser();
const page = await browser.newPage();
try {
    // ... work ...
} finally {
    await page.close();
}
```

### 4. Modify: `src/index.js`
Initialize browser on startup.

**Changes:**
- Import `initBrowser` from `browserManager.js`
- Call `await initBrowser()` after server starts listening
- Log browser ready state

---

## Request Lifecycle

```
Request arrives
      │
      ▼
getBrowser() ──► returns shared browser instance
      │
      ▼
browser.newPage() ──► creates isolated tab
      │
      ▼
Navigate → Fill Form → Submit → Extract Data
      │
      ▼
Return result to frontend
      │
      ▼
page.close() ──► tab destroyed, resources freed
```

---

## Error Handling

### Page Errors
- Screenshot captured via `captureErrorScreenshot()`
- Screenshot rotation ensures max 25 files
- Page closed in `finally` block (guaranteed cleanup)

### Browser Errors
- If browser crashes, subsequent requests will fail fast
- Process should be restarted (PM2/docker will handle)
- No automatic browser restart (fail fast principle)

---

## Concurrency Model

```
Request 1 ──┐
Request 2 ──┼──► Each gets own Page ──► Parallel execution
Request 3 ──┘    (isolated cookies/storage)

All Pages share single Browser
```

**Isolation guarantees:**
- Each page has independent cookie jar
- CSRF tokens are page-specific
- No shared state between requests
- Playwright handles tab isolation internally

---

## Resource Limits

| Resource | Limit | Handling |
|----------|-------|----------|
| Screenshots | 25 | FIFO rotation |
| Concurrent pages | Unlimited (practical: ~10-20) | Parallel execution |
| Browser memory | Shared across pages | Browser-level limit |

---

## Testing Considerations

1. **Concurrent requests**: Verify parallel execution works
2. **Error scenarios**: Confirm screenshots rotate properly
3. **Browser crash**: Verify graceful failure
4. **Memory usage**: Monitor over time under load

---

## Deployment Notes

- Browser initialized once at server startup
- No changes to environment variables needed
- PM2/docker restart will reinitialize browser
- Health check should verify browser is responsive

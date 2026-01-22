# Implementation Plan: NoRisk Italian Proxy Automation

## 1. Environment Configuration (Linux-First)
The system is designed for deployment on Linux environments (e.g., Ubuntu/Debian) to ensure stability and scalability.
* **Runtime**: Use Node.js (LTS) as the execution engine.
* **Browser Engine**: Install Chromium binaries and necessary Linux system dependencies using Playwright's native CLI (`install-deps`).
* **Process Management**: Utilize **PM2** to manage the automation as a background service, ensuring automatic restarts and log rotation on the server.

---

## 2. Hybrid Proxy Architecture
The software functions as an intermediate relay between the custom Italian frontend and the Dutch backend.

### A. Data Normalization Layer
Before submission, the system must process user input to match the provider's strict validation requirements:
* **Region Code Mapping**: Automatically append trailing spaces to specific country codes (e.g., converting 'IT' to `'it '`) as required by the backend, except for specific cases like 'us'.
* **Format Alignment**: Standardize date formats and numerical separators to ensure data integrity and prevent submission rejection.

### B. Session and Security Management
* **Cookie Persistence**: Playwright maintains the browser context natively, handling `Set-Cookie` headers and ensuring session continuity across all steps.
* **CSRF Token Handling**: The automation performs an initial background GET request to scrape the hidden `_token` from the HTML before proceeding with the POST request.

---

## 3. Automation Workflow (4-Step Progression)
The automation strictly mirrors the original Dutch application's dynamic progression.

1.  **Step 1 (Event Details)**: Inputting event type risk factors, duration, and visitor volume.
2.  **Step 2 (Coverage Selection)**: Dynamically toggling specific modules such as Liability, Accidents, and Equipment based on the user's choices.
3.  **Step 3 (Proposal/Quote)**: Navigating to the `/proposal` page. Since the premium is rendered in HTML rather than returned via API, the system will scrape the final price from the page content.
4.  **Step 4 (Personal Details)**: Finalizing the process by entering personal/legal information for the final submission.

---

## 4. Debugging and Headless Execution
The system supports two operational modes controlled via environment variables:

* **Headless Mode (Production)**: The default setting for Linux servers. The browser runs without a GUI to minimize CPU and RAM consumption.
* **Debug Mode (Development)**: Disables headless mode to launch a visible Chromium window. This allows for real-time visual inspection of the form-filling process and manual troubleshooting.
* **Failure Evidence**: The script is configured to capture automated screenshots of the page state upon encountering an error, facilitating post-mortem analysis in headless environments.

---

## 5. Result Extraction and Response
* **HTML Scraping**: The relay extracts the final premium and insurance details directly from the subsequent page's HTML after the Step 2 redirect.
* **Translation Relay**: Once the data is captured, the system returns a clean JSON response to the Italian frontend to display the success message or calculated quote to the user.
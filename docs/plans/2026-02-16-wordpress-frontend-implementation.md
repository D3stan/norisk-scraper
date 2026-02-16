# WordPress NoRisk Quote Form Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a WordPress page template that allows users to submit event insurance quotes and displays results from the automation API.

**Architecture:** A single PHP file (`page-preventivo.php`) containing HTML form, embedded CSS matching Golinucci branding, and vanilla JavaScript for form handling and API communication. The form submits to the existing Express automation API.

**Tech Stack:** WordPress PHP templates, vanilla JavaScript (ES6+), CSS (embedded), Fetch API

---

## Prerequisites

Before starting, ensure:
1. WordPress admin access to Golinucci site
2. FTP/sFTP access to upload files to `wp-content/themes/`
3. VPS IP address for the automation API
4. Child theme folder created: `royal-elementor-kit-child/`

---

## Task 1: Create WordPress Child Theme Structure

**Files:**
- Create: `norisk-wordpress/page-preventivo.php`
- Create: `norisk-wordpress/style.css`

**Step 1: Create child theme style.css**

```css
/*
Theme Name: Royal Elementor Kit Child
Template: royal-elementor-kit
Version: 1.0.0
*/

/* NoRisk Quote Form Styles */
.norisk-form-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 40px 20px;
}

.norisk-form-section {
    margin-bottom: 40px;
}

.norisk-form-section h3 {
    color: #1a1a1a;
    font-family: 'Lato', sans-serif;
    font-size: 20px;
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 2px solid #e0e0e0;
}

.norisk-form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 20px;
}

@media (max-width: 600px) {
    .norisk-form-row {
        grid-template-columns: 1fr;
    }
}

.norisk-form-group {
    display: flex;
    flex-direction: column;
}

.norisk-form-group.full-width {
    grid-column: 1 / -1;
}

.norisk-form-group label {
    font-weight: 600;
    margin-bottom: 8px;
    color: #333;
    font-size: 14px;
}

.norisk-form-group input[type="text"],
.norisk-form-group input[type="email"],
.norisk-form-group input[type="tel"],
.norisk-form-group input[type="number"],
.norisk-form-group input[type="date"],
.norisk-form-group select,
.norisk-form-group textarea {
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 16px;
    font-family: inherit;
    transition: border-color 0.3s;
}

.norisk-form-group input:focus,
.norisk-form-group select:focus,
.norisk-form-group textarea:focus {
    outline: none;
    border-color: #0066cc;
}

.norisk-form-group input:invalid,
.norisk-form-group select:invalid {
    border-color: #e74c3c;
}

.norisk-form-group textarea {
    resize: vertical;
    min-height: 100px;
}

.norisk-radio-group {
    display: flex;
    gap: 20px;
    margin-top: 8px;
}

.norisk-radio-group label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: normal;
    cursor: pointer;
}

.norisk-checkbox-group {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 8px;
}

.norisk-checkbox-group label {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: normal;
    cursor: pointer;
}

.norisk-checkbox-group input[type="checkbox"] {
    width: 20px;
    height: 20px;
}

.norisk-submit-btn {
    background-color: #1a1a1a;
    color: white;
    padding: 16px 40px;
    border: none;
    border-radius: 4px;
    font-size: 18px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.3s;
    width: 100%;
}

.norisk-submit-btn:hover {
    background-color: #333;
}

.norisk-submit-btn:disabled {
    background-color: #999;
    cursor: not-allowed;
}

/* Loading Overlay */
.norisk-loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.95);
    display: none;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 9999;
}

.norisk-loading-overlay.active {
    display: flex;
}

.norisk-spinner {
    width: 60px;
    height: 60px;
    border: 4px solid #e0e0e0;
    border-top-color: #1a1a1a;
    border-radius: 50%;
    animation: norisk-spin 1s linear infinite;
}

@keyframes norisk-spin {
    to { transform: rotate(360deg); }
}

.norisk-loading-text {
    margin-top: 20px;
    font-size: 18px;
    color: #333;
}

/* Results Section */
.norisk-results {
    display: none;
    padding: 40px;
    background: #f9f9f9;
    border-radius: 8px;
    text-align: center;
}

.norisk-results.active {
    display: block;
}

.norisk-results h2 {
    color: #1a1a1a;
    margin-bottom: 20px;
}

.norisk-results.success {
    border-left: 4px solid #27ae60;
}

.norisk-results.error {
    border-left: 4px solid #e74c3c;
}

.norisk-quote-ref {
    font-size: 24px;
    font-weight: 700;
    color: #27ae60;
    margin: 20px 0;
    padding: 15px;
    background: white;
    border-radius: 4px;
}

.norisk-error-message {
    color: #e74c3c;
    padding: 20px;
    background: #fdf2f2;
    border-radius: 4px;
    margin: 20px 0;
}

.norisk-new-quote-btn {
    background-color: #27ae60;
    color: white;
    padding: 14px 30px;
    border: none;
    border-radius: 4px;
    font-size: 16px;
    cursor: pointer;
    margin-top: 20px;
}

.norisk-new-quote-btn:hover {
    background-color: #219a52;
}

/* Form Section Visibility */
#quoteForm {
    transition: opacity 0.3s;
}

#quoteForm.hidden {
    display: none;
}

/* Privacy Checkbox */
.norisk-privacy-group {
    margin: 30px 0;
    padding: 20px;
    background: #f5f5f5;
    border-radius: 4px;
}

.norisk-privacy-group label {
    font-size: 14px;
    line-height: 1.5;
}

.norisk-privacy-group a {
    color: #0066cc;
    text-decoration: underline;
}
```

**Step 2: Test file creation**

Verify files exist:
```bash
cd norisk-wordpress
ls -la style.css page-preventivo.php 2>/dev/null && echo "Files created" || echo "Need to create files"
```

Expected: Files exist message

**Step 3: Commit**

```bash
git add norisk-wordpress/
git commit -m "feat: add WordPress child theme CSS for quote form

- Form layout with responsive grid
- Loading overlay with spinner animation
- Results display styling
- Privacy checkbox styling
- Match Golinucci brand colors"
```

---

## Task 2: Create WordPress Page Template

**Files:**
- Create: `norisk-wordpress/page-preventivo.php`

**Step 1: Write the PHP template**

```php
<?php
/**
 * Template Name: Preventivo Evento
 * Description: Form for requesting event insurance quotes
 */

// CONFIGURATION - Update these values
const API_URL = 'http://YOUR_VPS_IP:3000/api/quote';
const API_TIMEOUT_MS = 30000; // 30 seconds - easily tunable

get_header();
?>

<style>
<?php include 'style.css'; ?>
</style>

<div class="norisk-form-container">
    <h1>Richiedi Preventivo per il Tuo Evento</h1>
    <p>Compila il modulo sottostante per ricevere un preventivo personalizzato per l'assicurazione del tuo evento.</p>

    <!-- Loading Overlay -->
    <div id="loadingOverlay" class="norisk-loading-overlay">
        <div class="norisk-spinner"></div>
        <p class="norisk-loading-text">Stiamo elaborando il tuo preventivo...</p>
    </div>

    <!-- Quote Form -->
    <form id="quoteForm" method="post">

        <!-- Personal Information -->
        <div class="norisk-form-section">
            <h3>Informazioni Personali</h3>
            <div class="norisk-form-row">
                <div class="norisk-form-group">
                    <label for="initials">Iniziali *</label>
                    <input type="text" id="initials" name="initials" maxlength="3" required>
                </div>
                <div class="norisk-form-group">
                    <label for="lastName">Cognome *</label>
                    <input type="text" id="lastName" name="lastName" required>
                </div>
            </div>
            <div class="norisk-form-row">
                <div class="norisk-form-group">
                    <label for="phone">Telefono *</label>
                    <input type="tel" id="phone" name="phone" required>
                </div>
                <div class="norisk-form-group">
                    <label for="email">Email *</label>
                    <input type="email" id="email" name="email" required>
                </div>
            </div>
            <div class="norisk-form-row">
                <div class="norisk-form-group full-width">
                    <label for="role">Ruolo *</label>
                    <select id="role" name="role" required>
                        <option value="">Seleziona...</option>
                        <option value="event_organiser">Organizzatore Evento</option>
                        <option value="participant">Partecipante</option>
                        <option value="company_representative">Rappresentante Azienda</option>
                    </select>
                </div>
            </div>
        </div>

        <!-- Event Information -->
        <div class="norisk-form-section">
            <h3>Informazioni sull'Evento</h3>
            <div class="norisk-form-row">
                <div class="norisk-form-group full-width">
                    <label for="eventName">Nome Evento *</label>
                    <input type="text" id="eventName" name="eventName" required>
                </div>
            </div>
            <div class="norisk-form-row">
                <div class="norisk-form-group full-width">
                    <label for="eventType">Tipo di Evento *</label>
                    <select id="eventType" name="eventType" required>
                        <option value="">Seleziona...</option>
                        <option value="18">Festival / Concerto</option>
                        <option value="1">Fiera / Esposizione</option>
                        <option value="2">Conferenza / Congresso</option>
                        <option value="3">Sportivo</option>
                        <option value="4">Culturale</option>
                        <option value="5">Aziendale</option>
                        <option value="6">Privato / Festa</option>
                        <option value="7">Matrimonio</option>
                        <option value="8">Altro</option>
                    </select>
                </div>
            </div>
            <div class="norisk-form-row">
                <div class="norisk-form-group">
                    <label for="startDate">Data Inizio *</label>
                    <input type="date" id="startDate" name="startDate" required>
                </div>
                <div class="norisk-form-group">
                    <label for="days">Durata (giorni) *</label>
                    <input type="number" id="days" name="days" min="1" max="30" value="1" required>
                </div>
            </div>
            <div class="norisk-form-row">
                <div class="norisk-form-group">
                    <label for="visitors">Numero Partecipanti *</label>
                    <input type="number" id="visitors" name="visitors" min="1" required>
                </div>
                <div class="norisk-form-group">
                    <label>Ambiente *</label>
                    <div class="norisk-radio-group">
                        <label>
                            <input type="radio" name="environment" value="outdoor" checked>
                            All'aperto
                        </label>
                        <label>
                            <input type="radio" name="environment" value="indoor">
                            Al chiuso
                        </label>
                    </div>
                </div>
            </div>
            <div class="norisk-form-row">
                <div class="norisk-form-group full-width">
                    <label for="description">Descrizione Evento *</label>
                    <textarea id="description" name="description" maxlength="500" rows="4" required></textarea>
                </div>
            </div>
        </div>

        <!-- Location -->
        <div class="norisk-form-section">
            <h3>Location</h3>
            <div class="norisk-form-row">
                <div class="norisk-form-group full-width">
                    <label for="venueDescription">Descrizione Location</label>
                    <input type="text" id="venueDescription" name="venueDescription" placeholder="Es. Parco pubblico, Centro congressi, etc.">
                </div>
            </div>
            <div class="norisk-form-row">
                <div class="norisk-form-group">
                    <label for="address">Indirizzo *</label>
                    <input type="text" id="address" name="address" required>
                </div>
                <div class="norisk-form-group">
                    <label for="houseNumber">Numero Civico *</label>
                    <input type="text" id="houseNumber" name="houseNumber" required>
                </div>
            </div>
            <div class="norisk-form-row">
                <div class="norisk-form-group">
                    <label for="zipcode">CAP *</label>
                    <input type="text" id="zipcode" name="zipcode" required>
                </div>
                <div class="norisk-form-group">
                    <label for="city">Città *</label>
                    <input type="text" id="city" name="city" required>
                </div>
            </div>
            <div class="norisk-form-row">
                <div class="norisk-form-group full-width">
                    <label for="country">Paese *</label>
                    <select id="country" name="country" required>
                        <option value="it" selected>Italia</option>
                        <option value="nl">Paesi Bassi</option>
                        <option value="de">Germania</option>
                        <option value="fr">Francia</option>
                        <option value="es">Spagna</option>
                        <option value="gb">Regno Unito</option>
                        <option value="us">Stati Uniti</option>
                    </select>
                </div>
            </div>
        </div>

        <!-- Coverage Options -->
        <div class="norisk-form-section">
            <h3>Coperture Richieste</h3>
            <div class="norisk-checkbox-group">
                <label>
                    <input type="checkbox" name="coverages" value="liability" checked>
                    Responsabilità Civile
                </label>
                <label>
                    <input type="checkbox" name="coverages" value="accidents">
                    Infortuni
                </label>
                <label>
                    <input type="checkbox" name="coverages" value="equipment">
                    Attrezzature
                </label>
                <label>
                    <input type="checkbox" name="coverages" value="cancellation">
                    Annullamento
                </label>
            </div>
        </div>

        <!-- Privacy -->
        <div class="norisk-privacy-group">
            <label>
                <input type="checkbox" id="privacyAccept" name="privacyAccept" required>
                Ho letto e accetto l'<a href="/privacy-policy" target="_blank">informativa sulla privacy</a> *
            </label>
        </div>

        <!-- Submit -->
        <button type="submit" class="norisk-submit-btn">Richiedi Preventivo</button>
    </form>

    <!-- Results Section -->
    <div id="resultsSection" class="norisk-results">
        <h2 id="resultsTitle"></h2>
        <div id="resultsContent"></div>
        <button type="button" class="norisk-new-quote-btn" onclick="resetForm()">Richiedi Nuovo Preventivo</button>
    </div>
</div>

<script>
// CONFIGURATION - Update with your VPS IP
const CONFIG = {
    API_URL: '<?php echo API_URL; ?>',
    API_TIMEOUT_MS: <?php echo API_TIMEOUT_MS; ?>
};

// DOM Elements
const form = document.getElementById('quoteForm');
const loadingOverlay = document.getElementById('loadingOverlay');
const resultsSection = document.getElementById('resultsSection');
const resultsTitle = document.getElementById('resultsTitle');
const resultsContent = document.getElementById('resultsContent');

// Set minimum date to today
document.getElementById('startDate').min = new Date().toISOString().split('T')[0];

// Form submission handler
form.addEventListener('submit', async function(e) {
    e.preventDefault();

    // Show loading
    loadingOverlay.classList.add('active');

    try {
        const formData = collectFormData();
        const result = await submitQuote(formData);
        showSuccess(result);
    } catch (error) {
        showError(error.message);
    } finally {
        loadingOverlay.classList.remove('active');
    }
});

// Collect form data into API format
function collectFormData() {
    const coverageCheckboxes = document.querySelectorAll('input[name="coverages"]:checked');
    const coverages = {};

    // Initialize all coverages as false
    ['liability', 'accidents', 'equipment', 'cancellation'].forEach(c => {
        coverages[c] = false;
    });

    // Set selected to true
    coverageCheckboxes.forEach(cb => {
        coverages[cb.value] = true;
    });

    return {
        initials: document.getElementById('initials').value,
        lastName: document.getElementById('lastName').value,
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value,
        role: document.getElementById('role').value,
        eventName: document.getElementById('eventName').value,
        eventType: document.getElementById('eventType').value,
        startDate: document.getElementById('startDate').value,
        days: parseInt(document.getElementById('days').value),
        visitors: parseInt(document.getElementById('visitors').value),
        description: document.getElementById('description').value,
        venueDescription: document.getElementById('venueDescription').value,
        address: document.getElementById('address').value,
        houseNumber: document.getElementById('houseNumber').value,
        zipcode: document.getElementById('zipcode').value,
        city: document.getElementById('city').value,
        country: document.getElementById('country').value,
        environment: document.querySelector('input[name="environment"]:checked').value,
        coverages: coverages
    };
}

// Submit to API with timeout
async function submitQuote(data) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT_MS);

    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `Errore server: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
            throw new Error('Il servizio sta impiegando troppo tempo. Riprova piu tardi.');
        }
        if (error.message.includes('Failed to fetch')) {
            throw new Error('Errore di connessione al server. Verifica la tua connessione internet.');
        }
        throw error;
    }
}

// Show success results
function showSuccess(result) {
    form.classList.add('hidden');
    resultsSection.classList.add('active', 'success');
    resultsSection.classList.remove('error');

    resultsTitle.textContent = 'Preventivo Richiesto con Successo!';
    resultsContent.innerHTML = `
        <div class="norisk-quote-ref">
            Riferimento: ${result.quoteKey || 'N/A'}
        </div>
        <p>Grazie per la tua richiesta. Il nostro team ti contattera a breve con i dettagli del preventivo.</p>
        ${result.proposalUrl ? `<p><a href="${result.proposalUrl}" target="_blank">Visualizza proposta completa</a></p>` : ''}
    `;
}

// Show error message
function showError(message) {
    form.classList.add('hidden');
    resultsSection.classList.add('active', 'error');
    resultsSection.classList.remove('success');

    resultsTitle.textContent = 'Si è verificato un errore';
    resultsContent.innerHTML = `
        <div class="norisk-error-message">
            ${message}
        </div>
        <p>Si prega di riprovare. Se il problema persiste, contattaci telefonicamente.</p>
    `;
}

// Reset form for new quote
function resetForm() {
    form.reset();
    form.classList.remove('hidden');
    resultsSection.classList.remove('active', 'success', 'error');
    document.getElementById('startDate').min = new Date().toISOString().split('T')[0];
}
</script>

<?php get_footer(); ?>
```

**Step 2: Test template syntax**

Verify PHP syntax is valid:
```bash
cd norisk-wordpress
php -l page-preventivo.php
```

Expected: `No syntax errors detected in page-preventivo.php`

**Step 3: Commit**

```bash
git add norisk-wordpress/page-preventivo.php
git commit -m "feat: create WordPress page template for quote form

- Complete form with all 15+ required fields
- Embedded CSS matching Golinucci brand
- JavaScript form handling with fetch API
- Loading overlay with configurable timeout
- Success/error result display
- Responsive design for mobile"
```

---

## Task 3: Create Deployment Instructions

**Files:**
- Create: `norisk-wordpress/DEPLOYMENT.md`

**Step 1: Write deployment guide**

```markdown
# WordPress Form Deployment Guide

## Prerequisites
- WordPress admin access
- FTP/sFTP access to server
- VPS IP address for automation API

## Step 1: Update Configuration

Edit `page-preventivo.php` and update the API URL:

```php
const API_URL = 'http://YOUR_VPS_IP:3000/api/quote';
```

## Step 2: Upload to WordPress

1. Connect to your WordPress site via FTP
2. Navigate to: `wp-content/themes/`
3. Create folder: `royal-elementor-kit-child/`
4. Upload both files:
   - `style.css`
   - `page-preventivo.php`

## Step 3: Activate Child Theme

1. Log into WordPress admin
2. Go to Appearance → Themes
3. Activate "Royal Elementor Kit Child"

## Step 4: Create the Page

1. Go to Pages → Add New
2. Title: "Richiedi Preventivo Evento"
3. Page Attributes → Template: select "Preventivo Evento"
4. Publish the page
5. Note the URL (e.g., `/richiedi-preventivo-evento/`)

## Step 5: Add Link to Main Site

1. Edit the page where you want the button
2. Add a button linking to the new page
3. Button text: "Richiedi Preventivo"

## Step 6: Test

1. Visit the new page
2. Fill the form with test data
3. Submit and verify quote is generated
4. Check all error states work

## Troubleshooting

### CORS Errors
If you see CORS errors in browser console:
- Ensure your Express API has CORS enabled for golinucci.it
- Add to your Express app:
  ```javascript
  app.use(cors({ origin: 'https://golinucci.it' }));
  ```

### Form Not Styled
- Verify child theme is activated
- Clear browser cache
- Check that style.css is in the correct folder

### API Timeout
Adjust timeout in `page-preventivo.php`:
```php
const API_TIMEOUT_MS = 60000; // 60 seconds
```

### Page Template Not Showing
- Ensure file is named exactly `page-preventivo.php`
- Check that the PHP comment header is present
- Try re-uploading the file

## Maintenance

### Updating API URL
If your VPS IP changes, edit:
```php
const API_URL = 'http://NEW_IP:3000/api/quote';
```

### Adjusting Timeout
If quotes take longer to generate, increase:
```php
const API_TIMEOUT_MS = 45000; // 45 seconds
```

### Styling Changes
Modify `style.css` and re-upload. Changes are immediate.
```

**Step 2: Commit**

```bash
git add norisk-wordpress/DEPLOYMENT.md
git commit -m "docs: add WordPress deployment instructions

- Step-by-step upload guide
- Troubleshooting section
- Maintenance notes"
```

---

## Task 4: Test Locally (Optional Validation)

**Files:**
- Modify: `norisk-wordpress/page-preventivo.php` (test mode)

**Step 1: Create mock API response**

Add this temporarily at the top of the PHP file for testing:

```php
<?php
// TEST MODE - Uncomment for local testing without API
/*
if ($_SERVER['REQUEST_METHOD'] === 'POST' && strpos($_SERVER['HTTP_ACCEPT'], 'json') !== false) {
    header('Content-Type: application/json');
    echo json_encode([
        'success' => true,
        'quoteKey' => 'TEST-' . uniqid(),
        'proposalUrl' => 'https://example.com/proposal',
        'duration' => '5000ms'
    ]);
    exit;
}
*/
?>
```

**Step 2: Test form validation**

1. Open the HTML file in a browser
2. Try submitting without filling required fields
3. Verify HTML5 validation prevents submission
4. Fill all fields and submit
5. Verify mock response displays correctly

**Step 3: Remove test code**

Delete the test mode block before deploying.

**Step 4: Commit test documentation**

```bash
git commit -m "docs: add local testing instructions

- Mock API response for testing without backend
- Validation test checklist"
```

---

## Summary

After completing this plan you will have:

1. ✅ `norisk-wordpress/style.css` - Complete form styling
2. ✅ `norisk-wordpress/page-preventivo.php` - Full WordPress template
3. ✅ `norisk-wordpress/DEPLOYMENT.md` - Deployment instructions
4. ✅ Configurable API timeout (default 30s)
5. ✅ All 15+ form fields matching automation API
6. ✅ Loading states and error handling
7. ✅ Responsive design

**Next Step:** Deploy to WordPress using the deployment guide.

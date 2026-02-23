# Frontend Modularization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor the NoRisk WordPress frontend from a monolithic 1600-line template into modular, maintainable components with proper WordPress asset enqueuing.

**Architecture:** Split inline JavaScript into cacheable `.js` modules, extract PHP template parts, move CSS to proper enqueued file, add configurable settings for hardcoded URLs. Maintain exact backwards compatibility with existing HTML output and JavaScript globals.

**Tech Stack:** WordPress, PHP, vanilla JavaScript, CSS

---

## Prerequisites

Before starting, verify these files exist and are readable:
- `norisk-wordpress/page-preventivo.php` (source template)
- `norisk-wordpress/functions.php` (settings and AJAX handlers)
- `norisk-wordpress/style.css` (current styles)

Create directories:
```bash
mkdir -p norisk-wordpress/assets/css
mkdir -p norisk-wordpress/assets/js
mkdir -p norisk-wordpress/includes/template-parts
```

---

### Task 1: Move CSS File to Assets Directory

**Files:**
- Read: `norisk-wordpress/style.css`
- Create: `norisk-wordpress/assets/css/norisk-form.css`

**Step 1: Copy existing CSS content**

Read the current `style.css` file completely.

**Step 2: Create the new CSS file**

Create `norisk-wordpress/assets/css/norisk-form.css` with the exact same content as the original `style.css`.

**Step 3: Verify file was created**

Run: `ls -la norisk-wordpress/assets/css/`
Expected: `norisk-form.css` exists with non-zero size

**Step 4: Commit**

```bash
git add norisk-wordpress/assets/css/norisk-form.css
git commit -m "chore: move CSS to assets directory"
```

---

### Task 2: Extract norisk-form.js (Core Functionality)

**Files:**
- Read: `norisk-wordpress/page-preventivo.php:434-465` (CONFIG section)
- Read: `norisk-wordpress/page-preventivo.php:465-720` (LocalStorage functions)
- Read: `norisk-wordpress/page-preventivo.php:722-752` (date validation)
- Read: `norisk-wordpress/page-preventivo.php:850-863` (autosave)
- Read: `norisk-wordpress/page-preventivo.php:865-908` (form submit)
- Read: `norisk-wordpress/page-preventivo.php:910-1000` (collectFormData)
- Read: `norisk-wordpress/page-preventivo.php:1020-1052` (submitQuote)
- Read: `norisk-wordpress/page-preventivo.php:1380-1398` (showError)
- Read: `norisk-wordpress/page-preventivo.php:1400-1446` (resetForm)
- Create: `norisk-wordpress/assets/js/norisk-form.js`

**Step 1: Create base file structure**

Create `norisk-wordpress/assets/js/norisk-form.js`:

```javascript
/**
 * NoRisk Form - Core functionality
 * Dependencies: none (loaded first)
 */

// Global state
let lastFormData = null;
const FORM_STORAGE_KEY = 'norisk_form_data';

// DOM Elements (will be initialized after DOM ready)
let form, loadingOverlay, loadingBar, resultsSection, resultsTitle, resultsContent;

/**
 * Initialize DOM element references
 */
function initDomElements() {
    form = document.getElementById('quoteForm');
    loadingOverlay = document.getElementById('loadingOverlay');
    loadingBar = document.getElementById('loadingBar');
    resultsSection = document.getElementById('resultsSection');
    resultsTitle = document.getElementById('resultsTitle');
    resultsContent = document.getElementById('resultsContent');
}

/**
 * Save current form data to localStorage
 */
function saveFormToStorage() {
    const formData = collectFormData();
    localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(formData));
}

/**
 * Clear saved form data from localStorage
 */
function clearFormStorage() {
    localStorage.removeItem(FORM_STORAGE_KEY);
}

/**
 * Check if any coverages are selected in the form data
 */
function hasSelectedCoverages(formData) {
    if (!formData || !formData.coverages) return false;
    const c = formData.coverages;
    return c.cancellation_costs || c.liability || c.equipment || c.money || c.accident;
}

/**
 * Show modal asking user if they want to restore saved form data
 */
function showRestoreModal(savedData) {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.id = 'restoreModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;

    modal.innerHTML = `
        <div style="
            background: white;
            padding: 32px;
            border-radius: var(--radius-sm, 3px);
            max-width: 400px;
            width: 90%;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            font-family: 'Montserrat', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', sans-serif;
        ">
            <h3 style="margin: 0 0 16px 0; color: var(--text-main, #2C2C2C); font-size: 1.25rem; font-family: 'Montserrat', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', sans-serif;">Ripristinare i dati?</h3>
            <p style="margin: 0 0 24px 0; color: var(--text-body, #333); line-height: 1.6;">
                Abbiamo trovato dati precedenti relativi alle coperture selezionate.<br>
                Vuoi ripristinare le informazioni inserite in precedenza?
            </p>
            <div style="display: flex; gap: 12px; justify-content: center;">
                <button id="restoreYes" style="
                    padding: 12px 24px;
                    background: var(--brand-primary, #6B1C23);
                    color: white;
                    border: none;
                    border-radius: var(--radius-sm, 3px);
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                ">Sì, ripristina</button>
                <button id="restoreNo" style="
                    padding: 12px 24px;
                    background: transparent;
                    color: var(--brand-primary, #6B1C23);
                    border: 1px solid var(--brand-primary, #6B1C23);
                    border-radius: var(--radius-sm, 3px);
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                ">No, nuovo preventivo</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Handle button clicks
    document.getElementById('restoreYes').addEventListener('click', () => {
        restoreFormData(savedData);
        modal.remove();
    });

    document.getElementById('restoreNo').addEventListener('click', () => {
        clearFormStorage();
        modal.remove();
    });
}

/**
 * Restore form data from saved object
 */
function restoreFormData(data) {
    if (!data) return;

    // Personal info
    if (data.initials) document.getElementById('initials').value = data.initials;
    if (data.lastName) document.getElementById('lastName').value = data.lastName;
    if (data.phone) document.getElementById('phone').value = data.phone;
    if (data.email) document.getElementById('email').value = data.email;

    // Company info
    if (data.company_name) document.getElementById('company_name').value = data.company_name;
    if (data.company_commercial_number) document.getElementById('company_commercial_number').value = data.company_commercial_number;
    if (data.company_legal_form) document.getElementById('company_legal_form').value = data.company_legal_form;
    if (data.company_address) document.getElementById('company_address').value = data.company_address;
    if (data.company_house_number) document.getElementById('company_house_number').value = data.company_house_number;
    if (data.company_zipcode) document.getElementById('company_zipcode').value = data.company_zipcode;
    if (data.company_city) document.getElementById('company_city').value = data.company_city;
    if (data.company_country) document.getElementById('company_country').value = data.company_country;

    // Event info
    if (data.eventName) document.getElementById('eventName').value = data.eventName;
    if (data.eventType) document.getElementById('eventType').value = data.eventType;
    if (data.startDate) {
        document.getElementById('startDate').value = data.startDate;
        validateStartDate(document.getElementById('startDate'));
    }
    if (data.days) document.getElementById('days').value = data.days;
    if (data.visitors) document.getElementById('visitors').value = data.visitors;
    if (data.description) document.getElementById('description').value = data.description;

    // Location
    if (data.venueDescription) document.getElementById('venueDescription').value = data.venueDescription;
    if (data.address) document.getElementById('address').value = data.address;
    if (data.houseNumber) document.getElementById('houseNumber').value = data.houseNumber;
    if (data.zipcode) document.getElementById('zipcode').value = data.zipcode;
    if (data.city) document.getElementById('city').value = data.city;
    if (data.country) document.getElementById('country').value = data.country;
    if (data.environment) {
        const envRadio = document.querySelector(`input[name="environment"][value="${data.environment}"]`);
        if (envRadio) envRadio.checked = true;
    }

    // Coverages
    if (data.coverages) {
        const c = data.coverages;

        // Cancellation
        if (c.cancellation_costs) {
            const cb = document.getElementById('coverage_cancellation');
            if (cb) {
                cb.checked = true;
                cb.dispatchEvent(new Event('change'));
                if (c.budget) {
                    const el = document.getElementById('cancellation_total_cost');
                    if (el) {
                        el.value = parseInt(c.budget).toLocaleString('it-IT');
                        el.dataset.rawValue = c.budget;
                    }
                }
                if (c.cancellation_weather) {
                    const weatherCb = document.querySelector('input[name="cancellation_reasons"][value="extreme_weather"]');
                    if (weatherCb) weatherCb.checked = true;
                }
                if (c.cancellation_non_appearance) {
                    const nonAppCb = document.querySelector('input[name="cancellation_reasons"][value="non_appearance"]');
                    if (nonAppCb) {
                        nonAppCb.checked = true;
                        const container = document.getElementById('non_appearance_guests_container');
                        if (container) container.style.display = 'block';
                    }
                }
                if (c.cancellation_income) {
                    const profitCb = document.getElementById('cb_profit_max_50');
                    if (profitCb) {
                        profitCb.checked = true;
                        const container = document.getElementById('profit_max_50_container');
                        if (container) container.style.display = 'block';
                    }
                    if (c.cancellation_income_estimate) {
                        const el = document.getElementById('profit_estimate');
                        if (el) {
                            el.value = parseInt(c.cancellation_income_estimate).toLocaleString('it-IT');
                            el.dataset.rawValue = c.cancellation_income_estimate;
                        }
                    }
                }
            }
        }

        // Liability
        if (c.liability) {
            const cb = document.getElementById('coverage_liability');
            if (cb) {
                cb.checked = true;
                cb.dispatchEvent(new Event('change'));
                if (c.higher_liability) {
                    const radio = document.querySelector(`input[name="liability_amount"][value="${c.higher_liability}"]`);
                    if (radio) radio.checked = true;
                }
            }
        }

        // Equipment
        if (c.equipment) {
            const cb = document.getElementById('coverage_equipment');
            if (cb) {
                cb.checked = true;
                cb.dispatchEvent(new Event('change'));
                if (c.equipment_value) {
                    const el = document.getElementById('equipment_value');
                    if (el) {
                        el.value = parseInt(c.equipment_value).toLocaleString('it-IT');
                        el.dataset.rawValue = c.equipment_value;
                    }
                }
            }
        }

        // Money
        if (c.money) {
            const cb = document.getElementById('coverage_money');
            if (cb) {
                cb.checked = true;
                cb.dispatchEvent(new Event('change'));
                if (c.money_value) {
                    const el = document.getElementById('money_amount');
                    if (el) {
                        el.value = parseInt(c.money_value).toLocaleString('it-IT');
                        el.dataset.rawValue = c.money_value;
                    }
                }
            }
        }

        // Accidents
        if (c.accident) {
            const cb = document.getElementById('coverage_accidents');
            if (cb) {
                cb.checked = true;
                cb.dispatchEvent(new Event('change'));
                if (c.accident_man_days) {
                    const el = document.getElementById('accidents_employees');
                    if (el) el.value = c.accident_man_days;
                }
                if (c.accident_man_days_participants) {
                    const el = document.getElementById('accidents_participants');
                    if (el) el.value = c.accident_man_days_participants;
                }
                if (c.accident_man_days_participants_sport) {
                    const sportCb = document.querySelector('input[name="accidents_sport"]');
                    if (sportCb) sportCb.checked = true;
                }
            }
        }
    }
}

/**
 * Check for saved form data on page load
 */
function checkForSavedFormData() {
    const saved = localStorage.getItem(FORM_STORAGE_KEY);
    if (!saved) return;

    try {
        const savedData = JSON.parse(saved);
        if (!savedData) return;

        // If coverages are selected, ask user if they want to restore
        if (hasSelectedCoverages(savedData)) {
            showRestoreModal(savedData);
        } else {
            // No coverages selected, just restore silently
            restoreFormData(savedData);
        }
    } catch (e) {
        console.error('Error parsing saved form data:', e);
        clearFormStorage();
    }
}

/**
 * Validate start date is at least configured days from today
 */
function validateStartDate(input) {
    const selected = new Date(input.value);
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + window.noriskConfig.MIN_DAYS_ADVANCE);
    minDate.setHours(0, 0, 0, 0);
    selected.setHours(0, 0, 0, 0);
    const errorEl = document.getElementById('startDateError');
    if (selected < minDate) {
        errorEl.textContent = `La data dell'evento deve essere almeno ${window.noriskConfig.MIN_DAYS_ADVANCE} giorni dalla data odierna.`;
        errorEl.style.display = 'block';
        input.setCustomValidity(`La data deve essere almeno ${window.noriskConfig.MIN_DAYS_ADVANCE} giorni in anticipo.`);
    } else {
        errorEl.textContent = '';
        errorEl.style.display = 'none';
        input.setCustomValidity('');
    }
}

/**
 * Collect form data into API format
 */
function collectFormData() {
    // Build flat coverage object matching the scraper's expected field names
    const coverages = {};

    // Cancellation Costs
    const coverageCancellationEl = document.getElementById('coverage_cancellation');
    if (coverageCancellationEl?.checked) {
        coverages.cancellation_costs = true;
        const totalCostEl = document.getElementById('cancellation_total_cost');
        const totalCost = totalCostEl?.dataset.rawValue || totalCostEl?.value.replace(/[^0-9]/g, '');
        if (totalCost) coverages.budget = totalCost;

        const reasons = Array.from(document.querySelectorAll('input[name="cancellation_reasons"]:checked'))
                            .map(cb => cb.value);

        if (reasons.includes('non_appearance')) {
            coverages.cancellation_non_appearance = true;
            coverages.non_appearance_guests = collectGuests();
        }
        if (reasons.includes('extreme_weather')) {
            coverages.cancellation_weather = true;
        }
        if (reasons.includes('profit_max_50')) {
            coverages.cancellation_income = true;
            const profitEl = document.getElementById('profit_estimate');
            const profitEstimate = profitEl?.dataset.rawValue || profitEl?.value.replace(/[^0-9]/g, '');
            if (profitEstimate) coverages.cancellation_income_estimate = profitEstimate;
        }
    }

    // Liability
    const coverageLiabilityEl = document.getElementById('coverage_liability');
    if (coverageLiabilityEl?.checked) {
        coverages.liability = true;
        const liabilityRadio = document.querySelector('input[name="liability_amount"]:checked');
        coverages.higher_liability = liabilityRadio?.value || String(window.noriskConfig.LIABILITY_AMOUNT_1);
    }

    // Equipment
    const coverageEquipmentEl = document.getElementById('coverage_equipment');
    if (coverageEquipmentEl?.checked) {
        coverages.equipment = true;
        const equipmentEl = document.getElementById('equipment_value');
        const equipmentValue = equipmentEl?.dataset.rawValue || equipmentEl?.value.replace(/[^0-9]/g, '');
        if (equipmentValue) coverages.equipment_value = equipmentValue;
    }

    // Money
    const coverageMoneyEl = document.getElementById('coverage_money');
    if (coverageMoneyEl?.checked) {
        coverages.money = true;
        const moneyEl = document.getElementById('money_amount');
        const moneyAmount = moneyEl?.dataset.rawValue || moneyEl?.value.replace(/[^0-9]/g, '');
        if (moneyAmount) coverages.money_value = moneyAmount;
    }

    // Accidents
    const coverageAccidentsEl = document.getElementById('coverage_accidents');
    if (coverageAccidentsEl?.checked) {
        coverages.accident = true;
        const employeesEl = document.getElementById('accidents_employees');
        const participantsEl = document.getElementById('accidents_participants');
        const sportEl = document.querySelector('input[name="accidents_sport"]');
        if (employeesEl) coverages.accident_man_days = employeesEl.value;
        if (participantsEl) coverages.accident_man_days_participants = participantsEl.value;
        if (sportEl) coverages.accident_man_days_participants_sport = sportEl.checked;
    }

    const environmentRadio = document.querySelector('input[name="environment"]:checked');

    return {
        initials: document.getElementById('initials')?.value || '',
        lastName: document.getElementById('lastName')?.value || '',
        phone: document.getElementById('phone')?.value || '',
        email: document.getElementById('email')?.value || '',
        // Company info
        company_name: document.getElementById('company_name')?.value || '',
        company_commercial_number: document.getElementById('company_commercial_number')?.value || '',
        company_legal_form: document.getElementById('company_legal_form')?.value || '',
        company_address: document.getElementById('company_address')?.value || '',
        company_house_number: document.getElementById('company_house_number')?.value || '',
        company_zipcode: document.getElementById('company_zipcode')?.value || '',
        company_city: document.getElementById('company_city')?.value || '',
        company_country: document.getElementById('company_country')?.value || '',
        // Event info
        eventName: document.getElementById('eventName')?.value || '',
        eventType: document.getElementById('eventType')?.value || '',
        startDate: document.getElementById('startDate')?.value || '',
        days: parseInt(document.getElementById('days')?.value || '1'),
        visitors: parseInt(document.getElementById('visitors')?.value || '0'),
        description: document.getElementById('description')?.value || '',
        venueDescription: document.getElementById('venueDescription')?.value || '',
        address: document.getElementById('address')?.value || '',
        houseNumber: document.getElementById('houseNumber')?.value || '',
        zipcode: document.getElementById('zipcode')?.value || '',
        city: document.getElementById('city')?.value || '',
        country: document.getElementById('country')?.value || '',
        environment: environmentRadio?.value || 'outdoor',
        coverages: coverages
    };
}

/**
 * Collect non-appearance guests
 */
function collectGuests() {
    const guests = [];
    document.querySelectorAll('.norisk-guest-entry').forEach(entry => {
        const name = entry.querySelector('.norisk-guest-name')?.value || '';
        const birthdate = entry.querySelector('.norisk-guest-date')?.value || '';
        const isArtist = entry.querySelector('input[name="guest_artist[]"]')?.checked || false;
        if (name) {
            guests.push({
                name: name,
                birthdate: birthdate,
                artist: isArtist
            });
        }
    });
    return guests;
}

/**
 * Submit to API via WordPress AJAX proxy
 */
async function submitQuote(data) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), window.noriskConfig.API_TIMEOUT_MS);

    try {
        const response = await fetch(window.noriskConfig.AJAX_URL + '?action=norisk_submit_quote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        const json = await response.json().catch(() => ({}));

        if (!json.success) {
            throw new Error(json.data?.message || `Errore del server (${response.status}).`);
        }

        return json.data;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Il servizio sta impiegando troppo tempo. Riprova più tardi.');
        }
        if (error.message.includes('Failed to fetch')) {
            throw new Error('Errore di connessione al server. Verifica la tua connessione internet.');
        }
        throw error;
    }
}

/**
 * Show error message
 */
function showError(message) {
    form.classList.add('hidden');
    document.getElementById('formTitle').style.display = 'none';
    document.getElementById('formSubtitle').style.display = 'none';
    resultsSection.className = 'norisk-results active error';

    resultsTitle.textContent = 'Si è verificato un errore';
    resultsContent.innerHTML = `
        <div class="norisk-error-message">
            ${message}
        </div>
        <p>Si prega di riprovare. Se il problema persiste, contattaci telefonicamente.</p>
        <button type="button" class="norisk-new-quote-btn" onclick="resetForm()" style="margin-top: 24px;">
            Torna al modulo
        </button>
    `;
}

/**
 * Reset form for new quote
 */
function resetForm() {
    // Reset the results section to its original state
    resultsSection.className = 'norisk-results';
    resultsSection.innerHTML = `
        <h2 id="resultsTitle"></h2>
        <div id="resultsContent"></div>
    `;

    form.reset();
    form.classList.remove('hidden');
    document.getElementById('formTitle').style.display = '';
    document.getElementById('formSubtitle').style.display = '';
    resultsSection.classList.remove('active', 'success', 'error');
    lastFormData = null;

    // Clear saved form data when starting a new quote
    clearFormStorage();

    const minDate = new Date();
    minDate.setDate(minDate.getDate() + window.noriskConfig.MIN_DAYS_ADVANCE);
    document.getElementById('startDate').min = minDate.toISOString().split('T')[0];
    document.getElementById('startDateError').style.display = 'none';
    const profitContainer = document.getElementById('profit_max_50_container');
    if (profitContainer) profitContainer.style.display = 'none';

    // Reset coverage options visibility
    document.querySelectorAll('.norisk-coverage-options').forEach(el => el.classList.remove('active'));

    // Reset guests list
    const guestsList = document.getElementById('guests_list');
    if (guestsList) {
        guestsList.innerHTML = `
        <div class="norisk-guest-entry">
            <input type="text" name="guest_name[]" placeholder="Nome ospite" class="norisk-guest-name">
            <input type="date" name="guest_birthdate[]" class="norisk-guest-date">
            <label><input type="checkbox" name="guest_artist[]" value="1"> Artista</label>
        </div>
    `;
    }
    const nonAppearanceContainer = document.getElementById('non_appearance_guests_container');
    if (nonAppearanceContainer) nonAppearanceContainer.style.display = 'none';

    // Scroll to top of form
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initDomElements();

    // Set minimum date based on configured advance notice
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + window.noriskConfig.MIN_DAYS_ADVANCE);
    const startDateEl = document.getElementById('startDate');
    if (startDateEl) {
        startDateEl.min = minDate.toISOString().split('T')[0];
        startDateEl.addEventListener('change', function() { validateStartDate(this); });
    }

    // Check for saved form data on page load
    checkForSavedFormData();

    // Auto-save form data on input changes (debounced)
    let saveTimeout;
    form.addEventListener('input', function() {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(saveFormToStorage, 500);
    });

    // Also save on checkbox/radio changes
    form.addEventListener('change', function(e) {
        if (e.target.type === 'checkbox' || e.target.type === 'radio') {
            saveFormToStorage();
        }
    });

    // Form submission handler
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Store form data for summary
        lastFormData = collectFormData();

        // Save current state before submitting
        saveFormToStorage();

        // Show loading with progress bar
        loadingOverlay.classList.add('active');
        loadingBar.classList.add('animating');
        loadingBar.classList.remove('complete');
        loadingBar.style.width = '0%';

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.textContent = 'Richiesta in corso...';
        submitBtn.disabled = true;

        try {
            const result = await submitQuote(lastFormData);
            // Complete the loading bar animation
            loadingBar.classList.remove('animating');
            loadingBar.classList.add('complete');
            loadingBar.style.width = '100%';
            // Small delay to show completed bar before showing results
            await new Promise(resolve => setTimeout(resolve, 300));
            showSummary(result, lastFormData);
            // Clear saved form data on successful submission
            clearFormStorage();
        } catch (error) {
            console.error('Submission error:', error);
            showError(error.message || 'Si è verificato un errore imprevisto. Riprova più tardi.');
            // Keep saved form data on error so user can retry
        } finally {
            loadingOverlay.classList.remove('active');
            loadingBar.classList.remove('animating', 'complete');
            loadingBar.style.width = '0%';
            submitBtn.textContent = originalBtnText;
            submitBtn.disabled = false;
        }
    });
});
```

**Step 2: Verify file creation**

Run: `ls -la norisk-wordpress/assets/js/`
Expected: `norisk-form.js` exists with non-zero size

**Step 3: Commit**

```bash
git add norisk-wordpress/assets/js/norisk-form.js
git commit -m "feat: extract core form functionality to norisk-form.js"
```

---

### Task 3: Extract norisk-coverage.js (Coverage Handlers)

**Files:**
- Read: `norisk-wordpress/page-preventivo.php:754-788` (coverage toggles)
- Read: `norisk-wordpress/page-preventivo.php:790-805` (reasons toggle)
- Read: `norisk-wordpress/page-preventivo.php:807-835` (number formatting)
- Read: `norisk-wordpress/page-preventivo.php:837-849` (addGuest)
- Create: `norisk-wordpress/assets/js/norisk-coverage.js`

**Step 1: Create coverage handlers file**

Create `norisk-wordpress/assets/js/norisk-coverage.js`:

```javascript
/**
 * NoRisk Coverage - Coverage toggle handlers and form interactions
 * Dependencies: norisk-form.js (must be loaded first)
 */

document.addEventListener('DOMContentLoaded', function() {
    // Coverage toggle handlers (guarded: sections may be disabled in admin settings)
    const coverageCancellationEl = document.getElementById('coverage_cancellation');
    if (coverageCancellationEl) {
        coverageCancellationEl.addEventListener('change', function() {
            const optionsEl = document.getElementById('options_cancellation');
            if (optionsEl) optionsEl.classList.toggle('active', this.checked);
        });
    }

    const coverageLiabilityEl = document.getElementById('coverage_liability');
    if (coverageLiabilityEl) {
        coverageLiabilityEl.addEventListener('change', function() {
            const optionsEl = document.getElementById('options_liability');
            if (optionsEl) optionsEl.classList.toggle('active', this.checked);
        });
    }

    const coverageEquipmentEl = document.getElementById('coverage_equipment');
    if (coverageEquipmentEl) {
        coverageEquipmentEl.addEventListener('change', function() {
            const optionsEl = document.getElementById('options_equipment');
            if (optionsEl) optionsEl.classList.toggle('active', this.checked);
        });
    }

    const coverageMoneyEl = document.getElementById('coverage_money');
    if (coverageMoneyEl) {
        coverageMoneyEl.addEventListener('change', function() {
            const optionsEl = document.getElementById('options_money');
            if (optionsEl) optionsEl.classList.toggle('active', this.checked);
        });
    }

    const coverageAccidentsEl = document.getElementById('coverage_accidents');
    if (coverageAccidentsEl) {
        coverageAccidentsEl.addEventListener('change', function() {
            const optionsEl = document.getElementById('options_accidents');
            if (optionsEl) optionsEl.classList.toggle('active', this.checked);
        });
    }

    // Non-appearance guests toggle
    const cancellationReasons = document.querySelectorAll('input[name="cancellation_reasons"]');
    cancellationReasons.forEach(cb => {
        cb.addEventListener('change', function() {
            const container = document.getElementById('non_appearance_guests_container');
            if (!container) return;
            const nonAppearanceCb = document.querySelector('input[name="cancellation_reasons"][value="non_appearance"]');
            container.style.display = nonAppearanceCb?.checked ? 'block' : 'none';
        });
    });

    // Perdita Profitto toggle — show/hide stima guadagno
    const profitToggleEl = document.getElementById('cb_profit_max_50');
    if (profitToggleEl) {
        profitToggleEl.addEventListener('change', function() {
            const container = document.getElementById('profit_max_50_container');
            if (container) container.style.display = this.checked ? 'block' : 'none';
        });
    }

    // Thousands separator for number inputs with class norisk-number-formatted
    function formatThousands(input) {
        // Strip everything except digits
        let raw = input.value.replace(/[^0-9]/g, '');
        if (raw === '') { input.value = ''; return; }
        // Format with dots as thousands separator (Italian style)
        input.value = parseInt(raw, 10).toLocaleString('it-IT');
        // Store raw value in dataset for form submission
        input.dataset.rawValue = raw;
    }

    document.querySelectorAll('.norisk-number-formatted').forEach(function(input) {
        input.addEventListener('input', function() { formatThousands(this); });
        input.addEventListener('blur', function() { formatThousands(this); });
    });

    // Numeric currency inputs: cancellation_total_cost, equipment_value, money_amount
    ['cancellation_total_cost', 'equipment_value', 'money_amount'].forEach(function(id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.add('norisk-number-formatted');
        // Re-attach listener after adding class
        el.addEventListener('input', function() { formatThousands(this); });
        el.addEventListener('blur', function() { formatThousands(this); });
        // Change to text type so formatted string can be shown
        el.type = 'text';
        el.removeAttribute('min');
        el.setAttribute('inputmode', 'numeric');
    });
});

/**
 * Add guest function
 */
function addGuest() {
    const container = document.getElementById('guests_list');
    if (!container) return;

    const entry = document.createElement('div');
    entry.className = 'norisk-guest-entry';
    entry.innerHTML = `
        <input type="text" name="guest_name[]" placeholder="Nome ospite" class="norisk-guest-name">
        <input type="date" name="guest_birthdate[]" class="norisk-guest-date">
        <label><input type="checkbox" name="guest_artist[]" value="1"> Artista</label>
        <button type="button" class="norisk-remove-btn" onclick="this.parentElement.remove()">Rimuovi</button>
    `;
    container.appendChild(entry);
}
```

**Step 2: Commit**

```bash
git add norisk-wordpress/assets/js/norisk-coverage.js
git commit -m "feat: extract coverage handlers to norisk-coverage.js"
```

---

### Task 4: Extract norisk-summary.js (Results Display)

**Files:**
- Read: `norisk-wordpress/page-preventivo.php:1054-1172` (showSummary)
- Read: `norisk-wordpress/page-preventivo.php:1174-1281` (showSuccess - legacy)
- Read: `norisk-wordpress/page-preventivo.php:1283-1337` (checkQuoteStatus)
- Read: `norisk-wordpress/page-preventivo.php:1339-1378` (sendQuoteToUser)
- Create: `norisk-wordpress/assets/js/norisk-summary.js`

**Step 1: Create summary display file**

Create `norisk-wordpress/assets/js/norisk-summary.js`:

```javascript
/**
 * NoRisk Summary - Quote summary display and actions
 * Dependencies: norisk-form.js, norisk-coverage.js
 */

/**
 * Show summary of quote with user information
 */
function showSummary(result, formData) {
    const form = document.getElementById('quoteForm');
    const resultsSection = document.getElementById('resultsSection');

    form.classList.add('hidden');
    document.getElementById('formTitle').style.display = 'none';
    document.getElementById('formSubtitle').style.display = 'none';
    resultsSection.classList.add('active', 'success');
    resultsSection.classList.remove('error');

    const quoteKey = result.quoteKey || 'N/A';
    const pricing = result.pricing || {};
    // Parse Italian-format price (e.g. "1.530,65"): dots=thousands, comma=decimal
    const rawPriceStr = pricing.toPay || pricing.sumIncl || pricing.total;
    const rawPriceNum = rawPriceStr
        ? parseFloat(rawPriceStr.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, ''))
        : NaN;
    const finalPrice = !isNaN(rawPriceNum)
        ? (rawPriceNum + window.noriskConfig.SERVICE_FEE).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : (rawPriceStr || 'N/A');

    // Get event type label
    const eventTypeSelect = document.getElementById('eventType');
    const eventTypeLabel = eventTypeSelect ? eventTypeSelect.options[eventTypeSelect.selectedIndex].text : '';

    // Format date
    const startDate = new Date(formData.startDate);
    const formattedDate = startDate.toLocaleDateString('it-IT', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    // Get environment label
    const environmentLabels = {
        'outdoor': "All'aperto",
        'indoor': 'Al chiuso',
        'both': 'Entrambi'
    };
    const environmentLabel = environmentLabels[formData.environment] || formData.environment;

    // Build coverages HTML - only show selected coverages
    let coveragesHtml = '';

    if (formData.coverages.cancellation_costs) {
        const cancellationDetails = [];
        if (formData.coverages.cancellation_weather) {
            cancellationDetails.push('<div class="norisk-coverage-detail"><span class="label">Condizioni meteorologiche avverse</span><span class="value">inclusa</span></div>');
        }
        if (formData.coverages.cancellation_non_appearance) {
            cancellationDetails.push('<div class="norisk-coverage-detail"><span class="label">Mancata partecipazione artisti/ospiti</span><span class="value">Sì</span></div>');
        }
        if (formData.coverages.cancellation_income) {
            const profitEstVal = formData.coverages.cancellation_income_estimate;
            const profitDisplay = profitEstVal
                ? '\u20ac ' + parseInt(profitEstVal).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : 'fino al 50%';
            cancellationDetails.push(`<div class="norisk-coverage-detail"><span class="label">Perdita profitto</span><span class="value">${profitDisplay}</span></div>`);
        }

        const budgetFormatted = formData.coverages.budget ? '\u20ac ' + parseInt(formData.coverages.budget).toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : 'N/A';

        coveragesHtml += `
            <div class="norisk-coverage-block">
                <h4>Assicurazione Annullamento</h4>
                <div class="norisk-coverage-detail"><span class="label">Importo assicurato</span><span class="value">${budgetFormatted}</span></div>
                ${cancellationDetails.join('')}
            </div>
        `;
    }

    if (formData.coverages.liability) {
        const liabilityAmount = parseInt(formData.coverages.higher_liability || 2500000).toLocaleString('it-IT');
        coveragesHtml += `
            <div class="norisk-coverage-block">
                <h4>Responsabilità Civile</h4>
                <div class="norisk-coverage-detail"><span class="label">Massimale per sinistro</span><span class="value">\u20ac ${liabilityAmount},00</span></div>
                <div class="norisk-coverage-detail"><span class="label">Franchigia</span><span class="value">\u20ac ${window.noriskConfig.LIABILITY_DEDUCTIBLE.toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2})} per sinistro</span></div>
                <div class="norisk-coverage-detail"><span class="label">Numero di visitatori</span><span class="value">${formData.visitors}</span></div>
            </div>
        `;
    }

    if (formData.coverages.equipment) {
        const equipmentValue = formData.coverages.equipment_value ? '\u20ac ' + parseInt(formData.coverages.equipment_value).toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : 'N/A';
        coveragesHtml += `
            <div class="norisk-coverage-block">
                <h4>Danni ad Attrezzatura</h4>
                <div class="norisk-coverage-detail"><span class="label">Importo assicurato</span><span class="value">${equipmentValue}</span></div>
                <div class="norisk-coverage-detail"><span class="label">Franchigia</span><span class="value">\u20ac ${window.noriskConfig.LIABILITY_DEDUCTIBLE.toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2})} per sinistro</span></div>
            </div>
        `;
    }

    if (formData.coverages.accident) {
        const employees = formData.coverages.accident_man_days !== 'none' ? formData.coverages.accident_man_days : 'Nessuno';
        const participants = formData.coverages.accident_man_days_participants !== 'none' ? formData.coverages.accident_man_days_participants : 'Nessuno';
        const sport = formData.coverages.accident_man_days_participants_sport ? 'Sì' : 'No';

        coveragesHtml += `
            <div class="norisk-coverage-block">
                <h4>Infortuni</h4>
                <div class="norisk-coverage-detail"><span class="label">Numero assicurati (staff/partecipanti)</span><span class="value">${employees} / ${participants}</span></div>
                <div class="norisk-coverage-detail"><span class="label">Somma assicurata Invalidità Permanente</span><span class="value">\u20ac ${window.noriskConfig.ACCIDENTS_PERMANENT_DISABILITY.toLocaleString('it-IT')}</span></div>
                <div class="norisk-coverage-detail"><span class="label">Somma assicurata Morte</span><span class="value">\u20ac ${window.noriskConfig.ACCIDENTS_DEATH.toLocaleString('it-IT')}</span></div>
                <div class="norisk-coverage-detail"><span class="label">Sport incluso</span><span class="value">${sport}</span></div>
                <div class="norisk-coverage-detail" style="margin-top: 8px; font-size: 12px; color: var(--text-muted);">La copertura include i giorni di allestimento e di interruzione.</div>
            </div>
        `;
    }

    if (formData.coverages.money) {
        const moneyValue = formData.coverages.money_value ? '\u20ac ' + parseInt(formData.coverages.money_value).toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : 'N/A';
        coveragesHtml += `
            <div class="norisk-coverage-block">
                <h4>Denaro</h4>
                <div class="norisk-coverage-detail"><span class="label">Importo assicurato al giorno</span><span class="value">${moneyValue}</span></div>
            </div>
        `;
    }

    // Build full address strings
    const companyAddress = `${formData.company_address} ${formData.company_house_number}, ${formData.company_zipcode} ${formData.company_city}`;
    const eventAddress = `${formData.address} ${formData.houseNumber}, ${formData.zipcode} ${formData.city}`;

    // Get logo URLs from config (falling back to hardcoded for backwards compatibility)
    const logoUrl = window.noriskConfig.LOGO_URL || 'https://golinucci.it/wp-content/uploads/2026/02/WhatsApp-Image-2026-02-21-at-14.56.38-1.jpeg';
    const eventImageUrl = window.noriskConfig.EVENT_IMAGE_URL || 'https://golinucci.it/wp-content/uploads/2026/02/WhatsApp-Image-2026-02-21-at-14.56.38.jpeg';

    resultsSection.className = 'norisk-summary-container';
    resultsSection.innerHTML = `
        <div class="norisk-summary-header">
            <img src="${logoUrl}" alt="Golinucci Broker Assicurativo" class="norisk-logo-img" />
            <img src="${eventImageUrl}" alt="Assicurazione Evento" class="norisk-event-img" />
            <h2>Preventivo Assicurazione Evento</h2>
            <div class="norisk-quote-ref">Riferimento: ${quoteKey}</div>
        </div>

        <div class="norisk-summary-section">
            <h3>Chi si assicura</h3>
            <div class="norisk-summary-row">
                <span class="norisk-summary-label">Contraente</span>
                <span class="norisk-summary-value">${formData.company_name || 'N/A'}</span>
            </div>
            <div class="norisk-summary-row">
                <span class="norisk-summary-label">Indirizzo</span>
                <span class="norisk-summary-value">${companyAddress}</span>
            </div>
            <div class="norisk-summary-row">
                <span class="norisk-summary-label">Paese</span>
                <span class="norisk-summary-value">Italia</span>
            </div>
            <div class="norisk-summary-row">
                <span class="norisk-summary-label">Assicurato(i)</span>
                <span class="norisk-summary-value">${formData.company_name || 'N/A'}</span>
            </div>
        </div>

        <div class="norisk-summary-section">
            <h3>Informazioni Evento</h3>
            <div class="norisk-summary-row">
                <span class="norisk-summary-label">Titolo dell'evento</span>
                <span class="norisk-summary-value">${formData.eventName}</span>
            </div>
            <div class="norisk-summary-row">
                <span class="norisk-summary-label">Tipo di evento</span>
                <span class="norisk-summary-value">${eventTypeLabel}</span>
            </div>
            <div class="norisk-summary-row">
                <span class="norisk-summary-label">Descrizione</span>
                <span class="norisk-summary-value">${formData.description}</span>
            </div>
            <div class="norisk-summary-row">
                <span class="norisk-summary-label">Primo giorno dell'evento</span>
                <span class="norisk-summary-value">${formattedDate}</span>
            </div>
            <div class="norisk-summary-row">
                <span class="norisk-summary-label">Numero di giorni</span>
                <span class="norisk-summary-value">${formData.days}</span>
            </div>
            <div class="norisk-summary-row">
                <span class="norisk-summary-label">Posizione</span>
                <span class="norisk-summary-value">${formData.venueDescription || 'N/A'}</span>
            </div>
            <div class="norisk-summary-row">
                <span class="norisk-summary-label">Indirizzo</span>
                <span class="norisk-summary-value">${eventAddress}</span>
            </div>
            <div class="norisk-summary-row">
                <span class="norisk-summary-label">Ambiente</span>
                <span class="norisk-summary-value">${environmentLabel}</span>
            </div>
        </div>

        <div class="norisk-summary-section">
            <h3>Cosa si assicura</h3>
            ${coveragesHtml || '<p style="color: var(--text-muted);">Nessuna copertura selezionata</p>'}
        </div>

        <div class="norisk-summary-price">
            <div class="price-label">Costo polizza (incluse imposte e spese)</div>
            <div class="price-value">\u20ac ${finalPrice}</div>
        </div>

        <div class="norisk-summary-footer" style="text-align: center; margin: 24px 0; font-size: 14px; color: var(--text-muted); line-height: 1.8;">
            <div>Per leggere condizioni polizza : <a href="${window.noriskConfig.TERMS_URL || '#'}" target="_blank" rel="noopener" style="color: var(--brand-primary); text-decoration: underline;">clicca qui</a></div>
            <div>Per acquistare la polizza o ricevere ulteriori informazioni : <a href="mailto:eventi@golinucci.it" style="color: var(--brand-primary); text-decoration: underline;">eventi@golinucci.it</a></div>
        </div>

        <div class="norisk-summary-actions">
            <button type="button" class="norisk-print-btn" onclick="window.print()">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                ${window.noriskConfig.PRINT_BTN_TEXT}
            </button>
            <button type="button" class="norisk-new-quote-btn" onclick="resetForm()">
                ${window.noriskConfig.NEW_QUOTE_BTN_TEXT}
            </button>
        </div>
    `;
}

// Legacy showSuccess function - kept for backward compatibility
function showSuccess(result) {
    // Delegate to showSummary with collected form data
    if (typeof lastFormData !== 'undefined' && lastFormData) {
        showSummary(result, lastFormData);
    } else {
        // Fallback: create minimal formData from result
        showSummary(result, collectFormData());
    }
}

/**
 * Check quote status and update UI accordingly
 */
async function checkQuoteStatus(quoteKey) {
    const btn = document.getElementById('checkStatusBtn');
    const statusDiv = document.getElementById('actionStatus');

    btn.disabled = true;
    btn.textContent = 'Richiesta in corso...';

    try {
        const response = await fetch(
            window.noriskConfig.AJAX_URL + '?action=norisk_check_quote_status&quoteKey=' + encodeURIComponent(quoteKey),
            { method: 'GET' }
        );

        const json = await response.json().catch(() => ({}));
        if (!json.success) {
            throw new Error(json.data?.message || 'Errore durante la verifica');
        }

        const result = json.data;

        if (result.hasPdf) {
            // PDF is ready, update UI to show send button
            statusDiv.innerHTML = `
                <div class="norisk-success-message" style="color: #27ae60; padding: 15px; background: #f0fff4; border-radius: 4px;">
                    <strong>✓ Il preventivo è pronto!</strong>
                </div>
            `;
            btn.outerHTML = `
                <button type="button" class="norisk-submit-btn" onclick="sendQuoteToUser('${quoteKey}')" id="sendQuoteBtn">
                    Invia preventivo via email
                </button>
            `;
        } else {
            // Still waiting
            statusDiv.innerHTML = `
                <div class="norisk-warning-message" style="color: #f0ad4e; padding: 15px; background: #fff8e6; border-radius: 4px;">
                    <strong>⏳ Il preventivo è ancora in elaborazione...</strong><br>
                    Riprova tra qualche minuto.
                </div>
            `;
            btn.disabled = false;
            btn.textContent = 'Ricevi preventivo';
        }

    } catch (error) {
        btn.disabled = false;
        btn.textContent = 'Ricevi preventivo';
        statusDiv.innerHTML = `
            <div class="norisk-error-message" style="color: #e74c3c; padding: 15px; background: #fdf2f2; border-radius: 4px;">
                <strong>Errore:</strong> ${error.message}
            </div>
        `;
    }
}

/**
 * Send quote PDF to user
 */
async function sendQuoteToUser(quoteKey) {
    const btn = document.getElementById('sendQuoteBtn');
    const statusDiv = document.getElementById('actionStatus');

    btn.disabled = true;
    btn.textContent = 'Invio in corso...';

    try {
        const response = await fetch(window.noriskConfig.AJAX_URL + '?action=norisk_send_quote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quoteKey: quoteKey })
        });

        const json = await response.json().catch(() => ({}));
        if (!json.success) {
            throw new Error(json.data?.message || 'Errore durante l\'invio');
        }

        statusDiv.innerHTML = `
            <div class="norisk-success-message" style="color: #27ae60; padding: 15px; background: #f0fff4; border-radius: 4px;">
                <strong>✓ Il preventivo è stato inviato alla tua email!</strong><br>
                Controlla la tua casella di posta (anche nella cartella spam).
            </div>
        `;
        btn.style.display = 'none';

    } catch (error) {
        btn.disabled = false;
        btn.textContent = 'Invia preventivo via email';
        statusDiv.innerHTML = `
            <div class="norisk-error-message" style="color: #e74c3c; padding: 15px; background: #fdf2f2; border-radius: 4px;">
                <strong>Errore:</strong> ${error.message}
            </div>
        `;
    }
}
```

**Step 2: Commit**

```bash
git add norisk-wordpress/assets/js/norisk-summary.js
git commit -m "feat: extract summary display to norisk-summary.js"
```

---

### Task 5: Extract norisk-debug.js (Debug Tools)

**Files:**
- Read: `norisk-wordpress/page-preventivo.php:1449-1632` (debug panel)
- Create: `norisk-wordpress/assets/js/norisk-debug.js`

**Step 1: Create debug tools file**

Create `norisk-wordpress/assets/js/norisk-debug.js`:

```javascript
/**
 * NoRisk Debug Tools - Development and testing utilities
 * Dependencies: norisk-form.js, norisk-coverage.js, norisk-summary.js
 * Conditionally loaded based on show_debug_panel setting
 */

(function() {
    // Create debug container
    const debugContainer = document.createElement('div');
    debugContainer.id = 'norisk-debug-panel';
    debugContainer.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: white;
        padding: 20px;
        border: 2px solid #6B1C23;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        z-index: 99999;
        font-family: sans-serif;
        min-width: 200px;
    `;

    debugContainer.innerHTML = `
        <h4 style="margin: 0 0 15px 0; color: #2C2C2C; font-weight: bold; font-size: 16px; border-bottom: 1px solid #eee; padding-bottom: 10px;">🛠️ Debug Tools</h4>
        <div style="display: flex; flex-direction: column; gap: 10px;">
            <button id="debug-fill" style="padding: 8px 12px; cursor: pointer; background: #1a5276; color: white; border: none; border-radius: 4px; font-weight: 500;">Fill Fields</button>
            <button id="debug-success" style="padding: 8px 12px; cursor: pointer; background: #6B1C23; color: white; border: none; border-radius: 4px; font-weight: 500;">Simulate Success</button>
            <button id="debug-error" style="padding: 8px 12px; cursor: pointer; background: #dc2626; color: white; border: none; border-radius: 4px; font-weight: 500;">Simulate Error</button>
            <button id="debug-reset" style="padding: 8px 12px; cursor: pointer; background: #f3f4f6; color: #333; border: 1px solid #ccc; border-radius: 4px; font-weight: 500;">Reset Form</button>
            <button id="debug-remove" style="margin-top: 10px; font-size: 12px; color: #666; background: none; border: none; text-decoration: underline; cursor: pointer;">Remove Panel</button>
        </div>
    `;
    document.body.appendChild(debugContainer);

    // Mock Data
    const mockSuccessData = {
        quoteKey: 'TEST-QUOTE-' + Math.floor(Math.random() * 10000),
        status: 'draft',
        pricing: {
            sumExcl: '1.250,00',
            policyCosts: '15,00',
            insuranceTax: '265,65',
            toPay: '1.530,65'
        }
    };

    // Mock form data for summary display
    const mockFormData = {
        initials: 'Sig.',
        lastName: 'Rossi Mario',
        phone: '054722351',
        email: 'mario.rossi@example.com',
        company_name: 'Pro Loco Futuro',
        company_address: 'Via Roma',
        company_house_number: '3',
        company_zipcode: '47653',
        company_city: 'Cesena',
        eventName: 'Notte Bianca',
        eventType: '18',
        description: 'Concerto in piazza',
        startDate: '2026-03-15',
        days: 1,
        visitors: 2350,
        venueDescription: 'Piazza principale',
        address: 'Piazza Verdi',
        houseNumber: '3',
        zipcode: '47521',
        city: 'Cesena',
        country: 'it',
        environment: 'outdoor',
        coverages: {
            cancellation_costs: true,
            budget: '20000',
            cancellation_weather: true,
            cancellation_non_appearance: false,
            cancellation_income: false,
            liability: true,
            higher_liability: '5000000',
            equipment: false,
            accident: false
        }
    };

    // Fill Fields with pre-made test data
    document.getElementById('debug-fill').addEventListener('click', () => {
        // Personal
        document.getElementById('initials').value = 'Sig.';
        document.getElementById('lastName').value = 'Ferri Paolo';
        document.getElementById('phone').value = '054722351';
        document.getElementById('email').value = 'pgol@icloud.com';

        // Business
        document.getElementById('company_name').value = 'Pro loco futuro';
        document.getElementById('company_commercial_number').value = 'IT0239401920';
        document.getElementById('company_legal_form').value = 'association';
        document.getElementById('company_address').value = 'Via Roma';
        document.getElementById('company_house_number').value = '3';
        document.getElementById('company_zipcode').value = '47653';
        document.getElementById('company_city').value = 'Cesena';
        document.getElementById('company_country').value = 'it';

        // Event
        document.getElementById('eventName').value = 'Notte Bianca';
        document.getElementById('eventType').value = '18';
        document.getElementById('startDate').value = '2026-03-15';
        document.getElementById('startDate').dispatchEvent(new Event('change'));
        document.getElementById('days').value = '1';
        document.getElementById('visitors').value = '2350';
        document.getElementById('description').value = 'Concerto in piazza';

        // Location
        document.getElementById('venueDescription').value = 'Piazza';
        document.getElementById('address').value = 'Piazza verdi';
        document.getElementById('houseNumber').value = '3';
        document.getElementById('zipcode').value = '47521';
        document.getElementById('city').value = 'Cesena';
        document.getElementById('country').value = 'it';
        const outdoorRadio = document.querySelector('input[name="environment"][value="outdoor"]');
        if (outdoorRadio) outdoorRadio.checked = true;

        // Coverages — Cancellation
        const cbCanc = document.getElementById('coverage_cancellation');
        if (cbCanc) {
            cbCanc.checked = true;
            cbCanc.dispatchEvent(new Event('change'));
            const cancCostEl = document.getElementById('cancellation_total_cost');
            if (cancCostEl) {
                cancCostEl.value = '20.000';
                cancCostEl.dataset.rawValue = '20000';
            }
            const weatherCb = document.querySelector('input[name="cancellation_reasons"][value="extreme_weather"]');
            if (weatherCb) weatherCb.checked = true;
        }

        // Coverages — Liability
        const cbLiab = document.getElementById('coverage_liability');
        if (cbLiab) {
            cbLiab.checked = true;
            cbLiab.dispatchEvent(new Event('change'));
            const liabRadio = document.querySelector('input[name="liability_amount"][value="5000000"]');
            if (liabRadio) liabRadio.checked = true;
        }

        // Uncheck others
        const equipCb = document.getElementById('coverage_equipment');
        if (equipCb) {
            equipCb.checked = false;
            const equipOptions = document.getElementById('options_equipment');
            if (equipOptions) equipOptions.classList.remove('active');
        }
        const accidentCb = document.getElementById('coverage_accidents');
        if (accidentCb) {
            accidentCb.checked = false;
            const accidentOptions = document.getElementById('options_accidents');
            if (accidentOptions) accidentOptions.classList.remove('active');
        }

        console.info('NoRisk: form filled with test data.');
    });

    // Actions
    document.getElementById('debug-success').addEventListener('click', () => {
        const form = document.getElementById('quoteForm');
        if (form) form.classList.add('hidden');

        // Store mock form data for summary
        window.lastFormData = mockFormData;

        if (typeof showSummary === 'function') {
            showSummary(mockSuccessData, mockFormData);
        } else {
            alert('Error: showSummary() function not found on page.');
        }
    });

    document.getElementById('debug-error').addEventListener('click', () => {
        const form = document.getElementById('quoteForm');
        if (form) form.classList.add('hidden');

        if (typeof showError === 'function') {
            showError('Si è verificato un errore durante la comunicazione con il server NoRisk (Errore 500). Per favore riprova più tardi o contatta l\'assistenza.');
        } else {
            alert('Error: showError() function not found on page.');
        }
    });

    document.getElementById('debug-reset').addEventListener('click', () => {
        if (typeof resetForm === 'function') {
            resetForm();
        } else {
            window.location.reload();
        }
    });

    document.getElementById('debug-remove').addEventListener('click', () => {
        debugContainer.remove();
    });

    console.info('NoRisk Debug Tools Loaded');
})();
```

**Step 2: Commit**

```bash
git add norisk-wordpress/assets/js/norisk-debug.js
git commit -m "feat: extract debug tools to norisk-debug.js"
```

---

### Task 6: Add Image URL Settings to functions.php

**Files:**
- Modify: `norisk-wordpress/functions.php:28-71` (norisk_get_options defaults)
- Modify: `norisk-wordpress/functions.php:246-256` (text fields registration)
- Modify: `norisk-wordpress/functions.php:388-401` (sanitize_options)

**Step 1: Add new settings defaults**

In `norisk_get_options()`, add after line 37 (`terms_url`):
```php
'logo_url'             => 'https://golinucci.it/wp-content/uploads/2026/02/WhatsApp-Image-2026-02-21-at-14.56.38-1.jpeg',
'event_image_url'      => 'https://golinucci.it/wp-content/uploads/2026/02/WhatsApp-Image-2026-02-21-at-14.56.38.jpeg',
```

**Step 2: Register the new fields**

In the `$text_fields` array around line 246, add:
```php
'logo_url'             => 'URL Logo (Preventivo)',
'event_image_url'      => 'URL Immagine Evento (Preventivo)',
```

**Step 3: Add sanitization for URL fields**

In `norisk_sanitize_options()` around line 399, add:
```php
$sanitized['logo_url']        = esc_url_raw( $input['logo_url']        ?? 'https://golinucci.it/wp-content/uploads/2026/02/WhatsApp-Image-2026-02-21-at-14.56.38-1.jpeg' );
$sanitized['event_image_url'] = esc_url_raw( $input['event_image_url'] ?? 'https://golinucci.it/wp-content/uploads/2026/02/WhatsApp-Image-2026-02-21-at-14.56.38.jpeg' );
```

**Step 4: Verify settings page works**

Run: `git diff norisk-wordpress/functions.php`
Expected: Changes only in the three locations above

**Step 5: Commit**

```bash
git add norisk-wordpress/functions.php
git commit -m "feat: add configurable logo and event image URLs"
```

---

### Task 7: Add Asset Enqueuing to functions.php

**Files:**
- Modify: `norisk-wordpress/functions.php` (add enqueue function)

**Step 1: Add enqueue function before closing PHP tag**

Add at the end of `functions.php`, before the closing `?>`:

```php
// =========================================
// Asset Enqueuing
// =========================================

/**
 * Enqueue NoRisk form assets on preventivo page
 */
add_action( 'wp_enqueue_scripts', 'norisk_enqueue_assets' );
function norisk_enqueue_assets(): void {
    // Only enqueue on preventivo page template
    if ( ! is_page_template( 'page-preventivo.php' ) ) {
        return;
    }

    $opts    = norisk_get_options();
    $base_js = get_stylesheet_directory_uri() . '/assets/js/';
    $base_css = get_stylesheet_directory_uri() . '/assets/css/';

    // CSS
    wp_enqueue_style(
        'norisk-form',
        $base_css . 'norisk-form.css',
        [],
        null
    );

    // JS: Core form functionality (loaded first)
    wp_enqueue_script(
        'norisk-form',
        $base_js . 'norisk-form.js',
        [],
        null,
        true // Load in footer
    );

    // JS: Coverage handlers
    wp_enqueue_script(
        'norisk-coverage',
        $base_js . 'norisk-coverage.js',
        [ 'norisk-form' ],
        null,
        true
    );

    // JS: Summary display
    wp_enqueue_script(
        'norisk-summary',
        $base_js . 'norisk-summary.js',
        [ 'norisk-coverage' ],
        null,
        true
    );

    // Localized configuration (replaces inline CONFIG)
    wp_localize_script( 'norisk-form', 'noriskConfig', [
        'AJAX_URL'                     => admin_url( 'admin-ajax.php' ),
        'API_TIMEOUT_MS'               => (int) $opts['api_timeout'] * 1000,
        'MIN_DAYS_ADVANCE'             => (int) $opts['min_days_advance'],
        'NEW_QUOTE_BTN_TEXT'           => $opts['new_quote_btn_text'],
        'PRINT_BTN_TEXT'               => $opts['print_btn_text'],
        'LIABILITY_AMOUNT_1'           => (int) $opts['liability_amount_1'],
        'LIABILITY_AMOUNT_2'           => (int) $opts['liability_amount_2'],
        'ACCIDENTS_PERMANENT_DISABILITY' => (int) $opts['accidents_permanent_disability'],
        'ACCIDENTS_DEATH'              => (int) $opts['accidents_death'],
        'LIABILITY_DEDUCTIBLE'         => (int) $opts['liability_deductible'],
        'SERVICE_FEE'                  => (int) ( $opts['service_fee'] ?? 15 ),
        'TERMS_URL'                    => $opts['terms_url'] ?? '',
        'LOGO_URL'                     => $opts['logo_url'] ?? '',
        'EVENT_IMAGE_URL'              => $opts['event_image_url'] ?? '',
    ] );

    // Debug tools (conditionally loaded)
    if ( ! empty( $opts['show_debug_panel'] ) ) {
        wp_enqueue_script(
            'norisk-debug',
            $base_js . 'norisk-debug.js',
            [ 'norisk-summary' ],
            null,
            true
        );
    }
}
```

**Step 2: Verify syntax**

Run: `php -l norisk-wordpress/functions.php`
Expected: `No syntax errors detected`

**Step 3: Commit**

```bash
git add norisk-wordpress/functions.php
git commit -m "feat: add WordPress asset enqueuing for modular JS"
```

---

### Task 8: Create Slimmed page-preventivo.php Template

**Files:**
- Read: `norisk-wordpress/page-preventivo.php` (entire file for reference)
- Create: `norisk-wordpress/page-preventivo.php` (replace with slimmed version)

**Step 1: Create new slim template**

Replace `norisk-wordpress/page-preventivo.php` with:

```php
<?php
/**
 * Template Name: Preventivo Evento
 * Description: Form for requesting event insurance quotes
 */

// Load all configurable options (with defaults)
$norisk = norisk_get_options();

get_header();
?>

<div class="norisk-form-container">
    <h1 id="formTitle"><?php echo esc_html( $norisk['page_title'] ); ?></h1>
    <p id="formSubtitle"><?php echo esc_html( $norisk['page_subtitle'] ); ?></p>

    <!-- Loading Overlay -->
    <div id="loadingOverlay" class="norisk-loading-overlay">
        <div class="norisk-loading-bar-container">
            <div id="loadingBar" class="norisk-loading-bar"></div>
        </div>
        <p class="norisk-loading-text"><?php echo esc_html( $norisk['loading_text'] ); ?></p>
        <p class="norisk-loading-subtext"><?php echo esc_html( $norisk['loading_subtext'] ); ?></p>
    </div>

    <!-- Quote Form -->
    <form id="quoteForm" method="post">

        <!-- Personal Information -->
        <div class="norisk-form-section">
            <h3><?php echo esc_html( $norisk['section_personal_title'] ); ?></h3>
            <div class="norisk-form-row">
                <div class="norisk-form-group">
                    <label for="initials">Titolo *</label>
                    <select id="initials" name="initials" required>
                        <option value="">Seleziona...</option>
                        <option value="Sig.">Sig.</option>
                        <option value="Sign.ra">Sign.ra</option>
                    </select>
                </div>
                <div class="norisk-form-group">
                    <label for="lastName">Cognome Nome *</label>
                    <input type="text" id="lastName" name="lastName" required placeholder="Es. Rossi Mario">
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

            <!-- Dati Aziendali -->
            <h4 class="norisk-subsection-title"><?php echo esc_html( $norisk['section_company_title'] ); ?></h4>
            <div class="norisk-form-row">
                <div class="norisk-form-group">
                    <label for="company_name">Ragione Sociale *</label>
                    <input type="text" id="company_name" name="company_name" required placeholder="Es. Mario Rossi S.r.l.">
                </div>
                <div class="norisk-form-group">
                    <label for="company_commercial_number">Partita IVA *</label>
                    <input type="text" id="company_commercial_number" name="company_commercial_number" required placeholder="Es. IT12345678901">
                </div>
            </div>
            <div class="norisk-form-row">
                <div class="norisk-form-group full-width">
                    <label for="company_legal_form">Forma Giuridica *</label>
                    <select id="company_legal_form" name="company_legal_form" required>
                        <option value="">Seleziona...</option>
                        <option value="association">Associazione</option>
                        <option value="church">Ente Religioso</option>
                        <option value="cooperative_and_mutual_insurance_company">Cooperativa / Società di Mutuo Soccorso</option>
                        <option value="foundation">Fondazione</option>
                        <option value="general_partnership">Società in Nome Collettivo (S.n.c.)</option>
                        <option value="limited_partnership">Società in Accomandita Semplice (S.a.s.)</option>
                        <option value="partnership">Società di Persone</option>
                        <option value="private_limited_company">Società a Responsabilità Limitata (S.r.l.)</option>
                        <option value="public_legal_entity">Ente Pubblico</option>
                        <option value="public_limited_company">Società per Azioni (S.p.A.)</option>
                        <option value="sole_proprietorship">Ditta Individuale</option>
                    </select>
                </div>
            </div>
            <div class="norisk-form-row">
                <div class="norisk-form-group">
                    <label for="company_address">Indirizzo *</label>
                    <input type="text" id="company_address" name="company_address" required>
                </div>
                <div class="norisk-form-group">
                    <label for="company_house_number">Numero Civico *</label>
                    <input type="text" id="company_house_number" name="company_house_number" required>
                </div>
            </div>
            <div class="norisk-form-row">
                <div class="norisk-form-group">
                    <label for="company_zipcode">CAP *</label>
                    <input type="text" id="company_zipcode" name="company_zipcode" required>
                </div>
                <div class="norisk-form-group">
                    <label for="company_city">Città *</label>
                    <input type="text" id="company_city" name="company_city" required>
                </div>
            </div>
            <div class="norisk-form-row">
                <div class="norisk-form-group full-width">
                    <label for="company_country">Paese *</label>
                    <select id="company_country" name="company_country" required>
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

        <!-- Event Information -->
        <div class="norisk-form-section">
            <h3><?php echo esc_html( $norisk['section_event_title'] ); ?></h3>
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
                    <span id="startDateError" class="norisk-field-error" style="display:none; color:#e74c3c; font-size:0.85em; margin-top:4px;"></span>
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
            <h3><?php echo esc_html( $norisk['section_location_title'] ); ?></h3>
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
            <div class="norisk-form-row">
                <div class="norisk-form-group full-width">
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
                        <label>
                            <input type="radio" name="environment" value="both">
                            Entrambi
                        </label>
                    </div>
                </div>
            </div>
        </div>

        <!-- Coverage Options -->
        <div class="norisk-form-section">
            <h3><?php echo esc_html( $norisk['section_coverage_title'] ); ?></h3>
            <p class="norisk-coverage-note"><?php echo esc_html( $norisk['coverage_note'] ); ?></p>

            <?php if ( $norisk['show_coverage_cancellation'] ): ?>
            <!-- Cancellation Costs -->
            <div class="norisk-coverage-item">
                <label class="norisk-coverage-toggle">
                    <input type="checkbox" id="coverage_cancellation" name="coverage_cancellation" value="1">
                    <span class="norisk-coverage-title">Costi di Annullamento</span>
                </label>
                <div class="norisk-coverage-options" id="options_cancellation">
                    <div class="norisk-form-group">
                        <label for="cancellation_total_cost">Qual è il costo totale per organizzare questo evento?</label>
                        <input type="number" id="cancellation_total_cost" name="cancellation_total_cost" min="0" placeholder="€">
                    </div>
                    <div class="norisk-checkbox-group">
                        <?php if ( $norisk['show_cancellation_non_appearance'] ): ?>
                        <label>
                            <input type="checkbox" name="cancellation_reasons" value="non_appearance">
                            Annullamento per mancata partecipazione (artista/ospite)
                        </label>
                        <div class="norisk-sub-options" id="non_appearance_guests_container" style="display: none; margin-left: 30px;">
                            <div id="guests_list">
                                <div class="norisk-guest-entry">
                                    <input type="text" name="guest_name[]" placeholder="Nome ospite" class="norisk-guest-name">
                                    <input type="date" name="guest_birthdate[]" class="norisk-guest-date">
                                    <label><input type="checkbox" name="guest_artist[]" value="1"> Artista</label>
                                </div>
                            </div>
                            <button type="button" onclick="addGuest()" class="norisk-add-btn">+ Aggiungi ospite</button>
                        </div>
                        <?php endif; ?>
                        <?php if ( $norisk['show_cancellation_weather'] ): ?>
                        <label>
                            <input type="checkbox" name="cancellation_reasons" value="extreme_weather">
                            Annullamento per condizioni meteorologiche estreme
                        </label>
                        <?php endif; ?>
                        <?php if ( $norisk['show_cancellation_profit'] ): ?>
                        <label>
                            <input type="checkbox" name="cancellation_reasons" value="profit_max_50" id="cb_profit_max_50">
                            Perdita Profitto (fino a massimo 50% dei costi di annullamento)
                        </label>
                        <div class="norisk-sub-options" id="profit_max_50_container" style="display: none; margin-left: 30px; margin-top: 8px;">
                            <div class="norisk-form-group">
                                <label for="profit_estimate">Stima guadagno</label>
                                <input type="text" id="profit_estimate" name="profit_estimate" placeholder="€" class="norisk-number-formatted">
                            </div>
                        </div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
            <?php endif; ?>

            <?php if ( $norisk['show_coverage_liability'] ): ?>
            <!-- Liability -->
            <div class="norisk-coverage-item">
                <label class="norisk-coverage-toggle">
                    <input type="checkbox" id="coverage_liability" name="coverage_liability" value="1">
                    <span class="norisk-coverage-title">Responsabilità Civile</span>
                </label>
                <div class="norisk-coverage-options" id="options_liability">
                    <div class="norisk-form-group">
                        <label>Per quale importo vuoi assicurare la tua responsabilità?</label>
                        <div class="norisk-radio-group">
                            <label>
                                <input type="radio" name="liability_amount" value="<?php echo (int) $norisk['liability_amount_1']; ?>">
                                € <?php echo number_format( (int) $norisk['liability_amount_1'], 0, ',', '.' ); ?>
                            </label>
                            <label>
                                <input type="radio" name="liability_amount" value="<?php echo (int) $norisk['liability_amount_2']; ?>">
                                € <?php echo number_format( (int) $norisk['liability_amount_2'], 0, ',', '.' ); ?>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
            <?php endif; ?>

            <?php if ( $norisk['show_coverage_equipment'] ): ?>
            <!-- Equipment -->
            <div class="norisk-coverage-item">
                <label class="norisk-coverage-toggle">
                    <input type="checkbox" id="coverage_equipment" name="coverage_equipment" value="1">
                    <span class="norisk-coverage-title">Attrezzature</span>
                </label>
                <div class="norisk-coverage-options" id="options_equipment">
                    <div class="norisk-form-group">
                        <label for="equipment_value">Valore del materiale da assicurare</label>
                        <input type="number" id="equipment_value" name="equipment_value" min="0" placeholder="€">
                    </div>
                </div>
            </div>
            <?php endif; ?>

            <?php if ( $norisk['show_coverage_money'] ): ?>
            <!-- Money -->
            <div class="norisk-coverage-item">
                <label class="norisk-coverage-toggle">
                    <input type="checkbox" id="coverage_money" name="coverage_money" value="1">
                    <span class="norisk-coverage-title">Denaro</span>
                </label>
                <div class="norisk-coverage-options" id="options_money">
                    <div class="norisk-form-group">
                        <label for="money_amount">Quanto denaro vuoi assicurare ogni giorno?</label>
                        <input type="number" id="money_amount" name="money_amount" min="0" placeholder="€">
                    </div>
                </div>
            </div>
            <?php endif; ?>

            <?php if ( $norisk['show_coverage_accidents'] ): ?>
            <!-- Accidents -->
            <div class="norisk-coverage-item">
                <label class="norisk-coverage-toggle">
                    <input type="checkbox" id="coverage_accidents" name="coverage_accidents" value="1">
                    <span class="norisk-coverage-title">Infortuni</span>
                </label>
                <div class="norisk-coverage-options" id="options_accidents">
                    <div class="norisk-form-group">
                        <label for="accidents_employees">Numero di dipendenti (in giorni-uomo)</label>
                        <select id="accidents_employees" name="accidents_employees">
                            <option value="none">Nessuno</option>
                            <option value="1-50">1 - 50</option>
                            <option value="51-100">51 - 100</option>
                            <option value="101-250">101 - 250</option>
                            <option value="251-500">251 - 500</option>
                            <option value="501-1000">501 - 1000</option>
                            <option value="1001-1500">1001 - 1500</option>
                            <option value="1501-2000">1501 - 2000</option>
                            <option value="2001-2500">2001 - 2500</option>
                            <option value="2501-3000">2501 - 3000</option>
                            <option value="3001-3500">3001 - 3500</option>
                            <option value="3501-4000">3501 - 4000</option>
                            <option value="4001-5000">4001 - 5000</option>
                        </select>
                    </div>
                    <div class="norisk-form-group">
                        <label for="accidents_participants">Numero di partecipanti (in giorni-uomo)</label>
                        <select id="accidents_participants" name="accidents_participants">
                            <option value="none">Nessuno</option>
                            <option value="1-50">1 - 50</option>
                            <option value="51-100">51 - 100</option>
                            <option value="101-250">101 - 250</option>
                            <option value="251-500">251 - 500</option>
                            <option value="501-1000">501 - 1000</option>
                            <option value="1001-1500">1001 - 1500</option>
                            <option value="1501-2000">1501 - 2000</option>
                            <option value="2001-2500">2001 - 2500</option>
                            <option value="2501-3000">2501 - 3000</option>
                            <option value="3001-3500">3001 - 3500</option>
                            <option value="3501-4000">3501 - 4000</option>
                            <option value="4001-5000">4001 - 5000</option>
                            <option value="5001-6000">5001 - 6000</option>
                            <option value="6001-7000">6001 - 7000</option>
                            <option value="7001-8000">7001 - 8000</option>
                            <option value="8001-9000">8001 - 9000</option>
                            <option value="9001-10000">9001 - 10000</option>
                        </select>
                    </div>
                    <div class="norisk-checkbox-group">
                        <label>
                            <input type="checkbox" name="accidents_sport" value="1">
                            Sport incluso
                        </label>
                    </div>
                </div>
            </div>
            <?php endif; ?>
        </div>

        <!-- Privacy -->
        <div class="norisk-privacy-row">
            <input type="checkbox" id="privacyAccept" name="privacyAccept" required>
            <label for="privacyAccept"><?php echo esc_html( $norisk['privacy_label'] ); ?> <a href="<?php echo esc_url( $norisk['privacy_url'] ); ?>" target="_blank">informativa sulla privacy</a> <span style="color: var(--brand-primary);">*</span></label>
        </div>

        <!-- Submit -->
        <button type="submit" class="norisk-submit-btn"><?php echo esc_html( $norisk['submit_btn_text'] ); ?></button>
    </form>

    <!-- Results Section -->
    <div id="resultsSection" class="norisk-results">
        <h2 id="resultsTitle"></h2>
        <div id="resultsContent"></div>
    </div>
</div>

<?php
get_footer();
```

**Step 2: Verify syntax**

Run: `php -l norisk-wordpress/page-preventivo.php`
Expected: `No syntax errors detected`

**Step 3: Verify line count reduction**

Run: `wc -l norisk-wordpress/page-preventivo.php`
Expected: ~280 lines (down from 1637)

**Step 4: Commit**

```bash
git add norisk-wordpress/page-preventivo.php
git commit -m "refactor: slim down page template, move JS to enqueued files"
```

---

### Task 9: Final Verification and Cleanup

**Files:**
- All files in `norisk-wordpress/assets/`
- `norisk-wordpress/functions.php`
- `norisk-wordpress/page-preventivo.php`

**Step 1: Verify all assets exist**

Run:
```bash
ls -la norisk-wordpress/assets/css/
ls -la norisk-wordpress/assets/js/
```

Expected:
- `norisk-form.css` exists
- `norisk-form.js` exists
- `norisk-coverage.js` exists
- `norisk-summary.js` exists
- `norisk-debug.js` exists

**Step 2: Verify no inline scripts remain in template**

Run: `grep -n "<script" norisk-wordpress/page-preventivo.php`
Expected: No output (no inline script tags)

**Step 3: Verify no inline style include**

Run: `grep -n "include 'style.css'" norisk-wordpress/page-preventivo.php`
Expected: No output

**Step 4: Test file count**

Run: `git diff --stat HEAD~8`
Expected: Shows all files changed with appropriate line counts

**Step 5: Final commit**

```bash
git commit --allow-empty -m "refactor: complete frontend modularization

- Extract inline JavaScript to cacheable .js modules
- Add WordPress proper asset enqueuing
- Add configurable settings for logo/event images
- Reduce page-preventivo.php from 1637 to ~280 lines
- Maintain full backwards compatibility"
```

---

## Testing Checklist

After implementation, verify:

1. **Form loads without JavaScript errors** (check browser console)
2. **CSS loads correctly** (form styling appears)
3. **Coverage toggles work** (click coverage checkbox, options appear)
4. **Number formatting works** (type 10000, see 10.000)
5. **Form submission works** (submit form, get quote)
6. **Summary displays correctly** (all coverage details shown)
7. **LocalStorage persistence works** (refresh page, data restored)
8. **Print button works**
9. **Reset button works**
10. **Debug panel loads when enabled** (enable in settings, panel appears)

---

## Rollback Plan

If issues are found:

```bash
# Revert to original
git checkout HEAD~8 -- norisk-wordpress/page-preventivo.php
git checkout HEAD~8 -- norisk-wordpress/functions.php

# Remove new files
rm -rf norisk-wordpress/assets/
rm -rf norisk-wordpress/includes/

git commit -m "revert: rollback frontend modularization"
```

/**
 * NoRisk Form - Core Form Functionality
 * Handles form data collection, validation, storage, and submission
 */

// DOM Elements
let form;
let loadingOverlay;
let loadingBar;
let resultsSection;
let resultsTitle;
let resultsContent;

// Store form data for summary display
let lastFormData = null;

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

// LocalStorage key for form data
const FORM_STORAGE_KEY = 'norisk_form_data';

// =========================================
// LocalStorage Form Persistence
// =========================================

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
            cb.checked = true;
            cb.dispatchEvent(new Event('change'));
            if (c.budget) {
                const el = document.getElementById('cancellation_total_cost');
                el.value = parseInt(c.budget).toLocaleString('it-IT');
                el.dataset.rawValue = c.budget;
            }
            if (c.cancellation_weather) {
                document.querySelector('input[name="cancellation_reasons"][value="extreme_weather"]').checked = true;
            }
            if (c.cancellation_non_appearance) {
                document.querySelector('input[name="cancellation_reasons"][value="non_appearance"]').checked = true;
                document.getElementById('non_appearance_guests_container').style.display = 'block';
            }
            if (c.cancellation_income) {
                document.getElementById('cb_profit_max_50').checked = true;
                document.getElementById('profit_max_50_container').style.display = 'block';
                if (c.cancellation_income_estimate) {
                    const el = document.getElementById('profit_estimate');
                    el.value = parseInt(c.cancellation_income_estimate).toLocaleString('it-IT');
                    el.dataset.rawValue = c.cancellation_income_estimate;
                }
            }
        }

        // Liability
        if (c.liability) {
            const cb = document.getElementById('coverage_liability');
            cb.checked = true;
            cb.dispatchEvent(new Event('change'));
            if (c.higher_liability) {
                const radio = document.querySelector(`input[name="liability_amount"][value="${c.higher_liability}"]`);
                if (radio) radio.checked = true;
            }
        }

        // Equipment
        if (c.equipment) {
            const cb = document.getElementById('coverage_equipment');
            cb.checked = true;
            cb.dispatchEvent(new Event('change'));
            if (c.equipment_value) {
                const el = document.getElementById('equipment_value');
                el.value = parseInt(c.equipment_value).toLocaleString('it-IT');
                el.dataset.rawValue = c.equipment_value;
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
                    el.value = parseInt(c.money_value).toLocaleString('it-IT');
                    el.dataset.rawValue = c.money_value;
                }
            }
        }

        // Accidents
        if (c.accident) {
            const cb = document.getElementById('coverage_accidents');
            if (cb) {
                cb.checked = true;
                cb.dispatchEvent(new Event('change'));
                if (c.accident_man_days) document.getElementById('accidents_employees').value = c.accident_man_days;
                if (c.accident_man_days_participants) document.getElementById('accidents_participants').value = c.accident_man_days_participants;
                if (c.accident_man_days_participants_sport) {
                    document.querySelector('input[name="accidents_sport"]').checked = true;
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

// =========================================
// Date Validation
// =========================================

/**
 * Validate start date is at least MIN_DAYS_ADVANCE days from today
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
        input.setCustomValidity('La data deve essere almeno 15 giorni in anticipo.');
    } else {
        errorEl.textContent = '';
        errorEl.style.display = 'none';
        input.setCustomValidity('');
    }
}

// =========================================
// Form Data Collection
// =========================================

/**
 * Collect non-appearance guests
 */
function collectGuests() {
    const guests = [];
    document.querySelectorAll('.norisk-guest-entry').forEach(entry => {
        const name = entry.querySelector('.norisk-guest-name').value;
        const birthdate = entry.querySelector('.norisk-guest-date').value;
        const isArtist = entry.querySelector('input[name="guest_artist[]"]').checked;
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
 * Collect form data into API format
 */
function collectFormData() {
    // Build flat coverage object matching the scraper's expected field names
    const coverages = {};

    // Cancellation Costs
    if (document.getElementById('coverage_cancellation')?.checked) {
        coverages.cancellation_costs = true;
        const totalCost = document.getElementById('cancellation_total_cost').dataset.rawValue ||
                          document.getElementById('cancellation_total_cost').value.replace(/[^0-9]/g, '');
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
            const profitEstimate = document.getElementById('profit_estimate').dataset.rawValue ||
                                   document.getElementById('profit_estimate').value.replace(/[^0-9]/g, '');
            if (profitEstimate) coverages.cancellation_income_estimate = profitEstimate;
        }
    }

    // Liability
    if (document.getElementById('coverage_liability')?.checked) {
        coverages.liability = true;
        coverages.higher_liability = document.querySelector('input[name="liability_amount"]:checked')?.value || String(window.noriskConfig.LIABILITY_AMOUNT_1);
    }

    // Equipment
    if (document.getElementById('coverage_equipment')?.checked) {
        coverages.equipment = true;
        const equipmentValue = document.getElementById('equipment_value').dataset.rawValue ||
                               document.getElementById('equipment_value').value.replace(/[^0-9]/g, '');
        if (equipmentValue) coverages.equipment_value = equipmentValue;
    }

    // Money
    if (document.getElementById('coverage_money')?.checked) {
        coverages.money = true;
        const moneyAmount = document.getElementById('money_amount').dataset.rawValue ||
                            document.getElementById('money_amount').value.replace(/[^0-9]/g, '');
        if (moneyAmount) coverages.money_value = moneyAmount;
    }

    // Accidents
    if (document.getElementById('coverage_accidents')?.checked) {
        coverages.accident = true;
        coverages.accident_man_days = document.getElementById('accidents_employees').value;
        coverages.accident_man_days_participants = document.getElementById('accidents_participants').value;
        coverages.accident_man_days_participants_sport = document.querySelector('input[name="accidents_sport"]').checked;
    }

    return {
        initials: document.getElementById('initials').value,
        lastName: document.getElementById('lastName').value,
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value,
        // Company info
        company_name: document.getElementById('company_name').value,
        company_commercial_number: document.getElementById('company_commercial_number').value,
        company_legal_form: document.getElementById('company_legal_form').value,
        company_address: document.getElementById('company_address').value,
        company_house_number: document.getElementById('company_house_number').value,
        company_zipcode: document.getElementById('company_zipcode').value,
        company_city: document.getElementById('company_city').value,
        company_country: document.getElementById('company_country').value,
        // Event info
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

// =========================================
// API Submission
// =========================================

/**
 * Submit to API via WordPress AJAX proxy (server-side)
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

// =========================================
// Display Functions
// =========================================

/**
 * Show error message
 */
function showError(message) {
    form.classList.add('hidden');
    // Hide title and subtitle
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
    // Show title and subtitle again
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

// =========================================
// Initialization
// =========================================

document.addEventListener('DOMContentLoaded', function() {
    // Initialize DOM element references
    initDomElements();

    // Set minimum date based on configured advance notice
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + window.noriskConfig.MIN_DAYS_ADVANCE);
    document.getElementById('startDate').min = minDate.toISOString().split('T')[0];

    // Check for saved form data on page load
    checkForSavedFormData();

    // Start date validation
    document.getElementById('startDate').addEventListener('change', function() {
        validateStartDate(this);
    });

    // Coverage toggle handlers (guarded: sections may be disabled in admin settings)
    const coverageCancellationEl = document.getElementById('coverage_cancellation');
    if (coverageCancellationEl) {
        coverageCancellationEl.addEventListener('change', function() {
            document.getElementById('options_cancellation').classList.toggle('active', this.checked);
        });
    }

    const coverageLiabilityEl = document.getElementById('coverage_liability');
    if (coverageLiabilityEl) {
        coverageLiabilityEl.addEventListener('change', function() {
            document.getElementById('options_liability').classList.toggle('active', this.checked);
        });
    }

    const coverageEquipmentEl = document.getElementById('coverage_equipment');
    if (coverageEquipmentEl) {
        coverageEquipmentEl.addEventListener('change', function() {
            document.getElementById('options_equipment').classList.toggle('active', this.checked);
        });
    }

    const coverageMoneyEl = document.getElementById('coverage_money');
    if (coverageMoneyEl) {
        coverageMoneyEl.addEventListener('change', function() {
            document.getElementById('options_money').classList.toggle('active', this.checked);
        });
    }

    const coverageAccidentsEl = document.getElementById('coverage_accidents');
    if (coverageAccidentsEl) {
        coverageAccidentsEl.addEventListener('change', function() {
            document.getElementById('options_accidents').classList.toggle('active', this.checked);
        });
    }

    // Non-appearance guests toggle
    document.querySelectorAll('input[name="cancellation_reasons"]').forEach(cb => {
        cb.addEventListener('change', function() {
            const container = document.getElementById('non_appearance_guests_container');
            const isChecked = document.querySelector('input[name="cancellation_reasons"][value="non_appearance"]').checked;
            container.style.display = isChecked ? 'block' : 'none';
        });
    });

    // Perdita Profitto toggle - show/hide stima guadagno
    const profitToggleEl = document.getElementById('cb_profit_max_50');
    if (profitToggleEl) {
        profitToggleEl.addEventListener('change', function() {
            document.getElementById('profit_max_50_container').style.display = this.checked ? 'block' : 'none';
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

            // Call showSummary from norisk-summary.js
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

// =========================================
// Global Functions (called from HTML onclick handlers)
// =========================================

/**
 * Add guest function
 */
function addGuest() {
    const container = document.getElementById('guests_list');
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

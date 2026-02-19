<?php
/**
 * Template Name: Preventivo Evento
 * Description: Form for requesting event insurance quotes
 */

// CONFIGURATION
const API_TIMEOUT_MS = 120000;

// get_header();
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
            <h4 class="norisk-subsection-title">Dati Aziendali</h4>
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
            <h3>Coperture Richieste</h3>
            <p class="norisk-coverage-note">Seleziona le coperture desiderate e configura le opzioni.</p>

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
                        <label>
                            <input type="checkbox" name="cancellation_reasons" value="extreme_weather">
                            Annullamento per condizioni meteorologiche estreme
                        </label>
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
                    </div>
                </div>
            </div>

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
                                <input type="radio" name="liability_amount" value="2500000">
                                € 2.500.000
                            </label>
                            <label>
                                <input type="radio" name="liability_amount" value="5000000">
                                € 5.000.000
                            </label>
                        </div>
                    </div>
                </div>
            </div>

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

            <!-- Money -->
            <div class="norisk-coverage-item" style="display: none;">
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
        </div>

        <!-- Privacy -->
        <div class="norisk-privacy-row">
            <input type="checkbox" id="privacyAccept" name="privacyAccept" required>
            <label for="privacyAccept">Ho letto e accetto l'<a href="/privacy-policy" target="_blank">informativa sulla privacy</a> <span style="color: var(--brand-primary);">*</span></label>
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
// CONFIGURATION
const CONFIG = {
    AJAX_URL: '/wp-admin/admin-ajax.php',
    API_TIMEOUT_MS: <?php echo API_TIMEOUT_MS; ?>
};

// DOM Elements
const form = document.getElementById('quoteForm');
const loadingOverlay = document.getElementById('loadingOverlay');
const resultsSection = document.getElementById('resultsSection');
const resultsTitle = document.getElementById('resultsTitle');
const resultsContent = document.getElementById('resultsContent');

// Set minimum date to 15 days from today
(function() {
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 15);
    document.getElementById('startDate').min = minDate.toISOString().split('T')[0];
})();

// Validate start date is at least 15 days from today
function validateStartDate(input) {
    const selected = new Date(input.value);
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 15);
    minDate.setHours(0, 0, 0, 0);
    selected.setHours(0, 0, 0, 0);
    const errorEl = document.getElementById('startDateError');
    if (selected < minDate) {
        errorEl.textContent = 'La data dell\'evento deve essere almeno 15 giorni dalla data odierna.';
        errorEl.style.display = 'block';
        input.setCustomValidity('La data deve essere almeno 15 giorni in anticipo.');
    } else {
        errorEl.textContent = '';
        errorEl.style.display = 'none';
        input.setCustomValidity('');
    }
}
document.getElementById('startDate').addEventListener('change', function() {
    validateStartDate(this);
});

// Coverage toggle handlers
document.getElementById('coverage_cancellation').addEventListener('change', function() {
    document.getElementById('options_cancellation').classList.toggle('active', this.checked);
});

document.getElementById('coverage_liability').addEventListener('change', function() {
    document.getElementById('options_liability').classList.toggle('active', this.checked);
});

document.getElementById('coverage_equipment').addEventListener('change', function() {
    document.getElementById('options_equipment').classList.toggle('active', this.checked);
});

document.getElementById('coverage_money').addEventListener('change', function() {
    document.getElementById('options_money').classList.toggle('active', this.checked);
});

document.getElementById('coverage_accidents').addEventListener('change', function() {
    document.getElementById('options_accidents').classList.toggle('active', this.checked);
});

// Non-appearance guests toggle
document.querySelectorAll('input[name="cancellation_reasons"]').forEach(cb => {
    cb.addEventListener('change', function() {
        const container = document.getElementById('non_appearance_guests_container');
        const isChecked = document.querySelector('input[name="cancellation_reasons"][value="non_appearance"]').checked;
        container.style.display = isChecked ? 'block' : 'none';
    });
});

// Perdita Profitto toggle — show/hide stima guadagno
document.getElementById('cb_profit_max_50').addEventListener('change', function() {
    document.getElementById('profit_max_50_container').style.display = this.checked ? 'block' : 'none';
});

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

// Add guest function
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

// Form submission handler
form.addEventListener('submit', async function(e) {
    e.preventDefault();

    // Show loading
    loadingOverlay.classList.add('active');
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    submitBtn.textContent = 'Richiesta in corso...';
    submitBtn.disabled = true;

    try {
        const formData = collectFormData();
        const result = await submitQuote(formData);
        showSuccess(result);
    } catch (error) {
        console.error('Submission error:', error);
        showError(error.message || 'Si è verificato un errore imprevisto. Riprova più tardi.');
    } finally {
        loadingOverlay.classList.remove('active');
    }
});

// Collect form data into API format
function collectFormData() {
    // Build flat coverage object matching the scraper's expected field names
    const coverages = {};

    // Cancellation Costs
    if (document.getElementById('coverage_cancellation').checked) {
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
    if (document.getElementById('coverage_liability').checked) {
        coverages.liability = true;
        coverages.higher_liability = document.querySelector('input[name="liability_amount"]:checked')?.value || '2500000';
    }

    // Equipment
    if (document.getElementById('coverage_equipment').checked) {
        coverages.equipment = true;
        const equipmentValue = document.getElementById('equipment_value').dataset.rawValue ||
                               document.getElementById('equipment_value').value.replace(/[^0-9]/g, '');
        if (equipmentValue) coverages.equipment_value = equipmentValue;
    }

    // Money
    if (document.getElementById('coverage_money').checked) {
        coverages.money = true;
        const moneyAmount = document.getElementById('money_amount').dataset.rawValue ||
                            document.getElementById('money_amount').value.replace(/[^0-9]/g, '');
        if (moneyAmount) coverages.money_value = moneyAmount;
    }

    // Accidents
    if (document.getElementById('coverage_accidents').checked) {
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

// Collect non-appearance guests
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

// Submit to API via WordPress AJAX proxy (server-side)
async function submitQuote(data) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT_MS);

    try {
        const response = await fetch(CONFIG.AJAX_URL + '?action=norisk_submit_quote', {
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

// Show success results with Bozza di Preventivo
function showSuccess(result) {
    form.classList.add('hidden');
    resultsSection.classList.add('active', 'success');
    resultsSection.classList.remove('error');

    const quoteKey = result.quoteKey || 'N/A';
    const pricing = result.pricing || {};
    const status = result.status || 'draft';

    // Build pricing table if pricing data exists
    let pricingHtml = '';
    if (pricing.sumExcl) {
        pricingHtml = `
            <div class="norisk-pricing-table">
                <h4>Dettaglio Costi</h4>
                <div class="norisk-pricing-row">
                    <span>Premio Lordo:</span>
                    <span>€ ${pricing.sumExcl}</span>
                </div>
                <div class="norisk-pricing-row">
                    <span>Costi Polizza:</span>
                    <span>€ ${pricing.policyCosts}</span>
                </div>
                <div class="norisk-pricing-row">
                    <span>Imposta Assicurativa:</span>
                    <span>€ ${pricing.insuranceTax}</span>
                </div>
                <div class="norisk-pricing-row norisk-pricing-total">
                    <span><strong>Totale da Pagare:</strong></span>
                    <span><strong>€ ${pricing.toPay}</strong></span>
                </div>
            </div>
        `;
    }

    // Determine button based on status
    let actionButton = '';
    let statusMessage = '';

    if (status === 'draft' || status === 'submitted_waiting_email') {
        // Still waiting for PDF from NoRisk
        actionButton = `
            <button type="button" class="norisk-submit-btn" onclick="checkQuoteStatus('${quoteKey}')" id="checkStatusBtn">
                Ricevi preventivo
            </button>
        `;
        statusMessage = `<p class="norisk-quote-note">Clicca il pulsante per ricevere il preventivo via email.</p>`;
    } else if (status === 'email_received') {
        // PDF received, can send to user
        actionButton = `
            <button type="button" class="norisk-submit-btn" onclick="sendQuoteToUser('${quoteKey}')" id="sendQuoteBtn">
                Invia preventivo via email
            </button>
        `;
        statusMessage = `<p class="norisk-quote-note">Il preventivo è pronto! Clicca il pulsante per riceverlo via email.</p>`;
    } else if (status === 'sent') {
        // Already sent to user
        statusMessage = `
            <div class="norisk-success-message" style="color: #27ae60; padding: 15px; background: #f0fff4; border-radius: 4px; margin: 20px 0;">
                <strong>✓ Il preventivo è stato inviato alla tua email!</strong><br>
                Controlla la tua casella di posta (anche nella cartella spam).
            </div>
        `;
    } else {
        // Default case
        actionButton = `
            <button type="button" class="norisk-submit-btn" onclick="checkQuoteStatus('${quoteKey}')" id="checkStatusBtn">
                Ricevi preventivo
            </button>
        `;
        statusMessage = `<p class="norisk-quote-note">Stato: ${status}</p>`;
    }

    resultsTitle.textContent = 'Bozza di Preventivo';
    resultsContent.innerHTML = `
        <div class="norisk-quote-ref">
            Riferimento: ${quoteKey}
        </div>
        ${pricingHtml}
        ${statusMessage}
        ${actionButton}
        <div id="actionStatus" style="margin-top: 15px;"></div>
    `;
}

// Check quote status and update UI accordingly
async function checkQuoteStatus(quoteKey) {
    const btn = document.getElementById('checkStatusBtn');
    const statusDiv = document.getElementById('actionStatus');

    btn.disabled = true;
    btn.textContent = 'Richiesta in corso...';

    try {
        const response = await fetch(
            CONFIG.AJAX_URL + '?action=norisk_check_quote_status&quoteKey=' + encodeURIComponent(quoteKey),
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

// Send quote PDF to user
async function sendQuoteToUser(quoteKey) {
    const btn = document.getElementById('sendQuoteBtn');
    const statusDiv = document.getElementById('actionStatus');

    btn.disabled = true;
    btn.textContent = 'Invio in corso...';

    try {
        const response = await fetch(CONFIG.AJAX_URL + '?action=norisk_send_quote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quoteKey: quoteKey })
        });

        const json = await response.json().catch(() => ({}));
        if (!json.success) {
            throw new Error(json.data?.message || 'Errore durante l\'invio');
        }

        const result = json.data;

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
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 15);
    document.getElementById('startDate').min = minDate.toISOString().split('T')[0];
    document.getElementById('startDateError').style.display = 'none';
    document.getElementById('profit_max_50_container').style.display = 'none';

    // Reset coverage options visibility
    document.querySelectorAll('.norisk-coverage-options').forEach(el => el.classList.remove('active'));

    // Reset guests list
    document.getElementById('guests_list').innerHTML = `
        <div class="norisk-guest-entry">
            <input type="text" name="guest_name[]" placeholder="Nome ospite" class="norisk-guest-name">
            <input type="date" name="guest_birthdate[]" class="norisk-guest-date">
            <label><input type="checkbox" name="guest_artist[]" value="1"> Artista</label>
        </div>
    `;
    document.getElementById('non_appearance_guests_container').style.display = 'none';
}
</script>

<!-- TEMPORARY DEBUG TOOLS -->
<script>
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
        document.querySelector('input[name="environment"][value="outdoor"]').checked = true;

        // Coverages — Cancellation
        const cbCanc = document.getElementById('coverage_cancellation');
        cbCanc.checked = true;
        cbCanc.dispatchEvent(new Event('change'));
        const cancCostEl = document.getElementById('cancellation_total_cost');
        cancCostEl.value = '20.000';
        cancCostEl.dataset.rawValue = '20000';
        document.querySelector('input[name="cancellation_reasons"][value="extreme_weather"]').checked = true;

        // Coverages — Liability
        const cbLiab = document.getElementById('coverage_liability');
        cbLiab.checked = true;
        cbLiab.dispatchEvent(new Event('change'));
        document.querySelector('input[name="liability_amount"][value="5000000"]').checked = true;

        // Uncheck others
        document.getElementById('coverage_equipment').checked = false;
        document.getElementById('options_equipment').classList.remove('active');
        document.getElementById('coverage_accidents').checked = false;
        document.getElementById('options_accidents').classList.remove('active');

        console.info('NoRisk: form filled with test data.');
    });

    // Actions
    document.getElementById('debug-success').addEventListener('click', () => {
        const form = document.getElementById('quoteForm');
        if (form) form.classList.add('hidden');
        
        if (typeof showSuccess === 'function') {
            showSuccess(mockSuccessData);
        } else {
            alert('Error: showSuccess() function not found on page.');
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
</script>

<?php
    // get_footer();
?>

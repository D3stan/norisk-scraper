<?php
/**
 * Template Name: Preventivo Evento
 * Description: Form for requesting event insurance quotes
 */

// CONFIGURATION - Update these values
const API_URL = 'http://192.168.2.100:3000/api/quote';
const API_TIMEOUT_MS = 30000; // 30 seconds - easily tunable

get_header();
?>

<style>
<?php include 'style.css'; ?>

/* Pricing Table Styles */
.norisk-pricing-table {
    background: white;
    border-radius: 8px;
    padding: 25px;
    margin: 25px 0;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    text-align: left;
}

.norisk-pricing-table h4 {
    margin: 0 0 20px 0;
    color: #1a1a1a;
    font-size: 18px;
    border-bottom: 1px solid #e0e0e0;
    padding-bottom: 10px;
}

.norisk-pricing-row {
    display: flex;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px dashed #e0e0e0;
    font-size: 16px;
}

.norisk-pricing-row:last-child {
    border-bottom: none;
}

.norisk-pricing-total {
    margin-top: 10px;
    padding-top: 15px;
    border-top: 2px solid #1a1a1a;
    border-bottom: none;
    font-size: 18px;
    color: #1a1a1a;
}

.norisk-quote-note {
    color: #666;
    font-style: italic;
    margin: 20px 0;
    font-size: 14px;
}

/* Results section enhancements */
.norisk-results {
    max-width: 600px;
    margin: 0 auto;
}

.norisk-quote-ref {
    font-size: 20px;
    font-weight: 600;
    color: #1a1a1a;
    margin-bottom: 20px;
    padding: 15px;
    background: #f5f5f5;
    border-radius: 4px;
}
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
                            <input type="checkbox" name="cancellation_reasons" value="profit_max_50">
                            Profitto massimo 50% dei costi secondo il budget
                        </label>
                    </div>
                </div>
            </div>

            <!-- Liability -->
            <div class="norisk-coverage-item">
                <label class="norisk-coverage-toggle">
                    <input type="checkbox" id="coverage_liability" name="coverage_liability" value="1" checked>
                    <span class="norisk-coverage-title">Responsabilità Civile</span>
                </label>
                <div class="norisk-coverage-options" id="options_liability">
                    <div class="norisk-form-group">
                        <label>Per quale importo vuoi assicurare la tua responsabilità?</label>
                        <div class="norisk-radio-group">
                            <label>
                                <input type="radio" name="liability_amount" value="2500000" checked>
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

// Initialize liability options (checked by default)
document.getElementById('options_liability').classList.add('active');

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
    // Build coverage details
    const coverages = {
        cancellation: document.getElementById('coverage_cancellation').checked ? {
            total_cost: document.getElementById('cancellation_total_cost').value,
            reasons: Array.from(document.querySelectorAll('input[name="cancellation_reasons"]:checked')).map(cb => cb.value),
            non_appearance_guests: collectGuests()
        } : null,
        liability: document.getElementById('coverage_liability').checked ? {
            amount: document.querySelector('input[name="liability_amount"]:checked')?.value || '2500000'
        } : null,
        equipment: document.getElementById('coverage_equipment').checked ? {
            value: document.getElementById('equipment_value').value
        } : null,
        money: document.getElementById('coverage_money').checked ? {
            amount: document.getElementById('money_amount').value
        } : null,
        accidents: document.getElementById('coverage_accidents').checked ? {
            employees: document.getElementById('accidents_employees').value,
            participants: document.getElementById('accidents_participants').value,
            sport: document.querySelector('input[name="accidents_sport"]').checked
        } : null
    };

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
                Verifica stato preventivo
            </button>
        `;
        statusMessage = `<p class="norisk-quote-note">Stiamo elaborando il tuo preventivo. Clicca il pulsante per verificare se il documento è pronto.</p>`;
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
                Verifica stato preventivo
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
    btn.textContent = 'Verifica in corso...';

    try {
        const response = await fetch(CONFIG.API_URL.replace('/quote', `/quote/${quoteKey}/status`), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Errore durante la verifica');
        }

        const result = await response.json();

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
            btn.textContent = 'Verifica stato preventivo';
        }

    } catch (error) {
        btn.disabled = false;
        btn.textContent = 'Verifica stato preventivo';
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
        const response = await fetch(CONFIG.API_URL + '/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ quoteKey: quoteKey })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Errore durante l\'invio');
        }

        const result = await response.json();

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
    document.getElementById('startDate').min = new Date().toISOString().split('T')[0];

    // Reset coverage options visibility
    document.querySelectorAll('.norisk-coverage-options').forEach(el => el.classList.remove('active'));
    document.getElementById('options_liability').classList.add('active');

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

<?php get_footer(); ?>

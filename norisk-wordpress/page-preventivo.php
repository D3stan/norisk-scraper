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

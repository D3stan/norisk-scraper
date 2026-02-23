/**
 * NoRisk Insurance Quote Summary Module
 * Handles display of quote summary, PDF status checking, and email delivery
 *
 * Dependencies:
 * - norisk-form.js (provides lastFormData global, collectFormData(), resetForm())
 * - norisk-coverage.js
 */

// Show summary of quote with user information
function showSummary(result, formData) {
    const form = document.getElementById('eventForm');
    const resultsSection = document.getElementById('resultsSection');

    form.classList.add('hidden');
    // Hide title and subtitle
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
    const eventTypeLabel = eventTypeSelect.options[eventTypeSelect.selectedIndex].text;

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

        const budgetFormatted = formData.coverages.budget ? '€ ' + parseInt(formData.coverages.budget).toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : 'N/A';

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
                <div class="norisk-coverage-detail"><span class="label">Massimale per sinistro</span><span class="value">€ ${liabilityAmount},00</span></div>
                <div class="norisk-coverage-detail"><span class="label">Franchigia</span><span class="value">€ ${window.noriskConfig.LIABILITY_DEDUCTIBLE.toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2})} per sinistro</span></div>
                <div class="norisk-coverage-detail"><span class="label">Numero di visitatori</span><span class="value">${formData.visitors}</span></div>
            </div>
        `;
    }

    if (formData.coverages.equipment) {
        const equipmentValue = formData.coverages.equipment_value ? '€ ' + parseInt(formData.coverages.equipment_value).toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : 'N/A';
        coveragesHtml += `
            <div class="norisk-coverage-block">
                <h4>Danni ad Attrezzatura</h4>
                <div class="norisk-coverage-detail"><span class="label">Importo assicurato</span><span class="value">${equipmentValue}</span></div>
                <div class="norisk-coverage-detail"><span class="label">Franchigia</span><span class="value">€ ${window.noriskConfig.LIABILITY_DEDUCTIBLE.toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2})} per sinistro</span></div>
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
                <div class="norisk-coverage-detail"><span class="label">Somma assicurata Invalidità Permanente</span><span class="value">€ ${window.noriskConfig.ACCIDENTS_PERMANENT_DISABILITY.toLocaleString('it-IT')}</span></div>
                <div class="norisk-coverage-detail"><span class="label">Somma assicurata Morte</span><span class="value">€ ${window.noriskConfig.ACCIDENTS_DEATH.toLocaleString('it-IT')}</span></div>
                <div class="norisk-coverage-detail"><span class="label">Sport incluso</span><span class="value">${sport}</span></div>
                <div class="norisk-coverage-detail" style="margin-top: 8px; font-size: 12px; color: var(--text-muted);">La copertura include i giorni di allestimento e di interruzione.</div>
            </div>
        `;
    }

    if (formData.coverages.money) {
        const moneyValue = formData.coverages.money_value ? '€ ' + parseInt(formData.coverages.money_value).toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : 'N/A';
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

    // Use config for image URLs with fallbacks to hardcoded values
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
                <span class="norisk-summary-label">Primo giorno dell&#39;evento</span>
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
            <div class="price-value">€ ${finalPrice}</div>
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

// Check quote status and update UI accordingly
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

// Send quote PDF to user
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

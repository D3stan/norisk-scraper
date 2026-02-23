/**
 * NoRisk Debug Tools
 * Provides a debug panel for testing the quote form functionality
 * Conditionally loaded based on show_debug_panel setting
 *
 * Dependencies: norisk-form.js, norisk-coverage.js, norisk-summary.js
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
        <h4 style="margin: 0 0 15px 0; color: #2C2C2C; font-weight: bold; font-size: 16px; border-bottom: 1px solid #eee; padding-bottom: 10px;">Debug Tools</h4>
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

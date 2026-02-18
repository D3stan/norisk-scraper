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
            showError('Si è verificato un errore durante la comunicazione con il server NoRisk (Errore 500). Per favore riprova più tardi o contatta l'assistenza.');
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
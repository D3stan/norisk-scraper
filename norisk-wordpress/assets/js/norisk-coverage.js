/**
 * NoRisk Coverage - Coverage Toggle Handlers
 * Handles coverage toggles, number formatting, and guest management
 *
 * Dependencies: norisk-form.js must be loaded first
 */

document.addEventListener('DOMContentLoaded', function() {
    // =========================================
    // Coverage Toggle Handlers
    // =========================================

    // Coverage toggle handlers (guarded: sections may be disabled in admin settings)
    document.getElementById('coverage_cancellation')?.addEventListener('change', function() {
        document.getElementById('options_cancellation').classList.toggle('active', this.checked);
    });

    document.getElementById('coverage_liability')?.addEventListener('change', function() {
        document.getElementById('options_liability').classList.toggle('active', this.checked);
    });

    document.getElementById('coverage_equipment')?.addEventListener('change', function() {
        document.getElementById('options_equipment').classList.toggle('active', this.checked);
    });

    document.getElementById('coverage_money')?.addEventListener('change', function() {
        document.getElementById('options_money').classList.toggle('active', this.checked);
    });

    document.getElementById('coverage_accidents')?.addEventListener('change', function() {
        document.getElementById('options_accidents').classList.toggle('active', this.checked);
    });

    // =========================================
    // Non-appearance Guests Toggle
    // =========================================

    document.querySelectorAll('input[name="cancellation_reasons"]').forEach(cb => {
        cb.addEventListener('change', function() {
            const container = document.getElementById('non_appearance_guests_container');
            const isChecked = document.querySelector('input[name="cancellation_reasons"][value="non_appearance"]').checked;
            container.style.display = isChecked ? 'block' : 'none';
        });
    });

    // =========================================
    // Perdita Profitto (Profit) Toggle
    // =========================================

    document.getElementById('cb_profit_max_50')?.addEventListener('change', function() {
        document.getElementById('profit_max_50_container').style.display = this.checked ? 'block' : 'none';
    });

    // =========================================
    // Number Formatting
    // =========================================

    /**
     * Format number with thousands separator (Italian locale)
     * @param {HTMLInputElement} input - The input element to format
     */
    function formatThousands(input) {
        // Strip everything except digits
        let raw = input.value.replace(/[^0-9]/g, '');
        if (raw === '') { input.value = ''; return; }
        // Format with dots as thousands separator (Italian style)
        input.value = parseInt(raw, 10).toLocaleString('it-IT');
        // Store raw value in dataset for form submission
        input.dataset.rawValue = raw;
    }

    // Apply formatting to inputs with class 'norisk-number-formatted'
    document.querySelectorAll('.norisk-number-formatted').forEach(function(input) {
        input.addEventListener('input', function() { formatThousands(this); });
        input.addEventListener('blur', function() { formatThousands(this); });
    });

    // =========================================
    // Currency Input Formatting Setup
    // =========================================

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

// =========================================
// Global Functions (called from HTML onclick handlers)
// =========================================

/**
 * Add a new guest entry to the non-appearance guests list
 * Called from HTML onclick handlers
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

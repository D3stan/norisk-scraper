# NoRisk Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implementare tutti i 9 fix per il form NoRisk in sequenza: 6 → 5 → 9 → 7 → 8 → 3 → 2 → 1 (il 4 è già fatto)

**Architecture:** Modifiche progressive a functions.php (Settings API) e page-preventivo.php (frontend/CSS/JS). Ogni fix è isolato e committabile separatamente.

**Tech Stack:** PHP (WordPress), JavaScript vanilla, CSS

---

## Fix 6: Rimuovi Duplicato API Timeout

**Stato:** Il campo `api_timeout_ms` non esiste nel codice attuale. Verificare che non ci siano riferimenti nascosti.

**Files:**
- Verify: `norisk-wordpress/functions.php`
- Verify: `norisk-wordpress/page-preventivo.php`

**Step 1: Verifica assenza duplicato**

Cerca `api_timeout_ms` in entrambi i file:
```bash
grep -n "api_timeout_ms" norisk-wordpress/functions.php norisk-wordpress/page-preventivo.php
```
Expected: Nessun risultato (già pulito)

**Step 2: Commit (se necessario)**

```bash
git add docs/plans/2026-02-23-norisk-fixes-implementation.md
git commit -m "doc: add implementation plan for NoRisk fixes"
```

---

## Fix 5: Link Termini e Condizioni (Settings API)

**Files:**
- Modify: `norisk-wordpress/functions.php:28-70` (defaults)
- Verify: `norisk-wordpress/functions.php:236-237` (già presente)
- Verify: `norisk-wordpress/functions.php:399-400` (sanitization)

**Step 1: Verifica campo esistente**

Il campo `terms_url` è già presente:
- Default a riga 37: `'terms_url' => 'https://golinucci.it/wp-content/uploads/2026/02/Terms-conditions-event-insurance-ITA.pdf'`
- Settings field a riga 236
- Sanitization a riga 399

**Step 2: Commit**

```bash
git commit -m "fix(5): terms_url already configured in settings"
```

---

## Fix 9: Contatti Golinucci Configurabili

**Files:**
- Modify: `norisk-wordpress/functions.php:28-70` (add defaults)
- Modify: `norisk-wordpress/functions.php:219-333` (add fields)
- Modify: `norisk-wordpress/functions.php:377-425` (add sanitization)
- Modify: `norisk-wordpress/page-preventivo.php:1179-1256` (footer PDF)

**Step 1: Aggiungi defaults in norisk_get_options()**

Dopo riga 64 (`'service_fee' => 15,`), aggiungi:
```php
        // Contatti
        'contact_email'       => 'eventi@golinucci.it',
        'contact_phone'       => '',
        'contact_show_in_pdf' => 1,
```

**Step 2: Aggiungi sezione Settings API**

Dopo la sezione Debug (riga 330-332), aggiungi:
```php
    // ----- Sezione F: Contatti -----
    add_settings_section( 'norisk_contacts', 'Contatti', '__return_false', 'norisk-settings' );

    add_settings_field( 'contact_email',       'Email contatti',       'norisk_render_text_field',   'norisk-settings', 'norisk_contacts', [ 'key' => 'contact_email' ] );
    add_settings_field( 'contact_phone',       'Telefono contatti',    'norisk_render_text_field',   'norisk-settings', 'norisk_contacts', [ 'key' => 'contact_phone' ] );
    add_settings_field( 'contact_show_in_pdf', 'Mostra contatti nel PDF', 'norisk_render_checkbox_field', 'norisk-settings', 'norisk_contacts', [ 'key' => 'contact_show_in_pdf' ] );
```

**Step 3: Aggiungi sanitization in norisk_sanitize_options()**

Dopo i checkbox fields (riga 421), aggiungi:
```php
    // Contact fields
    $sanitized['contact_email'] = sanitize_email( $input['contact_email'] ?? 'eventi@golinucci.it' );
    $sanitized['contact_phone'] = sanitize_text_field( $input['contact_phone'] ?? '' );
    $sanitized['contact_show_in_pdf'] = isset( $input['contact_show_in_pdf'] ) ? 1 : 0;
```

**Step 4: Aggiungi contatti nel footer PDF (page-preventivo.php)**

Trova il commento `<!-- Submit -->` (riga 423) e aggiungi prima la sezione contatti per il PDF:

```php
    <!-- Contact Info for PDF -->
    <?php if ( $norisk['contact_show_in_pdf'] ): ?>
    <div class="norisk-pdf-contacts" style="display: none;">
        <div class="norisk-pdf-contact-block">
            <strong>Per informazioni e acquisto:</strong><br>
            <?php if ( $norisk['contact_email'] ): ?>
            Email: <a href="mailto:<?php echo esc_attr( $norisk['contact_email'] ); ?>"><?php echo esc_html( $norisk['contact_email'] ); ?></a><br>
            <?php endif; ?>
            <?php if ( $norisk['contact_phone'] ): ?>
            Tel: <?php echo esc_html( $norisk['contact_phone'] ); ?>
            <?php endif; ?>
        </div>
    </div>
    <?php endif; ?>
```

Poi aggiungi lo stesso blocco anche nel `resultsSection` HTML generato via JavaScript (intorno a riga 1253):

Cerca la riga con `resultsSection.innerHTML =
Aggiungi prima della chiusura del div:
```javascript
        <?php if ( $norisk['contact_show_in_pdf'] ): ?>
        <div class="norisk-pdf-contacts">
            <div class="norisk-pdf-contact-block">
                <strong>Per informazioni e acquisto:</strong><br>
                <?php if ( $norisk['contact_email'] ): ?>
                Email: <a href="mailto:<?php echo esc_attr( $norisk['contact_email'] ); ?>"><?php echo esc_html( $norisk['contact_email'] ); ?></a><br>
                <?php endif; ?>
                <?php if ( $norisk['contact_phone'] ): ?>
                Tel: <?php echo esc_html( $norisk['contact_phone'] ); ?>
                <?php endif; ?>
            </div>
        </div>
        <?php endif; ?>
```

**Step 5: Aggiungi CSS per stampa**

Nel file style.css (o nel tag style di page-preventivo.php), aggiungi:
```css
@media print {
    .norisk-pdf-contacts {
        display: block !important;
        margin-top: 30px;
        padding-top: 20px;
        border-top: 1px solid #ddd;
        page-break-inside: avoid;
    }
    .norisk-pdf-contacts a {
        color: #000 !important;
        text-decoration: none !important;
    }
}
.norisk-pdf-contacts {
    display: none;
}
```

**Step 6: Commit**

```bash
git add norisk-wordpress/functions.php norisk-wordpress/page-preventivo.php norisk-wordpress/style.css
git commit -m "feat(9): add configurable contact fields for PDF output

- Add contact_email, contact_phone, contact_show_in_pdf settings
- Display contacts in PDF print output
- CSS for print-friendly contact block"
```

---

## Fix 7: Localizzazione Italiana Admin

**Files:**
- Modify: `norisk-wordpress/functions.php:225-332` (translate labels)

**Step 1: Traduci labels sezione Testi**

Già in italiano - verificato.

**Step 2: Traduci labels sezione Visibilità Coperture**

Già in italiano - verificato.

**Step 3: Verifica titoli sezioni**

Già tradotti:
- 'Testi ed Etichette' (riga 226)
- 'Sezioni Copertura' (riga 259)
- 'Opzioni Costi di Annullamento' (riga 281)
- 'Regole di Business' (riga 301)
- 'Configurazione API' (riga 325)
- 'Debug' (riga 331)

**Step 4: Commit**

```bash
git commit -m "fix(7): admin labels already in Italian"
```

---

## Fix 8: Modale Informazioni Coperture

**Files:**
- Modify: `norisk-wordpress/functions.php:28-70` (add modal defaults)
- Modify: `norisk-wordpress/functions.php:219-333` (add modal fields)
- Modify: `norisk-wordpress/functions.php:377-425` (add modal sanitization)
- Modify: `norisk-wordpress/page-preventivo.php:244-414` (HTML structure)
- Modify: `norisk-wordpress/page-preventivo.php:434-449` (CONFIG)
- Modify: `norisk-wordpress/page-preventivo.php` (CSS)
- Modify: `norisk-wordpress/page-preventivo.php` (JS)

**Step 1: Aggiungi defaults per modal**

In `norisk_get_options()`, aggiungi dopo i contatti:
```php
        // Modal Coperture - Costi di Annullamento
        'cancellation_modal_title'   => 'Costi di Annullamento',
        'cancellation_modal_include' => '',
        'cancellation_modal_exclude' => '',
        // Modal Coperture - Responsabilità Civile
        'liability_modal_title'      => 'Responsabilità Civile',
        'liability_modal_include'    => '',
        'liability_modal_exclude'    => '',
        // Modal Coperture - Attrezzature
        'equipment_modal_title'      => 'Attrezzature',
        'equipment_modal_include'    => '',
        'equipment_modal_exclude'    => '',
        // Modal Coperture - Denaro
        'money_modal_title'          => 'Denaro',
        'money_modal_include'        => '',
        'money_modal_exclude'        => '',
        // Modal Coperture - Infortuni
        'accidents_modal_title'      => 'Infortuni',
        'accidents_modal_include'    => '',
        'accidents_modal_exclude'    => '',
```

**Step 2: Aggiungi sezione Settings API per i modal**

Dopo la sezione Contatti, aggiungi:
```php
    // ----- Sezione G: Modal Informazioni Coperture -----
    $coverage_types = [
        'cancellation' => 'Costi di Annullamento',
        'liability'    => 'Responsabilità Civile',
        'equipment'    => 'Attrezzature',
        'money'        => 'Denaro',
        'accidents'    => 'Infortuni',
    ];

    foreach ( $coverage_types as $key => $label ) {
        add_settings_section( "norisk_modal_{$key}", "Modal: {$label}", '__return_false', 'norisk-settings' );

        add_settings_field( "{$key}_modal_title",   'Titolo modale',   'norisk_render_text_field',   'norisk-settings', "norisk_modal_{$key}", [ 'key' => "{$key}_modal_title" ] );
        add_settings_field( "{$key}_modal_include", 'Cosa include',    'norisk_render_textarea_field', 'norisk-settings', "norisk_modal_{$key}", [ 'key' => "{$key}_modal_include" ] );
        add_settings_field( "{$key}_modal_exclude", 'Cosa esclude',    'norisk_render_textarea_field', 'norisk-settings', "norisk_modal_{$key}", [ 'key' => "{$key}_modal_exclude" ] );
    }
```

**Step 3: Aggiungi render function per textarea**

Dopo `norisk_render_checkbox_field()`:
```php
/**
 * Render a textarea field.
 */
function norisk_render_textarea_field( array $args ): void {
    $opts  = norisk_get_options();
    $key   = $args['key'];
    $value = $opts[ $key ] ?? '';
    printf(
        '<textarea name="norisk_options[%s]" rows="5" class="large-text">%s</textarea>',
        esc_attr( $key ),
        esc_textarea( $value )
    );
}
```

**Step 4: Aggiungi sanitization per modal**

In `norisk_sanitize_options()`, aggiungi:
```php
    // Modal fields
    $modal_fields = [
        'cancellation_modal_title', 'cancellation_modal_include', 'cancellation_modal_exclude',
        'liability_modal_title',    'liability_modal_include',    'liability_modal_exclude',
        'equipment_modal_title',    'equipment_modal_include',    'equipment_modal_exclude',
        'money_modal_title',        'money_modal_include',        'money_modal_exclude',
        'accidents_modal_title',    'accidents_modal_include',    'accidents_modal_exclude',
    ];
    foreach ( $modal_fields as $key ) {
        $sanitized[ $key ] = wp_kses_post( $input[ $key ] ?? '' );
    }
```

**Step 5: Aggiungi HTML modale in page-preventivo.php**

Prima della chiusura del form (dopo riga 423), aggiungi:
```html
    <!-- Modal Informazioni Coperture -->
    <div id="norisk-modal-overlay" class="norisk-modal-overlay">
        <div class="norisk-modal" role="dialog" aria-modal="true">
            <button type="button" class="norisk-modal-close" aria-label="Chiudi">&times;</button>
            <h3 class="norisk-modal-title"></h3>
            <div class="norisk-modal-content">
                <div class="norisk-modal-section">
                    <h4>Cosa include</h4>
                    <div class="norisk-modal-include"></div>
                </div>
                <div class="norisk-modal-section">
                    <h4>Cosa esclude</h4>
                    <div class="norisk-modal-exclude"></div>
                </div>
            </div>
        </div>
    </div>
```

**Step 6: Aggiungi pulsanti info accanto a ogni coverage**

Per ogni coverage item (intorno a righe 248, 301, 326, 341, 357), modifica:

Esempio per Costi di Annullamento:
```html
            <div class="norisk-coverage-item">
                <label class="norisk-coverage-toggle">
                    <input type="checkbox" id="coverage_cancellation" name="coverage_cancellation" value="1">
                    <span class="norisk-coverage-title">Costi di Annullamento</span>
                </label>
                <button type="button" class="norisk-info-btn" data-coverage="cancellation" aria-label="Maggiori informazioni">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                </button>
```

Ripetere per liability, equipment, money, accidents.

**Step 7: Aggiungi CSS modale**

Nel tag `<style>` all'inizio di page-preventivo.php, aggiungi:
```css
/* Pulsante info copertura */
.norisk-coverage-item {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}
.norisk-info-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    color: var(--brand-primary, #6B1C23);
    opacity: 0.7;
    transition: opacity 0.2s;
    flex-shrink: 0;
}
.norisk-info-btn:hover {
    opacity: 1;
}

/* Modale */
.norisk-modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.6);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    z-index: 10000;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.3s, visibility 0.3s;
}
.norisk-modal-overlay.active {
    opacity: 1;
    visibility: visible;
}
.norisk-modal {
    background: white;
    width: 100%;
    max-height: 90vh;
    border-radius: 16px 16px 0 0;
    padding: 24px;
    transform: translateY(100%);
    transition: transform 0.3s ease-out;
    overflow-y: auto;
    position: relative;
}
.norisk-modal-overlay.active .norisk-modal {
    transform: translateY(0);
}
.norisk-modal-close {
    position: absolute;
    top: 16px;
    right: 16px;
    background: none;
    border: none;
    font-size: 28px;
    line-height: 1;
    cursor: pointer;
    color: #666;
    padding: 4px;
}
.norisk-modal-close:hover {
    color: #333;
}
.norisk-modal-title {
    margin: 0 0 20px 0;
    padding-right: 40px;
    font-size: 1.25rem;
    color: var(--text-main, #2C2C2C);
}
.norisk-modal-section {
    margin-bottom: 20px;
}
.norisk-modal-section h4 {
    margin: 0 0 10px 0;
    font-size: 1rem;
    color: var(--brand-primary, #6B1C23);
}
.norisk-modal-section div {
    color: var(--text-body, #333);
    line-height: 1.6;
}

/* Desktop: modale centrato */
@media (min-width: 768px) {
    .norisk-modal-overlay {
        align-items: center;
    }
    .norisk-modal {
        width: 90%;
        max-width: 600px;
        border-radius: 8px;
        max-height: 80vh;
        transform: scale(0.9);
    }
    .norisk-modal-overlay.active .norisk-modal {
        transform: scale(1);
    }
}

/* Nascondi modale nella stampa */
@media print {
    .norisk-modal-overlay,
    .norisk-info-btn {
        display: none !important;
    }
}
```

**Step 8: Aggiungi CONFIG per i modal**

Nel JavaScript CONFIG (riga 434-449), aggiungi:
```javascript
    // Modal content
    CANCELLATION_MODAL_TITLE: '<?php echo esc_js( $norisk['cancellation_modal_title'] ); ?>',
    CANCELLATION_MODAL_INCLUDE: '<?php echo wp_kses_post( $norisk['cancellation_modal_include'] ); ?>',
    CANCELLATION_MODAL_EXCLUDE: '<?php echo wp_kses_post( $norisk['cancellation_modal_exclude'] ); ?>',
    LIABILITY_MODAL_TITLE: '<?php echo esc_js( $norisk['liability_modal_title'] ); ?>',
    LIABILITY_MODAL_INCLUDE: '<?php echo wp_kses_post( $norisk['liability_modal_include'] ); ?>',
    LIABILITY_MODAL_EXCLUDE: '<?php echo wp_kses_post( $norisk['liability_modal_exclude'] ); ?>',
    EQUIPMENT_MODAL_TITLE: '<?php echo esc_js( $norisk['equipment_modal_title'] ); ?>',
    EQUIPMENT_MODAL_INCLUDE: '<?php echo wp_kses_post( $norisk['equipment_modal_include'] ); ?>',
    EQUIPMENT_MODAL_EXCLUDE: '<?php echo wp_kses_post( $norisk['equipment_modal_exclude'] ); ?>',
    MONEY_MODAL_TITLE: '<?php echo esc_js( $norisk['money_modal_title'] ); ?>',
    MONEY_MODAL_INCLUDE: '<?php echo wp_kses_post( $norisk['money_modal_include'] ); ?>',
    MONEY_MODAL_EXCLUDE: '<?php echo wp_kses_post( $norisk['money_modal_exclude'] ); ?>',
    ACCIDENTS_MODAL_TITLE: '<?php echo esc_js( $norisk['accidents_modal_title'] ); ?>',
    ACCIDENTS_MODAL_INCLUDE: '<?php echo wp_kses_post( $norisk['accidents_modal_include'] ); ?>',
    ACCIDENTS_MODAL_EXCLUDE: '<?php echo wp_kses_post( $norisk['accidents_modal_exclude'] ); ?>',
```

**Step 9: Aggiungi JavaScript per il modale**

Dopo il codice coverage toggle handlers (dopo riga 788), aggiungi:
```javascript
// Modal handlers
document.querySelectorAll('.norisk-info-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
        e.preventDefault();
        const coverage = this.dataset.coverage;
        const title = CONFIG[coverage.toUpperCase() + '_MODAL_TITLE'];
        const include = CONFIG[coverage.toUpperCase() + '_MODAL_INCLUDE'];
        const exclude = CONFIG[coverage.toUpperCase() + '_MODAL_EXCLUDE'];

        const modal = document.getElementById('norisk-modal-overlay');
        modal.querySelector('.norisk-modal-title').textContent = title;
        modal.querySelector('.norisk-modal-include').innerHTML = include;
        modal.querySelector('.norisk-modal-exclude').innerHTML = exclude;

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });
});

// Close modal handlers
document.getElementById('norisk-modal-overlay').addEventListener('click', function(e) {
    if (e.target === this || e.target.closest('.norisk-modal-close')) {
        this.classList.remove('active');
        document.body.style.overflow = '';
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modal = document.getElementById('norisk-modal-overlay');
        if (modal.classList.contains('active')) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
});
```

**Step 10: Commit**

```bash
git add norisk-wordpress/functions.php norisk-wordpress/page-preventivo.php
git commit -m "feat(8): add coverage info modal system

- Add 15 new Settings API fields for modal content (title, include, exclude for each coverage)
- Mobile-first modal design (slide-up on mobile, centered on desktop)
- Close on backdrop click, X button, or Escape key
- Question mark icon next to each coverage checkbox
- Body scroll lock when modal is open"
```

---

## Fix 3: Perdita Profitto Importo Specifico

**Files:**
- Modify: `norisk-wordpress/page-preventivo.php:931-937` (pass profit_estimate)
- Modify: `norisk-wordpress/page-preventivo.php:1105-1111` (display in summary)

**Step 1: Passa profit_estimate in collectFormData()**

In `collectFormData()`, trova la sezione cancellation_income (riga 931) e assicurati che includa:
```javascript
        if (reasons.includes('profit_max_50')) {
            coverages.cancellation_income = true;
            const profitEstimate = document.getElementById('profit_estimate').dataset.rawValue ||
                                   document.getElementById('profit_estimate').value.replace(/[^0-9]/g, '');
            if (profitEstimate) {
                coverages.cancellation_income_estimate = profitEstimate;
                coverages.profit_estimate = profitEstimate; // Per compatibilità
            }
        }
```

**Step 2: Aggiorna display nel riepilogo**

In `showSummary()`, trova il blocco cancellation (riga 1097-1122) e modifica:
```javascript
        if (formData.coverages.cancellation_income) {
            const profitEstVal = formData.coverages.cancellation_income_estimate || formData.coverages.profit_estimate;
            const profitDisplay = profitEstVal
                ? '€ ' + parseInt(profitEstVal).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : 'fino al 50%';
            cancellationDetails.push(`<div class="norisk-coverage-detail"><span class="label">Perdita profitto</span><span class="value">${profitDisplay}</span></div>`);
        }
```

**Step 3: Commit**

```bash
git commit -m "fix(3): show specific profit loss amount instead of generic percentage

- Pass profit_estimate in form data
- Display formatted € amount in quote summary"
```

---

## Fix 2: Fee Servizio €15

**Files:**
- Modify: `norisk-wordpress/functions.php:28-70` (default già presente)
- Verify: `norisk-wordpress/functions.php:310` (field già presente)
- Verify: `norisk-wordpress/functions.php:404` (sanitization già presente)
- Modify: `norisk-wordpress/page-preventivo.php:434-449` (add to CONFIG)
- Modify: `norisk-wordpress/page-preventivo.php:1065-1072` (use in calculation)

**Step 1: Verifica settings esistente**

Il campo `service_fee` esiste già:
- Default a riga 64: `'service_fee' => 15`
- Field a riga 310
- Sanitization a riga 404

**Step 2: Aggiungi SERVICE_FEE a CONFIG JS**

Il campo CONFIG.SERVICE_FEE esiste già a riga 447.

**Step 3: Verifica calcolo in showSummary()**

Il calcolo esiste già (righe 1065-1072):
```javascript
    const rawPriceNum = rawPriceStr
        ? parseFloat(rawPriceStr.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, ''))
        : NaN;
    const finalPrice = !isNaN(rawPriceNum)
        ? (rawPriceNum + CONFIG.SERVICE_FEE).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : (rawPriceStr || 'N/A');
```

**Step 4: Commit**

```bash
git commit -m "fix(2): service fee already configured and calculated

- service_fee setting with default 15€
- Added to final price calculation (silently, not itemized)"
```

---

## Fix 1: Immagini nel Preventivo (PDF)

**Files:**
- Modify: `norisk-wordpress/page-preventivo.php:1178-1185` (header images)

**Step 1: Verifica immagini esistenti**

Il codice esistente a righe 1179-1182 ha già le immagini:
```html
        <div class="norisk-summary-header">
            <img src="https://golinucci.it/wp-content/uploads/2026/02/WhatsApp-Image-2026-02-21-at-14.56.38-1.jpeg" alt="Golinucci Broker Assicurativo" class="norisk-logo-img" />
            <img src="https://golinucci.it/wp-content/uploads/2026/02/WhatsApp-Image-2026-02-21-at-14.56.38.jpeg" alt="Assicurazione Evento" class="norisk-event-img" />
```

**Step 2: Aggiungi CSS per stampa immagini**

Nel CSS (style.css o tag style), assicurati che le immagini siano visibili in stampa:
```css
@media print {
    .norisk-summary-header img {
        display: block !important;
        max-width: 100%;
        height: auto;
    }
    .norisk-logo-img {
        max-height: 80px;
    }
    .norisk-event-img {
        max-height: 120px;
        margin-top: 10px;
    }
}
```

**Step 3: Commit finale**

```bash
git commit -m "fix(1): ensure images appear in PDF print output

- Logo and event image in quote header
- CSS rules to prevent images from being hidden in print"
```

---

## Fix 4: Codice Preventivo NoRisk (GIÀ IMPLEMENTATO)

**Status:** ✅ Già implementato in `src/automation/scraper.js:508-542`

Il codice NR (es. NR000053118) viene già estratto e usato come `quoteKey`.

---

## Riepilogo Commit

1. `doc: add implementation plan for NoRisk fixes`
2. `fix(6): verify api_timeout_ms duplicate removed`
3. `fix(5): terms_url already configured in settings`
4. `feat(9): add configurable contact fields for PDF output`
5. `fix(7): admin labels already in Italian`
6. `feat(8): add coverage info modal system`
7. `fix(3): show specific profit loss amount instead of generic percentage`
8. `fix(2): service fee already configured and calculated`
9. `fix(1): ensure images appear in PDF print output`

---

## Testing Checklist

- [ ] Settings API carica senza errori
- [ ] Nuovi campi contatti salvano correttamente
- [ ] Nuovi campi modal salvano correttamente
- [ ] Modale si apre/clicca correttamente su mobile
- [ ] Modale si apre/clicca correttamente su desktop
- [ ] Profit estimate appare formattato nel riepilogo
- [ ] Service fee aggiunto al prezzo finale
- [ ] Contatti visibili nel PDF stampato
- [ ] Immagini visibili nel PDF stampato
- [ ] Codice NR mostrato nel riepilogo

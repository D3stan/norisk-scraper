# NoRisk Insurance Automation - Fixes & Improvements

Ultimo aggiornamento: 23 Febbraio 2026

---

## Fix 1 - Immagini nel Preventivo (PDF)

**Obiettivo:** Aggiungere logo e immagini al documento preventivo stampabile/PDF.

**Implementazione:**
- Logo Golinucci: `https://golinucci.it/wp-content/uploads/2026/02/WhatsApp-Image-2026-02-21-at-14.56.38-1.jpeg`
- Immagine evento: `https://golinucci.it/wp-content/uploads/2026/02/WhatsApp-Image-2026-02-21-at-14.56.38.jpeg`
- CSS `@media print` deve includere le immagini (non `display: none`)

---

## Fix 2 - Fee Servizio €15

**Obiettivo:** Aggiungere €15 di fee servizio al prezzo finale (non itemizzato).

**Implementazione:**
- Setting `service_fee` in Settings API (default: 15)
- Nel calcolo JS: `finalPrice = apiPrice + CONFIG.SERVICE_FEE`
- Mostrare solo il totale finale all'utente

---

## Fix 3 - Perdita Profitto: Importo Specifico

**Obiettivo:** Mostrare l'importo specifico di perdita profitto invece del testo generico "fino al 50%".

**Implementazione:**
- Il campo `profit_estimate` è già nel form (input utente)
- Inviarlo nell'oggetto coverages all'API
- Nel riepilogo: mostrare "€ X.XXX,00" invece di "fino al 50%"

---

## Fix 4 - Codice Preventivo NoRisk (NR0000XXXXX)

**Obiettivo:** Estrarre e mostrare il codice preventivo ufficiale NoRisk al posto dell'UUID interno.

**Implementazione:**
1. Scraper salva l'URL della pagina "Your Details"
2. Naviga a `https://verzekeren.norisk.eu/agents`
3. Cerca `<a href=".../proposal/{UUID}">NR0000XXXXX</a>`
4. Estrae il testo NR0000XXXXX
5. Torna alla pagina Your Details
6. Restituisce `noriskQuoteCode` nella risposta API
7. Frontend mostra il codice NR nel riepilogo

---

## Fix 5 - Link Termini e Condizioni (Settings API)

**Obiettivo:** Aggiungere campo URL Termini e Condizioni configurabile da admin.

**Implementazione:**
- Nuovo campo `terms_url` in Settings API
- Default: `https://golinucci.it/wp-content/uploads/2026/02/Terms-conditions-event-insurance-ITA.pdf`
- Validazione: `esc_url_raw()`
- Mostrare il link nel footer del preventivo

---

## Fix 6 - Rimuovi Duplicato API Timeout

**Obiettivo:** Eliminare il campo duplicato "API Timeout" dalle impostazioni.

**Implementazione:**
- Rimuovere `api_timeout_ms` da Settings API
- Mantenere solo `api_timeout` (in secondi)
- PHP calcola millisecondi: `$timeout * 1000`

---

## Fix 7 - Localizzazione Italiana Admin

**Obiettivo:** Tradurre tutte le etichette del pannello admin in italiano.

**Implementazione:**
- Tradurre `$text_fields`, `$coverage_fields`, `$number_fields`
- Tradurre titoli sezioni: "Texts & Labels" → "Testi ed Etichette"
- Usare funzioni i18n WordPress: `__( 'Testo', 'norisk' )`

---

## Fix 8 - Modale Informazioni Coperture (NUOVO)

**Obiettivo:** Aggiungere punto di domanda accanto a ogni copertura che apre un modale mobile-friendly con "Cosa include" e "Cosa esclude".

### Settings API - Campi da aggiungere:

Per ogni copertura (cancellation, liability, equipment, money, accidents):
- `{coverage}_modal_title` - Titolo del modale
- `{coverage}_modal_include` - Cosa include (textarea)
- `{coverage}_modal_exclude` - Cosa esclude (textarea)

### Frontend - Comportamento:

```html
<!-- Esempio struttura HTML per ogni coverage item -->
<div class="norisk-coverage-item">
    <label class="norisk-coverage-toggle">
        <input type="checkbox" id="coverage_cancellation">
        <span class="norisk-coverage-title">Costi di Annullamento</span>
    </label>
    <!-- Pulsante modale -->
    <button type="button" class="norisk-info-btn" data-coverage="cancellation" aria-label="Maggiori informazioni">
        <svg><!-- icona punto di domanda --></svg>
    </button>
</div>
```

### Modale - Struttura HTML:

```html
<div id="norisk-modal-overlay" class="norisk-modal-overlay">
    <div class="norisk-modal" role="dialog" aria-modal="true">
        <button class="norisk-modal-close" aria-label="Chiudi">&times;</button>
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

### Modale - CSS (Mobile First):

```css
.norisk-modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.6);
    display: flex;
    align-items: flex-end; /* Mobile: modale dal basso */
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
}
.norisk-modal-overlay.active .norisk-modal {
    transform: translateY(0);
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
        opacity: 0;
    }
    .norisk-modal-overlay.active .norisk-modal {
        transform: scale(1);
        opacity: 1;
    }
}
```

### Modale - JavaScript:

```javascript
// Apertura modale
document.querySelectorAll('.norisk-info-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const coverage = this.dataset.coverage;
        const title = CONFIG[`${coverage.toUpperCase()}_MODAL_TITLE`];
        const include = CONFIG[`${coverage.toUpperCase()}_MODAL_INCLUDE`];
        const exclude = CONFIG[`${coverage.toUpperCase()}_MODAL_EXCLUDE`];

        document.querySelector('.norisk-modal-title').textContent = title;
        document.querySelector('.norisk-modal-include').innerHTML = include;
        document.querySelector('.norisk-modal-exclude').innerHTML = exclude;

        document.getElementById('norisk-modal-overlay').classList.add('active');
        document.body.style.overflow = 'hidden'; // Blocca scroll
    });
});

// Chiusura modale (click su overlay o pulsante X)
document.getElementById('norisk-modal-overlay').addEventListener('click', function(e) {
    if (e.target === this || e.target.closest('.norisk-modal-close')) {
        this.classList.remove('active');
        document.body.style.overflow = '';
    }
});

// Chiusura con tasto ESC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        document.getElementById('norisk-modal-overlay').classList.remove('active');
        document.body.style.overflow = '';
    }
});
```

### Configurazione JS (passata da PHP):

```php
// In page-preventivo.php, aggiungere a CONFIG:
const CONFIG = {
    // ... esistente ...
    CANCELLATION_MODAL_TITLE: '<?php echo esc_js($norisk['cancellation_modal_title']); ?>',
    CANCELLATION_MODAL_INCLUDE: '<?php echo esc_js($norisk['cancellation_modal_include']); ?>',
    CANCELLATION_MODAL_EXCLUDE: '<?php echo esc_js($norisk['cancellation_modal_exclude']); ?>',
    // ... ripetere per ogni copertura ...
};
```

---

## Fix 9 - Contatti Golinucci Configurabili (NUOVO)

**Obiettivo:** Aggiungere contatti Golinucci configurabili da Settings API e mostrarli nel PDF.

### Settings API - Campi da aggiungere:

```php
$contact_fields = [
    'contact_email' => [
        'label' => 'Email contatti',
        'default' => 'eventi@golinucci.it'
    ],
    'contact_phone' => [
        'label' => 'Telefono contatti',
        'default' => ''
    ],
    'contact_show_in_pdf' => [
        'label' => 'Mostra contatti nel PDF',
        'default' => true
    ]
];
```

### Visualizzazione nel PDF (sezione footer):

```html
<div class="norisk-pdf-contacts">
    <div class="norisk-pdf-contact-item">
        <strong>Per informazioni e acquisto:</strong><br>
        Email: <a href="mailto:<?php echo esc_attr($norisk['contact_email']); ?>">
            <?php echo esc_html($norisk['contact_email']); ?></a><br>
        <?php if ($norisk['contact_phone']): ?>
        Tel: <?php echo esc_html($norisk['contact_phone']); ?>
        <?php endif; ?>
    </div>
</div>
```

### CSS per stampa:

```css
@media print {
    .norisk-pdf-contacts {
        margin-top: 30px;
        padding-top: 20px;
        border-top: 1px solid #ddd;
        page-break-inside: avoid;
    }
    .norisk-pdf-contacts a {
        color: #000;
        text-decoration: none;
    }
}
```

---

## Riepilogo Campi Settings API da Aggiungere

| Campo | Tipo | Default |
|-------|------|---------|
| `service_fee` | number | 15 |
| `terms_url` | url | https://golinucci.it/wp-content/uploads/2026/02/Terms-conditions-event-insurance-ITA.pdf |
| `contact_email` | email | eventi@golinucci.it |
| `contact_phone` | text | '' |
| `contact_show_in_pdf` | checkbox | true |
| `cancellation_modal_title` | text | 'Costi di Annullamento' |
| `cancellation_modal_include` | textarea | '' |
| `cancellation_modal_exclude` | textarea | '' |
| `liability_modal_title` | text | 'Responsabilità Civile' |
| `liability_modal_include` | textarea | '' |
| `liability_modal_exclude` | textarea | '' |
| `equipment_modal_title` | text | 'Attrezzature' |
| `equipment_modal_include` | textarea | '' |
| `equipment_modal_exclude` | textarea | '' |
| `money_modal_title` | text | 'Denaro' |
| `money_modal_include` | textarea | '' |
| `money_modal_exclude` | textarea | '' |
| `accidents_modal_title` | text | 'Infortuni' |
| `accidents_modal_include` | textarea | '' |
| `accidents_modal_exclude` | textarea | '' |

---

## Ordine di Implementazione Suggerito

1. **Fix 6** - Rimuovi duplicato API timeout (isolated, no-risk)
2. **Fix 5** - T&C URL Settings API (isolated)
3. **Fix 9** - Contatti configurabili (isolated)
4. **Fix 7** - Traduzioni italiane (no logic changes)
5. **Fix 8** - Modale coperture (nuova feature)
6. **Fix 3** - Perdita profitto importo (data flow)
7. **Fix 2** - Fee €15 (single calc change)
8. **Fix 4** - Codice NR (scraper + API + frontend)
9. **Fix 1** - Immagini PDF (visual only)

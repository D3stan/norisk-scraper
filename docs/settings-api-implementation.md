# WordPress Settings API — Admin Configurability Plan

**Date:** 2026-02-20  
**Goal:** Make the NoRisk quote form configurable from the WordPress admin panel (`Settings → NoRisk Form`) without touching code, using the native WordPress Settings API and Options API.

**Scope:** Tier 1 + Tier 2 items identified in the admin-configurability analysis report. No structural refactor of the form, no plugin dependencies.

**Files affected:**
- `norisk-wordpress/functions.php` — all registration logic added here
- `norisk-wordpress/page-preventivo.php` — hardcoded strings replaced with `get_option()` calls

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│            WordPress Admin Panel                 │
│                                                  │
│  Settings → NoRisk Form                          │
│  ┌─────────────────────────────────────────────┐ │
│  │  Section: Texts & Labels                    │ │
│  │  Section: Coverage Sections                 │ │
│  │  Section: Business Rules                    │ │
│  │  Section: API Configuration                 │ │
│  └──────────────┬──────────────────────────────┘ │
└─────────────────┼───────────────────────────────┘
                  │ update_option('norisk_options', [...])
                  ▼
         wp_options table (DB)
                  │
                  │ get_option('norisk_options', [...])
                  ▼
┌─────────────────────────────────────────────────┐
│         page-preventivo.php (template)           │
│  Reads options at render time, outputs HTML      │
└─────────────────────────────────────────────────┘
```

**Core pattern used:**
- All settings stored as a single serialized array under one option key: `norisk_options`
- This is a single DB read per page load (performance-safe, per Options API docs)
- Default fallback values always provided — existing hardcoded values become the defaults

---

## Options Map

All stored under `get_option('norisk_options', [])`. Key → default value → where used.

### Group A — Texts & Labels

| Option key | Default value | Used in |
|---|---|---|
| `page_title` | `Richiedi Preventivo per il Tuo Evento` | `<h1>` |
| `page_subtitle` | `Compila il modulo sottostante per ricevere un preventivo personalizzato...` | `<p>` below h1 |
| `loading_text` | `Stiamo elaborando il tuo preventivo...` | Loading overlay `<p>` |
| `loading_subtext` | `Questo potrebbe richiedere fino a 30 secondi` | Loading overlay `<p>` |
| `submit_btn_text` | `Richiedi Preventivo` | `<button type="submit">` |
| `privacy_label` | `Ho letto e accetto l'informativa sulla privacy` | Privacy checkbox label |
| `privacy_url` | `/privacy-policy` | Privacy link `href` |
| `new_quote_btn_text` | `Richiedi Nuovo Preventivo` | Reset button |
| `print_btn_text` | `Stampa / Salva PDF` | Print button |
| `section_personal_title` | `Informazioni Personali` | Form section h3 |
| `section_company_title` | `Dati Aziendali` | Form subsection h4 |
| `section_event_title` | `Informazioni sull'Evento` | Form section h3 |
| `section_location_title` | `Location` | Form section h3 |
| `section_coverage_title` | `Coperture Richieste` | Form section h3 |
| `coverage_note` | `Seleziona le coperture desiderate e configura le opzioni.` | Coverage intro `<p>` |

### Group B — Coverage Visibility (show/hide per toggle)

| Option key | Default | Effect |
|---|---|---|
| `show_coverage_cancellation` | `1` (on) | Shows/hides "Costi di Annullamento" block |
| `show_coverage_liability` | `1` (on) | Shows/hides "Responsabilità Civile" block |
| `show_coverage_equipment` | `1` (on) | Shows/hides "Attrezzature" block |
| `show_coverage_money` | `0` (off) | Shows/hides "Denaro" block (currently hardcoded hidden) |
| `show_coverage_accidents` | `1` (on) | Shows/hides "Infortuni" block |

### Group C — Business Rules

| Option key | Default | Effect |
|---|---|---|
| `min_days_advance` | `15` | Min days before event (date picker min + JS validation msg) |
| `liability_amount_1` | `2500000` | First liability radio option value (€ displayed auto-formatted) |
| `liability_amount_2` | `5000000` | Second liability radio option value |
| `accidents_permanent_disability` | `75000` | Fixed shown in summary (€ 75.000) |
| `accidents_death` | `25000` | Fixed shown in summary (€ 25.000) |
| `liability_deductible` | `500` | Shown in summary as "Franchigia" |

### Group D — API Configuration

| Option key | Default | Effect |
|---|---|---|
| `api_base_url` | `http://api.wordpress.home/api` | Replaces `NORISK_API_BASE` constant |
| `api_timeout` | `120` | Replaces `NORISK_API_TIMEOUT` constant |
| `api_timeout_ms` | `120000` | Replaces `API_TIMEOUT_MS` PHP const → JS variable |

---

## Implementation Tasks

### Task 1 — Register the settings admin page

**File:** `functions.php`

Add an `admin_menu` action that registers a submenu page under Settings:

```php
add_action('admin_menu', 'norisk_register_admin_page');
function norisk_register_admin_page() {
    add_options_page(
        'NoRisk Form Settings',
        'NoRisk Form',
        'manage_options',
        'norisk-settings',
        'norisk_render_settings_page'
    );
}
```

Result: **Settings → NoRisk Form** appears in the WP admin sidebar.

---

### Task 2 — Register settings, sections, and fields

**File:** `functions.php`

Add an `admin_init` action. Use a single `register_setting()` call for the entire `norisk_options` array, then group fields into 4 sections using `add_settings_section()` and `add_settings_field()`.

Structure:

```
register_setting('norisk_group', 'norisk_options', [
    'sanitize_callback' => 'norisk_sanitize_options'
])

add_settings_section('norisk_texts', 'Texts & Labels', ...)
  add_settings_field('page_title', ...)
  add_settings_field('page_subtitle', ...)
  add_settings_field('loading_text', ...)
  add_settings_field('loading_subtext', ...)
  add_settings_field('submit_btn_text', ...)
  add_settings_field('privacy_label', ...)
  add_settings_field('privacy_url', ...)
  add_settings_field('new_quote_btn_text', ...)
  add_settings_field('print_btn_text', ...)
  add_settings_field('section_*_title', ...) × 5

add_settings_section('norisk_coverage_visibility', 'Coverage Sections', ...)
  add_settings_field('show_coverage_*', ...) × 5   ← checkboxes

add_settings_section('norisk_business_rules', 'Business Rules', ...)
  add_settings_field('min_days_advance', ...)
  add_settings_field('liability_amount_1', ...)
  add_settings_field('liability_amount_2', ...)
  add_settings_field('accidents_permanent_disability', ...)
  add_settings_field('accidents_death', ...)
  add_settings_field('liability_deductible', ...)

add_settings_section('norisk_api', 'API Configuration', ...)
  add_settings_field('api_base_url', ...)
  add_settings_field('api_timeout', ...)
  add_settings_field('api_timeout_ms', ...)
```

Each field callback renders the appropriate `<input>`, `<textarea>`, or `<input type="checkbox">` wired to `norisk_options[field_key]`.

---

### Task 3 — Write the sanitize callback

**File:** `functions.php`

```php
function norisk_sanitize_options(array $input): array {
    $sanitized = [];

    // Text fields — plain text, no HTML
    $text_fields = ['page_title', 'page_subtitle', 'loading_text', 'loading_subtext',
                    'submit_btn_text', 'privacy_label', 'new_quote_btn_text', 'print_btn_text',
                    'section_personal_title', 'section_company_title', 'section_event_title',
                    'section_location_title', 'section_coverage_title', 'coverage_note'];
    foreach ($text_fields as $key) {
        $sanitized[$key] = sanitize_text_field($input[$key] ?? '');
    }

    // URL fields
    $sanitized['privacy_url'] = esc_url_raw($input['privacy_url'] ?? '/privacy-policy');
    $sanitized['api_base_url'] = esc_url_raw($input['api_base_url'] ?? '');

    // Integer fields
    $int_fields = ['min_days_advance', 'api_timeout', 'api_timeout_ms',
                   'liability_amount_1', 'liability_amount_2',
                   'accidents_permanent_disability', 'accidents_death', 'liability_deductible'];
    foreach ($int_fields as $key) {
        $sanitized[$key] = absint($input[$key] ?? 0);
    }

    // Checkbox fields (present = 1, absent = 0)
    $checkbox_fields = ['show_coverage_cancellation', 'show_coverage_liability',
                        'show_coverage_equipment', 'show_coverage_money', 'show_coverage_accidents'];
    foreach ($checkbox_fields as $key) {
        $sanitized[$key] = isset($input[$key]) ? 1 : 0;
    }

    return $sanitized;
}
```

---

### Task 4 — Write the admin page renderer

**File:** `functions.php`

```php
function norisk_render_settings_page() {
    if (!current_user_can('manage_options')) return;
    ?>
    <div class="wrap">
        <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
        <form method="post" action="options.php">
            <?php
            settings_fields('norisk_group');
            do_settings_sections('norisk-settings');
            submit_button('Save Settings');
            ?>
        </form>
    </div>
    <?php
}
```

WordPress handles `POST → options.php`, nonce verification, and `update_option()` automatically.

---

### Task 5 — Create a defaults helper function

**File:** `functions.php`

To avoid repeating defaults across the template, define a single source-of-truth function:

```php
function norisk_get_options(): array {
    return wp_parse_args(get_option('norisk_options', []), [
        // Texts
        'page_title'             => 'Richiedi Preventivo per il Tuo Evento',
        'page_subtitle'          => 'Compila il modulo sottostante per ricevere un preventivo personalizzato per l\'assicurazione del tuo evento.',
        'loading_text'           => 'Stiamo elaborando il tuo preventivo...',
        'loading_subtext'        => 'Questo potrebbe richiedere fino a 30 secondi',
        'submit_btn_text'        => 'Richiedi Preventivo',
        'privacy_label'          => 'Ho letto e accetto l\'informativa sulla privacy',
        'privacy_url'            => '/privacy-policy',
        'new_quote_btn_text'     => 'Richiedi Nuovo Preventivo',
        'print_btn_text'         => 'Stampa / Salva PDF',
        'section_personal_title' => 'Informazioni Personali',
        'section_company_title'  => 'Dati Aziendali',
        'section_event_title'    => 'Informazioni sull\'Evento',
        'section_location_title' => 'Location',
        'section_coverage_title' => 'Coperture Richieste',
        'coverage_note'          => 'Seleziona le coperture desiderate e configura le opzioni.',
        // Coverage visibility
        'show_coverage_cancellation' => 1,
        'show_coverage_liability'    => 1,
        'show_coverage_equipment'    => 1,
        'show_coverage_money'        => 0,
        'show_coverage_accidents'    => 1,
        // Business rules
        'min_days_advance'                => 15,
        'liability_amount_1'              => 2500000,
        'liability_amount_2'              => 5000000,
        'accidents_permanent_disability'  => 75000,
        'accidents_death'                 => 25000,
        'liability_deductible'            => 500,
        // API
        'api_base_url'    => 'http://api.wordpress.home/api',
        'api_timeout'     => 120,
        'api_timeout_ms'  => 120000,
    ]);
}
```

`wp_parse_args()` merges saved options with defaults — missing keys always fall back safely.

---

### Task 6 — Update page-preventivo.php to consume options

**File:** `page-preventivo.php`

At the top of the file (after the template comment), add one line:

```php
$norisk = norisk_get_options();
```

Then replace each hardcoded string. Exact find→replace pairs:

| Find (hardcoded) | Replace with |
|---|---|
| `const API_TIMEOUT_MS = 120000;` | `const API_TIMEOUT_MS = <?php echo (int)$norisk['api_timeout_ms']; ?>;` |
| `define( 'NORISK_API_BASE', '...' )` in functions.php | `define( 'NORISK_API_BASE', norisk_get_options()['api_base_url'] )` |
| `define( 'NORISK_API_TIMEOUT', 120 )` in functions.php | `define( 'NORISK_API_TIMEOUT', norisk_get_options()['api_timeout'] )` |
| `<h1>Richiedi Preventivo per il Tuo Evento</h1>` | `<h1><?php echo esc_html($norisk['page_title']); ?></h1>` |
| `<p>Compila il modulo...` | `<p><?php echo esc_html($norisk['page_subtitle']); ?></p>` |
| `Stiamo elaborando il tuo preventivo...` | `<?php echo esc_html($norisk['loading_text']); ?>` |
| `Questo potrebbe richiedere fino a 30 secondi` | `<?php echo esc_html($norisk['loading_subtext']); ?>` |
| `<h3>Informazioni Personali</h3>` | `<h3><?php echo esc_html($norisk['section_personal_title']); ?></h3>` |
| `<h4 class="norisk-subsection-title">Dati Aziendali</h4>` | `<h4 ...><?php echo esc_html($norisk['section_company_title']); ?></h4>` |
| `<h3>Informazioni sull'Evento</h3>` | `<h3><?php echo esc_html($norisk['section_event_title']); ?></h3>` |
| `<h3>Location</h3>` | `<h3><?php echo esc_html($norisk['section_location_title']); ?></h3>` |
| `<h3>Coperture Richieste</h3>` | `<h3><?php echo esc_html($norisk['section_coverage_title']); ?></h3>` |
| `<p class="norisk-coverage-note">Seleziona...` | `<p ...><?php echo esc_html($norisk['coverage_note']); ?></p>` |
| `<button type="submit" class="norisk-submit-btn">Richiedi Preventivo</button>` | `<button ...><?php echo esc_html($norisk['submit_btn_text']); ?></button>` |
| `href="/privacy-policy"` | `href="<?php echo esc_url($norisk['privacy_url']); ?>"` |
| `Ho letto e accetto l'` | `<?php echo esc_html($norisk['privacy_label']); ?> <a ...>` |

**For coverage section visibility**, wrap each `norisk-coverage-item` div with:

```php
<?php if ($norisk['show_coverage_cancellation']): ?>
<div class="norisk-coverage-item">
    <!-- Cancellation block -->
</div>
<?php endif; ?>
```

Also expose configurable values to JavaScript via `wp_localize_script()` or an inline PHP-injected `CONFIG` object:

```php
// Replace hardcoded JS CONFIG block with:
const CONFIG = {
    AJAX_URL: '<?php echo esc_js(admin_url("admin-ajax.php")); ?>',
    API_TIMEOUT_MS: <?php echo (int)$norisk['api_timeout_ms']; ?>,
    MIN_DAYS_ADVANCE: <?php echo (int)$norisk['min_days_advance']; ?>,
    NEW_QUOTE_BTN_TEXT: '<?php echo esc_js($norisk['new_quote_btn_text']); ?>',
    PRINT_BTN_TEXT: '<?php echo esc_js($norisk['print_btn_text']); ?>',
    LIABILITY_AMOUNT_1: <?php echo (int)$norisk['liability_amount_1']; ?>,
    LIABILITY_AMOUNT_2: <?php echo (int)$norisk['liability_amount_2']; ?>,
    ACCIDENTS_PERMANENT_DISABILITY: <?php echo (int)$norisk['accidents_permanent_disability']; ?>,
    ACCIDENTS_DEATH: <?php echo (int)$norisk['accidents_death']; ?>,
    LIABILITY_DEDUCTIBLE: <?php echo (int)$norisk['liability_deductible']; ?>,
};
```

Then update the inline JS that currently hardcodes `15` (min date), `€ 75.000`, `€ 25.000`, `€ 500` to read from `CONFIG.*` instead.

---

### Task 7 — Fix the debug panel visibility

**File:** `page-preventivo.php`

While in the file, gate the debug panel so it only renders for administrators:

```php
<?php if (current_user_can('administrator')): ?>
<script>
(function() {
    // ... existing debug panel code ...
})();
</script>
<?php endif; ?>
```

This is a required security fix noted in the analysis report.

---

### Task 8 — Fix AJAX URL

**File:** `page-preventivo.php`

Replace the hardcoded JS config entry:

```js
// Before
AJAX_URL: '/wp-admin/admin-ajax.php',

// After (now handled by Task 6's CONFIG block)
AJAX_URL: '<?php echo esc_js(admin_url("admin-ajax.php")); ?>',
```

---

## Testing Checklist

After implementation, verify:

- [ ] `Settings → NoRisk Form` page appears in WP admin
- [ ] All fields render with correct default values on first load (no saved options yet)
- [ ] Saving settings updates displayed text on the frontend page
- [ ] Turning off a coverage checkbox hides that section from the form
- [ ] Changing `min_days_advance` reflects in the JS date validation (min date recalculates)
- [ ] Changing `api_base_url` changes the endpoint used by proxy functions
- [ ] Debug panel is invisible to logged-out users and non-admins
- [ ] AJAX URL works correctly (not broken on non-root WordPress installs)
- [ ] Empty fields safely fall back to defaults (test by saving empty values)
- [ ] XSS: all outputs use `esc_html()`, `esc_url()`, `esc_js()` appropriately

---

## Out of Scope (not in this plan)

- Dropdown option management (event types, countries, legal forms) — these require a Repeater-style UI (ACF) or a separate JSON management interface
- Adding/removing form fields — requires API schema changes
- Reordering form sections — requires template loop refactor
- Visual/live-preview customization — Customizer API is a separate effort
- ACF integration — separate plan if needed

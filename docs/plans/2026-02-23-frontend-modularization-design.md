# Frontend Modularization Design

## Overview
Refactor the NoRisk WordPress frontend (`page-preventivo.php` and `functions.php`) from a monolithic 1600-line template into a clean, modular architecture with proper separation of concerns.

## Goals
- Extract inline JavaScript to cacheable `.js` files
- Separate CSS from inline includes to proper enqueuing
- Create maintainable PHP template parts
- Add configurable settings for hardcoded URLs
- Preserve all existing functionality and backwards compatibility

## Architecture

### File Structure
```
norisk-wordpress/
├── assets/
│   ├── css/
│   │   └── norisk-form.css          (moved from style.css)
│   └── js/
│       ├── norisk-form.js           (core form functionality)
│       ├── norisk-coverage.js       (coverage toggle handlers)
│       ├── norisk-summary.js        (quote summary display)
│       └── norisk-debug.js          (debug tools, conditionally loaded)
├── includes/
│   ├── template-functions.php       (helper functions)
│   └── template-parts/
│       ├── form-section-personal.php
│       ├── form-section-company.php
│       ├── form-section-event.php
│       ├── form-section-location.php
│       ├── form-section-coverage.php
│       └── form-section-privacy.php
├── functions.php                     (updated with proper enqueuing)
└── page-preventivo.php               (slimmed-down template)
```

### JavaScript Modules

#### norisk-form.js
- Form data collection (`collectFormData()`)
- LocalStorage persistence (save/restore/clear)
- AJAX submission via WordPress AJAX endpoints
- Form validation and date handling
- Error and success display handlers
- Main entry point, loaded first

#### norisk-coverage.js
- Toggle handlers for all coverage types
- Dynamic form field visibility
- Number formatting (Italian thousands separators)
- Guest add/remove functionality
- Depends on: norisk-form.js

#### norisk-summary.js
- Quote summary HTML generation
- Coverage block builders
- Print and reset button handlers
- Depends on: norisk-coverage.js

#### norisk-debug.js
- Fill form with test data
- Simulate success/error states
- Reset functionality
- Self-removable panel
- Conditionally loaded based on `show_debug_panel` setting

### PHP Template Parts

Each template part receives the `$norisk` options array and generates identical HTML to the current implementation:

- `form-section-personal.php` - Title, name, phone, email fields
- `form-section-company.php` - Company details, legal form, address
- `form-section-event.php` - Event name, type, dates, visitors, description
- `form-section-location.php` - Venue description, address, environment
- `form-section-coverage.php` - All coverage options with toggle logic
- `form-section-privacy.php` - Privacy checkbox and submit button

### Settings API Additions

New configurable options in `functions.php`:
- `logo_url` - Header logo image (replaces hardcoded golinucci.it URL)
- `event_image_url` - Event insurance image (replaces hardcoded URL)
- Existing `terms_url` already configurable

### WordPress Asset Enqueuing

```php
add_action('wp_enqueue_scripts', 'norisk_enqueue_assets');

function norisk_enqueue_assets() {
    if (!is_page_template('page-preventivo.php')) return;

    // CSS
    wp_enqueue_style('norisk-form', get_stylesheet_directory_uri() . '/assets/css/norisk-form.css');

    // JS modules with dependencies
    wp_enqueue_script('norisk-form', ..., ['jquery']);
    wp_enqueue_script('norisk-coverage', ..., ['norisk-form']);
    wp_enqueue_script('norisk-summary', ..., ['norisk-coverage']);

    // Localized configuration (replaces inline CONFIG object)
    wp_localize_script('norisk-form', 'noriskConfig', [...]);

    // Debug tools (conditionally)
    if ($norisk['show_debug_panel']) {
        wp_enqueue_script('norisk-debug', ..., ['norisk-summary']);
    }
}
```

## Backwards Compatibility

All changes maintain exact output compatibility:
- Same HTML structure and CSS selectors
- Same form field `name` attributes
- Same JavaScript global functions (`showSummary`, `resetForm`, etc.)
- Same AJAX endpoints and request format
- Same LocalStorage keys and data format

## Testing Considerations

- Verify form submission works end-to-end
- Confirm LocalStorage persistence works
- Test coverage toggle visibility
- Validate number formatting (Italian locale)
- Check debug panel conditional loading
- Confirm summary display with all coverage types
- Test print and reset functionality

## Security

- Maintain existing nonces where applicable
- Keep sanitization in `functions.php`
- No new user input vectors introduced

## Performance

- JavaScript files become cacheable (browser and CDN)
- Reduced HTML payload size
- No inline scripts blocking render

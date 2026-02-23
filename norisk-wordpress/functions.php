<?php
/**
 * Recommended way to include parent theme styles.
 * (Please see http://codex.wordpress.org/Child_Themes#How_to_Create_a_Child_Theme)
 *
 */  

add_action( 'wp_enqueue_scripts', 'preventivo_style' );
                                function preventivo_style() {
                                        wp_enqueue_style( 'parent-style', get_template_directory_uri() . '/style.css' );
                                        wp_enqueue_style( 'child-style', get_stylesheet_directory_uri() . '/style.css', array('parent-style') );
                                }

/**
 * Your code goes below.
 */

// =========================================
// NoRisk Options Helper
// Single source of truth for all configurable values.
// =========================================

/**
 * Returns all NoRisk options merged with defaults.
 * Uses wp_parse_args so missing keys always fall back safely.
 */
function norisk_get_options(): array {
    return wp_parse_args( get_option( 'norisk_options', [] ), [
        // Texts
        'page_title'             => 'Richiedi Preventivo per il Tuo Evento',
        'page_subtitle'          => 'Compila il modulo sottostante per ricevere un preventivo personalizzato per l\'assicurazione del tuo evento.',
        'loading_text'           => 'Stiamo elaborando il tuo preventivo...',
        'loading_subtext'        => 'Questo potrebbe richiedere fino a 30 secondi',
        'submit_btn_text'        => 'Richiedi Preventivo',
        'privacy_label'          => 'Ho letto e accetto l\'informativa sulla privacy',
        'privacy_url'            => '/privacy-policy',
        'terms_url'              => 'https://golinucci.it/wp-content/uploads/2026/02/Terms-conditions-event-insurance-ITA.pdf',
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
        'min_days_advance'               => 15,
        'liability_amount_1'             => 2500000,
        'liability_amount_2'             => 5000000,
        'accidents_permanent_disability' => 75000,
        'accidents_death'                => 25000,
        'liability_deductible'           => 500,
        // Business
        'service_fee'                    => 15,
        // API
        'api_base_url'     => 'http://api.wordpress.home/api',
        'api_timeout'      => 120,
        // Debug
        'show_debug_panel' => 0,
    ] );
}

// =========================================
// NoRisk API Proxy — server-side AJAX handlers
// The browser never touches the internal API directly.
// =========================================

define( 'NORISK_API_BASE',    norisk_get_options()['api_base_url'] );
define( 'NORISK_API_TIMEOUT', norisk_get_options()['api_timeout'] ); // seconds

/**
 * Helper: forward a POST request to the internal API.
 */
function norisk_proxy_post( string $endpoint, array $body ): array {
    $response = wp_remote_post(
        NORISK_API_BASE . $endpoint,
        [
            'timeout'     => NORISK_API_TIMEOUT,
            'headers'     => [ 'Content-Type' => 'application/json' ],
            'body'        => wp_json_encode( $body ),
            'data_format' => 'body',
        ]
    );

    if ( is_wp_error( $response ) ) {
        return [ 'ok' => false, 'status' => 500, 'body' => [ 'message' => $response->get_error_message() ] ];
    }

    $code = wp_remote_retrieve_response_code( $response );
    $data = json_decode( wp_remote_retrieve_body( $response ), true ) ?? [];
    return [ 'ok' => ( $code >= 200 && $code < 300 ), 'status' => $code, 'body' => $data ];
}

/**
 * Helper: forward a GET request to the internal API.
 */
function norisk_proxy_get( string $endpoint ): array {
    $response = wp_remote_get(
        NORISK_API_BASE . $endpoint,
        [
            'timeout' => NORISK_API_TIMEOUT,
            'headers' => [ 'Content-Type' => 'application/json' ],
        ]
    );

    if ( is_wp_error( $response ) ) {
        return [ 'ok' => false, 'status' => 500, 'body' => [ 'message' => $response->get_error_message() ] ];
    }

    $code = wp_remote_retrieve_response_code( $response );
    $data = json_decode( wp_remote_retrieve_body( $response ), true ) ?? [];
    return [ 'ok' => ( $code >= 200 && $code < 300 ), 'status' => $code, 'body' => $data ];
}

/**
 * Action: norisk_submit_quote
 * Proxies the quote submission to the internal API.
 */
add_action( 'wp_ajax_norisk_submit_quote',        'norisk_ajax_submit_quote' );
add_action( 'wp_ajax_nopriv_norisk_submit_quote', 'norisk_ajax_submit_quote' );
function norisk_ajax_submit_quote(): void {
    // Read raw JSON body sent by the browser
    $raw  = file_get_contents( 'php://input' );
    $data = json_decode( $raw, true );

    if ( ! is_array( $data ) ) {
        wp_send_json_error( [ 'message' => 'Richiesta non valida.' ], 400 );
    }

    $result = norisk_proxy_post( '/quote', $data );

    if ( $result['ok'] ) {
        wp_send_json_success( $result['body'] );
    } else {
        $msg = $result['body']['message'] ?? ( 'Errore del server (' . $result['status'] . ').' );
        wp_send_json_error( [ 'message' => $msg ], $result['status'] );
    }
}

/**
 * Action: norisk_check_quote_status
 * Proxies a quote status check to the internal API.
 */
add_action( 'wp_ajax_norisk_check_quote_status',        'norisk_ajax_check_quote_status' );
add_action( 'wp_ajax_nopriv_norisk_check_quote_status', 'norisk_ajax_check_quote_status' );
function norisk_ajax_check_quote_status(): void {
    $quote_key = isset( $_GET['quoteKey'] ) ? sanitize_text_field( $_GET['quoteKey'] ) : '';

    if ( empty( $quote_key ) ) {
        wp_send_json_error( [ 'message' => 'Chiave preventivo mancante.' ], 400 );
    }

    $result = norisk_proxy_get( '/quote/' . rawurlencode( $quote_key ) . '/status' );

    if ( $result['ok'] ) {
        wp_send_json_success( $result['body'] );
    } else {
        $msg = $result['body']['message'] ?? ( 'Errore del server (' . $result['status'] . ').' );
        wp_send_json_error( [ 'message' => $msg ], $result['status'] );
    }
}

/**
 * Action: norisk_send_quote
 * Proxies the "send quote to user" request to the internal API.
 */
add_action( 'wp_ajax_norisk_send_quote',        'norisk_ajax_send_quote' );
add_action( 'wp_ajax_nopriv_norisk_send_quote', 'norisk_ajax_send_quote' );
function norisk_ajax_send_quote(): void {
    $raw  = file_get_contents( 'php://input' );
    $data = json_decode( $raw, true );

    if ( ! is_array( $data ) || empty( $data['quoteKey'] ) ) {
        wp_send_json_error( [ 'message' => 'Chiave preventivo mancante.' ], 400 );
    }

    $result = norisk_proxy_post( '/quote/send', $data );

    if ( $result['ok'] ) {
        wp_send_json_success( $result['body'] );
    } else {
        $msg = $result['body']['message'] ?? ( 'Errore del server (' . $result['status'] . ').' );
        wp_send_json_error( [ 'message' => $msg ], $result['status'] );
    }
}

// =========================================
// NoRisk Settings API — WordPress Admin Panel
// Settings → NoRisk Form
// =========================================

/**
 * Register admin submenu page under Settings.
 */
add_action( 'admin_menu', 'norisk_register_admin_page' );
function norisk_register_admin_page(): void {
    add_options_page(
        'NoRisk Form Settings',
        'NoRisk Form',
        'manage_options',
        'norisk-settings',
        'norisk_render_settings_page'
    );
}

/**
 * Register all settings, sections, and fields.
 */
add_action( 'admin_init', 'norisk_register_settings' );
function norisk_register_settings(): void {
    register_setting( 'norisk_group', 'norisk_options', [
        'sanitize_callback' => 'norisk_sanitize_options',
    ] );

    // ----- Sezione A: Testi ed Etichette -----
    add_settings_section( 'norisk_texts', 'Testi ed Etichette', '__return_false', 'norisk-settings' );

    $text_fields = [
        'page_title'             => 'Titolo Pagina',
        'page_subtitle'          => 'Sottotitolo Pagina',
        'loading_text'           => 'Testo Caricamento',
        'loading_subtext'        => 'Testo Secondario Caricamento',
        'submit_btn_text'        => 'Testo Pulsante Invia',
        'privacy_label'          => 'Etichetta Casella Privacy',
        'privacy_url'            => 'URL Privacy Policy',
        'terms_url'              => 'URL Condizioni Contrattuali',
        'new_quote_btn_text'     => 'Testo Pulsante Nuovo Preventivo',
        'print_btn_text'         => 'Testo Pulsante Stampa/PDF',
        'section_personal_title' => 'Titolo Sezione Dati Personali',
        'section_company_title'  => 'Titolo Sezione Dati Aziendali',
        'section_event_title'    => 'Titolo Sezione Evento',
        'section_location_title' => 'Titolo Sezione Location',
        'section_coverage_title' => 'Titolo Sezione Coperture',
        'coverage_note'          => 'Nota Introduttiva Coperture',
    ];

    foreach ( $text_fields as $key => $label ) {
        add_settings_field(
            $key,
            $label,
            'norisk_render_text_field',
            'norisk-settings',
            'norisk_texts',
            [ 'key' => $key ]
        );
    }

    // ----- Sezione B: Visibilità Coperture -----
    add_settings_section( 'norisk_coverage_visibility', 'Sezioni Copertura', '__return_false', 'norisk-settings' );

    $coverage_fields = [
        'show_coverage_cancellation' => 'Mostra Costi di Annullamento',
        'show_coverage_liability'    => 'Mostra Responsabilità Civile',
        'show_coverage_equipment'    => 'Mostra Attrezzatura',
        'show_coverage_money'        => 'Mostra Denaro',
        'show_coverage_accidents'    => 'Mostra Infortuni',
    ];

    foreach ( $coverage_fields as $key => $label ) {
        add_settings_field(
            $key,
            $label,
            'norisk_render_checkbox_field',
            'norisk-settings',
            'norisk_coverage_visibility',
            [ 'key' => $key ]
        );
    }

    // ----- Sezione C: Regole di Business -----
    add_settings_section( 'norisk_business_rules', 'Regole di Business', '__return_false', 'norisk-settings' );

    $number_fields = [
        'min_days_advance'               => 'Giorni Minimi Anticipo',
        'liability_amount_1'             => 'Massimale RC Opzione 1 (€)',
        'liability_amount_2'             => 'Massimale RC Opzione 2 (€)',
        'accidents_permanent_disability' => 'Infortuni: Somma Invalidità Permanente (€)',
        'accidents_death'                => 'Infortuni: Somma Decesso (€)',
        'liability_deductible'           => 'Franchigia RC (€)',
        'service_fee'                    => 'Commissione di Servizio (€)',
    ];

    foreach ( $number_fields as $key => $label ) {
        add_settings_field(
            $key,
            $label,
            'norisk_render_number_field',
            'norisk-settings',
            'norisk_business_rules',
            [ 'key' => $key ]
        );
    }

    // ----- Sezione D: Configurazione API -----
    add_settings_section( 'norisk_api', 'Configurazione API', '__return_false', 'norisk-settings' );

    add_settings_field( 'api_base_url', 'URL Base API',         'norisk_render_text_field',   'norisk-settings', 'norisk_api', [ 'key' => 'api_base_url' ] );
    add_settings_field( 'api_timeout',  'Timeout API (secondi)', 'norisk_render_number_field', 'norisk-settings', 'norisk_api', [ 'key' => 'api_timeout' ] );

    // ----- Sezione E: Debug -----
    add_settings_section( 'norisk_debug', 'Debug', '__return_false', 'norisk-settings' );
    add_settings_field( 'show_debug_panel', 'Mostra pannello debug (solo amministratori)', 'norisk_render_checkbox_field', 'norisk-settings', 'norisk_debug', [ 'key' => 'show_debug_panel' ] );
}

/**
 * Render a plain text / URL input field.
 */
function norisk_render_text_field( array $args ): void {
    $opts  = norisk_get_options();
    $key   = $args['key'];
    $value = $opts[ $key ] ?? '';
    printf(
        '<input type="text" name="norisk_options[%s]" value="%s" class="regular-text" />',
        esc_attr( $key ),
        esc_attr( $value )
    );
}

/**
 * Render a number input field.
 */
function norisk_render_number_field( array $args ): void {
    $opts  = norisk_get_options();
    $key   = $args['key'];
    $value = $opts[ $key ] ?? 0;
    printf(
        '<input type="number" name="norisk_options[%s]" value="%s" class="small-text" min="0" />',
        esc_attr( $key ),
        esc_attr( (string) $value )
    );
}

/**
 * Render a checkbox field.
 */
function norisk_render_checkbox_field( array $args ): void {
    $opts    = norisk_get_options();
    $key     = $args['key'];
    $checked = ! empty( $opts[ $key ] ) ? 'checked' : '';
    printf(
        '<input type="checkbox" name="norisk_options[%s]" value="1" %s />',
        esc_attr( $key ),
        $checked
    );
}

/**
 * Sanitize all incoming settings before saving.
 */
function norisk_sanitize_options( $input ): array {
    if ( ! is_array( $input ) ) {
        return [];
    }

    $sanitized = [];

    // Plain text fields
    $text_fields = [
        'page_title', 'page_subtitle', 'loading_text', 'loading_subtext',
        'submit_btn_text', 'privacy_label', 'new_quote_btn_text', 'print_btn_text',
        'section_personal_title', 'section_company_title', 'section_event_title',
        'section_location_title', 'section_coverage_title', 'coverage_note',
    ];
    foreach ( $text_fields as $key ) {
        $sanitized[ $key ] = sanitize_text_field( $input[ $key ] ?? '' );
    }

    // URL fields
    $sanitized['privacy_url']  = esc_url_raw( $input['privacy_url']  ?? '/privacy-policy' );
    $sanitized['terms_url']    = esc_url_raw( $input['terms_url']    ?? '' );
    $sanitized['api_base_url'] = esc_url_raw( $input['api_base_url'] ?? '' );

    // Integer fields
    $int_fields = [
        'min_days_advance', 'api_timeout', 'service_fee',
        'liability_amount_1', 'liability_amount_2',
        'accidents_permanent_disability', 'accidents_death', 'liability_deductible',
    ];
    foreach ( $int_fields as $key ) {
        $sanitized[ $key ] = absint( $input[ $key ] ?? 0 );
    }

    // Checkbox fields — present = 1, absent = 0
    $checkbox_fields = [
        'show_coverage_cancellation', 'show_coverage_liability',
        'show_coverage_equipment', 'show_coverage_money', 'show_coverage_accidents',
        'show_debug_panel',
    ];
    foreach ( $checkbox_fields as $key ) {
        $sanitized[ $key ] = isset( $input[ $key ] ) ? 1 : 0;
    }

    return $sanitized;
}

/**
 * Render the admin settings page.
 */
function norisk_render_settings_page(): void {
    if ( ! current_user_can( 'manage_options' ) ) {
        return;
    }
    ?>
    <div class="wrap">
        <h1><?php echo esc_html( get_admin_page_title() ); ?></h1>
        <form method="post" action="options.php">
            <?php
            settings_fields( 'norisk_group' );
            do_settings_sections( 'norisk-settings' );
            submit_button( 'Salva Impostazioni' );
            ?>
        </form>
    </div>
    <?php
}
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
// NoRisk API Proxy — server-side AJAX handlers
// The browser never touches the internal API directly.
// =========================================

define( 'NORISK_API_BASE', 'http://api.wordpress.home/api' );
define( 'NORISK_API_TIMEOUT', 120 ); // seconds

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
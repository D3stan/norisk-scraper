<?php
/**
 * Local testing wrapper for WordPress page template
 */

function get_header() {
    echo "<!DOCTYPE html><html><head><meta charset='UTF-8'><title>Test Preventivo</title></head><body>";
}

function get_footer() {
    echo "</body></html>";
}

include 'page-preventivo.php';
?>

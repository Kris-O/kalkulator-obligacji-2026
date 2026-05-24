<?php
/**
 * Obsługa zapytań AJAX dla kalkulatora obligacji.
 *
 * Endpoint: /wp-admin/admin-ajax.php?action=kalkulator_get_rates
 * Metoda:   GET (publiczne — nonce nie jest wymagany dla odczytu kursów)
 * Odpowiedź: JSON { nbp_rate, wibor6m, updated, source }
 */

if ( ! defined( 'ABSPATH' ) ) exit;

class Kalkulator_Ajax {

    public static function register() {
        // Dostępny zarówno dla zalogowanych jak i niezalogowanych użytkowników
        add_action( 'wp_ajax_kalkulator_get_rates',        array( __CLASS__, 'handle_get_rates' ) );
        add_action( 'wp_ajax_nopriv_kalkulator_get_rates', array( __CLASS__, 'handle_get_rates' ) );

        // Ręczne wymuszenie odświeżenia przez admina
        add_action( 'wp_ajax_kalkulator_refresh_rates',    array( __CLASS__, 'handle_refresh_rates' ) );
    }

    /**
     * Zwraca aktualne kursy rynkowe jako JSON.
     */
    public static function handle_get_rates() {
        $rates = Kalkulator_Rates_Fetcher::get_rates();

        wp_send_json_success( array(
            'nbp_rate' => isset( $rates['nbp_rate'] ) ? (float) $rates['nbp_rate'] : null,
            'wibor6m'  => isset( $rates['wibor6m'] )  ? (float) $rates['wibor6m']  : null,
            'updated'  => isset( $rates['updated'] )  ? $rates['updated']           : null,
            'source'   => isset( $rates['source'] )   ? $rates['source']            : array(),
        ) );
    }

    /**
     * Wymusza ponowne pobranie kursów (tylko dla adminów).
     */
    public static function handle_refresh_rates() {
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_send_json_error( array( 'message' => 'Brak uprawnień.' ), 403 );
        }

        check_ajax_referer( 'kalkulator_refresh', 'nonce' );

        $rates = Kalkulator_Rates_Fetcher::fetch_and_cache();

        wp_send_json_success( array(
            'nbp_rate' => (float) $rates['nbp_rate'],
            'wibor6m'  => (float) $rates['wibor6m'],
            'updated'  => $rates['updated'],
            'source'   => $rates['source'],
        ) );
    }
}

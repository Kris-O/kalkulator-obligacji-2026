<?php
/**
 * Pobieranie aktualnych parametrów rynkowych.
 *
 * Stopa referencyjna NBP: scraping strony nbp.pl
 * WIBOR 6M: scraping strony gpwbenchmark.pl
 *
 * Wyniki cache'owane w WP Options (klucz: kalkulator_rates).
 * Odświeżane przez WP Cron raz dziennie lub ręcznie przez admin.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

class Kalkulator_Rates_Fetcher {

    const OPTION_KEY    = 'kalkulator_rates';
    const CACHE_HOURS   = 20; // Cron codziennie, ale akceptujemy do 20h przestarzałości

    /**
     * Zwraca aktualne kursy (z cache lub po odświeżeniu).
     * @return array { nbp_rate, wibor6m, updated }
     */
    public static function get_rates() {
        $cached = get_option( self::OPTION_KEY );

        if ( $cached && isset( $cached['updated'] ) ) {
            $age_hours = ( time() - strtotime( $cached['updated'] ) ) / 3600;
            if ( $age_hours < self::CACHE_HOURS ) {
                return $cached;
            }
        }

        return self::fetch_and_cache();
    }

    /**
     * Pobiera kursy z zewnętrznych stron i zapisuje do cache.
     * @return array
     */
    public static function fetch_and_cache() {
        $nbp_rate = self::fetch_nbp_rate();
        $wibor6m  = self::fetch_wibor6m();

        $data = array(
            'nbp_rate' => $nbp_rate ?? 0.0575,
            'wibor6m'  => $wibor6m  ?? 0.0590,
            'updated'  => current_time( 'mysql' ),
            'source'   => array(
                'nbp_ok'   => $nbp_rate !== null,
                'wibor_ok' => $wibor6m  !== null,
            ),
        );

        update_option( self::OPTION_KEY, $data, false );
        return $data;
    }

    // -------------------------------------------------------------------------
    // Stopa referencyjna NBP
    // -------------------------------------------------------------------------

    /**
     * Scraping strony nbp.pl z tabelą stóp procentowych.
     * Strona: https://www.nbp.pl/home.aspx?f=/dzienne/stopy_procentowe.htm
     *
     * @return float|null  Stopa referencyjna jako ułamek dziesiętny (np. 0.0575)
     */
    private static function fetch_nbp_rate() {
        $url = 'https://www.nbp.pl/home.aspx?f=/dzienne/stopy_procentowe.htm';

        $response = wp_remote_get( $url, array(
            'timeout'    => 15,
            'user-agent' => 'Mozilla/5.0 (compatible; WordPress/' . get_bloginfo('version') . '; kalkulator-obligacji)',
            'headers'    => array( 'Accept-Language' => 'pl-PL,pl;q=0.9' ),
        ) );

        if ( is_wp_error( $response ) ) {
            error_log( 'Kalkulator Obligacji: NBP fetch error — ' . $response->get_error_message() );
            return null;
        }

        $body = wp_remote_retrieve_body( $response );
        if ( empty( $body ) ) return null;

        return self::parse_nbp_rate( $body );
    }

    /**
     * Parsuje HTML tabeli NBP i wyciąga stopę referencyjną.
     * Szuka wiersza zawierającego "referencyjna" lub "Stopa referencyjna".
     */
    private static function parse_nbp_rate( $html ) {
        // Szukaj wartości po tekście "referencyjna" w tabeli HTML
        // Wzorzec: ...referencyjna...</td><td...>X,XX</td>
        if ( preg_match(
            '/referencyjna[^<]*<\/[^>]+>\s*(?:<[^>]+>)*\s*([\d]+[,.][\d]+)\s*%?/iu',
            $html,
            $matches
        ) ) {
            $val = str_replace( ',', '.', $matches[1] );
            $rate = floatval( $val );
            // Sanity check: stopa NBP 0.1% - 25%
            if ( $rate >= 0.1 && $rate <= 25 ) {
                return $rate / 100;
            }
        }

        // Alternatywna metoda: szukaj w meta lub JSON-LD
        if ( preg_match( '/stopie referencyjnej NBP wynosz[^"\']*?([\d,]+)\s*%/iu', $html, $m2 ) ) {
            $val = str_replace( ',', '.', $m2[1] );
            $rate = floatval( $val );
            if ( $rate >= 0.1 && $rate <= 25 ) return $rate / 100;
        }

        error_log( 'Kalkulator Obligacji: nie udało się sparsować stopy NBP' );
        return null;
    }

    // -------------------------------------------------------------------------
    // WIBOR 6M
    // -------------------------------------------------------------------------

    /**
     * Scraping strony GPW Benchmark z danymi bieżącymi WIBOR.
     * Strona: https://gpwbenchmark.pl/en-dane-biezace
     *
     * @return float|null  WIBOR 6M jako ułamek dziesiętny (np. 0.0590)
     */
    private static function fetch_wibor6m() {
        $url = 'https://gpwbenchmark.pl/en-dane-biezace';

        $response = wp_remote_get( $url, array(
            'timeout'    => 15,
            'user-agent' => 'Mozilla/5.0 (compatible; WordPress/' . get_bloginfo('version') . '; kalkulator-obligacji)',
        ) );

        if ( is_wp_error( $response ) ) {
            error_log( 'Kalkulator Obligacji: GPW Benchmark fetch error — ' . $response->get_error_message() );
            return null;
        }

        $body = wp_remote_retrieve_body( $response );
        if ( empty( $body ) ) return null;

        return self::parse_wibor6m( $body );
    }

    /**
     * Parsuje HTML strony GPW Benchmark.
     * Szuka wiersza z "WIBOR6M" lub "WIBOR 6M" i wyciąga wartość.
     */
    private static function parse_wibor6m( $html ) {
        // Wzorzec 1: WIBOR6M w tabeli HTML (np. <td>WIBOR6M</td><td>5,90</td>)
        if ( preg_match(
            '/WIBOR\s*6\s*M[^<]*<\/[^>]+>\s*(?:<[^>]+>)*\s*([\d]+[,.][\d]+)/iu',
            $html,
            $matches
        ) ) {
            $val = str_replace( ',', '.', $matches[1] );
            $rate = floatval( $val );
            if ( $rate >= 0.1 && $rate <= 30 ) return $rate / 100;
        }

        // Wzorzec 2: wartość w JSON lub atrybucie data-*
        if ( preg_match( '/"WIBOR6M"[^:]*:\s*"?([\d,.]+)"?/i', $html, $m2 ) ) {
            $val = str_replace( ',', '.', $m2[1] );
            $rate = floatval( $val );
            if ( $rate >= 0.1 && $rate <= 30 ) return $rate / 100;
        }

        error_log( 'Kalkulator Obligacji: nie udało się sparsować WIBOR 6M' );
        return null;
    }
}

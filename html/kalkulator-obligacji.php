<?php
/**
 * Plugin Name: Kalkulator Obligacji Skarbowych
 * Plugin URI:  https://github.com/Kris-O/kalkulator-obligacji-2026
 * Description: Interaktywny kalkulator porównujący 7 typów polskich obligacji skarbowych PKO z automatycznym pobieraniem stopy NBP i WIBOR 6M. Shortcode: [kalkulator_obligacji]. Model oparty na kalkulatorze Marcina Iwucia (marciniwuc.com).
 * Version:     1.0.3
 * Author:      Krzysztof Oldak
 * Author URI:  https://www.linkedin.com/in/krzysztofoldak/
 * License:     GPL-2.0-or-later
 * Text Domain: kalkulator-obligacji
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'KALK_OBLIG_VERSION', '1.0.0' );
define( 'KALK_OBLIG_DIR',     plugin_dir_path( __FILE__ ) );
define( 'KALK_OBLIG_URL',     plugin_dir_url( __FILE__ ) );
define( 'KALK_OBLIG_CRON',    'kalkulator_daily_rates' );

// ── Załaduj klasy pomocnicze ─────────────────────────────────
require_once KALK_OBLIG_DIR . 'includes/class-rates-fetcher.php';
require_once KALK_OBLIG_DIR . 'includes/class-ajax.php';

// ── Rejestracja AJAX ─────────────────────────────────────────
add_action( 'init', array( 'Kalkulator_Ajax', 'register' ) );

// ── Shortcode ────────────────────────────────────────────────
add_shortcode( 'kalkulator_obligacji', 'kalkulator_obligacji_shortcode' );

function kalkulator_obligacji_shortcode( $atts ) {
    $atts = shortcode_atts( array(
        'bond_count' => 1000,
        'tax'        => 19,
    ), $atts, 'kalkulator_obligacji' );

    // Kolejkuj skrypty i style tylko gdy shortcode jest używany
    kalkulator_obligacji_enqueue_assets();

    ob_start();
    include KALK_OBLIG_DIR . 'templates/calculator-wp.php';
    return ob_get_clean();
}

function kalkulator_obligacji_enqueue_assets() {
    static $enqueued = false;
    if ( $enqueued ) return;
    $enqueued = true;

    wp_enqueue_style(
        'kalkulator-obligacji',
        KALK_OBLIG_URL . 'assets/calculator.css',
        array(),
        KALK_OBLIG_VERSION
    );

    // Chart.js z CDN
    wp_enqueue_script(
        'chartjs',
        'https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js',
        array(),
        '4.4.4',
        true
    );

    wp_enqueue_script(
        'kalkulator-obligacji-calc',
        KALK_OBLIG_URL . 'assets/calculator.js',
        array(),
        KALK_OBLIG_VERSION,
        true
    );

    wp_enqueue_script(
        'kalkulator-obligacji-ui',
        KALK_OBLIG_URL . 'assets/charts.js',
        array( 'chartjs', 'kalkulator-obligacji-calc' ),
        KALK_OBLIG_VERSION,
        true
    );

    // Przekaż URL AJAX do skryptu
    wp_localize_script( 'kalkulator-obligacji-ui', 'KalkulatorConfig', array(
        'ajaxUrl' => admin_url( 'admin-ajax.php' ),
        'nonce'   => wp_create_nonce( 'kalkulator_refresh' ),
        'version' => KALK_OBLIG_VERSION,
    ) );
}

// ── WP Cron — codzienny fetch kursów ────────────────────────
register_activation_hook( __FILE__, 'kalkulator_obligacji_activate' );
register_deactivation_hook( __FILE__, 'kalkulator_obligacji_deactivate' );

function kalkulator_obligacji_activate() {
    if ( ! wp_next_scheduled( KALK_OBLIG_CRON ) ) {
        wp_schedule_event( time(), 'daily', KALK_OBLIG_CRON );
    }
    // Pierwsze pobranie kursów od razu przy aktywacji
    Kalkulator_Rates_Fetcher::fetch_and_cache();
}

function kalkulator_obligacji_deactivate() {
    $timestamp = wp_next_scheduled( KALK_OBLIG_CRON );
    if ( $timestamp ) {
        wp_unschedule_event( $timestamp, KALK_OBLIG_CRON );
    }
}

add_action( KALK_OBLIG_CRON, array( 'Kalkulator_Rates_Fetcher', 'fetch_and_cache' ) );

// ── Panel admina ─────────────────────────────────────────────
add_action( 'admin_menu', 'kalkulator_obligacji_admin_menu' );

function kalkulator_obligacji_admin_menu() {
    add_options_page(
        'Kalkulator Obligacji',
        'Kalkulator Obligacji',
        'manage_options',
        'kalkulator-obligacji',
        'kalkulator_obligacji_admin_page'
    );
}

function kalkulator_obligacji_admin_page() {
    if ( ! current_user_can( 'manage_options' ) ) return;

    $rates   = Kalkulator_Rates_Fetcher::get_rates();
    $nonce   = wp_create_nonce( 'kalkulator_refresh' );
    $next    = wp_next_scheduled( KALK_OBLIG_CRON );
    $next_dt = $next ? date_i18n( 'Y-m-d H:i', $next ) : '—';

    ?>
    <div class="wrap">
      <h1>Kalkulator Obligacji Skarbowych</h1>
      <h2 class="title">Aktualne parametry rynkowe</h2>
      <table class="widefat" style="max-width:600px">
        <tbody>
          <tr><th>Stopa referencyjna NBP</th><td><?php echo esc_html( number_format( $rates['nbp_rate'] * 100, 2, ',', '' ) ); ?> %</td></tr>
          <tr><th>WIBOR 6M</th>            <td><?php echo esc_html( number_format( $rates['wibor6m']  * 100, 2, ',', '' ) ); ?> %</td></tr>
          <tr><th>Ostatnia aktualizacja</th><td><?php echo esc_html( $rates['updated'] ?? '—' ); ?></td></tr>
          <tr><th>Następna aktualizacja</th><td><?php echo esc_html( $next_dt ); ?></td></tr>
          <tr>
            <th>Źródło NBP</th>
            <td><?php echo ( $rates['source']['nbp_ok'] ?? false ) ? '✅ OK' : '⚠️ Fallback (domyślna wartość)'; ?></td>
          </tr>
          <tr>
            <th>Źródło WIBOR</th>
            <td><?php echo ( $rates['source']['wibor_ok'] ?? false ) ? '✅ OK' : '⚠️ Fallback (domyślna wartość)'; ?></td>
          </tr>
        </tbody>
      </table>

      <p style="margin-top:16px">
        <button class="button button-primary" id="kalk-refresh-btn"
                data-nonce="<?php echo esc_attr( $nonce ); ?>"
                data-ajax="<?php echo esc_url( admin_url('admin-ajax.php') ); ?>">
          Odśwież kursy teraz
        </button>
        <span id="kalk-refresh-msg" style="margin-left:12px;display:none;color:green">Zaktualizowano!</span>
      </p>

      <h2 class="title" style="margin-top:24px">Użycie shortcode</h2>
      <p>Wklej shortcode na dowolnej stronie lub wpisie:</p>
      <code style="font-size:1.1em;padding:6px 12px;background:#f0f0f0;display:inline-block">[kalkulator_obligacji]</code>

      <p style="margin-top:8px">Opcjonalne parametry:</p>
      <code>[kalkulator_obligacji bond_count="500" tax="19"]</code>

      <h2 class="title" style="margin-top:24px">Jak działa pobieranie kursów?</h2>
      <ul style="list-style:disc;margin-left:20px;line-height:1.8">
        <li>WP Cron uruchamia się <strong>raz dziennie</strong> i pobiera kursy ze stron <code>nbp.pl</code> i <code>gpwbenchmark.pl</code></li>
        <li>Kursy są zapisywane w bazie WordPress (wp_options)</li>
        <li>Kalkulator pobiera je przez AJAX przy każdym otwarciu strony</li>
        <li>Jeśli scraping zawiedzie — używane są ostatnie znane wartości lub domyślne (maj 2026)</li>
      </ul>
    </div>

    <script>
    document.getElementById('kalk-refresh-btn').addEventListener('click', function(){
      const btn = this;
      btn.disabled = true;
      btn.textContent = 'Pobieranie...';
      fetch(btn.dataset.ajax, {
        method: 'POST',
        headers: {'Content-Type':'application/x-www-form-urlencoded'},
        body: 'action=kalkulator_refresh_rates&nonce=' + btn.dataset.nonce
      })
      .then(r=>r.json())
      .then(data=>{
        btn.disabled = false;
        btn.textContent = 'Odśwież kursy teraz';
        if(data.success){
          document.getElementById('kalk-refresh-msg').style.display='inline';
          setTimeout(()=>{ document.getElementById('kalk-refresh-msg').style.display='none'; location.reload(); }, 2000);
        }
      })
      .catch(()=>{ btn.disabled=false; btn.textContent='Odśwież kursy teraz'; });
    });
    </script>
    <?php
}

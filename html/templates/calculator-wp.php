<?php if ( ! defined( 'ABSPATH' ) ) exit; ?>

<div class="kalkulator-obligacji" id="ko-app"
     data-ajax-url="<?php echo esc_url( admin_url('admin-ajax.php') ); ?>">

  <!-- HEADER -->
  <div class="ko-header">
    <div>
      <h1>Kalkulator Obligacji Skarbowych</h1>
      <p>Porównaj 7 typów obligacji PKO z kontem oszczędnościowym na 12 lat</p>
    </div>
    <div class="ko-rates-badge" id="ko-rates-badge">
      <strong>Aktualne parametry rynkowe</strong>
      <div class="rate-row"><span>Stopa NBP</span><span class="rate-val" id="ko-badge-nbp">&#8230;</span></div>
      <div class="rate-row"><span>WIBOR 6M</span><span class="rate-val" id="ko-badge-wibor">&#8230;</span></div>
      <div class="rate-row" style="font-size:.76rem;opacity:.6;border:none;padding-top:6px">
        <span>Aktualizacja:</span><span id="ko-badge-date">&#8230;</span>
      </div>
    </div>
  </div>

  <!-- TABS -->
  <div class="ko-tabs" role="tablist">
    <button class="ko-tab active" data-tab="zalozenia"  role="tab">&#9881; Założenia</button>
    <button class="ko-tab"        data-tab="porownanie" role="tab">&#128200; Porównanie</button>
    <button class="ko-tab"        data-tab="realna"     role="tab">&#128178; Wartość realna</button>
    <button class="ko-tab"        data-tab="ike"        role="tab">&#127968; IKE Obligacje</button>
    <button class="ko-tab"        data-tab="szczegoly"  role="tab">&#128203; Szczegóły</button>
  </div>

  <!-- PANEL: ZAŁOŻENIA -->
  <div class="ko-panel active" id="panel-zalozenia" role="tabpanel">
    <div class="ko-card">
      <h2>Parametry inwestycji</h2>
      <div class="ko-form-row">
        <div class="ko-field">
          <label>Liczba obligacji</label>
          <div class="unit">
            <input type="number" id="ko-bond-count"
                   value="<?php echo esc_attr( $atts['bond_count'] ?? 1000 ); ?>"
                   min="1" max="100000" step="1">
            <span>szt.</span>
          </div>
        </div>
        <div class="ko-field">
          <label>Wartość inwestycji</label>
          <div class="unit">
            <input type="number" id="ko-invest-value"
                   value="<?php echo esc_attr( ( $atts['bond_count'] ?? 1000 ) * 100 ); ?>"
                   readonly style="background:#f8f9fa">
            <span>zł</span>
          </div>
        </div>
        <div class="ko-field">
          <label>Podatek Belki</label>
          <div class="unit">
            <input type="number" id="ko-tax"
                   value="<?php echo esc_attr( $atts['tax'] ?? 19 ); ?>"
                   min="0" max="100" step="0.5">
            <span>%</span>
          </div>
        </div>
      </div>
    </div>

    <div class="ko-card">
      <h2>Scenariusz makroekonomiczny</h2>
      <p style="font-size:.85rem;color:var(--gray-600);margin-bottom:14px">
        Dane domyślne uwzględniają aktualne kursy NBP i GPW Benchmark pobierane automatycznie.
      </p>
      <div class="ko-scenario-toggle">
        <button class="ko-scenario-btn active" data-mode="uniform">Jednolity (ta sama wartość każdy rok)</button>
        <button class="ko-scenario-btn"        data-mode="yearly">Własny (różne wartości dla każdego roku)</button>
      </div>

      <div id="ko-uniform-inputs">
        <div class="ko-form-row">
          <div class="ko-field">
            <label>Inflacja</label>
            <div class="unit"><input type="number" id="u-inflation" value="5.0" min="0" max="50" step="0.1"><span>%/rok</span></div>
          </div>
          <div class="ko-field">
            <label>Stopa NBP</label>
            <div class="unit"><input type="number" id="u-nbp" value="5.75" min="0" max="30" step="0.01"><span>%/rok</span></div>
          </div>
          <div class="ko-field">
            <label>WIBOR 6M</label>
            <div class="unit"><input type="number" id="u-wibor" value="5.90" min="0" max="30" step="0.01"><span>%/rok</span></div>
          </div>
          <div class="ko-field">
            <label>Konto oszczędnościowe</label>
            <div class="unit"><input type="number" id="u-savings" value="5.00" min="0" max="30" step="0.01"><span>%/rok</span></div>
          </div>
        </div>
      </div>

      <div id="ko-yearly-inputs" style="display:none">
        <div class="ko-scenario-table-wrap">
          <table class="ko-scenario-table">
            <thead>
              <tr>
                <th>Rok</th>
                <th>Inflacja (%)</th>
                <th>Stopa NBP (%)</th>
                <th>WIBOR 6M (%)</th>
                <th>Konto oszcz. (%)</th>
              </tr>
            </thead>
            <tbody id="ko-scenario-tbody"></tbody>
          </table>
        </div>
      </div>
    </div>

    <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
      <button class="ko-btn-primary" id="ko-calc-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
        Oblicz
      </button>
      <button class="ko-btn-secondary" id="ko-reset-btn">Przywróć domyślne</button>
    </div>
  </div>

  <!-- PANEL: PORÓWNANIE -->
  <div class="ko-panel" id="panel-porownanie" role="tabpanel">
    <div class="ko-card">
      <h2>Wynik po 12 latach (wartość nominalna)</h2>
      <div class="ko-highlight-grid" id="ko-highlights"></div>
    </div>
    <div class="ko-card">
      <h2>Wartość nominalna na koniec roku (zł)</h2>
      <div class="ko-results-wrap">
        <table class="ko-results-table" id="ko-nominal-table">
          <thead>
            <tr>
              <th>Rok</th>
              <th>ROR<br><small>1-roczna</small></th>
              <th>DOR<br><small>2-letnia</small></th>
              <th>TOS<br><small>3-letnia</small></th>
              <th>COI<br><small>4-letnia</small></th>
              <th>ROS<br><small>6-letnia</small></th>
              <th>EDO<br><small>10-letnia</small></th>
              <th>ROD<br><small>12-letnia</small></th>
              <th>Konto<br><small>oszcz.</small></th>
            </tr>
          </thead>
          <tbody id="ko-nominal-tbody"></tbody>
        </table>
      </div>
    </div>
    <div class="ko-card">
      <h2>Wykres — wzrost wartości nominalnej</h2>
      <div class="ko-chart-wrap"><canvas id="ko-chart-nominal"></canvas></div>
      <div class="ko-legend" id="ko-legend-nominal"></div>
    </div>
  </div>

  <!-- PANEL: WARTOŚĆ REALNA -->
  <div class="ko-panel" id="panel-realna" role="tabpanel">
    <div class="ko-card">
      <h2>Wartość realna (po uwzględnieniu inflacji, zł)</h2>
      <p style="font-size:.84rem;color:var(--gray-600);margin-bottom:16px">
        Wartości sprowadzone do siły nabywczej z dnia zakupu. Powyżej 100&nbsp;000 zł = realny zysk.
      </p>
      <div class="ko-results-wrap">
        <table class="ko-results-table">
          <thead>
            <tr>
              <th>Rok</th><th>ROR</th><th>DOR</th><th>TOS</th><th>COI</th>
              <th>ROS</th><th>EDO</th><th>ROD</th><th>Konto</th>
            </tr>
          </thead>
          <tbody id="ko-real-tbody"></tbody>
        </table>
      </div>
    </div>
    <div class="ko-card">
      <h2>Wykres — realna stopa zwrotu (%)</h2>
      <div class="ko-chart-wrap"><canvas id="ko-chart-real"></canvas></div>
      <div class="ko-legend" id="ko-legend-real"></div>
    </div>
  </div>

  <!-- PANEL: IKE OBLIGACJE -->
  <div class="ko-panel" id="panel-ike" role="tabpanel">
    <div class="ko-card">
      <h2>Parametry IKE Obligacje</h2>
      <div class="ko-form-row" style="align-items:flex-start">
        <div class="ko-field" style="flex:2">
          <label>Tryb opodatkowania</label>
          <div style="display:flex;flex-direction:column;gap:8px;margin-top:6px;font-size:.9rem">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:400">
              <input type="radio" name="ike-mode" id="ike-eligible" value="eligible" checked>
              <span><strong>Spełniam warunki IKE</strong> — brak podatku Belki (19% → 0%)</span>
            </label>
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:400">
              <input type="radio" name="ike-mode" id="ike-partial" value="partial">
              <span><strong>Nie spełniam warunków</strong> — podatek 19% + opłata zarządzania</span>
            </label>
          </div>
        </div>
        <div class="ko-field">
          <label>Opłata za zarządzanie</label>
          <div class="unit">
            <input type="number" id="ike-fee-rate" value="0.10" min="0" max="2" step="0.01">
            <span>%/rok</span>
          </div>
          <small style="color:var(--gray-500);font-size:.78rem;display:block;margin-top:4px">PKO BP: 0,10% (powyżej 50 tys. zł) lub 0,16% (poniżej)</small>
        </div>
      </div>
    </div>

    <div class="ko-card">
      <h2>Wynik po 12 latach — IKE vs zwykłe</h2>
      <div class="ko-highlight-grid" id="ko-ike-highlights"></div>
    </div>

    <div class="ko-card">
      <h2>Wartość nominalna w IKE na koniec roku (zł)</h2>
      <div class="ko-results-wrap">
        <table class="ko-results-table" id="ko-ike-table">
          <thead>
            <tr>
              <th>Rok</th>
              <th>ROR<br><small>1-roczna</small></th>
              <th>DOR<br><small>2-letnia</small></th>
              <th>TOS<br><small>3-letnia</small></th>
              <th>COI<br><small>4-letnia</small></th>
              <th>ROS<br><small>6-letnia</small></th>
              <th>EDO<br><small>10-letnia</small></th>
              <th>ROD<br><small>12-letnia</small></th>
              <th>Konto<br><small>oszcz.</small></th>
            </tr>
          </thead>
          <tbody id="ko-ike-tbody"></tbody>
        </table>
      </div>
    </div>

    <div class="ko-card">
      <h2>Wykres — IKE vs najlepsza obligacja zwykła</h2>
      <div class="ko-chart-wrap"><canvas id="ko-chart-ike"></canvas></div>
      <div class="ko-legend" id="ko-legend-ike"></div>
    </div>

    <div class="ko-card" style="background:var(--blue-50,#EEF4FF);border:1px solid var(--blue-200,#BFD7FF)">
      <h2 style="color:var(--navy)">&#8505; Jak działa IKE Obligacje?</h2>
      <ul style="list-style:disc;margin-left:20px;line-height:1.9;font-size:.88rem">
        <li>Roczny limit wpłat: 3-krotność średniego wynagrodzenia (≈ 24&nbsp;tys. zł w 2026)</li>
        <li>Brak podatku Belki przy wypłacie po 60. roku życia (lub po spełnieniu warunków ustawy)</li>
        <li>Opłata za zarządzanie: <strong>0,10%/rok</strong> wartości portfela powyżej 50 000 zł, <strong>0,16%/rok</strong> poniżej</li>
        <li>Wcześniejszy zwrot (przed warunkami IKE): normalny podatek 19% + opłata zarządzania</li>
        <li>Obligacje dostępne identyczne jak w rachunku zwykłym (ROR, DOR, TOS, COI, ROS, EDO, ROD)</li>
      </ul>
    </div>
  </div><!-- /panel-ike -->

  <!-- PANEL: SZCZEGÓŁY -->
  <div class="ko-panel" id="panel-szczegoly" role="tabpanel">
    <div class="ko-card">
      <h2>Miesięczny przebieg wartości</h2>
      <div class="ko-detail-controls">
        <label for="ko-detail-select">Instrument:</label>
        <select id="ko-detail-select">
          <option value="ROR">ROR — 1-roczna</option>
          <option value="DOR">DOR — 2-letnia</option>
          <option value="TOS">TOS — 3-letnia (WIBOR)</option>
          <option value="COI">COI — 4-letnia (inflacja)</option>
          <option value="ROS">ROS — 6-letnia (inflacja)</option>
          <option value="EDO">EDO — 10-letnia (inflacja)</option>
          <option value="ROD">ROD — 12-letnia (inflacja)</option>
          <option value="KTO">Konto oszczędnościowe</option>
        </select>
      </div>
      <div class="ko-monthly-wrap">
        <table class="ko-monthly-table">
          <thead>
            <tr>
              <th style="text-align:left">Miesiąc</th>
              <th>Wartość (zł)</th>
              <th>Zysk (zł)</th>
              <th>Zysk (%)</th>
            </tr>
          </thead>
          <tbody id="ko-monthly-tbody"></tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- DISCLAIMER -->
  <div class="ko-disclaimer">
    <strong>&#9888; Uwaga:</strong> Kalkulator ma charakter wyłącznie informacyjny i edukacyjny.
    Wyniki obliczeń opierają się na założeniach scenariuszowych i nie stanowią doradztwa inwestycyjnego.
    Rzeczywiste oprocentowanie obligacji może różnić się od prezentowanych wartości.
    Przed podjęciem decyzji inwestycyjnej zapoznaj się z aktualnymi warunkami emisji obligacji PKO.
  </div>

</div><!-- /.kalkulator-obligacji -->

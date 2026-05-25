/**
 * Kalkulator Obligacji — UI + wykresy (Chart.js)
 * Wymaga: calculator.js (BondCalculator) + Chart.js (CDN)
 */

'use strict';

(function () {

  // ── Kolory dla każdego instrumentu ──────────────────────────
  const COLORS = {
    ROR: '#3498DB',
    DOR: '#9B59B6',
    TOS: '#E67E22',
    COI: '#27AE60',
    ROS: '#1ABC9C',
    EDO: '#2C3E50',
    ROD: '#E74C3C',
    KTO: '#95A5A6',
  };

  const BOND_KEYS = ['ROR','DOR','TOS','COI','ROS','EDO','ROD','KTO'];
  const BOND_LABELS = {
    ROR: 'ROR (1-roczna)',
    DOR: 'DOR (2-letnia)',
    TOS: 'TOS (3-letnia, stała 4,40%)',
    COI: 'COI (4-letnia, inflacja)',
    ROS: 'ROS (6-letnia, inflacja)',
    EDO: 'EDO (10-letnia, inflacja)',
    ROD: 'ROD (12-letnia, inflacja)',
    KTO: 'Konto oszczędnościowe',
  };

  // Domyślne dane rynkowe (nadpisywane przez AJAX jeśli WP)
  const marketRates = {
    nbpRate: 5.75,
    wibor6m: 5.90,
    updated: null,
  };

  let lastResults    = null;
  let lastIKEResults = null;
  let chartNominal   = null;
  let chartReal      = null;
  let chartIKE       = null;
  let scenarioMode   = 'uniform'; // 'uniform' | 'yearly'

  // ── Domyślne wartości roczne ────────────────────────────────
  const DEFAULTS_YEARLY = {
    inflation:   [5.0, 4.0, 3.5, 3.0, 3.0, 3.0, 3.0, 3.0, 3.0, 3.0, 3.0, 3.0],
    nbp:         [5.75,5.00,4.50,4.00,3.75,3.75,3.75,3.75,3.75,3.75,3.75,3.75],
    wibor:       [5.90,5.20,4.70,4.20,3.90,3.90,3.90,3.90,3.90,3.90,3.90,3.90],
    savings:     [5.00,4.40,4.00,3.60,3.60,3.60,3.60,3.60,3.60,3.60,3.60,3.60],
  };

  // ── Init ────────────────────────────────────────────────────
  function init() {
    buildScenarioTable();
    bindEvents();
    loadMarketRates();
    runCalculation();
  }

  // ── Tabela scenariusza (tryb roczny) ────────────────────────
  function buildScenarioTable() {
    const tbody = document.getElementById('ko-scenario-tbody');
    if (!tbody) return;
    let html = '';
    for (let y = 1; y <= 12; y++) {
      const i = y - 1;
      html += `<tr>
        <td><strong>Rok ${y}</strong></td>
        <td><input type="number" class="yr-inflation" data-y="${i}" value="${DEFAULTS_YEARLY.inflation[i]}" min="0" max="50" step="0.1"></td>
        <td><input type="number" class="yr-nbp"       data-y="${i}" value="${DEFAULTS_YEARLY.nbp[i]}"       min="0" max="30" step="0.01"></td>
        <td><input type="number" class="yr-wibor"     data-y="${i}" value="${DEFAULTS_YEARLY.wibor[i]}"     min="0" max="30" step="0.01"></td>
        <td><input type="number" class="yr-savings"   data-y="${i}" value="${DEFAULTS_YEARLY.savings[i]}"   min="0" max="30" step="0.01"></td>
      </tr>`;
    }
    tbody.innerHTML = html;
  }

  // ── Zdarzenia ────────────────────────────────────────────────
  function bindEvents() {
    // Liczba obligacji → wartość
    const countEl = document.getElementById('ko-bond-count');
    const valEl   = document.getElementById('ko-invest-value');
    if (countEl && valEl) {
      countEl.addEventListener('input', () => {
        valEl.value = (parseInt(countEl.value) || 0) * 100;
      });
    }

    // Przycisk oblicz
    const calcBtn = document.getElementById('ko-calc-btn');
    if (calcBtn) calcBtn.addEventListener('click', runCalculation);

    // Reset
    const resetBtn = document.getElementById('ko-reset-btn');
    if (resetBtn) resetBtn.addEventListener('click', resetDefaults);

    // Scenariusz toggle
    document.querySelectorAll('.ko-scenario-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        scenarioMode = btn.dataset.mode;
        document.querySelectorAll('.ko-scenario-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('ko-uniform-inputs').style.display = scenarioMode === 'uniform' ? '' : 'none';
        document.getElementById('ko-yearly-inputs').style.display  = scenarioMode === 'yearly'  ? '' : 'none';
      });
    });

    // Tabs
    document.querySelectorAll('.ko-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.ko-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.ko-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('panel-' + tab.dataset.tab)?.classList.add('active');
        // Odśwież wykresy przy przełączeniu (mogą być w ukrytym div)
        if (lastResults) {
          setTimeout(() => {
            chartNominal?.resize();
            chartReal?.resize();
            chartIKE?.resize();
          }, 50);
        }
      });
    });

    // Detal: zmiana instrumentu
    const detailSel = document.getElementById('ko-detail-select');
    if (detailSel) {
      detailSel.addEventListener('change', () => {
        if (lastResults) renderMonthlyTable(detailSel.value, lastResults);
      });
    }

    // IKE: zmiana trybu lub opłaty → przelicz
    document.querySelectorAll('input[name="ike-mode"]').forEach(r => {
      r.addEventListener('change', runCalculation);
    });

    // Przelicz przy każdej zmianie pola formularza (debounce)
    let debounceTimer;
    document.getElementById('ko-app')?.addEventListener('input', e => {
      if (e.target.closest('#ko-scenario-tbody') || e.target.closest('#ko-uniform-inputs') ||
          e.target.id === 'ko-bond-count' || e.target.id === 'ko-tax' ||
          e.target.id === 'ike-fee-rate') {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(runCalculation, 600);
      }
    });
  }

  // ── Pobierz parametry z formularza ──────────────────────────
  function getParams() {
    const bondCount = parseInt(document.getElementById('ko-bond-count')?.value) || 1000;
    const taxRate   = (parseFloat(document.getElementById('ko-tax')?.value) || 19) / 100;

    let inflation, nbpRate, wibor6m, savingsRate;

    if (scenarioMode === 'uniform') {
      const inf  = parseFloat(document.getElementById('u-inflation')?.value) / 100 || 0.05;
      const nbp  = parseFloat(document.getElementById('u-nbp')?.value)       / 100 || 0.0575;
      const wib  = parseFloat(document.getElementById('u-wibor')?.value)     / 100 || 0.059;
      const sav  = parseFloat(document.getElementById('u-savings')?.value)   / 100 || 0.05;
      inflation   = Array(12).fill(inf);
      nbpRate     = Array(12).fill(nbp);
      wibor6m     = Array(12).fill(wib);
      savingsRate = Array(12).fill(sav);
    } else {
      inflation   = readYearlyCol('yr-inflation');
      nbpRate     = readYearlyCol('yr-nbp');
      wibor6m     = readYearlyCol('yr-wibor');
      savingsRate = readYearlyCol('yr-savings');
    }

    return { bondCount, taxRate, inflation, nbpRate, wibor6m, savingsRate };
  }

  function readYearlyCol(cls) {
    const vals = [];
    document.querySelectorAll('.' + cls).forEach(inp => {
      vals[parseInt(inp.dataset.y)] = parseFloat(inp.value) / 100 || 0;
    });
    return vals;
  }

  // ── Główna kalkulacja + render ───────────────────────────────
  function runCalculation() {
    const params = getParams();
    lastResults  = BondCalculator.calculate(params);

    // IKE — oblicz równolegle z parametrami z zakładki IKE
    const ikeMode    = document.querySelector('input[name="ike-mode"]:checked')?.value || 'eligible';
    const ikeFeeRate = (parseFloat(document.getElementById('ike-fee-rate')?.value) || 0.10) / 100;
    lastIKEResults   = BondCalculator.calculate({ ...params, ikeMode, ikeFeeRate });

    renderHighlights(lastResults);
    renderNominalTable(lastResults);
    renderRealTable(lastResults);
    renderChartNominal(lastResults);
    renderChartReal(lastResults);
    renderIKETab(lastResults, lastIKEResults);
    const detailKey = document.getElementById('ko-detail-select')?.value || 'ROR';
    renderMonthlyTable(detailKey, lastResults);
  }

  // ── Highlights ───────────────────────────────────────────────
  function renderHighlights(res) {
    const container = document.getElementById('ko-highlights');
    if (!container) return;
    const yr12 = 11; // indeks roku 12 (0-based)
    const initial = res.annual.initialValue;

    // Znajdź najlepszą obligację po 12 latach (nominalna)
    let bestKey = null, bestVal = 0;
    for (const k of BOND_KEYS) {
      const v = res.annual.nominal[k]?.[yr12] || 0;
      if (v > bestVal) { bestVal = v; bestKey = k; }
    }

    let html = '';
    for (const k of BOND_KEYS) {
      const val  = res.annual.nominal[k]?.[yr12] || 0;
      const gain = ((val - initial) / initial * 100).toFixed(1);
      const isBest = k === bestKey;
      html += `<div class="ko-highlight-card${isBest ? ' best' : ''}">
        <div class="hc-label">${BOND_LABELS[k]}</div>
        <div class="hc-value">${fmt(val)} zł</div>
        <div class="hc-sub">+${gain}% po 12 latach${isBest ? ' 🏆' : ''}</div>
      </div>`;
    }
    container.innerHTML = html;
  }

  // ── Tabela nominalna ─────────────────────────────────────────
  function renderNominalTable(res) {
    const tbody = document.getElementById('ko-nominal-tbody');
    if (!tbody) return;
    const { annual } = res;
    const initial = annual.initialValue;
    let html = `<tr>
      <td>Start</td>
      ${BOND_KEYS.map(() => `<td>${fmt(initial)}</td>`).join('')}
    </tr>`;

    for (let y = 0; y < 12; y++) {
      const vals = BOND_KEYS.map(k => annual.nominal[k]?.[y] || 0);
      const maxV = Math.max(...vals);
      html += `<tr>
        <td>Rok ${y + 1}</td>
        ${vals.map((v, i) => `<td class="${v === maxV ? 'best' : ''}">${fmt(v)}</td>`).join('')}
      </tr>`;
      // Wiersz zwrotów co 4 lata
      if ((y + 1) % 4 === 0 || y === 11) {
        const rets = BOND_KEYS.map(k => (annual.return[k]?.[y] || 0) * 100);
        const maxR = Math.max(...rets);
        html += `<tr class="ret-row">
          <td style="font-size:.78rem;color:var(--gray-400)">zwrot %</td>
          ${rets.map((r, i) => `<td class="${r === maxR ? 'best' : ''}">${r >= 0 ? '+' : ''}${r.toFixed(1)}%</td>`).join('')}
        </tr>`;
      }
    }
    tbody.innerHTML = html;
  }

  // ── Tabela realna ────────────────────────────────────────────
  function renderRealTable(res) {
    const tbody = document.getElementById('ko-real-tbody');
    if (!tbody) return;
    const { annual } = res;
    const initial = annual.initialValue;
    let html = '';

    for (let y = 0; y < 12; y++) {
      const vals = BOND_KEYS.map(k => annual.real[k]?.[y] || 0);
      const maxV = Math.max(...vals);
      html += `<tr>
        <td>Rok ${y + 1}</td>
        ${vals.map(v => `<td class="${v === maxV ? 'best' : v < initial ? 'worst' : ''}">${fmt(v)}</td>`).join('')}
      </tr>`;
    }
    tbody.innerHTML = html;
  }

  // ── Tabela miesięczna ────────────────────────────────────────
  function renderMonthlyTable(key, res) {
    const tbody = document.getElementById('ko-monthly-tbody');
    if (!tbody) return;
    const data    = res.monthly[key] || [];
    const initial = res.annual.initialValue;
    let html = '';
    for (let m = 1; m <= 144; m++) {
      const v    = data[m] || 0;
      const gain = v - initial;
      const pct  = (gain / initial * 100).toFixed(2);
      const gainCls = gain >= 0 ? 'gain' : 'loss';
      const yr   = Math.ceil(m / 12);
      const mo   = m % 12 || 12;
      html += `<tr>
        <td>Rok ${yr}, mc ${mo} <small style="color:var(--gray-400)">(mc ${m})</small></td>
        <td>${fmt(v)}</td>
        <td class="${gainCls}">${gain >= 0 ? '+' : ''}${fmt(gain)}</td>
        <td class="${gainCls}">${gain >= 0 ? '+' : ''}${pct}%</td>
      </tr>`;
    }
    tbody.innerHTML = html;
  }

  // ── Wykresy ──────────────────────────────────────────────────
  function renderChartNominal(res) {
    const canvas = document.getElementById('ko-chart-nominal');
    if (!canvas || typeof Chart === 'undefined') return;
    if (chartNominal) chartNominal.destroy();

    const { annual } = res;
    const labels = annual.years.map(y => `Rok ${y}`);
    const datasets = BOND_KEYS.map(k => ({
      label:           BOND_LABELS[k],
      data:            annual.nominal[k] || [],
      borderColor:     COLORS[k],
      backgroundColor: COLORS[k] + '22',
      borderWidth:     2,
      pointRadius:     3,
      pointHoverRadius:6,
      tension:         0.3,
    }));

    chartNominal = new Chart(canvas, {
      type: 'line',
      data: { labels, datasets },
      options: chartOptions('Wartość nominalna (zł)', res.annual.initialValue),
    });
    renderLegend('ko-legend-nominal', chartNominal);
  }

  function renderChartReal(res) {
    const canvas = document.getElementById('ko-chart-real');
    if (!canvas || typeof Chart === 'undefined') return;
    if (chartReal) chartReal.destroy();

    const { annual } = res;
    const labels = annual.years.map(y => `Rok ${y}`);
    const datasets = BOND_KEYS.map(k => ({
      label:           BOND_LABELS[k],
      data:            annual.realReturn[k]?.map(r => +(r * 100).toFixed(2)) || [],
      borderColor:     COLORS[k],
      backgroundColor: COLORS[k] + '22',
      borderWidth:     2,
      pointRadius:     3,
      pointHoverRadius:6,
      tension:         0.3,
    }));

    chartReal = new Chart(canvas, {
      type: 'line',
      data: { labels, datasets },
      options: chartOptions('Realna stopa zwrotu (%)', 0, true),
    });
    renderLegend('ko-legend-real', chartReal);
  }

  function chartOptions(yLabel, baseline, isPercent = false) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(27,42,74,.92)',
          titleFont: { size: 13, weight: '600' },
          bodyFont:  { size: 12 },
          padding: 12,
          callbacks: {
            label: ctx => {
              const v = ctx.parsed.y;
              return isPercent
                ? `  ${ctx.dataset.label}: ${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
                : `  ${ctx.dataset.label}: ${fmt(v)} zł`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: '#F1F3F5' },
          ticks: { font: { size: 11 }, color: '#6C757D' },
        },
        y: {
          grid: { color: '#F1F3F5' },
          ticks: {
            font: { size: 11 },
            color: '#6C757D',
            callback: v => isPercent ? v + '%' : fmtShort(v),
          },
        },
      },
    };
  }

  function renderLegend(containerId, chart) {
    const el = document.getElementById(containerId);
    if (!el) return;
    let html = '';
    chart.data.datasets.forEach((ds, i) => {
      html += `<div class="ko-legend-item" data-idx="${i}" style="cursor:pointer">
        <div class="ko-legend-dot" style="background:${ds.borderColor}"></div>
        <span>${ds.label}</span>
      </div>`;
    });
    el.innerHTML = html;
    el.querySelectorAll('.ko-legend-item').forEach(item => {
      item.addEventListener('click', () => {
        const idx  = parseInt(item.dataset.idx);
        const meta = chart.getDatasetMeta(idx);
        meta.hidden = !meta.hidden;
        item.classList.toggle('hidden', meta.hidden);
        chart.update();
      });
    });
  }

  // ── Dane rynkowe z NBP/WP ───────────────────────────────────
  function loadMarketRates() {
    // Jeśli WordPress AJAX dostępny — pobierz aktualne kursy
    const app = document.getElementById('ko-app');
    const ajaxUrl = app?.dataset.ajaxUrl;

    if (ajaxUrl) {
      fetch(ajaxUrl + '?action=kalkulator_get_rates')
        .then(r => r.json())
        .then(data => {
          if (data.nbp_rate) {
            marketRates.nbpRate = parseFloat(data.nbp_rate) * 100;
            marketRates.wibor6m = parseFloat(data.wibor6m)  * 100;
            marketRates.updated = data.updated;
            applyMarketRates(data);
          }
        })
        .catch(() => {}); // ignoruj błędy — fallback do wartości domyślnych
    }
  }

  function applyMarketRates(data) {
    const nbp   = (parseFloat(data.nbp_rate) * 100).toFixed(2);
    const wibor = (parseFloat(data.wibor6m)  * 100).toFixed(2);

    // Aktualizuj badge
    const badgeNbp   = document.getElementById('ko-badge-nbp');
    const badgeWibor = document.getElementById('ko-badge-wibor');
    const badgeDate  = document.getElementById('ko-badge-date');
    if (badgeNbp)   badgeNbp.textContent   = nbp   + '%';
    if (badgeWibor) badgeWibor.textContent = wibor + '%';
    if (badgeDate)  badgeDate.textContent  = data.updated || '—';

    // Aktualizuj pola formularza
    const nbpEl   = document.getElementById('u-nbp');
    const wiborEl = document.getElementById('u-wibor');
    if (nbpEl)   nbpEl.value   = nbp;
    if (wiborEl) wiborEl.value = wibor;

    // Aktualizuj tabelę roczną
    document.querySelectorAll('.yr-nbp').forEach(el => {
      if (parseInt(el.dataset.y) === 0) el.value = nbp;
    });
    document.querySelectorAll('.yr-wibor').forEach(el => {
      if (parseInt(el.dataset.y) === 0) el.value = wibor;
    });

    runCalculation();
  }

  // ── Reset domyślnych ─────────────────────────────────────────
  function resetDefaults() {
    document.getElementById('ko-bond-count').value  = 1000;
    document.getElementById('ko-invest-value').value= 100000;
    document.getElementById('ko-tax').value         = 19;
    document.getElementById('u-inflation').value    = 5.0;
    document.getElementById('u-nbp').value          = 5.75;
    document.getElementById('u-wibor').value        = 5.90;
    document.getElementById('u-savings').value      = 5.00;
    const ikeEligible = document.getElementById('ike-eligible');
    if (ikeEligible) ikeEligible.checked = true;
    const ikeFeeEl = document.getElementById('ike-fee-rate');
    if (ikeFeeEl) ikeFeeEl.value = 0.10;
    buildScenarioTable();
    runCalculation();
  }

  // ── IKE: render zakładki ─────────────────────────────────────
  function renderIKETab(regularRes, ikeRes) {
    renderIKEHighlights(regularRes, ikeRes);
    renderIKETable(regularRes, ikeRes);
    renderChartIKE(regularRes, ikeRes);
  }

  function renderIKEHighlights(regularRes, ikeRes) {
    const container = document.getElementById('ko-ike-highlights');
    if (!container) return;
    const yr12    = 11;
    const initial = regularRes.annual.initialValue;
    let html = '';
    for (const k of BOND_KEYS) {
      const ikeVal = ikeRes.annual.nominal[k]?.[yr12]     || 0;
      const regVal = regularRes.annual.nominal[k]?.[yr12] || 0;
      const diff   = ikeVal - regVal;
      const ikeGainPct = ((ikeVal - initial) / initial * 100).toFixed(1);
      const cls = diff > 0 ? ' ike-gain' : diff < 0 ? ' ike-loss' : '';
      html += `<div class="ko-highlight-card${cls}">
        <div class="hc-label">${BOND_LABELS[k]}</div>
        <div class="hc-value">${fmt(ikeVal)} zł</div>
        <div class="hc-sub">+${ikeGainPct}% · zysk IKE: <strong>${diff >= 0 ? '+' : ''}${fmt(diff)}</strong></div>
      </div>`;
    }
    container.innerHTML = html;
  }

  function renderIKETable(regularRes, ikeRes) {
    const tbody = document.getElementById('ko-ike-tbody');
    if (!tbody) return;
    const { annual } = ikeRes;
    const regAnnual  = regularRes.annual;
    let html = '';
    for (let y = 0; y < 12; y++) {
      const ikeVals = BOND_KEYS.map(k => annual.nominal[k]?.[y]    || 0);
      const regVals = BOND_KEYS.map(k => regAnnual.nominal[k]?.[y] || 0);
      const maxIKE  = Math.max(...ikeVals);
      html += `<tr>
        <td>Rok ${y + 1}</td>
        ${ikeVals.map(v => `<td class="${v === maxIKE ? 'best' : ''}">${fmt(v)}</td>`).join('')}
      </tr>`;
      if ((y + 1) % 4 === 0 || y === 11) {
        const diffs = ikeVals.map((v, i) => v - regVals[i]);
        const maxD  = Math.max(...diffs);
        html += `<tr class="ret-row">
          <td style="font-size:.78rem;color:var(--gray-400)">zysk vs zwykłe</td>
          ${diffs.map(d => `<td class="${d === maxD ? 'best' : d < 0 ? 'worst' : ''}">${d >= 0 ? '+' : ''}${fmt(d)}</td>`).join('')}
        </tr>`;
      }
    }
    tbody.innerHTML = html;
  }

  function renderChartIKE(regularRes, ikeRes) {
    const canvas = document.getElementById('ko-chart-ike');
    if (!canvas || typeof Chart === 'undefined') return;
    if (chartIKE) chartIKE.destroy();

    const labels = ikeRes.annual.years.map(y => `Rok ${y}`);

    // IKE bonds — linie ciągłe
    const datasets = BOND_KEYS.map(k => ({
      label:           BOND_LABELS[k] + ' (IKE)',
      data:            ikeRes.annual.nominal[k] || [],
      borderColor:     COLORS[k],
      backgroundColor: COLORS[k] + '22',
      borderWidth:     2,
      pointRadius:     3,
      pointHoverRadius:6,
      tension:         0.3,
    }));

    // Najlepsza obligacja zwykła — linia przerywana dla porównania
    let bestKey = null, bestVal = 0;
    for (const k of BOND_KEYS) {
      const v = regularRes.annual.nominal[k]?.[11] || 0;
      if (v > bestVal) { bestVal = v; bestKey = k; }
    }
    if (bestKey) {
      datasets.push({
        label:           BOND_LABELS[bestKey] + ' (zwykłe, bez IKE)',
        data:            regularRes.annual.nominal[bestKey] || [],
        borderColor:     COLORS[bestKey],
        backgroundColor: 'transparent',
        borderWidth:     2,
        borderDash:      [6, 3],
        pointRadius:     2,
        pointHoverRadius:5,
        tension:         0.3,
      });
    }

    chartIKE = new Chart(canvas, {
      type: 'line',
      data: { labels, datasets },
      options: chartOptions('Wartość nominalna IKE (zł)', ikeRes.annual.initialValue),
    });
    renderLegend('ko-legend-ike', chartIKE);
  }

  // ── Formatowanie liczb ───────────────────────────────────────
  function fmt(n) {
    return new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
  }
  function fmtShort(n) {
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + ' mln';
    if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(0) + ' tys.';
    return n.toFixed(0);
  }

  // ── Start ────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

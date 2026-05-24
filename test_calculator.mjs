/**
 * Test porównujący wyniki calculator.js z wartościami z arkusza Excel.
 * Uruchom: node test_calculator.mjs
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { calculate, DEFAULT_PARAMS } = require('./html/assets/calculator.js');

// ── Oczekiwane wartości z arkusza Excel (Scenariusz I) ───────────────────────
//    Wiersze 9-20 tabeli rocznej (OBLIGACJE!B9:K20) — lata 1..12
const EXPECTED = {
  //       rok:  ROR            DOR            TOS            COI            EDO            ROS            ROD            KTO
  1:  { ROR: 103095.75841088484, DOR: 102651.8954837449,  TOS: 102754,               COI: 102227.50000000001, EDO: 101903.50000000001, ROS: 102430,               ROD: 102106,               KTO: 102955.28974864181 },
  2:  { ROR: 106700.01436739908, DOR: 106515.58706635753, TOS: 106474.816,            COI: 105257.20477307901, EDO: 105402.1735,         ROS: 105917.04999999999, ROD: 106040.656,            KTO: 105997.91687226789 },
  3:  { ROR: 110419.48435106546, DOR: 109751.33580261402, TOS: 111169.34790400001,   COI: 108376.44610073091, EDO: 109044.29261349999,  ROS: 109547.06904999998, ROD: 110156.306176,         KTO: 109130.46244336788 },
  4:  { ROR: 114257.88213608663, DOR: 113882.10853124423, TOS: 114345.37632794966,   COI: 113207.87004757431, EDO: 112835.73861065348,  ROS: 113325.91888104998, ROD: 114461.27626009601,    KTO: 112355.58381260214 },
  5:  { ROR: 118218.86285224656, DOR: 117320.51545483913, TOS: 118485.37449232429,   COI: 115834.94878897596, EDO: 116782.63389369028,  ROS: 117259.70155517301, ROD: 118964.27496806043,    KTO: 115676.01686304263 },
  6:  { ROR: 122409.52883136789, DOR: 121735.57161040515, TOS: 123708.21716937167,   COI: 119267.93503189032, EDO: 120891.35188333156,  ROS: 122974.76931893511, ROD: 123674.41161659121,    KTO: 119094.5783310333  },
  7:  { ROR: 126734.1619832639,  DOR: 125492.27060800041, TOS: 127242.5137039548,    COI: 122802.37596531378, EDO: 125168.52731054815,  ROS: 125963.44896895273, ROD: 128601.21455095439,    KTO: 122614.16819563853 },
  8:  { ROR: 131197.06780529994, DOR: 130215.22825697954, TOS: 131849.17684353082,   COI: 128276.72986931454, EDO: 129621.0669302806,   ROS: 130251.3083705308,  ROD: 133754.6504202983,     KTO: 126237.77213870666 },
  9:  { ROR: 135802.61359284623, DOR: 134205.07654412443, TOS: 137660.44517422552,   COI: 131254.07349266455, EDO: 134256.1606744221,   ROS: 134714.94396596964, ROD: 139145.14433963204,    KTO: 129968.46407763565 },
  10: { ROR: 140555.36114942277, DOR: 139256.07545803348, TOS: 141593.40198295706,   COI: 135144.02743907025, EDO: 141511.2932620734,   ROS: 139361.5618096127,  ROD: 144783.6009792551,     KTO: 133809.40877298923 },
  11: { ROR: 145459.9041377715,  DOR: 143494.5526914894,  TOS: 146719.2705751451,    COI: 139148.94079568097, EDO: 144349.81241122517,  ROS: 144198.66338128742, ROD: 150681.42662430083,    KTO: 137763.8645131756  },
  12: { ROR: 150521.25291400295, DOR: 148894.78529915755, TOS: 153185.1503303831,    COI: 145350.67094616155, EDO: 149305.5434319636,   ROS: 151225.037698078,   ROD: 159280.55224901868,    KTO: 141835.18587846626 },
};

const TOLERANCE = 0.01; // dopuszczalny błąd: 1 grosz

// ── Uruchom kalkulator ───────────────────────────────────────────────────────

const result = calculate(DEFAULT_PARAMS);
const annual = result.annual.nominal;

// ── Porównanie ───────────────────────────────────────────────────────────────

const types = ['ROR', 'DOR', 'TOS', 'COI', 'EDO', 'ROS', 'ROD', 'KTO'];
let allPass = true;

console.log('\n=== Test kalkulator vs Excel (Scenariusz I, 1000 obligacji) ===\n');
console.log('Rok  Instrument  Oczekiwane         Obliczone          Diff         Status');
console.log('─'.repeat(85));

for (let y = 1; y <= 12; y++) {
  const exp = EXPECTED[y];
  for (const t of types) {
    const expected = exp[t];
    const computed = annual[t]?.[y - 1] ?? NaN;
    const diff = Math.abs(computed - expected);
    const ok = diff <= TOLERANCE;
    if (!ok) allPass = false;
    const status = ok ? '✓' : '✗ FAIL';
    console.log(
      `${String(y).padStart(3)}  ${t.padEnd(10)}  ${expected.toFixed(5).padStart(17)}  ${(isNaN(computed) ? 'NaN' : computed.toFixed(5)).padStart(17)}  ${diff.toFixed(6).padStart(12)}  ${status}`
    );
  }
  if (y < 12) console.log('');
}

console.log('\n' + '─'.repeat(85));

// ── Miesięczne smoke-testy vs Excel (Scenariusz I, OBLIGACJE) ───────────────
// Wartości referencyjne pochodzą bezpośrednio z tabeli miesięcznej w XLSX.
// Te testy łapią błędy rolowania, których nie widać w samej tabeli rocznej.

const EXPECTED_MONTHLY = {
  50: {
    ROR: 114805.54142379112,
    DOR: 114263.641198337,
    TOS: 115035.37108130699,
    COI: 113310.92294019207,
    EDO: 113493.55449115961,
    ROS: 113981.54932673713,
    ROD: 115211.77604475676,
    KTO: 112902.29539841811,
  },
  100: {
    ROR: 132552.34206156776,
    DOR: 131400.74170659712,
    TOS: 133452.26293631975,
    COI: 128394.34132317422,
    EDO: 131166.09817832778,
    ROS: 131739.1793352588,
    ROD: 135551.4817267429,
    KTO: 127469.28306231658,
  },
};

const EXPECTED_MONTHLY_COI_EDGE = {
  49: 113310.89646178992,
};

let allPassMonthly = true;
console.log('\n=== Smoke-testy miesięczne (Scenariusz I, XLSX) ===\n');
console.log('Mies.  Instrument  Oczekiwane         Obliczone          Diff         Status');
console.log('─'.repeat(88));

for (const [month, exp] of Object.entries(EXPECTED_MONTHLY)) {
  const m = Number(month);
  for (const t of types) {
    const expected = exp[t];
    const computed = result.monthly[t]?.[m] ?? NaN;
    const diff = Math.abs(computed - expected);
    const ok = diff <= TOLERANCE;
    if (!ok) { allPass = false; allPassMonthly = false; }
    const status = ok ? '✓' : '✗ FAIL';
    console.log(
      `${String(m).padStart(5)}  ${t.padEnd(10)}  ${expected.toFixed(5).padStart(17)}  ${(isNaN(computed) ? 'NaN' : computed.toFixed(5)).padStart(17)}  ${diff.toFixed(6).padStart(12)}  ${status}`
    );
  }
  console.log('');
}

for (const [month, expected] of Object.entries(EXPECTED_MONTHLY_COI_EDGE)) {
  const m = Number(month);
  const computed = result.monthly.COI?.[m] ?? NaN;
  const diff = Math.abs(computed - expected);
  const ok = diff <= TOLERANCE;
  if (!ok) { allPass = false; allPassMonthly = false; }
  const status = ok ? '✓' : '✗ FAIL';
  console.log(
    `${String(m).padStart(5)}  ${'COI'.padEnd(10)}  ${expected.toFixed(5).padStart(17)}  ${(isNaN(computed) ? 'NaN' : computed.toFixed(5)).padStart(17)}  ${diff.toFixed(6).padStart(12)}  ${status}`
  );
  console.log('');
}

console.log('─'.repeat(88));
console.log(allPassMonthly
  ? '✅  Smoke-testy miesięczne: OK'
  : '❌  Smoke-testy miesięczne: FAIL');

// ── Podsumowanie ─────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(85));
console.log(allPass
  ? '\n✅  WSZYSTKIE TESTY ZALICZONE — kalkulator zgodny z arkuszem Excel.'
  : '\n❌  NIEKTÓRE TESTY NIEZALICZONE — sprawdź różnice powyżej.');

// ── Szczegółowe wartości rok 1 ───────────────────────────────────────────────
console.log('\n=== Rok 1 — szczegóły ===');
for (const t of types) {
  const exp = EXPECTED[1][t];
  const got = annual[t]?.[0] ?? NaN;
  console.log(`  ${t}: expected=${exp.toFixed(5)}, got=${isNaN(got)?'NaN':got.toFixed(5)}`);
}

process.exit(allPass ? 0 : 1);

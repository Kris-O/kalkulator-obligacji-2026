/**
 * Kalkulator Obligacji Skarbowych v2.0
 * Model dwu-składnikowy zgodny 1:1 z arkuszem Excel "Finanse Bardzo Osobiste"
 *
 * Każda obligacja jest wyceniana jako suma dwóch składników:
 *   (1) wartość wykupu (redemption) — co dostaniesz przy wcześniejszym wykupie dziś
 *   (2) konto oszczędnościowe (savings) — skumulowane kupony/odsetki reinwestowane
 *
 * Wynik miesięczny = savings_{t-1} × (1 + savRate/12 × (1-tax)) + redemption_t
 */

'use strict';

// ---------------------------------------------------------------------------
// Typy obligacji
// ---------------------------------------------------------------------------

const BONDS = {
  ROR: { name: 'ROR', label: '1-roczna (ROR)',  months: 12,  base: 'nbp',       margin: 0.000, couponType: 'monthly',    feePerBond: 0.5, fixedPeriod1Rate: 0.0400, zamiana: 99.9 },
  DOR: { name: 'DOR', label: '2-letnia (DOR)',  months: 24,  base: 'nbp',       margin: 0.0015,couponType: 'monthly',    feePerBond: 0.7, fixedPeriod1Rate: 0.0415, zamiana: 99.9 },
  TOS: { name: 'TOS', label: '3-letnia (TOS)',  months: 36,  base: 'fixed',     margin: 0.000, couponType: 'capitalize', feePerBond: 1.0, fixedPeriod1Rate: 0.0440, zamiana: 99.9 },
  COI: { name: 'COI', label: '4-letnia (COI)',  months: 48,  base: 'inflation', margin: 0.015, couponType: 'annual',     feePerBond: 2.0, fixedPeriod1Rate: 0.0475, zamiana: 99.9, protectionMonths: 12 },
  ROS: { name: 'ROS', label: '6-letnia (ROS)',  months: 72,  base: 'inflation', margin: 0.020, couponType: 'capitalize', feePerBond: 2.0, fixedPeriod1Rate: 0.0500, zamiana: 100  },
  EDO: { name: 'EDO', label: '10-letnia (EDO)', months: 120, base: 'inflation', margin: 0.020, couponType: 'capitalize', feePerBond: 3.0, fixedPeriod1Rate: 0.0535, zamiana: 99.9 },
  ROD: { name: 'ROD', label: '12-letnia (ROD)', months: 144, base: 'inflation', margin: 0.025, couponType: 'capitalize', feePerBond: 3.0, fixedPeriod1Rate: 0.0560, zamiana: 100  },
};

const TOTAL_MONTHS = 145;

// ---------------------------------------------------------------------------
// Główna funkcja obliczeniowa
// ---------------------------------------------------------------------------

/**
 * @param {object} params
 * @param {number}   params.bondCount     - liczba obligacji (np. 1000)
 * @param {number}   params.taxRate       - podatek Belki (0.19)
 * @param {number[]} params.inflation     - inflacja rok 1-12
 * @param {number[]} params.nbpRate       - stopa NBP rok 1-12
 * @param {number[]} params.wibor6m       - WIBOR 6M rok 1-12 (używany do wyświetlania; TOS ma stałe 4.40%)
 * @param {number[]} params.savingsRate   - oprocentowanie konta rok 1-12
 * @returns {{ monthly, annual, cumulativeInflation, initialValue }}
 */
function calculate(params) {
  const { bondCount, taxRate, inflation, nbpRate, savingsRate } = params;
  const initialValue = bondCount * 100;

  const results = {};

  for (const [key, bond] of Object.entries(BONDS)) {
    results[key] = calcBond(bond, params, TOTAL_MONTHS);
  }

  results.KTO = calcSavings(initialValue, taxRate, savingsRate, TOTAL_MONTHS);

  const cumulativeInflation = calcCumulativeInflation(inflation, TOTAL_MONTHS);
  results.REAL = {};
  for (const key of Object.keys(results)) {
    if (key === 'REAL') continue;
    results.REAL[key] = results[key].map((v, i) => v / (cumulativeInflation[i] || 1));
  }

  const annual = buildAnnualSummary(results, initialValue, cumulativeInflation);
  return { monthly: results, annual, cumulativeInflation, initialValue };
}

// ---------------------------------------------------------------------------
// Symulacja obligacji — model dwu-składnikowy
// ---------------------------------------------------------------------------

function calcBond(bond, params, totalMonths) {
  const { months: maturityMonths, base, margin, couponType, feePerBond, fixedPeriod1Rate, zamiana, protectionMonths = 1 } = bond;
  const { bondCount: initBonds, taxRate, inflation, nbpRate, savingsRate } = params;

  const monthly = new Array(totalMonths + 1).fill(0);
  monthly[0] = initBonds * 100;

  let bondCount    = initBonds;
  let originalFace = bondCount * 100; // baza do obliczania opłaty i podatku w bieżącym okresie
  let capBase      = originalFace;    // rosnąca podstawa dla obligacji z kapitalizacją
  let savings      = 0;               // skumulowane kupony na koncie oszczędnościowym
  let periodMonth  = 1;               // miesiąc w bieżącym okresie wykupu (1..maturityMonths)
  let prevMaturity = false;           // czy poprzedni miesiąc był terminem wykupu?

  for (let m = 1; m <= totalMonths; m++) {
    const simYear    = Math.ceil(m / 12);                         // rok symulacji (1-12)
    const yearIdx    = Math.min(simYear, 12) - 1;                 // indeks tablicy params
    const yearInPer  = Math.ceil(periodMonth / 12);               // rok w bieżącym okresie
    const monthInYr  = ((periodMonth - 1) % 12) + 1;             // miesiąc w roku okresu (1-12)

    // ── Stopa oprocentowania ─────────────────────────────────────────────────
    let rate;
    if (base === 'fixed') {
      // TOS: zawsze 4.40%
      rate = fixedPeriod1Rate;
    } else if (couponType === 'monthly') {
      // ROR/DOR: miesiąc 1 okresu = stopa specjalna, potem NBP+marża
      rate = (periodMonth === 1)
        ? fixedPeriod1Rate
        : (nbpRate[yearIdx] + margin);
    } else {
      // COI/EDO/ROS/ROD: rok 1 okresu = stopa stała, rok 2+ = inflacja+marża
      if (yearInPer === 1) {
        rate = fixedPeriod1Rate;
      } else {
        rate = ((base === 'inflation') ? inflation[yearIdx] : nbpRate[yearIdx]) + margin;
      }
    }

    // ── Wartość brutto (gross) ────────────────────────────────────────────────
    // Miesięczne: prosty miesięczny przyrost
    // Roczne/kapitalizacja: narastające odsetki proste w ciągu roku
    const gross = (couponType === 'monthly')
      ? capBase * (1 + rate / 12)
      : capBase * (1 + rate * monthInYr / 12);

    // ── Termin wykupu i ochrona ──────────────────────────────────────────────
    const isMaturity   = (periodMonth === maturityMonths);
    const isProtection = (periodMonth <= protectionMonths);

    // ── Opłata za wcześniejszy wykup ────────────────────────────────────────
    let fee;
    if (isMaturity) {
      fee = 0;
    } else if (isProtection) {
      // Ochrona: opłata ograniczona do faktycznie naliczonych odsetek
      fee = Math.min(gross - originalFace, bondCount * feePerBond);
    } else {
      fee = bondCount * feePerBond;
    }
    fee = Math.max(0, fee);

    // ── Wartość wykupu (redemption) ──────────────────────────────────────────
    // AM = AJ - AL - (AJ - AG - AL) * tax
    const redemption = gross - fee - (gross - originalFace - fee) * taxRate;

    // ── Odsetki / kupon trafiający na konto oszczędnościowe ─────────────────
    let toSavings = 0;

    if (couponType === 'monthly') {
      // Kupon miesięczny: pełne odsetki netto (bez opłaty) → konto
      const coupon = gross - capBase;
      toSavings = coupon * (1 - taxRate);
      if (isMaturity) {
        // Bonus zamiany: ROUNDDOWN(gross / 99.9) * 0.1
        toSavings += Math.floor(gross / zamiana) * 0.1;
      }

    } else if (couponType === 'annual') {
      // COI: kupon roczny na koniec każdego roku okresu
      if (monthInYr === 12) {
        if (isMaturity) {
          // Termin wykupu: reszta z zamiany trafia na konto
          toSavings = redemption - Math.floor(redemption / zamiana) * zamiana;
        } else {
          // Zwykły kupon roczny: pełna kwota odsetek netto (bez opłaty)
          toSavings = (gross - capBase) * (1 - taxRate);
        }
      }

    } else {
      // capitalize (TOS/EDO/ROS/ROD): tylko przy terminie wykupu — reszta z zamiany
      if (isMaturity) {
        toSavings = redemption - Math.floor(redemption / zamiana) * zamiana;
      }
    }

    // ── Redukcja konta przy rolowaniu (ROR/DOR/COI) ─────────────────────────
    // Pieniądze ze starego konta odkupują nowe obligacje; reszta zostaje
    const savingsReduction = (prevMaturity && couponType !== 'capitalize')
      ? Math.floor(savings / 100) * 100
      : 0;

    // ── Miesięczna stopa wzrostu konta oszczędnościowego ────────────────────
    const savGrowth = savingsRate[yearIdx] / 12 * (1 - taxRate);

    // ── Wynik miesięczny = konto z poprzedniego miesiąca × wzrost + wykup ───
    // Dla COI Excel (kolumna CL) odejmuje redukcję konta także w samym wyniku
    // miesiąca po terminie wykupu, żeby nie podwójnie liczyć środków z konta.
    const savingsForResult = (couponType === 'annual')
      ? (savings - savingsReduction)
      : savings;
    const result = savingsForResult * (1 + savGrowth) + redemption;
    monthly[m] = result;

    // ── Aktualizacja konta oszczędnościowego ────────────────────────────────
    // AP44 = (AP43 - redukcja_jeśli_AP43_był_w_terminie) × (1+savRate/12×(1-tax)) + AN44
    savings = (savings - savingsReduction) * (1 + savGrowth) + toSavings;

    // ── Kapitalizacja roczna: aktualizacja capBase (nie przy terminie) ───────
    if (!isMaturity && couponType === 'capitalize' && monthInYr === 12) {
      capBase = gross; // nowa podstawa = narosłe odsetki z tego roku
    }

    // ── Rolowanie na nowy okres przy terminie wykupu ─────────────────────────
    if (isMaturity) {
      const newFromRedemption = Math.floor(redemption / zamiana);
      // Dla ROR/DOR/COI: konto też kupuje obligacje; dla TOS/EDO/ROS/ROD: nie
      const newFromSavings = (couponType !== 'capitalize')
        ? Math.floor(savings / 100) // savings jest tu już po aktualizacji (AP55 dla ROR)
        : 0;

      bondCount    = newFromRedemption + newFromSavings;
      originalFace = bondCount * 100;
      capBase      = originalFace;
      periodMonth  = 1;
      prevMaturity = true;
    } else {
      periodMonth++;
      prevMaturity = false;
    }
  }

  return monthly;
}

// ---------------------------------------------------------------------------
// Konto oszczędnościowe (benchmark KTO)
// ---------------------------------------------------------------------------

function calcSavings(initialValue, taxRate, savingsRate, totalMonths) {
  const monthly = new Array(totalMonths + 1).fill(0);
  monthly[0] = initialValue;
  let balance = initialValue;

  for (let m = 1; m <= totalMonths; m++) {
    const idx = Math.min(Math.ceil(m / 12), 12) - 1;
    balance *= (1 + savingsRate[idx] / 12 * (1 - taxRate));
    monthly[m] = balance;
  }
  return monthly;
}

// ---------------------------------------------------------------------------
// Skumulowana inflacja (do korekty wartości realnej)
// ---------------------------------------------------------------------------

function calcCumulativeInflation(inflation, totalMonths) {
  const cumulative = new Array(totalMonths + 1).fill(1);
  for (let m = 1; m <= totalMonths; m++) {
    const idx = Math.min(Math.ceil(m / 12), 12) - 1;
    cumulative[m] = cumulative[m - 1] * (1 + (inflation[idx] || 0) / 12);
  }
  return cumulative;
}

// ---------------------------------------------------------------------------
// Podsumowanie roczne
// ---------------------------------------------------------------------------

function buildAnnualSummary(results, initialValue, cumulativeInflation) {
  const years = 12;
  const keys = Object.keys(results).filter(k => k !== 'REAL');
  const annual = { nominal: {}, return: {}, real: {}, realReturn: {} };

  for (const key of keys) {
    annual.nominal[key]    = [];
    annual.return[key]     = [];
    annual.real[key]       = [];
    annual.realReturn[key] = [];

    for (let y = 1; y <= years; y++) {
      const m       = y * 12;
      const nomVal  = results[key][m] || 0;
      const realVal = nomVal / (cumulativeInflation[m] || 1);
      annual.nominal[key].push(nomVal);
      annual.return[key].push((nomVal - initialValue) / initialValue);
      annual.real[key].push(realVal);
      annual.realReturn[key].push((realVal - initialValue) / initialValue);
    }
  }

  annual.years        = Array.from({ length: years }, (_, i) => i + 1);
  annual.initialValue = initialValue;
  return annual;
}

// ---------------------------------------------------------------------------
// Domyślne parametry — Scenariusz I z arkusza (maj 2026)
// ---------------------------------------------------------------------------

const DEFAULT_PARAMS = {
  bondCount:   1000,
  taxRate:     0.19,
  // Scenariusz I: inflacja 2.1%, NBP 3.75%, WIBOR 3.88%, lokata 3.6%
  inflation:   new Array(12).fill(0.021),
  nbpRate:     new Array(12).fill(0.0375),
  wibor6m:     new Array(12).fill(0.0388),
  savingsRate: new Array(12).fill(0.036),
};

// ---------------------------------------------------------------------------
// Eksport
// ---------------------------------------------------------------------------

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calculate, BONDS, DEFAULT_PARAMS };
} else {
  window.BondCalculator = { calculate, BONDS, DEFAULT_PARAMS };
}

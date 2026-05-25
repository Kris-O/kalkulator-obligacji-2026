# Polish Treasury Bond Calculator

🇵🇱 [Wersja polska → README.pl.md](README.pl.md)

An interactive calculator comparing 7 types of Polish PKO treasury bonds against a savings
account benchmark over a 12-year horizon.

The calculation model is verified 1:1 against the reference spreadsheet
`Kalkulator-obligacji-maj-2026-Finanse-Bardzo-Osobiste.xlsx` by Marcin Iwuć
([Finanse Bardzo Osobiste](https://marciniwuc.com/obligacje-indeksowane-inflacja-kalkulator/)).
Full model description: [`docs/calculation-model.md`](docs/calculation-model.md).

---

## Quick Start

### Standalone HTML (no server, no install)

```
Open in any browser:
  standalone/kalkulator-obligacji.html
```

Fully **offline** — Chart.js 4.4.4 is bundled directly in the HTML file.
No internet connection or npm packages required.

### Run Tests

```bash
node test_calculator.mjs
```

Requires Node.js ≥ 18. No npm dependencies.

Expected output:
```
✅  WSZYSTKIE TESTY ZALICZONE — kalkulator zgodny z arkuszem Excel.
```

113 assertions: 8 instruments × 12 years (96) + monthly smoke tests m=49/50/100 (17),
tolerance ±0.01 PLN.

### WordPress Plugin

> ⚠️ **Do not use "Code → Download ZIP"** from GitHub — that downloads the entire repository,
> not the plugin. WordPress will reject it. Use the dedicated plugin ZIP below.

**Download:** [`releases/kalkulator-obligacji-wordpress-v1.0.3.zip`](releases/kalkulator-obligacji-wordpress-v1.0.3.zip)

1. Download the ZIP above
2. Go to **WordPress → Plugins → Add New → Upload Plugin**
3. Upload the ZIP and click **Install Now**, then **Activate**
4. Insert shortcode on any page:

```
[kalkulator_obligacji]
```

Optional parameters:
```
[kalkulator_obligacji bond_count="500" tax="19"]
```

The plugin auto-fetches current NBP and WIBOR 6M rates once a day
(WP Cron + scraping). Admin panel: Settings → Kalkulator Obligacji.

---

## Instruments

| Symbol | Term    | Base rate           | Year-1 rate | Coupons       |
|--------|---------|---------------------|-------------|---------------|
| ROR    | 12 mo   | NBP reference rate  | 4.00%       | Monthly       |
| DOR    | 24 mo   | NBP + 0.15%         | 4.15%       | Monthly       |
| TOS    | 36 mo   | Fixed 4.40%         | 4.40%       | Compounding   |
| COI    | 48 mo   | Inflation + 1.50%   | 4.75%       | Annual payout |
| ROS    | 72 mo   | Inflation + 2.00%   | 5.00%       | Compounding   |
| EDO    | 120 mo  | Inflation + 2.00%   | 5.35%       | Compounding   |
| ROD    | 144 mo  | Inflation + 2.50%   | 5.60%       | Compounding   |

All bonds are issued by the Polish Ministry of Finance and distributed through PKO Bank Polski.
Redemption before maturity incurs a fee (0.50–3.00 PLN/bond depending on type).

---

## Default Parameters — Scenario I

Values hardcoded in `html/assets/calculator.js` from the reference spreadsheet
(`OBLIGACJE!EE28:EJ39`, Scenario I, May 2026):

| Parameter            | Value       |
|----------------------|-------------|
| Inflation            | 2.1%/year   |
| NBP reference rate   | 3.75%/year  |
| WIBOR 6M             | 3.88%/year  |
| Savings account      | 3.60%/year  |
| Number of bonds      | 1,000 pcs.  |
| Face value           | 100 PLN/pc. |
| Capital gains tax    | 19%         |

Scenario I comes from columns EF:EJ of the spreadsheet and is independent of
the values entered in the `WPISZ ZAŁOŻENIA` (Enter Assumptions) sheet.

---

## Calculation Model

The calculator uses a **two-component model** matching the Excel formulas exactly:

```
result[t] = savings[t-1] × (1 + savRate/12 × (1−tax)) + redemption[t]
```

- **redemption[t]** — current early-redemption value of the bond position
- **savings[t]** — accumulated net coupons reinvested in a savings account

At each rollover (end of term), bond proceeds and accumulated coupons are
reinvested into a new bond of the same type. See [`docs/calculation-model.md`](docs/calculation-model.md)
for the full description including fee logic, tax basis, and per-instrument coupon types.

---

## File Structure

```
├── html/                          # WordPress plugin source
│   ├── kalkulator-obligacji.php   # Plugin entrypoint (shortcode, WP Cron, admin)
│   ├── assets/
│   │   ├── calculator.js          # ✅ Verified calculation engine (v2.0)
│   │   ├── charts.js              # UI + Chart.js wrappers
│   │   └── calculator.css         # Styles
│   ├── includes/
│   │   ├── class-rates-fetcher.php # NBP + GPW Benchmark scraper
│   │   └── class-ajax.php          # WP AJAX endpoints
│   └── standalone/
│       └── kalkulator-obligacji.html # Self-contained dev source
│
├── standalone/                    # 📦 Release build — open directly in browser
│   └── kalkulator-obligacji.html
│
├── docs/
│   └── calculation-model.md       # Full model description (Polish)
│
├── test_calculator.mjs            # Comparison tests vs Excel spreadsheet
├── build.mjs                      # Builds standalone ZIP
├── CHANGELOG.md
├── README.md                      # This file (English)
└── README.pl.md                   # Polish version
```

---

## Build ZIP

```bash
node build.mjs
```

Creates `dist/kalkulator-obligacji-v{version}.zip` containing `standalone/kalkulator-obligacji.html`
(version read from `package.json`; currently v1.0.3).

---

## Requirements

- **Tests**: Node.js ≥ 18 (ESM)
- **Standalone HTML**: any browser with JavaScript (Chart.js bundled, no CDN)
- **WordPress Plugin**: WordPress ≥ 5.8, PHP ≥ 7.4

---

## Known Limitations

Untested edge cases: ROD rollover after month 144, IKE account variant,
inflation ≤ 0, NBP rate above Scenario I values. Details in section 12 of
[`docs/calculation-model.md`](docs/calculation-model.md) and [`ISSUES.md`](ISSUES.md).

---

## Credits & Attribution

This project is an open-source reimplementation of the Excel calculator created by
**Marcin Iwuć** at [Finanse Bardzo Osobiste](https://marciniwuc.com/):

> **Marcin Iwuć** — *"Obligacje indeksowane inflacją — kalkulator"*
> [marciniwuc.com/obligacje-indeksowane-inflacja-kalkulator/](https://marciniwuc.com/obligacje-indeksowane-inflacja-kalkulator/)

The original Excel file (`Kalkulator-obligacji-maj-2026-Finanse-Bardzo-Osobiste.xlsx`)
served as the reference model — all formulas, parameters, and test values were verified
1:1 against the spreadsheet. Marcin regularly updates the calculator whenever PKO BP
changes its bond offering.

---

## License

GPL-2.0-or-later. Bond data: PKO BP offer, May 2026. Updating parameters when the
offering changes requires manually editing `html/assets/calculator.js`.

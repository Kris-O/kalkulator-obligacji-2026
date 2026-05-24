# Kalkulator Obligacji Skarbowych

Interaktywny kalkulator porównujący 7 typów polskich obligacji skarbowych PKO z kontem
oszczędnościowym (benchmarkiem) w horyzoncie 12 lat.

Model obliczeniowy jest zweryfikowany 1:1 z arkuszem referencyjnym
`Kalkulator-obligacji-maj-2026-Finanse-Bardzo-Osobiste.xlsx` (Finanse Bardzo Osobiste, maj 2026).
Szczegóły logiki: [`docs/calculation-model.md`](docs/calculation-model.md).

---

## Szybki start

### Standalone HTML (bez serwera, bez instalacji)

```
Otwórz w przeglądarce:
  standalone/kalkulator-obligacji.html
```

Działa w pełni **offline** — Chart.js 4.4.4 jest wbudowany bezpośrednio w plik HTML.
Nie wymaga połączenia z internetem ani instalacji żadnych pakietów.

### Uruchomienie testów

```bash
node test_calculator.mjs
```

Wymaga Node.js ≥ 18. Brak dodatkowych dependencji npm.

Oczekiwany wynik:
```
✅  WSZYSTKIE TESTY ZALICZONE — kalkulator zgodny z arkuszem Excel.
```

113 asercji: 8 instrumentów × 12 lat (96) + smoke-testy miesięczne m=49/50/100 (17), tolerancja ±0,01 zł.

### WordPress Plugin

1. Skopiuj katalog `html/` jako plugin do `wp-content/plugins/kalkulator-obligacji/`
2. Aktywuj w panelu WordPress → Wtyczki
3. Wklej shortcode na dowolnej stronie:

```
[kalkulator_obligacji]
```

Opcjonalne parametry:
```
[kalkulator_obligacji bond_count="500" tax="19"]
```

Plugin automatycznie pobiera aktualne kursy NBP i WIBOR 6M raz dziennie
(WP Cron + scraping). Panel admina: Ustawienia → Kalkulator Obligacji.

---

## Parametry domyślne — Scenariusz I

Wartości hardcoded w `html/assets/calculator.js` na podstawie danych z arkusza
(`OBLIGACJE!EE28:EJ39`, Scenariusz I, maj 2026):

| Parametr              | Wartość   |
|-----------------------|-----------|
| Inflacja              | 2,1%/rok  |
| Stopa NBP             | 3,75%/rok |
| WIBOR 6M              | 3,88%/rok |
| Konto oszczędnościowe | 3,60%/rok |
| Liczba obligacji      | 1 000 szt.|
| Wartość nominalna     | 100 zł/szt.|
| Podatek Belki         | 19%       |

Scenariusz I pochodzi z kolumn EF:EJ arkusza i jest niezależny od wartości
wpisanych w zakładce `WPISZ ZAŁOŻENIA`.

---

## Struktura plików

```
├── html/                          # Źródło pluginu WordPress
│   ├── kalkulator-obligacji.php   # Główny plik pluginu (shortcode, WP Cron, admin)
│   ├── assets/
│   │   ├── calculator.js          # ✅ Zweryfikowana logika obliczeń (v2.0)
│   │   ├── charts.js              # UI + Chart.js
│   │   └── calculator.css         # Style
│   ├── includes/
│   │   ├── class-rates-fetcher.php # Scraping NBP + GPW Benchmark
│   │   └── class-ajax.php          # WP AJAX endpoints
│   └── standalone/
│       └── kalkulator-obligacji.html # Self-contained (dev source)
│
├── standalone/                    # 📦 Release — gotowe do otwarcia w przeglądarce
│   └── kalkulator-obligacji.html
│
├── docs/
│   └── calculation-model.md       # Opis modelu obliczeniowego (po polsku)
│
├── test_calculator.mjs            # Testy porównawcze z arkuszem Excel
├── build.mjs                      # Skrypt budowania standalone ZIP
├── CHANGELOG.md
└── README.md
```

---

## Budowanie ZIP

```bash
node build.mjs
```

Tworzy `dist/kalkulator-obligacji-v{wersja}.zip` zawierający `standalone/kalkulator-obligacji.html`
(wersja czytana z `package.json`; aktualnie v1.0.3).

---

## Instrumenty

| Symbol | Termin  | Baza             | Stopa rok 1 | Odsetki       |
|--------|---------|------------------|-------------|---------------|
| ROR    | 12 mc   | Stopa NBP        | 4,00%       | Miesięczne    |
| DOR    | 24 mc   | Stopa NBP +0,15% | 4,15%       | Miesięczne    |
| TOS    | 36 mc   | Stała 4,40%      | 4,40%       | Kapitalizacja |
| COI    | 48 mc   | Inflacja +1,50%  | 4,75%       | Roczne        |
| ROS    | 72 mc   | Inflacja +2,00%  | 5,00%       | Kapitalizacja |
| EDO    | 120 mc  | Inflacja +2,00%  | 5,35%       | Kapitalizacja |
| ROD    | 144 mc  | Inflacja +2,50%  | 5,60%       | Kapitalizacja |

---

## Wymagania

- **Testy**: Node.js ≥ 18 (ESM)
- **Standalone HTML**: przeglądarka z JavaScript (Chart.js wbudowany, brak CDN)
- **WordPress Plugin**: WordPress ≥ 5.8, PHP ≥ 7.4

---

## Znane ograniczenia

Nieprzetestowane przypadki: rok 12 ROD po rolowaniu, IKE, inflacja ≤ 0,
stopa NBP > wartości ze Scenariusza I. Szczegóły: sekcja 12 w
[`docs/calculation-model.md`](docs/calculation-model.md).

---

## Licencja

GPL-2.0-or-later. Dane obligacji PKO BP: oferta maj 2026. Aktualizacja parametrów
przy zmianie oferty wymaga ręcznej edycji `html/assets/calculator.js`.

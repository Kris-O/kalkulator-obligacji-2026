# Changelog

Wszystkie istotne zmiany w tym projekcie.

Format oparty na [Keep a Changelog](https://keepachangelog.com/pl/1.0.0/).

---

## [1.0.3] — 2026-05-25

### Naprawione
- **COI monthly rollover vs Excel**: poprawiono logikę miesięczną po zapadalności,
  aby nie występował skok po rolowaniu i aby wartości miesięczne COI były zgodne
  1:1 z arkuszem referencyjnym.
- **Ochrona opłaty wcześniejszego wykupu dla COI**: dopasowano zakres ochrony do
  modelu z Excela (`12` miesięcy okresu), zamiast tylko pierwszego miesiąca.

### Zmienione
- **Smoke-testy miesięczne**: `test_calculator.mjs` porównuje teraz wartości
  miesięczne bezpośrednio do XLSX (miesiące `50` i `100` dla wszystkich instrumentów)
  oraz zawiera dodatkowy test krawędziowy `COI` dla miesiąca `49`.

---

## [1.0.2] — 2026-05-24

### Dodane
- **Miesięczne smoke-testy regresji**: 16 asercji (8 instrumentów × miesiące 50 i 100)
  dołączone do `test_calculator.mjs`; łącznie 112 testów (96 rocznych + 16 miesięcznych)
- **Chart.js 4.4.4 vendored offline**: biblioteka wbudowana bezpośrednio w standalone HTML
  (~238 KB); plik działa w trybie offline bez połączenia z internetem po double-click
- **Backlog**: uściślono issue #4 w `ISSUES.md` — rok 12 ROD jest objęty testami
  rocznym; otwarte pozostaje tylko zachowanie miesiąc 145+ (post-rollover poza horyzontem)
- **Build**: `build.mjs` czyta wersję z `package.json`; ZIP zawiera tylko standalone HTML
- **process.exit**: `test_calculator.mjs` zwraca exit code 1 przy niepowodzeniu (wymagane przez CI)

---

## [1.0.1] — 2026-05-24

### Naprawione
- **Standalone HTML**: wbudowany kalkulator zastąpiony zweryfikowanym modelem
  dwu-składnikowym (poprzednia wersja używała błędnego uproszczonego modelu)
- **Etykieta TOS**: poprawiono z „3-letnia (WIBOR)" na „3-letnia (stała 4,40%)"
  w obu wersjach (standalone + charts.js); TOS ma stałą stopę 4,40%, nie WIBOR
- **Wartości domyślne UI**: zunifikowano z parametrami Scenariusza I
  (inflacja 2,1%, NBP 3,75%, WIBOR 3,88%, konto 3,60%)

### Dodane
- `README.md` — instrukcja uruchomienia standalone, testów i pluginu WP
- `CHANGELOG.md` — ten plik
- `.github/workflows/test.yml` — CI: automatyczne testy po każdym push
- `standalone/kalkulator-obligacji.html` — katalog release gotowy do otwarcia
- `build.mjs` — skrypt tworzący ZIP z wersją release
- Wersja w `package.json` podniesiona do 1.0.1

---

## [1.0.0] — 2026-05-24

### Pierwsze wydanie — zweryfikowany model obliczeniowy

#### Kalkulator (`html/assets/calculator.js`)
- Model dwu-składnikowy: `result[t] = savings[t-1] × (1 + savRate/12 × (1-tax)) + redemption[t]`
- 7 instrumentów: ROR, DOR, TOS, COI, ROS, EDO, ROD
- Prawidłowe rolowanie (reinwestycja po zapadalności) z uwzględnieniem `prevMaturity`
- Opłata za wcześniejszy wykup z okresu ochronnego (miesiąc 1 każdego okresu)
- Ujemna podstawa podatku — bez zacięcia `max(0, podstawa)`
- Ceny zamiany: ROR/DOR/TOS/COI/EDO = 99,90 zł; ROS/ROD = 100,00 zł
- Parametry Scenariusza I hardcoded z arkusza `OBLIGACJE!EE28:EJ39`

#### Testy (`test_calculator.mjs`)
- 96 asercji (8 instrumentów × 12 lat) vs wartości z arkusza Excel
- Tolerancja ±0,01 zł
- Wszystkie 96 asercji: ✅ diff = 0,000000

#### Dokumentacja
- `docs/calculation-model.md` — pełny opis modelu po polsku (12 sekcji)

#### Standalone HTML (`html/standalone/kalkulator-obligacji.html`)
- Self-contained: CSS + JS inline, Chart.js z CDN
- 4 zakładki: Założenia, Porównanie, Wartość realna, Szczegóły

#### WordPress Plugin (`html/kalkulator-obligacji.php`)
- Shortcode `[kalkulator_obligacji]`
- WP Cron: codzienny scraping NBP i GPW Benchmark
- Panel admina z podglądem kursów i manualnym odświeżaniem
- AJAX endpoint dla frontendu

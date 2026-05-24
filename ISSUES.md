# Planowane funkcje i znane braki

Lista funkcji do zaimplementowania. Po przeniesieniu projektu na GitHub — przekształcić w Issues.

---

## #1 Zakładka IKE OBLIGACJE

**Opis**: Arkusz Excel zawiera trzeci arkusz z kalkulatorem IKE.
IKE Obligacje ma zróżnicowane koszty zarządzania (0,10–0,16% w zależności od wartości portfela)
i inne zasady opodatkowania.

**Warianty do obsługi**:
- `spełniam warunki IKE` — brak podatku Belki (taxRate = 0), ale koszty zarządzania odliczane corocznie
- `nie spełniam warunków` / `przed 3 latami` — normalny podatek 19%, koszty zarządzania bez ulgi

**Kroki implementacji**:
1. Dodać parameter `ikeMode: 'none' | 'eligible' | 'partial'` do `params`
2. W `calcBond`: obsłużyć `taxRate = 0` gdy `ikeMode === 'eligible'`
3. Odjąć roczną opłatę zarządzającą od `savings` po każdym roku
4. Dodać osobną kolumnę/wykres w zakładce Porównanie
5. Dodać testy porównawcze z arkuszem IKE

**Akceptacyjne wartości do wyekstrahowania**: z arkusza (zakładka IKE).

---

## #2 Scenariusze użytkownika z WPISZ ZAŁOŻENIA

**Opis**: Arkusz Excel ma zakładkę `WPISZ ZAŁOŻENIA` z trybem rocznym (B13:B24)
i jednolitym (B12). Kalkulator JS obsługuje oba tryby w UI, ale DEFAULT_PARAMS
pochodzi z Scenariusza I (EE:EJ). Tryb roczny nie jest weryfikowany testami.

**Kroki implementacji**:
1. Dodać testy dla trybu rocznego — wyekstrahować wartości z arkusza dla własnych stóp
2. Przetestować zachowanie dla: inflacja ujemna, NBP = 0, stopa > 15%
3. Obsłużyć przypadek brzegowy: DOR rok 1 = 4,15% < NBP = 5,75% — czy stopa może spaść
   poniżej roku 1 przy wysokim NBP? (dokument wskazuje, że tak)

**Pliki do edycji**: `test_calculator.mjs` (dodać blok testów dla scenariusza rocznego).

---

## #3 Walidacja input — bardziej restrykcyjna

**Opis**: Brakuje walidacji granicznych:
- Inflacja ≤ 0 (stopy obligacji mogą spaść poniżej zera przy inflacji < marży)
- NBP → DOR: jeśli NBP > 4,15%, stopa roku 1 DOR (4,15%) jest niższa niż rok 2+
- Liczba obligacji = 0 (divide by zero risk przy wyświetlaniu)

**Proponowane rozwiązanie**:
- Dodać `validateParams(params)` w `calculator.js` rzucający opisowe błędy
- Wyświetlać banner ostrzegawczy w UI gdy inflacja ≤ 0 lub NBP ≥ 10%

---

## #4 ROD rok 12 — rolowanie po granicy symulacji

**Opis**: ROD ma termin 144 miesięcy = 12 lat. Pierwsze rolowanie ROD wypada
dokładnie na granicy horyzontu symulacji (miesiąc 144). Zachowanie po rolowaniu
(miesiąc 145+) nie jest testowane.

**Kroki**: Rozszerzyć `TOTAL_MONTHS` na 157 i dodać asercje dla ROD rok 13
(tylko jeśli arkusz zawiera te dane).

---

## #5 Plugin WP — weryfikacja parsowania kursów NBP/WIBOR

**Opis**: `class-rates-fetcher.php` używa regex do wyciągania kursów ze stron HTML.
Brak testu jednostkowego regex na sample HTML stron NBP i GPW Benchmark.

**Ryzyko**: Zmiana layoutu strony NBP/GPW → silent fallback do domyślnych wartości
bez powiadomienia administratora.

**Proponowane rozwiązanie**:
- Dodać PHP unit test z sample HTML
- Dodać alert e-mail do admina gdy scraping zawiedzie 3× z rzędu
- Rozważyć alternatywne źródło: NBP Open Data API (o ile istnieje)

---

*Wygenerowano: 2026-05-24. Otwórz jako Issues na GitHub po przeniesieniu projektu.*

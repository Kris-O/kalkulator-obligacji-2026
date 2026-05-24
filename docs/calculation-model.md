# Model obliczeniowy — Kalkulator Obligacji Skarbowych

> Dokument opisuje logikę kalkulatora zaimplementowaną w `html/assets/calculator.js`.
> Wyniki są zweryfikowane 1:1 z arkuszem referencyjnym
> `Kalkulator-obligacji-maj-2026-Finanse-Bardzo-Osobiste.xlsx` (Finanse Bardzo Osobiste, maj 2026).

---

## 1. Czym jest `savings` (konto oszczędnościowe)

`savings` to skumulowana wartość wszystkich kuponów i odsetek wypłaconych przez obligację,
reinwestowanych na koncie oszczędnościowym.

Konto oszczędnościowe jest **odrębnym rachunkiem** — niezależnym od wartości samej obligacji.
Rośnie co miesiąc według wzoru:

```
savings[t] = (savings[t-1] - redukcja_przy_rolowaniu) × (1 + savingsRate/12 × (1 - taxRate))
           + toSavings[t]
```

gdzie `toSavings[t]` to kwota dopisana w danym miesiącu (kupon lub reszta z zamiany).

Konto oszczędnościowe **nie jest oprocentowane stopą obligacji** — rośnie zawsze według
`savingsRate` (stopa lokaty), niezależnie od rodzaju obligacji.

---

## 2. Czym jest `redemption` (wartość wykupu)

`redemption` to kwota, którą inwestor otrzyma, jeśli zdecyduje się wycofać z obligacji
w danym miesiącu. Obliczana jest miesięcznie jako:

```
redemption = gross - fee - (gross - originalFace - fee) × taxRate
```

gdzie:
- `gross` — wartość brutto obligacji (kapitał + narosłe odsetki)
- `fee` — opłata za wcześniejszy wykup (0 w dniu zapadalności)
- `originalFace` — nominalna wartość zakupu w bieżącym okresie (`bondCount × 100`)
- `taxRate` — stawka podatku Belki (19%)

Wyrażenie `(gross - originalFace - fee)` stanowi **podstawę opodatkowania** — zysk netto
po odjęciu opłaty. Jeśli jest ujemne (strata), podatek wynosi zero (ale ujemna podstawa
wchodzi do wzoru i łagodzi straty — patrz sekcja 5).

---

## 3. Dlaczego kupony trafiają na konto, a nie powiększają wartości obligacji

W rzeczywistości polskie obligacje oszczędnościowe **wypłacają odsetki poza obligacją**
na rachunek inwestora. Inwestor może je swobodnie wypłacić lub reinwestować.

Kalkulator modeluje reinwestycję: każdy wypłacony kupon trafia na konto oszczędnościowe
i dalej rośnie w tempie lokaty (3,6% rocznie, netto 19% podatku).

Konsekwencja: wartość nominalna obligacji (`face`) **nie rośnie** dla instrumentów
z wypłatą kuponów (ROR, DOR, COI). Rośnie tylko dla instrumentów z **kapitalizacją**
(TOS, EDO, ROS, ROD), gdzie odsetki są doliczane do kapitału obligacji.

Formuła wyniku miesięcznego:

```
result[t] = savings[t-1] × (1 + savingsRate/12 × (1-tax)) + redemption[t]
```

Czyli: wartość portfela = konto z poprzedniego miesiąca powiększone o jeden miesiąc wzrostu,
plus aktualna wartość wykupu obligacji.

---

## 4. Jak obliczana jest opłata za wcześniejszy wykup

### Trzy przypadki

| Sytuacja | Opłata |
|---|---|
| Miesiąc zapadalności (koniec okresu) | `fee = 0` |
| Miesiąc 1 każdego okresu (ochrona) | `fee = min(gross − originalFace, bondCount × feePerBond)` |
| Każdy inny miesiąc | `fee = bondCount × feePerBond` |

**Okres ochronny** (miesiąc 1 każdego nowego okresu wykupu) ogranicza opłatę do faktycznie
naliczonych odsetek. Dzięki temu inwestor nigdy nie traci więcej niż zarobił — redemption
w miesiącu ochronnym spada co najwyżej do poziomu `originalFace`.

Stawki `feePerBond` (zł za sztukę obligacji):

| Instrument | Opłata (zł/szt.) |
|---|---|
| ROR | 0,50 |
| DOR | 0,70 |
| TOS | 1,00 |
| COI | 2,00 |
| ROS | 2,00 |
| EDO | 3,00 |
| ROD | 3,00 |

---

## 5. Jak obliczana jest podstawa podatku

Podstawa podatku od zysku kapitałowego (podatek Belki, 19%) to:

```
podstawa = gross - originalFace - fee
```

Wzór **nie stosuje** `max(0, podstawa)` — jeśli opłata przewyższa naliczone odsetki,
podstawa jest ujemna i zmniejsza stratę inwestora przy wcześniejszym wykupie:

```
redemption = gross - fee - podstawa × taxRate
           = gross - fee - (gross - originalFace - fee) × 0.19
```

Przykład: ROR, miesiąc 2, face=100 000, gross=100 312,50, fee=500:
- podstawa = 312,50 − 500 = −187,50
- redemption = 100 312,50 − 500 − (−187,50 × 0,19) = 99 812,50 + 35,625 = **99 848,13 zł**

Wynik jest poniżej face value (strata), ale podatek od ujemnej podstawy częściowo ją
kompensuje — dokładnie tak jak w arkuszu Excel.

Dla instrumentów z **kapitalizacją** (TOS, EDO, ROS, ROD) podatek naliczany jest
jednorazowo przy wykupie od łącznego zysku. W miesiącach pośrednich `originalFace` to
zawsze wartość zakupu w bieżącym cyklu (`bondCount × 100`), nie bieżące `capBase`.

---

## 6. Jak działa rolowanie (reinwestycja po zapadalności)

W dniu zapadalności kalkulator automatycznie odkupuje nowe obligacje tego samego typu
za środki z wykupu i konta oszczędnościowego.

### Liczba nowych obligacji

Dla instrumentów z kuponami (ROR, DOR, COI):

```
nowe_szt = floor(redemption / zamiana) + floor(savings / 100)
```

Środki z konta (po pobraniu `floor(savings/100) × 100`) są zużywane na zakup;
reszta (modulo 100 zł) zostaje na koncie.

Dla instrumentów z kapitalizacją (TOS, EDO, ROS, ROD):

```
nowe_szt = floor(redemption / zamiana)
```

Konto nie jest uszczuplane — trafia na nie tylko reszta z zamiany:

```
toSavings = redemption − floor(redemption / zamiana) × zamiana
```

### Cena zamiany (`zamiana`)

| Instrument | Cena zamiany |
|---|---|
| ROR | 99,90 zł |
| DOR | 99,90 zł |
| TOS | 99,90 zł |
| COI | 99,90 zł |
| EDO | 99,90 zł |
| ROS | 100,00 zł |
| ROD | 100,00 zł |

ROS i ROD nie posiadają named range `zamiana_ROS` / `zamiana_ROD` w arkuszu —
wartość 100,00 zł ustalona empirycznie z danych kolumn arkusza.

### Po rolowaniu

Nowy okres zaczyna się ze stopą specjalną roku 1 (analogicznie do pierwszego zakupu).
Konto oszczędnościowe nadal rośnie bez przerwy.

---

## 7. Instrumenty z kuponami miesięcznymi

**ROR** (1-roczna) i **DOR** (2-letnia).

- Odsetki naliczane i wypłacane co miesiąc.
- Wypłata = `(gross − face) × (1 − tax)` trafia na konto oszczędnościowe.
- Stopa specjalna w miesiącu 1 każdego okresu; od miesiąca 2: NBP + marża.
- `gross` w każdym miesiącu = `face × (1 + rate/12)` — prosty procent miesięczny.

---

## 8. Instrumenty z kuponami rocznymi

**COI** (4-letnia).

- Odsetki naliczane miesięcznie metodą prostą (`capBase × (1 + rate × m/12)`),
  ale wypłacane raz na rok (w miesiącu 12, 24, 36 okresu).
- Przy wypłacie rocznej pełna kwota odsetek netto (bez odliczania opłaty) trafia na konto:
  `toSavings = (gross − capBase) × (1 − tax)`
- Opłata wpływa tylko na `redemption` (wartość wykupu), nie na `toSavings`.
- `capBase` dla COI pozostaje stały w ciągu całego okresu (odsetki nie są kapitalizowane).
- Przy terminie zapadalności (miesiąc 48): reszta z zamiany trafia na konto,
  a konto uczestniczy w odkupie nowych obligacji.

---

## 9. Instrumenty z kapitalizacją wewnętrzną

**TOS** (3-letnia), **EDO** (10-letnia), **ROS** (6-letnia), **ROD** (12-letnia).

- Brak wypłat pośrednich — odsetki doliczane do kapitału obligacji na koniec każdego roku.
- `capBase` aktualizowany co 12 miesięcy: `capBase = gross` (wartość brutto z końca roku).
- Wartość brutto w miesiącu `m` roku: `gross = capBase × (1 + rate × monthInYear/12)` —
  prosty procent narastający w ciągu roku, kapitalizowany rocznie.
- Podatek Belki naliczany przy wykupie od `gross − originalFace − fee`
  (gdzie `originalFace` = wartość face w bieżącym cyklu, nie bieżące `capBase`).
- Konto oszczędnościowe gromadzi tylko resztę z zamiany przy terminie wykupu.
- Konto **nie** uczestniczy w odkupie nowych obligacji (tylko redemption / zamiana).

**TOS** ma dodatkową cechę: stopa oprocentowania **stała 4,40%** przez cały 3-letni okres,
niezależnie od inflacji i NBP.

---

## 10. Parametry pochodzące ze Scenariusza I

Wartości domyślne (`DEFAULT_PARAMS`) odpowiadają **Scenariuszowi I** arkusza,
przechowywanego w zakresie `OBLIGACJE!EE28:EJ39`:

| Parametr | Wartość | Kolumna w arkuszu |
|---|---|---|
| Inflacja | 2,1% (każdy rok) | EF28:EF39 |
| Stopa NBP | 3,75% (każdy rok) | EH28:EH39 |
| WIBOR 6M | 3,88% (każdy rok) | EI28:EI39 |
| Oprocentowanie lokaty | 3,6% (każdy rok) | EJ28:EJ39 |

Scenariusz I jest niezależny od wartości wpisanych przez użytkownika w arkuszu
`WPISZ ZAŁOŻENIA` — arkusz może działać w trybie jednolitym (`B12`) lub rocznym (`B13:B24`),
ale kolumny EF:EJ zawierają osobno skonfigurowane wartości.

---

## 11. Założenia skopiowane z arkusza referencyjnego

Poniższe wartości są hardcoded w `calculator.js` na podstawie danych z arkusza.
Zmiana oferty PKO BP wymaga ręcznej aktualizacji.

### Stopy specjalne roku 1 (wg oferty maj 2026)

| Instrument | Stopa roku 1 | Źródło |
|---|---|---|
| ROR | 4,00% | PKO BP, produkt ROR |
| DOR | 4,15% | PKO BP, produkt DOR |
| TOS | 4,40% (cały okres) | PKO BP, produkt TOS |
| COI | 4,75% | PKO BP, produkt COI |
| ROS | 5,00% | PKO BP, produkt ROS |
| EDO | 5,35% | PKO BP, produkt EDO |
| ROD | 5,60% | PKO BP, produkt ROD |

### Stawki opłat i marże

| Instrument | Marża | Opłata (zł/szt.) | Zamiana (zł) |
|---|---|---|---|
| ROR | +0,00% | 0,50 | 99,90 |
| DOR | +0,15% | 0,70 | 99,90 |
| TOS | — (stała) | 1,00 | 99,90 |
| COI | +1,50% | 2,00 | 99,90 |
| ROS | +2,00% | 2,00 | 100,00 |
| EDO | +2,00% | 3,00 | 99,90 |
| ROD | +2,50% | 3,00 | 100,00 |

### Inne założenia

| Parametr | Wartość |
|---|---|
| Wartość nominalna obligacji | 100 zł/szt. |
| Podatek Belki | 19% |
| Horyzont symulacji | 12 lat (144 miesiące) |
| Stopa specjalna ROR: zakres | tylko miesiąc 1 każdego 12-miesięcznego okresu |
| Stopa specjalna DOR: zakres | tylko miesiąc 1 każdego 24-miesięcznego okresu |
| Stopa specjalna COI/EDO/ROS/ROD: zakres | rok 1 każdego okresu (miesiące 1–12) |

---

## 12. Przypadki niezweryfikowane

Poniższe scenariusze **nie zostały** objęte automatycznym testem porównawczym
z arkuszem i mogą zawierać nieznane odchylenia:

1. **Rok 12 (miesiąc 144)** — tabela roczna w arkuszu kończy się na roku 11 (wiersz 19);
   rok 12 nie ma referencyjnej wartości do porównania.

2. **Scenariusz z różnymi stopami w każdym roku** — testy pokrywają tylko Scenariusz I
   (stałe parametry). Tryb "chcę sam ustawić każdy rok" (`WPISZ ZAŁOŻENIA!B13:B24`)
   nie był weryfikowany.

3. **Liczba obligacji inna niż 1000** — testy uruchamiane wyłącznie dla `bondCount=1000`.
   Wpływ zaokrągleń `floor()` przy innych liczbach obligacji nie jest sprawdzony.

4. **Stawka podatku inna niż 19%** — brak testu dla wartości niestandardowych
   (np. IKE = 0%).

5. **Zakładka IKE** — arkusz zawiera trzeci arkusz z kalkulatorem IKE
   (koszty zarządzania 0,10–0,16%). Nie jest zaimplementowany ani zweryfikowany.

6. **ROD po roku 12 (drugi cykl)** — ROD ma termin 144 miesięcy, więc pierwsze rolowanie
   wypada dokładnie na granicy horyzontu symulacji. Zachowanie po rolowaniu ROD
   nie jest sprawdzone.

7. **Inflacja ujemna lub zerowa** — nie testowano zachowania dla `inflation ≤ 0`.
   Stopy COI/EDO/ROS/ROD roku 2+ mogą spaść poniżej zera jeśli inflacja < marża.

8. **Stopa NBP wyższa niż w Scenariuszu I** — test obejmuje NBP=3,75%.
   Przy wyższych stopach NBP może wystąpić sytuacja, że stopa DOR (miesiąc 1) 4,15%
   jest niższa niż NBP+0,15%, co nie jest obsługiwane jako przypadek brzegowy.

---

*Wygenerowano: 2026-05-24. Arkusz referencyjny: maj 2026.*

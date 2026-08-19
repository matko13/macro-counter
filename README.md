# Makro — licznik kalorii i makro

Prosty licznik kalorii, białka, węglowodanów i tłuszczu. Zbudowany wokół jednej
zasady: **jak najmniej wpisywania**. Codzienne logowanie jedzenia ma być
tapaniem, nie wypełnianiem formularza.

Jeden plik — `index.html`. Bez buildu, bez zależności, bez backendu.
Otwórz go w przeglądarce (także z dysku, `file://`) i działa. Postawiony na
hostingu dokłada instalację na ekranie głównym i pracę offline — patrz
„Publikacja online".

## Jak to unika wpisywania

| Zamiast wpisywać | Robisz to |
| --- | --- |
| cały złożony posiłek | **opisujesz go zdaniem** — patrz niżej |
| nazwę i wartości produktu | ~370 gotowych produktów z polskiej kuchni w bazie |
| gramaturę | każdy produkt ma domyślną porcję — tapnięcie w `+ 1 szt` / `+ 150 g` i gotowe |
| ciągle to samo śniadanie | sekcja **Twoje najczęstsze** sama wypycha na wierzch to, co jesz realnie |
| cały posiłek po kawałku | **zestawy** — raz zapisany posiłek dodajesz jednym tapnięciem |
| wczorajszy dzień od nowa | **Powtórz wczoraj** kopiuje cały dzień |
| swój cel kaloryczny | kalkulator (Mifflin-St Jeor) — same plusy/minusy, żadnej klawiatury |
| przypisanie do posiłku | posiłek (śniadanie / obiad / kolacja / przekąska) zgaduje się z godziny |
| korektę pomyłki | każde dodanie i usunięcie ma **Cofnij** |

Klawiatura jest potrzebna dokładnie w dwóch miejscach: szukanie produktu
(z pominięciem polskich znaków — `zolty` znajduje `Ser żółty`) i jednorazowe
dodanie własnego produktu z etykiety.

## Opis posiłku zdaniem

Dla dania złożonego z kilku rzeczy szybciej jest je opisać, niż wyklikać.
Wpisujesz na przykład:

> na śniadanie zrobiłem zapiekankę z 4 jaj, 2 serków wiejskich, garści
> pomidorków koktajlowych, garści pomidorów suszonych i 8 oliwek. Na górze był
> topping z fety. Zjadłem tego połowę

i dostajesz gotową listę do zatwierdzenia — sześć składników z gramaturą,
posiłek ustawiony na śniadanie, część zjedzona ustawiona na ½, a „zapiekanka”
rozpoznana jako nazwa dania, nie jako osobny produkt. Zanim cokolwiek wejdzie
do dziennika, widzisz podgląd i możesz poprawić każdą pozycję.

Co parser rozumie:

- **liczebniki** cyfrą i słowem, razem z odmianą: `4 jaj`, `dwa jajka`,
  `ośmiu oliwek`, `półtora banana`, `1/3 pizzy`
- **jednostki domowe**: garść, łyżka, łyżeczka, szklanka, kromka, plaster,
  puszka, kostka, opakowanie, miarka, talerz — a także `200 g`, `0,5 l`, `2 dag`
- **polską odmianę** przez porównanie wspólnego prefiksu z progiem zależnym od
  długości słowa (`fety` = `feta`, ale `ser` ≠ `sernik`), plus tabelę form
  nieregularnych (`kurczak` → „Pierś z kurczaka", `serków` → „Serek wiejski",
  `kartofle` → „Ziemniaki")
- **dłuższa nazwa wygrywa z krótszą**: `pomidorków koktajlowych` to
  „Pomidorki koktajlowe", nie „Pomidor"
- **ile zjadłeś**: `połowę`, `pół`, `ćwiartkę`, `dwie trzecie`, `3/4`, `całość`
  — z rozróżnieniem na ułamek jako ilość (`pół szklanki mleka`) i jako część
  zjedzonego dania (`zjadłem tego połowę`)
- **posiłek i dzień**: `na śniadanie`, `na obiad`, `wczoraj`, `przedwczoraj`
- **nazwę dania**: produkt przed `z` i listą składników jest tytułem potrawy,
  a nie składnikiem — i od razu jest proponowany jako nazwa zestawu, żeby
  następnym razem wystarczyło jedno tapnięcie

Słowa, których nie rozpoznał, wypisuje pod podglądem („Pominięte słowa:
zrobiłem, topping"), więc widać, czy nie zgubił czegoś jadalnego. Jeśli nie
rozpoznał niczego, mówi to wprost, zamiast zapisać puste zero.

### Przymiotniki, które zmieniają liczby

„Piwo zero" to nie „piwo". Zignorowany przymiotnik daje wynik gorszy niż brak
wyniku: cichą, zawyżoną liczbę, której nikt nie zauważy. Dlatego wyrazy w rodzaju
*zero, light, bezalkoholowe, odtłuszczone, bez cukru, wegański, panierowany,
wędzony, smażony* są traktowane osobno:

- jeśli w bazie jest wariant — trafia w niego (`piwo zero` → Piwo bezalkoholowe,
  `mleko odtłuszczone` → Mleko 0%, `kurczak panierowany` → kotlet panierowany)
- jeśli wariantu nie ma — pozycja dostaje **widoczne ostrzeżenie** w podglądzie
  („nie mam wersji «light» — liczby są dla zwykłej") razem ze skrótem do
  poprawienia wartości; poprawiony produkt zostaje w bazie na stałe
- `bez X` nigdy nie dodaje X jako składnika — `jogurt bez cukru` to jogurt
  z ostrzeżeniem, nie jogurt plus cukier

Wyszukiwanie idzie po nazwach **i aliasach**, słowo po słowie, więc `piwo zero`
zwraca wynik. Gdy naprawdę nic nie pasuje, apka mówi to wprost i proponuje
dodanie szukanej frazy jako własnego produktu — z nazwą już wpisaną.

**To działa lokalnie i deterministycznie** — żadnego modelu językowego ani
zapytań do sieci. Opis posiłku to dana zdrowotna i nigdzie nie wychodzi
z Twojego urządzenia; apka nadal jest jednym plikiem, który zadziała offline.
Ceną jest zamknięty słownik: parser rozpoznaje to, co jest w bazie, plus Twoje
własne produkty. Czego nie zna — pominie i o tym powie.

Baza wbudowana to produkty **ogólne**, bez marek i kodów kreskowych. Szersza,
markowa baza jest możliwa — patrz „Szersza baza produktów" niżej.

## Co jest w środku

- **Odczyt dnia** — ile kcal zostało do celu, listwa z podziałką jak na wadze
  kuchennej, pod nią trzy paski makro z osobnym kolorem dla każdego składnika.
  Przekroczenie celu ma własny kolor i własny segment na pasku.
- **Ostatnie 7 dni** — słupki z linią celu; tapnięcie przeskakuje na ten dzień.
- **Log dnia** — pogrupowany po posiłkach, z makro przy każdej pozycji.
  Tapnięcie pozycji otwiera zmianę gramatury albo usunięcie.
- **Dowolny dzień** — strzałkami wstecz, więc można uzupełnić wczoraj.
- **Jasny i ciemny motyw** — automatycznie z systemu albo ręcznie.

## Publikacja online

Repozytorium jest publiczne, więc GitHub Pages jest darmowe. Publikacja jest
zautomatyzowana — `.github/workflows/pages.yml` po każdym wejściu na `main`
**sam włącza Pages** (`configure-pages` z `enablement: true`) i wystawia stronę,
więc nie trzeba niczego klikać w ustawieniach. Adres to
`https://<użytkownik>.github.io/<repo>/`.

Workflow publikuje wyłącznie pliki apki — bez README i bez katalogu `.github`
— i przerywa z błędem, jeśli któregoś z nich brakuje, zamiast wystawić
niekompletną stronę.

Gdyby automat się nie udał (np. organizacja blokuje włączanie Pages tokenem
workflow), zostaje droga ręczna: **Settings** → **Pages** → Source
*Deploy from a branch* → branch `main`, folder `/ (root)`.

Wszystkie ścieżki w apce są relatywne, więc działa też w podkatalogu, jakim
jest adres Pages. Co dokłada hosting:

- **Instalacja na ekranie głównym** — `manifest.webmanifest` z ikonami, tryb
  `standalone`, więc otwiera się bez paska przeglądarki, jak zwykła apka.
- **Praca offline** — `sw.js` trzyma w cache cały szkielet apki (i fonty
  z Google, pobierane trybem `cors`, bo odpowiedzi opaque nie da się zapisać
  w Cache API). Po pierwszym wejściu apka wstaje bez sieci: log, parser
  i zapisywanie działają normalnie.
- **Możliwość odpytywania bazy na żywo** — to jest ta różnica względem wersji
  opublikowanej jako Artifact: normalny hosting nie ma jej restrykcyjnej
  polityki bezpieczeństwa, więc droga nr 2 z rozdziału „Szersza baza
  produktów" staje się wykonalna.

**Publiczny adres nie publikuje Twojego dziennika.** Publiczny jest kod;
wpisy, cele i własne produkty siedzą w `localStorage` przeglądarki każdej
osoby osobno i nigdzie nie są wysyłane. Kto wejdzie na adres, dostaje pustą
apkę, nie Twoje dane.

Service worker rejestruje się tylko wtedy, gdy strona jest w bezpiecznym
kontekście (`https`, `localhost`, `127.0.0.1`) **i** ma znacznik manifestu —
więc wersja jednoplikowa (Artifact, `file://`) go pomija i nie próbuje ładować
plików, których tam nie ma.

## Dane

Wszystko leży w `localStorage` tej jednej przeglądarki. Nie ma serwera, konta
ani wysyłki gdziekolwiek. Kopia zapasowa to zwykły JSON do skopiowania
(zakładka **Ja → Kopia zapasowa**), tą samą drogą się ją wczytuje.

Konsekwencja: wyczyszczenie danych przeglądarki usuwa historię. Na telefonie
warto dodać stronę do ekranu głównego (Safari: *Udostępnij → Do ekranu
początkowego*; Chrome: *menu → Dodaj do ekranu głównego*) — wtedy wygląda
i działa jak zwykła apka.

## Szersza baza produktów

Wbudowane ~370 pozycji to produkty ogólne. Konkretny jogurt konkretnej marki
dodaje się raz ręcznie i zostaje na stałe. Jeśli to za mało, są dwie drogi —
różnią się nie ilością pracy, a tym, co się przy nich traci:

1. **Paczka offline z Open Food Facts** — otwarta baza produktów spożywczych
   z markami i kodami kreskowymi. Wycinek dla rynku polskiego (kilka–kilkanaście
   tysięcy pozycji z nazwą, marką i wartościami na 100 g) to rzędu 0,4–1,5 MB,
   po kompresji ok. 120–400 KB, więc apka zostaje jednym plikiem działającym
   offline i nadal nic nie wysyła. Koszty: dane są współtworzone przez
   użytkowników, więc jakość jest nierówna, a licencja **ODbL** wymaga podania
   źródła i utrzymania tej samej licencji dla pochodnej bazy.
2. **Zapytanie na żywo, gdy lokalnie nie ma trafienia** — pełne pokrycie
   i zawsze aktualne dane. Koszty: potrzebna sieć w momencie użycia, każde
   zapytanie mówi obcemu serwerowi, co jesz, i **nie zadziała w wersji
   opublikowanej jako Artifact** — jej polityka bezpieczeństwa blokuje
   połączenia do zewnętrznych hostów. Działałoby tylko w kopii uruchamianej
   lokalnie.

## Wartości odżywcze

Baza to typowe wartości dla produktów ogólnych (tabele składu żywności),
zaokrąglone. Do prowadzenia diety w praktyce wystarczą; jeśli liczysz coś
dokładnie, wpisz produkt z etykiety przez **Dodaj → Dodaj własny produkt** —
własne produkty zostają w bazie na stałe.

Kalkulator zapotrzebowania używa wzoru Mifflin-St Jeor razy współczynnik
aktywności, z korektą −20% (redukcja) lub +12% (masa). To punkt wyjścia,
nie zalecenie medyczne.

## Dostępność i jakość

- Paleta makro przechodzi testy odróżnialności przy daltonizmie (protanopia /
  deuteranopia / trytanopia) w obu motywach; kolor nigdy nie jest jedynym
  nośnikiem znaczenia — każdy pasek i słupek ma etykietę tekstową.
- Cele tapania ≥ 38 px, widoczny focus klawiatury, `prefers-reduced-motion`.
- Testy: 62 przypadki przez Playwright — 21 na interfejs (dodawanie, cofanie,
  szukanie bez polskich znaków, arkusz porcji, zestawy, kalkulator, trwałość po
  odświeżeniu, oba motywy, brak poziomego przewijania) i 19 na opis posiłku
  zdaniem (rozpoznanie składników, gramatura, nazwa dania, część zjedzona,
  posiłek i dzień ze zdania, korekta i usuwanie pozycji w podglądzie, zapis
  zestawu, cofnięcie całego posiłku, uczciwy komunikat przy zerowym wyniku).
  Dodatkowe 12 pilnuje bazy i przymiotników: unikalność identyfikatorów, spójność
  aliasów, „piwo zero" i „mleko odtłuszczone" trafiające w wariant, ostrzeżenie
  przy braku wariantu, „bez cukru" nie dodające cukru, brak fałszywych trafień na
  zwykłych słowach („resztki z lodówki"), szukanie po aliasach.
  Kolejne 10 sprawdza wersję hostowaną na prawdziwym serwerze HTTP pod
  podkatalogiem: rejestrację i przejęcie kontroli przez service workera,
  zawartość cache, a potem — po **zgaszeniu serwera** — start apki, trwałość
  danych, działanie parsera i zapisywanie bez sieci, także w nowej karcie.
  Osobny zestaw kontrolny przepuszcza dziesięć realnych zdań przez sam parser.

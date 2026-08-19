# Makro — licznik kalorii i makro

Prosty licznik kalorii, białka, węglowodanów i tłuszczu. Zbudowany wokół jednej
zasady: **jak najmniej wpisywania**. Codzienne logowanie jedzenia ma być
tapaniem, nie wypełnianiem formularza.

Jeden plik — `index.html`. Bez buildu, bez zależności, bez backendu.
Otwórz go w przeglądarce (także z dysku, `file://`) i działa.

## Jak to unika wpisywania

| Zamiast wpisywać | Robisz to |
| --- | --- |
| cały złożony posiłek | **opisujesz go zdaniem** — patrz niżej |
| nazwę i wartości produktu | ~150 gotowych produktów z polskiej kuchni w bazie |
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

**To działa lokalnie i deterministycznie** — żadnego modelu językowego ani
zapytań do sieci. Opis posiłku to dana zdrowotna i nigdzie nie wychodzi
z Twojego urządzenia; apka nadal jest jednym plikiem, który zadziała offline.
Ceną jest zamknięty słownik: parser rozpoznaje to, co jest w bazie, plus Twoje
własne produkty. Czego nie zna — pominie i o tym powie.

## Co jest w środku

- **Odczyt dnia** — ile kcal zostało do celu, listwa z podziałką jak na wadze
  kuchennej, pod nią trzy paski makro z osobnym kolorem dla każdego składnika.
  Przekroczenie celu ma własny kolor i własny segment na pasku.
- **Ostatnie 7 dni** — słupki z linią celu; tapnięcie przeskakuje na ten dzień.
- **Log dnia** — pogrupowany po posiłkach, z makro przy każdej pozycji.
  Tapnięcie pozycji otwiera zmianę gramatury albo usunięcie.
- **Dowolny dzień** — strzałkami wstecz, więc można uzupełnić wczoraj.
- **Jasny i ciemny motyw** — automatycznie z systemu albo ręcznie.

## Dane

Wszystko leży w `localStorage` tej jednej przeglądarki. Nie ma serwera, konta
ani wysyłki gdziekolwiek. Kopia zapasowa to zwykły JSON do skopiowania
(zakładka **Ja → Kopia zapasowa**), tą samą drogą się ją wczytuje.

Konsekwencja: wyczyszczenie danych przeglądarki usuwa historię. Na telefonie
warto dodać stronę do ekranu głównego (Safari: *Udostępnij → Do ekranu
początkowego*; Chrome: *menu → Dodaj do ekranu głównego*) — wtedy wygląda
i działa jak zwykła apka.

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
- Testy: 40 przypadków przez Playwright — 21 na interfejs (dodawanie, cofanie,
  szukanie bez polskich znaków, arkusz porcji, zestawy, kalkulator, trwałość po
  odświeżeniu, oba motywy, brak poziomego przewijania) i 19 na opis posiłku
  zdaniem (rozpoznanie składników, gramatura, nazwa dania, część zjedzona,
  posiłek i dzień ze zdania, korekta i usuwanie pozycji w podglądzie, zapis
  zestawu, cofnięcie całego posiłku, uczciwy komunikat przy zerowym wyniku).
  Osobny zestaw kontrolny przepuszcza dziesięć realnych zdań przez sam parser.

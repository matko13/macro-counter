# Makro — licznik kalorii i makro

Prosty licznik kalorii, białka, węglowodanów i tłuszczu. Zbudowany wokół jednej
zasady: **jak najmniej wpisywania**. Codzienne logowanie jedzenia ma być
tapaniem, nie wypełnianiem formularza.

Jeden plik — `index.html`. Bez buildu, bez zależności, bez backendu.
Otwórz go w przeglądarce (także z dysku, `file://`) i działa.

## Jak to unika wpisywania

| Zamiast wpisywać | Robisz to |
| --- | --- |
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
- Testy: 21 przypadków przez Playwright (dodawanie, cofanie, szukanie bez
  polskich znaków, arkusz porcji, zestawy, kalkulator, trwałość po odświeżeniu,
  oba motywy, brak poziomego przewijania).

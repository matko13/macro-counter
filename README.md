# Makro — licznik kalorii i makro

**https://matko13.github.io/macro-counter/** — działa też offline i da się
dodać do ekranu głównego telefonu.

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
| cały złożony posiłek | **mówisz albo piszesz zdaniem** — patrz niżej |
| nazwę i wartości produktu | 670 gotowych produktów z polskiej kuchni w bazie |
| gramaturę | każdy produkt ma domyślną porcję — tapnięcie w `+ 1 szt` / `+ 150 g` i gotowe. A gdy chcesz dokładnie: liczba w stepperze jest **polem do wpisania**, bo dojechanie plusem do 275 g to kilkadziesiąt tapnięć |
| ciągle to samo śniadanie | na liście produktów to, co jesz realnie, idzie na wierzch — bez osobnej sekcji na ekranie Dziś |
| cały posiłek po kawałku | **zestawy** — raz zapisany posiłek dodajesz jednym tapnięciem, a ołówek pozwala go poprawić: nazwa, gramatura każdego składnika, wyrzucenie i dorzucenie produktu |
| wczorajszy dzień od nowa | **Powtórz wczoraj** kopiuje cały dzień |
| swój cel kaloryczny | kalkulator (Mifflin-St Jeor) — same plusy/minusy, żadnej klawiatury; a po kilku tygodniach cel przelicza się z **Twoich** danych, patrz „Cel z pomiaru" |
| przypisanie do posiłku | posiłek (śniadanie / obiad / kolacja / przekąska) zgaduje się z godziny — a wybrać go można od razu przy dodawaniu albo zmienić później, tapnięciem wpisu |
| korektę pomyłki | każde dodanie i usunięcie ma **Cofnij** |

Klawiatura jest potrzebna dokładnie w dwóch miejscach: szukanie produktu
(z pominięciem polskich znaków — `zolty` znajduje `Ser żółty`) i jednorazowe
dodanie własnego produktu z etykiety. Przy tym drugim wybierasz, **na co
podane są wartości** — na 100 g czy na porcję. Etykiety odżywek, batonów
i saszetek podają je na porcję (miarka 30 g, baton 27 g), więc przepisujesz
liczby wprost, a apka przelicza je na 100 g sama i pokazuje, co zapisze.
Bez tego trzeba było dzielić w głowie, a pomyłka w takim przeliczeniu liczy
się dalej przy każdym kolejnym dodaniu.

Własny produkt da się też **poprawić i usunąć** — ołówek na jego wierszu na
liście (wbudowane produkty go nie mają). Po zmianie wartości apka pyta, co
zrobić z już zapisanymi pozycjami: pokazuje ile ich jest i jaka będzie różnica
w kaloriach, i pozwala je przeliczyć **albo zostawić**. Dziennik jest zapisem
tego, co zjadłeś — cicha przeróbka przeszłości byłaby jej fałszowaniem,
a ciche pominięcie zostawiałoby dzisiejszy posiłek z błędnymi liczbami.
Usunięcie produktu **nie rusza historii**: wpisy w dzienniku i zestawy trzymają
własną kopię wartości, więc znika tylko z listy do dodawania (z Cofnij).

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
  `ośmiu oliwek`, `półtora banana`, `1/3 pizzy`. Liczba **nie przeskakuje na
  inny produkt**: `5 słówek i jabłko` to jedno jabłko, choć „5" stoi obok.
  Rozstrzyga rodzaj słowa, nie odległość — spójnik, czasownik i pora dnia
  kończą temat (`na 5 osób zrobiłem jabłko`, `o 5 rano jabłko`), a przymiotnik
  nie (`2 duże jabłka`, `2 średnie pomidory` to nadal dwie sztuki)
- **jednostki domowe**: garść, łyżka, łyżeczka, szklanka, kromka, plaster,
  puszka, kostka, opakowanie, miarka, talerz — a także `200 g`, `0,5 l`, `2 dag`.
  **Łyżka waży tyle, ile to, co się nią nabiera**: 28 g gęstej sałatki, 18 g
  ugotowanego ryżu, 10 g mąki, 6 g płatków owsianych. Produkty liczone łyżkami
  mają swoją wagę w bazie (oliwa 10 g) i ona wygrywa
- **polską odmianę** przez porównanie wspólnego prefiksu z progiem zależnym od
  długości słowa (`fety` = `feta`, ale `ser` ≠ `sernik`). Osobno dopuszczony jest
  **dopełniacz liczby mnogiej rodzaju żeńskiego**, który zmienia dwie końcowe
  litery: `śliwki → śliwek`, `truskawki → truskawek`, `borówki → borówek`.
  Plus tabelę form nieregularnych (`kurczak` → „Pierś z kurczaka", `serków` → „Serek wiejski",
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

### Dyktowanie

Zamiast pisać, można powiedzieć. Mikrofon jest jednym tapnięciem od ekranu
Dziś: tapiesz, mówisz „na kolację usmażyłem 3 jajka z boczkiem i zjadłem
kromkę chleba", tapiesz stop — i od razu jesteś w podglądzie z gotowymi
pozycjami. Tekst pojawia się na żywo w trakcie mówienia, więc widać, co
zostało usłyszane.

Mowa nie ma przecinków, a parser ich nie potrzebuje: `4 jaj 2 serków
wiejskich i 8 oliwek zjadłem połowę` rozkłada się tak samo jak wersja
z przestankowaniem. Liczby działają zarówno cyfrą, jak i słowem, bo
rozpoznawanie mowy zapisuje je różnie w zależności od przeglądarki.

**Tu jest wyjątek od prywatności całej reszty apki i mówi o tym wprost sam
ekran dyktowania:** rozpoznawanie mowy w przeglądarce (Chrome, Edge) wysyła
nagranie na serwery jej producenta. Wszystko inne — parsowanie, liczenie,
zapis — zostaje na urządzeniu. Jeśli to nie do przyjęcia, wpisywanie ręczne
działa dokładnie tak samo i nic nie wysyła.

Rozpoznawanie mowy zgłasza koniec sesji więcej niż raz — iOS zamyka ją po
każdej frazie, a apka wraca do słuchania — więc koniec dyktowania jest
raportowany **dokładnie raz**, podgląd nie otwiera się, gdy arkusz jest już
zamknięty, a zatwierdzenie wykonuje się raz nawet przy zdublowanym tapnięciu.
Bez tych trzech zamków spóźnione zamknięcie sesji otwierało podgląd drugi raz,
już po zapisaniu posiłku.

Przeglądarki bez rozpoznawania mowy (m.in. Firefox) nie dostają przycisku
mikrofonu, tylko wyjaśnienie, dlaczego go nie ma. Odmowa dostępu do
mikrofonu tłumaczy się po polsku i nie jest zastępowana ogólnikiem. Na iOS
Safari kończy sesję po każdej frazie — dyktowanie samo wraca do słuchania,
dopóki nie tapniesz stop. Strona osadzona w innej (np. podgląd) zwykle nie
ma prawa do mikrofonu; w takim wypadku apka mówi, że zadziała pod własnym
adresem, zamiast sugerować, że to Ty czegoś nie zezwoliłeś.

### Danie a jego składnik

`X z Y` znaczy w polszczyźnie dwie różne rzeczy i pomylenie ich liczy kalorie
podwójnie:

| zdanie | wynik | dlaczego |
| --- | --- | --- |
| `burger z wołowiną` | sam burger | wołowina jest w burgerze, to opis |
| `pizza z pieczarkami` | sama pizza | dodatek jest na pizzy |
| `chleb z masłem` | chleb **i** masło | dwa osobne składniki |
| `zapiekanka z 4 jaj, 2 serków i 8 oliwek` | trzy składniki, „Zapiekanka" jako nazwa | przepis własny |
| `kanapka z 2 kromek chleba i 50 g szynki` | chleb i szynka, „Kanapka" jako nazwa | podane ilości = przepis |

Rozstrzygają trzy rzeczy: czy pierwszy produkt jest **daniem złożonym** (kategoria
„Dania gotowe" — jego kalorie zawierają już wsad), ile rzeczy wymieniono po `z`
i czy podano dla nich **ilości**. Jeden składnik bez ilości albo dwa bez ilości to
opis dania; trzy albo podane gramatury to przepis, który się rozbija.

Pominięty składnik nie znika po cichu — podgląd pisze „nie doliczyłem osobno:
wołowina — to jest już w «Burger»", więc widać decyzję i można ją odwrócić,
podając ilość.

### Wariant produktu, czyli skąd biorą się największe pomyłki

Ta sama nazwa potrafi znaczyć dwie bardzo różne liczby, a różnica jest większa
niż między produktami:

| zdanie | trafia w | zamiast | różnica |
| --- | --- | --- | --- |
| `100 g ryżu białego suchego` | Ryż biały (suchy), 355 kcal | ugotowany, 130 kcal | 2,7× |
| `2 łyżki śmietany 30%` | Śmietana 30% | 18% | +60% |
| `szklanka mleka 3,2%` | Mleko 3,2% | 2% | +20% |
| `150 g piersi z kurczaka z grilla` | wersja z grilla | surowa | +50% |

Rozstrzyga to, co jest w zdaniu, a nie kolejność w bazie:

- **procent tłuszczu** wybiera wariant o najbliższej wartości (`mleko 3,2%`,
  `jogurt grecki 0%`, `śmietana 22%`); gdy takiego procentu nie ma w bazie,
  produkt zostaje bez podmiany, zamiast trafić w losowy wariant
- **wariant z nawiasu** jest normalnym słowem do trafienia — `Ryż biały (suchy)`
  i `Ryż biały (ugotowany)` miały wcześniej tę samą frazę, więc `ryż suchy`
  dawał ugotowany; bez tego liczby były niższe o 225 kcal na 100 g
- **nazwa zaczynająca się słowem funkcyjnym** też się liczy: `sos` i `deser`
  same w sobie są słowami do pominięcia, ale `sos sojowy`, `sos czosnkowy`
  i `deser mleczny` to produkty. Wcześniej `sos sojowy` dawał napój sojowy,
  a `sos czosnkowy` — ząbek czosnku
- **łącznik i obce znaki**: `chleb pszenno-żytni`, `crème brûlée`, `piña colada`
- **słowo, które jest zarazem miarą**: `pomidory z puszki` to produkt,
  `puszka pomidorów` to miara — jedno nie psuje drugiego
- **ta sama nazwa potoczna dla dwóch różnych rzeczy**: samo `kakao` to proszek
  (343 kcal/100 g, liczony z łyżki), a `kakao na mleku` czy `kakao z mlekiem`
  to napój (90 kcal/100 ml). Wcześniej w bazie był tylko napój, a alias „kakao”
  prowadził do niego — więc „2 łyżki kakao” liczyły napój

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
- **przymiotnik nie może sam zostać produktem.** Im większa baza, tym łatwiej
  o produkt, który wygląda jak zwykłe słowo z opisu: `ser wędzony` dokładał
  łososia wędzonego, `marchewka surowa` — surówkę, `kotlet wege` — węgorza,
  a `bez cukru` — bezę. Takie trafienie jest gorsze niż brak trafienia, bo
  dolicza kalorie, których nikt nie zjadł, więc przymiotnik liczy się tylko
  wtedy, gdy naprawdę jest częścią nazwy

Wyszukiwanie idzie po nazwach **i aliasach**, słowo po słowie, więc `piwo zero`
zwraca wynik. Gdy naprawdę nic nie pasuje, apka mówi to wprost i proponuje
dodanie szukanej frazy jako własnego produktu — z nazwą już wpisaną.

**To działa lokalnie i deterministycznie** — żadnego modelu językowego ani
zapytań do sieci. Opis posiłku to dana zdrowotna i nigdzie nie wychodzi
z Twojego urządzenia; apka nadal jest jednym plikiem, który zadziała offline.
Ceną jest zamknięty słownik: parser rozpoznaje to, co jest w bazie, plus Twoje
własne produkty. Czego nie zna — pominie i o tym powie.

Porcje domyślne dla owoców na sztuki to **waga części jadalnej**, nie całego
owocu z ogryzkiem czy skórką: jabłko 150 g (78 kcal), gruszka 150 g, pomarańcza
130 g. Tabele amerykańskie liczą „średnie jabłko" jako 182 g z gniazdem
nasiennym, co dawało 94 kcal i wyglądało absurdalnie wysoko przy znajomym
„jabłko ≈ 50 kcal na 100 g" — sama wartość na 100 g była poprawna, przesadzona
była porcja.

Baza wbudowana to w zasadzie produkty **ogólne**, bez marek i kodów kreskowych.
Wyjątki są dwa, oba wpisane wprost z etykiety, bo są jadane na tyle regularnie,
że warto je mieć pod ręką bez dodawania za każdym razem:

- **Twaróg ze Strzałkowa półtłusty** — ma też wagę kostki (250 g), więc „kostka
  twarogu" liczy się poprawnie
- **Kiszka ziemniaczana Gzella** — marka siedzi w nazwie, ale to jedyna kiszka
  ziemniaczana w bazie, więc samo „kiszka ziemniaczana" na nią trafia. Nie
  przejmuje przy tym „kiszki pasztetowej", która jest zupełnie innym produktem
- **Mleko proteinowe Łaciate** — jedyne mleko wysokobiałkowe w bazie, więc
  „mleko proteinowe" i „mleko wysokobiałkowe" na nie trafiają. Samo „mleko"
  zostaje przy Mleku 2%, a „mleko odtłuszczone" przy Mleku 0%

Osobny przypadek to **sushi**. Pięć rodzajów sztuk (nigiri opalane, futomaki
pieczone, futomaki philadelphia, california w tempurze, hosomaki w panko) jest
nazwane ogólnie, bo tak nazywa je każda sushiarnia — policzą więc dowolne
zamówienie, sztuka po sztuce. Do tego jeden wpis na cały 30-sztukowy zestaw,
oszacowany ze składu konkretnego zamówienia. Test pilnuje, żeby zestaw zgadzał
się z sumą swoich sztuk, bo inaczej te same 30 kawałków dałyby dwa różne wyniki
zależnie od tego, jak je wpiszesz.

Sushi je się na kawałki, nie na porcje, a „kawałek" i „kawałki" są na liście
słów pomijanych — więc „30 kawałków sushi" znaczyło dla apki „30 **porcji**
sushi", czyli 6 kg i 8700 kcal. Rodzajowe sushi ma dziś wagę kawałka (40 g)
i wychodzi 1,2 kg. Zestaw takiej wagi mieć nie może: dostaje ją każde liczenie,
także „pół zestawu", które spadało wtedy z 610 g na 21 g.

Wartości sushi są **szacunkiem, nie etykietą** — restauracje nie podają makro.
Liczone od dołu: każdy rodzaj sztuki rozbity na składniki o znanej gęstości
kalorycznej (ryż z octem, łosoś, philadelphia, panko, wchłonięty olej), więc
da się podważyć pojedyncze założenie zamiast całej liczby.

Szersza, markowa baza jest możliwa — patrz „Szersza baza produktów" niżej.

## Co jest w środku

- **Odczyt dnia** — ile kcal zostało do celu jedną wielką liczbą, pod nią
  pasek postępu dnia i trzy paski makro, każdy z własnym kolorem.
  Przekroczenie celu ma własny kolor.
- **Ostatnie 7 dni** — słupki z linią celu; tapnięcie przeskakuje na ten dzień.
- **Log dnia** — pogrupowany po posiłkach, z makro przy każdej pozycji.
  Tapnięcie pozycji otwiera zmianę gramatury, **przeniesienie do innego
  posiłku** albo usunięcie. Zgadywanie z godziny jest tylko domysłem —
  kanapka zjedzona o 15:00 nadal może być śniadaniem, więc raz wpisana
  pozycja nie zostaje uwięziona w porze dnia, w której ją zapisano.
- **Dowolny dzień** — strzałkami wstecz, więc można uzupełnić wczoraj.
- **Jasny i ciemny motyw** — automatycznie z systemu albo ręcznie.

## Wygląd

Zasada jest jedna: **interfejs jest monochromatyczny, kolor należy wyłącznie do
danych.** Nagłówki, zakładki, przyciski i karty są w skali szarości, a zieleń,
ochra i fiolet występują tylko tam, gdzie znaczą białko, węglowodany i tłuszcz.
Dzięki temu kolor cokolwiek mówi: jeśli coś świeci, to jest liczba, nie ozdoba.

Reszta wynika z tego samego:

- **hierarchia rozmiarem, nie ozdobami** — najważniejsza liczba dnia jest wielka
  i czarna, wszystko inne wyraźnie mniejsze i szare
- **krój systemowy** (SF Pro na iOS, Roboto na Androidzie) — apka wygląda jak
  część telefonu, a nie jak strona, i nie ściąga niczego z sieci
- **jedna rodzina zaokrągleń i jeden cień**; żadnych gradientów, obwódek na
  wszystkim ani ikon-emoji
- **cele tapania ≥ 48 px** i zakładki na dole, w zasięgu kciuka
- **oba motywy pełnoprawne** — ciemny nie jest przyciemnionym jasnym: ma własne
  wartości kolorów danych, sprawdzone pod kątem daltonizmu tak samo jak jasny

## Na oko — kiedy nie ma czego zważyć

Na imprezie stoi miska z sałatką i nabierasz z niej dwie czy trzy łyżki. Nie ma
wagi, nie ma etykiety, nie wiesz nawet, ile gospodarz dał majonezu.

Dania (kategoria „Dania gotowe", liczone w porcjach) mają w arkuszu rząd
**„Na oko"**: `łyżka · 2 łyżki · 3 łyżki · talerzyk`. Gramy i kalorie widać od
razu nad nim, a gdy chcesz dokładniej — pole gramatury jest obok. Dla sałatki
jarzynowej „3 łyżki" to 84 g i 151 kcal.

Warto przy tym wiedzieć, gdzie naprawdę jest błąd: **nie w porcji, a
w przepisie**. Sałatka jarzynowa waha się od ~120 do ~250 kcal na 100 g
w zależności od proporcji majonezu do warzyw — to ±50% na samym produkcie,
więcej niż cała niepewność co do liczby łyżek. Mierzenie łyżek co do grama jest
tam fałszywą precyzją; lepiej wziąć wyższą ze swoich ocen i pozwolić, żeby
**bank tygodnia** rozłożył jeden wieczór na siedem dni.

## Język interfejsu

Ekran podaje liczbę i tyle. Nie tłumaczy, dlaczego liczy tak, a nie inaczej —
uzasadnienia są w tym pliku i w komentarzach w kodzie, bo tam ktoś ich szuka.
Trzy zasady, których się trzymam:

- **żadnej pierwszej osoby.** Apka nie mówi „Rozpoznałem" ani „Znalazłem Twoje
  dane". Mówi „Sprawdź i dodaj" i „Kopia Twoich danych"
- **brak akapitu bije krótki akapit.** Jeśli przyciski i tak mówią, co się
  stanie, notka nad nimi jest szumem
- **zostają tylko te zdania, które zapobiegają pomyłce**: ostrzeżenie przed
  nieodwracalnym usunięciem, informacja co wychodzi z telefonu przy zgłoszeniu,
  i instrukcja odzyskania danych na iOS

Tekstu widocznego na ekranie jest **1922 znaki w 135 napisach** (było 4469
w 187). Zdań dłuższych niż 45 znaków zostało osiem, każde z powyższych powodów.

## Zgłaszanie problemów

**Ja → Zgłoś problem**. Apka nie ma serwera, więc nie wyśle zgłoszenia sama —
ale zbiera to, czego przy zgłoszeniu zwykle brakuje: wersję wdrożenia,
przeglądarkę, czy działa z ekranu początkowego, czy `localStorage` w ogóle
odpowiada, i treść ostatnich pięciu błędów. Potem albo jedno tapnięcie
w gotowe Issue na GitHubie, albo skopiowanie tekstu — dla kogoś bez konta.

Błędy łapią się same (`error` i `unhandledrejection`) do osobnego klucza
`makro.err`, nigdy do danych. Lista jest ograniczona do pięciu wpisów
i przeżywa przeładowanie, bo awaria zwykle kończy się właśnie odświeżeniem.

Raport **nie zawiera niczego o jedzeniu**: ani nazw produktów, ani wag, ani
celów. Tylko liczniki — ile dni w dzienniku, ile własnych produktów, czy profil
jest ustawiony — bo „pusto po aktualizacji" wygląda inaczej przy zerze niż przy
stu dniach. Treść jest pokazana w całości przed wysłaniem i można ją edytować.
Test wprost sprawdza, że nic nie wycieka.

### Czytanie zgłoszeń na starcie sesji

`.claude/hooks/session-start.sh` odpytuje Issues i wypisuje otwarte zgłoszenia,
a hook `SessionStart` wkłada ten tekst do kontekstu modelu. Efekt: nie trzeba
niczego przeklejać ani nawet pamiętać o pytaniu.

Hooki Claude Code odpalają się na zdarzeniach Claude Code, **nie GitHuba** —
nie da się więc uruchomić hooka „w chwili zgłoszenia". Sesja musi się zacząć.
Kto chce reakcji bez startowania sesji, potrzebuje Routine (zaplanowanego
zadania) albo workflow na `issues: [opened]`.

Repo jest publiczne, więc hook działa **bez tokenu** (`GH_TOKEN` tylko podnosi
limit zapytań). Nigdy nie przerywa startu sesji: brak sieci, limit API czy
padnięty GitHub kończą się jedną linijką wyjaśnienia i kodem 0. Sprawdzone na
404, na nieistniejącym hoście i na zepsutym tokenie.

Treść zgłoszeń jest oznaczona w wyjściu jako **dane, nie polecenia** — pisze je
ktokolwiek z internetu, a trafia to prosto do kontekstu modelu.

## Dni bez alkoholu

Pojawia się sam, gdy w historii jest jakikolwiek alkohol — kto go nigdy nie
zapisał, nie ogląda licznika. Piwo bezalkoholowe alkoholem nie jest i licznika
nie zeruje.

Zwykły „streak" po pierwszej wpadce kasuje się do zera i udaje, że poprzednich
czterdziestu dni nie było. To nieprawda i zniechęca, więc liczby są trzy:

- **dni od ostatniego razu** — ta motywuje i owszem, startuje od nowa
- **czyste dni z ostatnich trzydziestu** — tej jedna wpadka nie kasuje, zmienia
  ją o jeden i tyle jest warta. Dzień bez zapisu nie liczy się jako czysty,
  tak samo jak przy liczeniu zapotrzebowania z wagi
- **kalorie, których nie wypiłeś** — liczone z **Twojego własnego spożycia
  sprzed rzucenia** (średnia z 30 dni przed ostatnim kieliszkiem), nie z żadnej
  średniej krajowej, i przeliczone na kilogramy tłuszczu

Do tego pasek trzydziestu kropek: jedna to jeden dzień, pełna — czysty,
obwódka — z alkoholem, blada — bez zapisu. Widać wzorzec, a nie tylko liczbę.
Przy wpadce apka podaje sam fakt i datę, bez komentarza.

## Bank tygodnia

Dzień to zły horyzont — nikt nie je równo. Zjadłeś 600 kcal pod celem w środę,
w sobotę jest kolacja; fizjologicznie liczy się **deficyt tygodniowy**. Dlatego
w karcie odczytu jest jedna linijka: *„Ten tydzień: +1250 kcal zapasu z 5
zamkniętych dni"*, a tapnięcie rozpisuje tydzień dzień po dniu i mówi, po ile
wychodzi na dzień, jeśli chcesz rozłożyć zapas równo.

Dwie zasady, bez których byłaby to liczba wzięta z powietrza:

- **liczą się tylko dni już zamknięte** — dzisiejszy jest w toku i wielka liczba
  wyżej i tak go pokazuje
- **dzień bez zapisu jest pomijany, nie liczony jako pełny zapas.** Dzień,
  którego nie zapisałeś, to nie dzień, w którym nie jadłeś — ta sama zasada,
  co przy liczeniu zapotrzebowania z wagi. Arkusz wypisuje, ile dni pominął

W poniedziałek bank się nie pokazuje, bo nie ma jeszcze czego bilansować.

## Czym domknąć dzień

Wieczorem zostaje budżet i luka w białku. Apka ma 655 produktów i zna obie te
liczby, więc **liczy to zamiast kazać zgadywać**: pokazuje kilka produktów
z konkretną gramaturą („Twaróg chudy 200 g · B 40 g · 198 kcal"), a tapnięcie
otwiera arkusz porcji z już wpisaną ilością.

Samo „białko na kalorię" to zły ranking — wygrywa nim kolagen i pół kilo
krewetek. Podpowiedź ma być **jedzeniem**, więc liczy się też, czy porcja jest
normalna (nie więcej niż dwie domyślne), czy produkt bywa posiłkiem, i czy Ty go
w ogóle jadasz — pozycje z Twojej historii idą wyżej. Jedna propozycja na
kategorię, żeby nie wychodziło pięć rodzajów twarogu.

Karta pojawia się po **dwóch posiłkach za sobą** (co najmniej trzy pozycje,
zjedzone 30% budżetu) i gdy brakuje co najmniej 15 g białka. Nie po godzinie,
bo dawny dzień też da się oglądać. Po obiedzie planowanie reszty dnia ma sens,
po samym śniadaniu jeszcze nie — a rano cały dzień jest „luką" i taka lista
byłaby szumem.

## Cel z pomiaru, nie ze wzoru

Mifflin-St Jeor opisuje statystycznego człowieka o Twoich wymiarach, a mnożnik
aktywności (1,2 … 1,9) i tak zgadujesz sam — i to jest największa niepewność
w całym rachunku: między „siedzącą" a „średnią" jest ~630 kcal dziennie.

To można zmierzyć, zamiast zgadywać. Apka zna Twoje spożycie, więc wystarczy
wiedzieć, co się z Tobą przy nim dzieje:

```
zapotrzebowanie = średnie spożycie − (zmiana wagi × 7700 kcal/kg)
```

7700 kcal/kg to przyjęta wartość energetyczna tkanki tłuszczowej. Wpisujesz
wagę (stepper startuje od ostatniego pomiaru — waga zmienia się o grosze na
dobę, więc to kilka tapnięć, nie wpisywanie), a po ~3 tygodniach karta
**Ja → „Cel z Twoich danych"** pokazuje, ile realnie spalasz, i pozwala ustawić
to jako cel jednym tapnięciem.

Trzy rzeczy, na które trzeba tu uważać, i co apka z nimi robi:

- **dzienna waga skacze o 1–2 kg** od wody, glikogenu i zawartości jelit.
  Tempo bierze się więc z **regresji liniowej po wszystkich pomiarach**
  z okna 28 dni, a nie z odjęcia dwóch liczb; na ekranie Dziś widać *trend*,
  nie tylko goły pomiar
- **niezapisane dni psują wynik mocniej niż waga** — średnia z połowy dni to
  nie średnie spożycie, a wynik wychodzi wtedy zaniżony. Apka **odmawia**
  policzenia, dopóki nie ma zapisu z ≥70% dni okna, i mówi, ilu jeszcze
  brakuje. Dni pominięte wypisuje przy wyniku
- **za mało danych to za mało danych**: minimum 3 pomiary wagi rozłożone na
  ≥14 dni. Zamiast liczby dostajesz wtedy informację, czego brakuje

Waga z ostatniego pomiaru podstawia się też do kalkulatora, żeby wzór nie
liczył z liczby wpisanej ręcznie kiedyś dawno.

## Publikacja online

Wdrażanie jest zautomatyzowane: `.github/workflows/pages.yml` po każdym wejściu
na `main` pakuje stronę i publikuje ją. Ale **samo włączenie Pages trzeba zrobić
raz ręcznie** — token workflow tego nie potrafi i dostaje
`Create Pages site failed: Resource not accessible by integration`, bo
utworzenie strony wymaga uprawnienia `administration`, którego domyślny
`GITHUB_TOKEN` nie ma.

Jednorazowo:

1. Repozytorium musi być **publiczne** — Pages dla prywatnych wymagają planu
   płatnego (Settings → General → Change visibility)
2. **Settings** → **Pages** → *Build and deployment* → Source: **GitHub Actions**
3. Uruchom workflow ponownie (Actions → *Publikuj na GitHub Pages* → *Run workflow*)
   albo wypchnij cokolwiek na `main`

Od tej pory każde wejście na `main` publikuje się samo. Apka działa pod
**https://matko13.github.io/macro-counter/**.

Dopóki Pages są wyłączone, workflow **nie udaje, że wdrożył** i nie świeci się
czerwono bez powodu: sprawdza `GET /repos/{repo}/pages`, a gdy dostanie 404,
kończy zielono z ostrzeżeniem i instrukcją w podsumowaniu runu. Publikuje
wyłącznie pliki apki — bez README i bez katalogu `.github` — i przerywa
z błędem, jeśli któregoś brakuje, zamiast wystawić stronę bez service workera
albo bez ikon.

Wszystkie ścieżki w apce są relatywne, więc działa też w podkatalogu, jakim
jest adres Pages. Co dokłada hosting:

- **Instalacja na ekranie głównym** — `manifest.webmanifest` z ikonami, tryb
  `standalone`, więc otwiera się bez paska przeglądarki, jak zwykła apka.
- **Praca offline** — `sw.js` trzyma w cache cały szkielet apki. Apka nie
  ściąga niczego z zewnątrz: krój pisma jest systemowy, więc nie ma zapytań do
  Google Fonts ani żadnego innego hosta. Po pierwszym wejściu wstaje bez sieci:
  log, parser i zapisywanie działają normalnie.
- **Aktualizacje bez zgadywania** — nowa wersja nie podmienia się pod ręką.
  Gdy jest gotowa, u dołu pojawia się pasek „Jest nowsza wersja apki" z
  przyciskiem, a nowy kod wchodzi dopiero po tapnięciu. Warunkiem wykrycia
  jest zmiana `sw.js` między wdrożeniami, więc workflow wbija w niego skrót
  commita w miejsce `__BUILD__` i przerywa, gdy podmiana się nie udała.
  Zainstalowana apka sprawdza wdrożenia przy każdym powrocie na ekran.
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

### Ikonka na iOS ma osobną pamięć niż Safari

To nie jest drobiazg, bo wygląda dokładnie jak utrata danych: dodajesz apkę do
ekranu głównego, otwierasz ikonkę i dzień jest pusty. Na iOS apka uruchomiona
z ekranu głównego dostaje **własny worek danych** — localStorage, ciasteczka
i service worker nie są wspólne z Safari. Wpisy nie zginęły, tylko zostały
w przeglądarce.

Apka radzi z tym sobie sama, na ile platforma pozwala:

- przy każdym zapisie odkłada migawkę stanu do **Cache Storage** — to jedyna
  pamięć, którą Safari i apka z ekranu głównego na iOS mają wspólną
- gdy wstaje pusta, a migawka istnieje, **pyta**, czy przenieść dane: pokazuje
  ile jest wpisów i z kiedy jest ostatni zapis. Nigdy nie wczytuje sama —
  po „Wyczyść wszystko” dane mają zostać wyczyszczone (to samo „Wyczyść”
  usuwa więc i migawkę)
- gdy migawki nie ma, a apka działa z ekranu głównego, **tłumaczy sytuację
  i podaje drogę**: w Safari *Ja → Kopia zapasowa → Kopiuj*, tutaj to samo
  miejsce → wklej. Schowak na iOS jest wspólny, więc to działa zawsze.
  Komunikat pokazuje się raz

Sprzątanie po starych wdrożeniach **nie rusza** cache'u z danymi — inaczej
pierwsza aktualizacja zabrałaby migawkę razem ze starym szkieletem apki.
Pilnuje tego test, który to sprawdza na prawdziwym service workerze.

Dodatkowo Safari usuwa dane stron nieodwiedzanych przez 7 dni; apki dodane do
ekranu głównego są z tego wyjęte, więc ikonka jest bezpieczniejszym miejscem
na historię niż zakładka.

## Szersza baza produktów

Wbudowane 670 pozycji to produkty ogólne. Konkretny jogurt konkretnej marki
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
- Cele tapania ≥ 44 px (minimum z wytycznych Apple, pilnowane testem), widoczny focus klawiatury, `prefers-reduced-motion`.
- Testy: **516 przypadków** przez Playwright (headless Chromium, część na
  emulowanym iPhone 13), w dwudziestu zestawach. Całość leży w `test/`
  i uruchamia się jednym poleceniem:

  ```
  ./test/run.sh              # wszystko
  ./test/run.sh db wariant   # wybrane zestawy
  ```

  Dziewięć zestawów działa na `file://` i nie potrzebuje niczego poza
  Playwrightem. Dwa ostatnie sprawdzają **prawdziwego service workera**, więc
  skrypt stawia im lokalne serwery i buduje atrapy dwóch wdrożeń (A i B), żeby
  dało się przejść aktualizację od początku do końca. Zajęty port przerywa
  przebieg z błędem, zamiast po cichu testować cudze pliki — na tym raz
  przejechałem, wynik wyglądał wtedy na porażkę apki, a była to porażka
  atrapy.


  | zestaw | ile | co pilnuje |
  | --- | --- | --- |
  | interfejs | 21 | dodawanie, cofanie, szukanie bez polskich znaków, arkusz porcji, zestawy, kalkulator, trwałość po odświeżeniu, oba motywy, brak poziomego przewijania |
  | opis posiłku zdaniem | 47 | rozpoznanie składników, gramatura, nazwa dania, część zjedzona, posiłek i dzień ze zdania, korekta i usuwanie pozycji, zapis zestawu, cofnięcie całego posiłku, uczciwy komunikat przy zerowym wyniku, oraz trzynaście przypadków na to, żeby liczba nie przeskakiwała na inny produkt — pięć zdań, w których musi zniknąć, i osiem, w których musi zostać. Do tego dopełniacz liczby mnogiej (`śliwek`, `truskawek`, `borówek`, `porzeczek`) i druga strona tej samej reguły: dwadzieścia jedno zwykłe słowo, które **nie** może udawać jedzenia — bo poluzowanie odmiany wpuszczało `pralka`→praliny, a `3 serie` na siłowni trafiały w `ser` |
  | przymiotniki i aliasy | 18 | „piwo zero" i „mleko odtłuszczone" trafiające w wariant, ostrzeżenie przy braku wariantu, „bez cukru" bez cukru, brak fałszywych trafień na zwykłych słowach, oraz przypadki, w których przymiotnik nie może sam zostać produktem (`ser wędzony`, `marchewka surowa`, `solone orzeszki`) |
  | warianty produktu | 28 | procent tłuszczu, warianty z nawiasu (suchy / ugotowany, grill / surowy), nazwy zaczynające się słowem pomijanym (`sos sojowy`), łącznik, obce znaki diakrytyczne, słowo będące zarazem miarą, całe zdanie z trzema wariantami naraz. Do tego waga łyżki zależna od tego, co się nabiera (sałatka 28 g, ugotowany ryż 18 g, płatki 6 g, oliwa po swojemu), łyżeczka jako trzecia część łyżki, oraz rząd „Na oko" dla dań — z pilnowaniem, że żadna etykieta nie jest ucięta |
  | spójność bazy | 99 | 670 produktów: unikalne identyfikatory i nazwy, znane kategorie i jednostki, porcje > 0, brak liczb ujemnych, **kcal zgodne z makro w regule 4/4/9**, alkohol liczony z 7 kcal/g, porcja poniżej 1100 kcal, owoce jako część jadalna, aliasy wskazujące na istniejące produkty i — najważniejsze — **każdy produkt osiągalny własną nazwą** |
  | dyktowanie | 18 | język i tryb nasłuchu, tekst częściowy na żywo, przejście do podglądu po stopie, zdanie bez przecinków, odmowa mikrofonu po polsku i bez pętli ponowień, samoczynny koniec frazy (iOS), wygaszenie mikrofonu przy zamknięciu arkusza, przeglądarka bez rozpoznawania mowy |
  | danie a składnik | 11 | burger z wołowiną kontra chleb z masłem kontra przepis z ilościami, nazwy pięciowyrazowe, porcje jadalne owoców |
  | dotyk i geometria | 18 | żadna reguła `:hover` poza `@media (hover:hover)` (na iOS pierwsze tapnięcie na takim elemencie tylko „najeżdża", a klika dopiero drugie), pojedyncze tapnięcie zatwierdza posiłek i dodaje produkt, **każdy element dotykowy ma ≥44 px** na wszystkich ekranach, oraz szerokość toastu: pełna szerokość treści zamiast połowy ekranu, równe marginesy, najwyżej dwie linijki tekstu i nieściśnięty „Cofnij". Do tego **rozmiary wszystkich ikon na każdym ekranie** — funkcja rysująca ikony nie podaje wymiarów, a bezwymiarowy SVG w gridzie rozciąga się na całe pole, a we fleksie zapada do zera i po prostu znika |
  | podgląd bez dubli | 8 | spóźnione zamknięcie sesji mowy po zatwierdzeniu, zamknięcie arkusza w trakcie dyktowania, podwójne kliknięcie w „Dodaj" |
  | zgłaszanie problemów | 23 | treść raportu, wyłapywanie prawdziwych wyjątków i ich przetrwanie przeładowania, ograniczenie listy błędów, nietykalność dziennika, oba przyciski (GitHub i schowek) tej samej szerokości i z odstępem, oraz — najważniejsze — że **raport nie zawiera niczego o jedzeniu, wadze ani celach** |
  | dni bez alkoholu | 19 | liczenie dni od ostatniego razu i czystych dni w oknie, piwo bezalkoholowe nieprzerywające licznika, dzień bez zapisu nieliczony jako czysty, kalorie liczone z własnego spożycia sprzed rzucenia, brak licznika u kogoś, kto alkoholu nigdy nie zapisał, oraz to, że **wpadka nie kasuje dorobku** — licznik dni startuje od nowa, ale czyste dni zmieniają się o jeden |
  | tydzień i domykanie dnia | 28 | arytmetyka banku (suma odstępstw, dni zamknięte bez dzisiejszego, bank ujemny), **dzień bez zapisu pomijany a nie liczony jako zapas**, ukrycie banku w poniedziałek, rozpisanie tygodnia na siedem dni, oraz podpowiedzi domykające: budżet i luka białka, żadna nie przekracza budżetu, porcje realne, bez powtórzonych kategorii, historia podnosząca pozycje wyżej, trzy przypadki kiedy NIE podpowiadać, i odmiana jednostek. Zegar jest przypięty do znanej środy — zestaw zależny od dnia tygodnia sprawdzałby co innego każdego dnia |
  | wpisywanie liczb | 22 | gramatura wpisywana z klawiatury we wszystkich pięciu miejscach ze stepperem, **znak po znaku** (nie ustawieniem wartości na raz — to jedyny sposób, żeby złapać utratę fokusu), plus liczy dalej od wpisanej wartości, granice i śmieciowy tekst, przecinek w wadze, oraz wyłączony double-tap zoom na każdej kontrolce przy zachowanym zsuwaniu palcami |
  | edycja zestawu | 25 | nazwa, gramatura składnika z przeliczeniem kcal, wyrzucenie i dorzucenie produktu przez szukanie, „Anuluj" naprawdę nic nie zmieniające (praca na kopii), odmowa zapisu pustego zestawu i bez nazwy, poprawiona wersja wpadająca do dnia, oraz składnik po usuniętym produkcie skalowany proporcjonalnie zamiast blokować edycję |
  | własny produkt | 38 | wartości z etykiety podane na porcję przeliczone na 100 g (miarka 30 g i baton 27 g wracają w odczycie zgodne z etykietą), podgląd tego, co wyląduje w bazie, wyczyszczone domyślne 100 g przy przejściu na tryb porcji (inaczej ciche przeliczenie 1:1), odmowa zapisu bez wagi porcji i bez nazwy, oraz tryb „na 100 g" działający bez zmian. Do tego poprawianie i usuwanie: ołówek tylko przy własnych produktach, pytanie o przeliczenie zapisanych pozycji z liczbą i różnicą kalorii, „zostaw jak było" nieruszające dziennika, kolejne dodanie liczone już nową wartością, usunięcie nietykające historii, Cofnij — i **odświeżenie obu cache'ów nazwy** (indeksu fraz i słów wyszukiwarki), bez którego po zmianie nazwy produkt z wyszukiwarki wypadał |
  | waga i cel z pomiaru | 24 | wzór na zapotrzebowanie sprawdzony na czterech scenariuszach co do kilokalorii (spadek, utrzymanie, szybki spadek, przyrost), odporność tempa na szum ±0,9 kg, **odmowa policzenia** przy jednym pomiarze / za krótkim oknie / połowie dni bez zapisu, wiersz wagi na Dziś, karta kalibracji, ustawienie celu z pomiaru wraz z przeliczeniem makro, stepper startujący od ostatniego pomiaru, synchronizacja wagi z kalkulatorem, usuwanie pomiaru i obecność wagi w kopii zapasowej |
  | przenoszenie posiłku | 22 | wybór posiłku w arkuszu wpisu, zaznaczony ten właściwy, przeniesienie zmieniające grupę bez ruszania kalorii i gramatury, zniknięcie pustej grupy, trwałość po przeładowaniu, powrót do pierwotnego posiłku, rozdzielenie dwóch wpisów na dwie grupy z osobnymi sumami, oraz „Usuń" nadal działające w tym samym arkuszu. Do tego wybór posiłku już przy dodawaniu produktu z listy: zaznaczony jest ten zgadnięty z godziny, ale wpis ląduje w wybranym |
  | ratunek danych | 20 | migawka w Cache Storage, propozycja przeniesienia przy pustym starcie (i to, że nic nie wczytuje się samo), „Nie teraz" nieusuwające migawki, „Wyczyść wszystko" usuwające ją naprawdę, wyjaśnienie w trybie z ekranu głównego pokazywane raz, brak zaczepki w zwykłej karcie, oraz uszkodzony zapis odkładany na bok zamiast nadpisania |
  | aktualizacja (prawdziwy SW) | 15 | brak paska przy pierwszej instalacji, pojawienie się po podmianie wdrożenia, brak samoczynnej podmiany kodu, wejście nowej wersji po tapnięciu, przełączenie cache'u, przetrwanie danych, **nietykalność cache'u z migawką** |
  | offline na serwerze HTTP | 10 | rejestracja i przejęcie kontroli przez SW, zawartość cache, a potem — po **zgaszeniu serwera** — start apki, trwałość danych, parser i zapisywanie bez sieci, także w nowej karcie |

  Zestaw „spójność bazy" powstał po tym, jak baza spuchła z 369 do 651 pozycji.
  Okazało się, że samo rozszerzanie bazy psuje parser w sposób, którego nie
  widać po liczbie produktów: nowy „Sos sojowy" był nieosiągalny (bo `sos` to
  słowo pomijane), nowa „Beza" przechwytywała `bez cukru`, a nowy „Węgorz" —
  `wege`. Reguła „każdy produkt musi trafić sam w siebie po nazwie" wyłapała
  30 takich przypadków naraz; teraz jest ich zero.

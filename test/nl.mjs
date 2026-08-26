import { chromium, APP, SHOTS } from './lib.mjs';
const errs=[]; const T=[]; const ok=(n,c)=>T.push((c?'PASS':'FAIL')+'  '+n);
const b = await chromium.launch();
const ctx = await b.newContext({viewport:{width:414,height:1000},deviceScaleFactor:2,locale:'pl-PL'});
const p = await ctx.newPage();
p.on('pageerror',e=>errs.push('pageerror: '+e.message));
await p.goto(APP);
await p.waitForTimeout(400);

const SENT='na śniadanie zrobiłem zapiekankę z 4 jaj, 2 serków wiejskich, garści pomidorków koktajlowych, garści pomidorów suszonych i 8 oliwek. Na górze był topping z fety. Zjadłem tego połowę';

// wejście z ekranu Dziś
await p.locator('.nlcard').first().click();
await p.waitForTimeout(400);
ok('arkusz opisu otwarty', await p.locator('.sheet.on textarea').isVisible());
await p.locator('.sheet textarea').fill(SENT);
await p.locator('.sheet .sheetrow .btn').nth(1).click();   // Rozpoznaj
await p.waitForTimeout(350);

const rows = await p.locator('.nlrow').count();
ok('6 rozpoznanych składników  ['+rows+']', rows === 6);
const names = await p.locator('.nlrow .n b').allInnerTexts();
ok('feta z "toppingu" złapana', names.some(n=>/Feta/.test(n)));
ok('zapiekanka NIE jest składnikiem', !names.some(n=>/Zapiekanka/.test(n)));
ok('danie rozpoznane jako Zapiekanka', /danie: Zapiekanka/.test(await p.locator('.sheet .per').innerText()));

// posiłek ze zdania, nie z godziny
const slotPressed = await p.locator('.sheet .field .seg button[aria-pressed="true"]').first().innerText();
ok('posiłek = Śniadanie ze zdania  ['+slotPressed+']', slotPressed === 'Śniadanie');

// "zjadłem połowę" -> ½ zaznaczone
const parts = p.locator('.sheet .field').nth(1).locator('button');
const pressedPart = await p.locator('.sheet .field').nth(1).locator('button[aria-pressed="true"]').innerText();
ok('zjedzona część = ½  ['+pressedPart+']', pressedPart === '½');

const totalHalf = parseInt((await p.locator('.nltot .v').innerText()).replace(/\D/g,''),10);
const fullTxt = await p.locator('.nltot .u').innerText();
const full = parseInt(fullTxt.replace(/\D/g,''),10);
ok('suma to połowa całości  ['+totalHalf+' z '+full+']', Math.abs(totalHalf*2-full)<=2);

// korekta gramatury w podglądzie
await p.locator('.nlrow .g button').first().click();  // − na jajkach
await p.waitForTimeout(150);
const afterMinus = parseInt((await p.locator('.nltot .v').innerText()).replace(/\D/g,''),10);
ok('stepper zmienia sumę  ['+totalHalf+' -> '+afterMinus+']', afterMinus < totalHalf);

// usunięcie pozycji
await p.locator('.nlrow .rm').last().click();
await p.waitForTimeout(150);
ok('usunięcie składnika  ['+(await p.locator('.nlrow').count())+']', await p.locator('.nlrow').count() === 5);

// zestaw domyślnie włączony bo rozpoznano danie
ok('zestaw zaproponowany', (await p.locator('.sheet .toggle').getAttribute('aria-pressed')) === 'true');
await p.screenshot({path:SHOTS+'/nl-review.png'});

// zapis
await p.locator('.sheet .sheetrow .btn').nth(1).click();
await p.waitForTimeout(400);
ok('5 wpisów w dniu  ['+(await p.locator('.entry').count())+']', await p.locator('.entry').count() === 5);
const head = await p.locator('.grouphead .t').first().innerText();
ok('wpisy pod Śniadaniem  ['+head+']', head.toUpperCase() === 'ŚNIADANIE');
ok('toast z Cofnij', /Cofnij/.test(await p.locator('.toast.on').innerText()));

// zestaw zapisany
await p.locator('.tab').nth(2).click(); await p.waitForTimeout(250);
ok('zestaw „Zapiekanka” na liście', /Zapiekanka/.test(await p.locator('.card h3').first().innerText()));

// cofnięcie usuwa wpisy i zestaw
await p.locator('.tab').first().click(); await p.waitForTimeout(200);
await p.locator('.nlcard').first().click(); await p.waitForTimeout(300);
await p.locator('.sheet textarea').fill('wczoraj na kolację 3 jajka i piwo');
await p.locator('.sheet .sheetrow .btn').nth(1).click(); await p.waitForTimeout(300);
ok('"wczoraj" kieruje na inny dzień', /wczoraj/.test(await p.locator('.sheet .per').innerText()));
await p.locator('.sheet .sheetrow .btn').nth(1).click(); await p.waitForTimeout(350);
ok('przeskok na wczoraj', (await p.locator('.shuttle h2').innerText()) === 'Wczoraj');
await p.locator('.toast.on button').click(); await p.waitForTimeout(250);
ok('Cofnij usuwa cały posiłek  ['+(await p.locator('.entry').count())+']', await p.locator('.entry').count() === 0);

// pusty wynik
await p.locator('.nlcard').first().click(); await p.waitForTimeout(300);
await p.locator('.sheet textarea').fill('jakieś resztki z lodówki');
await p.locator('.sheet .sheetrow .btn').nth(1).click(); await p.waitForTimeout(300);
ok('uczciwy komunikat gdy nic nie rozpoznano', /Nie rozpoznałem/.test(await p.locator('.sheet h3').innerText()));

// ── liczba nie przeskakuje na inny produkt ─────────────────────────────────
/* „Podyktowałem 5 słówek i jabłko, a dodał 5 jabłek”. Liczba żyła przez trzy
   kolejne słowa i łapała pierwszy rozpoznany produkt. Odległość jest tu złym
   kryterium — rozstrzyga rodzaj słowa: spójnik, czasownik i pora dnia kończą
   temat, przymiotnik nie. */
const QTY = t => p.evaluate(x=>window.MAKRO.parse(x).items.map(i=>i.f.n+':'+Math.round(i.g)), t);
const leak = [
  ['5 słówek i jabłko','Jabłko:150'],
  ['powtórzyłem 5 słówek i zjadłem jabłko','Jabłko:150'],
  ['o 5 rano jabłko','Jabłko:150'],
  ['5 minut rozgrzewki i jabłko','Jabłko:150'],
  ['na 5 osób zrobiłem jabłko','Jabłko:150']
];
for (const [txt,want] of leak) {
  const got=(await QTY(txt)).join(' + ');
  ok('liczba dla czegoś innego nie mnoży produktu: „'+txt+'”  ['+got+']', got===want);
}
/* Druga strona reguły: przymiotnik między liczbą a produktem nie może jej zjeść. */
const keep = [
  ['2 duże jabłka','Jabłko:300'],
  ['2 średnie pomidory','Pomidor:240'],
  ['2 dojrzałe banany','Banan:240'],
  ['zjadłem 3 banany','Banan:360'],
  ['5 jabłek','Jabłko:750'],
  ['3 kromki chleba pszennego','Chleb pszenny:105'],
  ['4 jaj i 2 serków wiejskich','Jajko:220 + Serek wiejski:400'],
  ['na obiad 200 g ryżu i 150 g piersi z kurczaka','Ryż biały (ugotowany):200 + Pierś z kurczaka (surowa):150']
];
for (const [txt,want] of keep) {
  const got=(await QTY(txt)).join(' + ');
  ok('a prawdziwa ilość zostaje: „'+txt+'”  ['+got+']', got===want);
}
const half=(await QTY('dwa i pół banana')).join(' + ');
ok('„i” przed liczbą nie przerywa („dwa i pół banana”)  ['+half+']', /Banan/.test(half));

// ── dopełniacz liczby mnogiej: śliwki → śliwek ─────────────────────────────
/* „5 śliwek i jabłko” dodawało 5 jabłek: śliwki nie były rozpoznawane, więc
   liczba została bez właściciela i przeskoczyła dalej. Przyczyna była w regule
   odmiany — dopuszczała różnicę JEDNEJ końcowej litery, a dopełniacz liczby
   mnogiej rodzaju żeńskiego zmienia dwie: śliwki→śliwek. „jabłek” i „oliwek”
   działały tylko dlatego, że miały ręczne aliasy. */
const infl = [
  ['5 śliwek i jabłko','Śliwki:500 + Jabłko:150'],
  ['5 śliwek','Śliwki:500'],
  ['garść truskawek','Truskawki:30'],
  ['garść borówek','Borówki:30'],
  ['garść porzeczek','Porzeczki:30'],
  ['4 jaj','Jajko:220'],
  ['garść oliwek','Oliwki:30'],
  ['5 jabłek','Jabłko:750']
];
for (const [txt,want] of infl) {
  const got=(await QTY(txt)).join(' + ');
  ok('odmiana rozpoznana: „'+txt+'”  ['+got+']', got===want);
}

// ── słowa, które tylko wyglądają jak jedzenie ──────────────────────────────
/* Poluzowanie odmiany wpuszczało śmieci: „pralka”→praliny, „kartka”→ziemniaki.
   Dlatego dwie końcówki są dopuszczone tylko dla wzorca -ek/-ki, a kilka słów
   wysokiego ryzyka jest wprost wyłączonych — „3 serie” na siłowni trafiały
   w „ser” przez alias „sera”. */
const junk = await p.evaluate(ws=>{
  const out=[];
  ws.split(' ').forEach(w=>{const r=window.MAKRO.parse(w); if(r.items.length)out.push(w+'→'+r.items[0].f.n)});
  return out;
}, 'maska maszyna kaseta kanapa lampa mapa rama kartka szafka torba pralka komputer telefon zeszyt linijka praca droga seria serie sztanga powtorki');
ok('zwykłe słowa nie udają jedzenia  ['+(junk.join(', ')||'żadne')+']', junk.length===0);
const gym=(await QTY('zrobiłem 3 serie i zjadłem jabłko')).join(' + ');
ok('„3 serie” to nie trzy sery  ['+gym+']', gym==='Jabłko:150');
const seen=await p.evaluate(()=>window.MAKRO.parse('zrobiłem 3 serie i zjadłem jabłko').skipped);
ok('a pominięte słowo jest wypisane, nie przemilczane  ['+seen.join(',')+']',
   seen.some(w=>/seri/i.test(w)));
/* Prawdziwe jedzenie o podobnych nazwach musi nadal działać. */
const real = [['2 kanapki','Kanapka z szynką i serem:240'],['ramen','Ramen:400'],
              ['ser żółty','Ser żółty (gouda):30']];
for (const [txt,want] of real) {
  const got=(await QTY(txt)).join(' + ');
  ok('a prawdziwe jedzenie zostaje: „'+txt+'”  ['+got+']', got===want);
}

console.log(T.join('\n'));
console.log(errs.length?'\nBŁĘDY: '+errs.join('\n'):'\nbłędy JS: brak');
await b.close();
process.exit(T.some(t=>t.startsWith('FAIL'))||errs.length?1:0);

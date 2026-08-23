import { chromium, APP, SHOTS } from './lib.mjs';

const errs = [];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:414,height:900}, deviceScaleFactor:2, locale:'pl-PL' });
const p = await ctx.newPage();
p.on('console', m => { if (m.type()==='error') errs.push('console: '+m.text()); });
p.on('pageerror', e => errs.push('pageerror: '+e.message));
await p.goto(APP);
await p.waitForTimeout(700);

const T = [];
const ok = (n,c) => T.push((c?'PASS':'FAIL')+'  '+n);

// startowy stan
ok('render zakładek', await p.locator('.tab').count() === 4);
ok('odczyt kcal widoczny', await p.locator('.bignum .v').isVisible());
ok('pasek 7 dni ma 7 słupków', await p.locator('.week .day').count() === 7);

// 1) szybkie dodanie jednym tapnięciem (pasek „najczęstszych” usunięty —
//    jedno tapnięcie zostało na liście produktów w „Dodaj”)
await p.locator('.tab').nth(1).click(); await p.waitForTimeout(250);
await p.locator('.addbtn').first().click(); await p.waitForTimeout(200);
await p.locator('.tab').nth(0).click();
await p.waitForTimeout(200);
ok('wpis pojawił się w logu', await p.locator('.entry').count() === 1);
ok('toast z Cofnij', await p.locator('.toast.on button').innerText() === 'Cofnij');

// 2) cofnij
await p.locator('.toast.on button').click();
await p.waitForTimeout(150);
ok('cofnij usuwa wpis', await p.locator('.entry').count() === 0);

// 3) szukanie bez polskich znaków
await p.locator('.tab').nth(1).click();
await p.locator('.search input').fill('zolty');
await p.waitForTimeout(200);
const first = await p.locator('.food .body b').first().innerText();
ok('„zolty” znajduje „Ser żółty (gouda)”  ['+first+']', /żółty/.test(first));
await p.locator('.search input').fill('platki');
await p.waitForTimeout(200);
ok('„platki” znajduje płatki  ['+(await p.locator('.food .body b').first().innerText())+']', /Płatki/.test(await p.locator('.food .body b').first().innerText()));

// 4) arkusz porcji + zmiana ilości
await p.locator('.search input').fill('jajko');
await p.waitForTimeout(200);
await p.locator('.food .body').first().click();
await p.waitForTimeout(350);
ok('arkusz otwarty', await p.locator('.sheet.on').count() === 1);
const kcal1 = await p.locator('.preview .v').innerText();
await p.locator('.sheet .seg button').nth(2).click();   // 1½ szt
await p.waitForTimeout(120);
const kcal2 = await p.locator('.preview .v').innerText();
ok('chip porcji zmienia kcal  ['+kcal1+' -> '+kcal2+']', kcal1 !== kcal2);
await p.locator('.sheet .stepper button').nth(1).click(); // +
await p.waitForTimeout(120);
ok('stepper zmienia gramy', (await p.locator('.preview .v').innerText()) !== kcal2);
await p.locator('.sheet .sheetrow .btn').nth(1).click();  // Dodaj
await p.waitForTimeout(300);

// 5) dodanie z listy jednym tapnięciem (bez utraty pozycji listy)
await p.locator('.addbtn').first().click();
await p.waitForTimeout(200);
ok('lista nadal na ekranie Dodaj po szybkim dodaniu', await p.locator('.search input').count() === 1);

// 6) suma dnia
await p.locator('.tab').first().click();
await p.waitForTimeout(250);
const n = await p.locator('.entry').count();
ok('2 wpisy w logu  ['+n+']', n === 2);
const grp = await p.locator('.grouphead .t').first().innerText();
ok('auto-grupowanie po godzinie  ['+grp+']', ['ŚNIADANIE','OBIAD','KOLACJA','PRZEKĄSKA'].includes(grp.toUpperCase()));

// 7) zapis zestawu
await p.locator('.grouphead .save').first().click();
await p.waitForTimeout(320);
await p.locator('.sheet .sheetrow .btn').nth(1).click();
await p.waitForTimeout(250);
await p.locator('.tab').nth(2).click();
await p.waitForTimeout(200);
ok('zestaw zapisany', await p.locator('.card h3').count() >= 1);
await p.locator('.card .btn').first().click();  // dodaj zestaw do dnia
await p.waitForTimeout(300);
ok('zestaw dodany do dnia  ['+(await p.locator('.entry').count())+' wpisów]', await p.locator('.entry').count() === 4);

// 8) kalkulator celu
await p.locator('.tab').nth(3).click();
await p.waitForTimeout(200);
await p.locator('.card .btn').first().click();  // Ustaw jako mój cel
await p.waitForTimeout(250);
const note = await p.locator('.card .note').filter({hasText:'Teraz'}).innerText();
ok('cel + makro wyliczone  ['+note.replace(/\s+/g,' ').slice(0,64)+']', /kcal/.test(note) && /B \d/.test(note));

// 9) trwałość po odświeżeniu
await p.reload();
await p.waitForTimeout(600);
ok('dane przetrwały reload', await p.locator('.entry').count() === 4);

// 10) ciemny motyw
await ctx.close();
const ctx2 = await b.newContext({ viewport:{width:414,height:1000}, deviceScaleFactor:2, colorScheme:'dark', locale:'pl-PL' });
const p2 = await ctx2.newPage();
p2.on('pageerror', e => errs.push('pageerror(dark): '+e.message));
await p2.goto(APP);
await p2.waitForTimeout(600);
const bg = await p2.evaluate(() => getComputedStyle(document.body).backgroundColor);
const lum = c => { const m=c.match(/\d+/g)||[0,0,0]; return (+m[0]*.2126 + +m[1]*.7152 + +m[2]*.0722)/255; };
ok('ciemne tło body  ['+bg+', jasność '+lum(bg).toFixed(2)+']', lum(bg) < 0.15);
const inkOnDark = await p2.evaluate(() => getComputedStyle(document.querySelector('.bignum .v')).color);
ok('jasny tekst w ciemnym motywie  ['+inkOnDark+', jasność '+lum(inkOnDark).toFixed(2)+']', lum(inkOnDark) > 0.85);

// przewinięcie poziome = błąd layoutu
const hscroll = await p2.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
ok('brak poziomego przewijania strony', !hscroll);

console.log(T.join('\n'));
console.log(errs.length ? '\nBŁĘDY JS:\n'+errs.join('\n') : '\nBŁĘDY JS: brak');
await b.close();
process.exit(T.some(t=>t.startsWith('FAIL')) || errs.length ? 1 : 0);

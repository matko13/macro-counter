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

console.log(T.join('\n'));
console.log(errs.length?'\nBŁĘDY: '+errs.join('\n'):'\nbłędy JS: brak');
await b.close();
process.exit(T.some(t=>t.startsWith('FAIL'))||errs.length?1:0);

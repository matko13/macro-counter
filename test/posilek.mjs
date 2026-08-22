/* Posiłek jest zgadywany z godziny zapisu, więc musi być jak go poprawić:
   kanapka zjedzona o 15:00 to nadal może być śniadanie, a przekąska o 22:00
   to nie kolacja. Bez tego jedyną drogą było usunięcie wpisu i dodanie go
   ponownie w odpowiedniej porze dnia — czyli żadna droga. */
import { chromium, devices, APP } from './lib.mjs';
const T=[],ok=(n,c)=>{T.push((c?'PASS':'FAIL')+'  '+n);console.log(T[T.length-1])};
const b=await chromium.launch();
const ctx=await b.newContext({...devices['iPhone 13'],locale:'pl-PL'});
const p=await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto(APP); await p.waitForTimeout(600);

const groups = () => p.locator('.grouphead .t').allInnerTexts();
const openFirstEntry = async () => {
  await p.locator('.entry').first().tap(); await p.waitForTimeout(400);
};
const stored = () => p.evaluate(()=>{
  const d=JSON.parse(localStorage.getItem('makro.v1')||'{}');
  return Object.values(d.log||{}).flat().map(e=>({n:e.n,sl:e.sl||null,k:e.k,g:e.g}));
});

// dodajemy jeden produkt
await p.locator('.tab').nth(1).tap(); await p.waitForTimeout(300);
await p.locator('.addbtn').first().tap(); await p.waitForTimeout(400);
await p.locator('.tab').nth(0).tap(); await p.waitForTimeout(300);
ok('wpis dodany  ['+await p.locator('.entry').count()+']', await p.locator('.entry').count()===1);
const startGroup=(await groups())[0];
const before=(await stored())[0];

// ── arkusz wpisu ma wybór posiłku ──────────────────────────────────────────
await openFirstEntry();
ok('arkusz wpisu otwarty', await p.locator('#sheet.on').count()===1);
const labels = await p.locator('#sheet .field label').allInnerTexts();
ok('jest pole „Posiłek”  ['+labels.join(', ')+']', labels.some(l=>/Posiłek/i.test(l)));
const segs = p.locator('#sheet .field').filter({has:p.locator('label:text-is("Posiłek")')}).locator('.seg button');
const names = await segs.allInnerTexts();
ok('wszystkie cztery posiłki do wyboru  ['+names.join('/')+']',
   ['Śniadanie','Obiad','Kolacja','Przekąska'].every(x=>names.includes(x)));
const pressed = await p.locator('#sheet .seg button[aria-pressed="true"]').last().innerText();
ok('zaznaczony jest ten, w którym wpis siedzi  ['+pressed+' / grupa '+startGroup+']',
   pressed.toUpperCase()===startGroup.toUpperCase());

// ── przeniesienie ──────────────────────────────────────────────────────────
const target = ['Śniadanie','Obiad','Kolacja','Przekąska']
  .find(x=>x.toUpperCase()!==startGroup.toUpperCase());
await segs.filter({hasText:new RegExp('^'+target+'$')}).tap(); await p.waitForTimeout(200);
const nowPressed = await p.locator('#sheet .seg button[aria-pressed="true"]').last().innerText();
ok('wybór przeskakuje na tapnięty posiłek  ['+nowPressed+']', nowPressed===target);
await p.locator('#sheet .sheetrow .btn').nth(1).tap(); await p.waitForTimeout(500);

const g2 = await groups();
ok('wpis siedzi teraz pod nowym posiłkiem  ['+g2.join(', ')+']',
   g2.length===1 && g2[0].toUpperCase()===target.toUpperCase());
ok('stara grupa zniknęła, nie została pusta', !g2.some(x=>x.toUpperCase()===startGroup.toUpperCase()));
ok('nie zrobił się z tego drugi wpis  ['+await p.locator('.entry').count()+']',
   await p.locator('.entry').count()===1);

const after=(await stored())[0];
ok('kalorie i gramatura bez zmian  ['+after.k+' kcal / '+after.g+' g]',
   after.k===before.k && after.g===before.g);
ok('posiłek zapisany wprost, nie zgadywany  [sl='+after.sl+']', after.sl===target);

// ── trwałość ───────────────────────────────────────────────────────────────
await p.reload(); await p.waitForTimeout(700);
const g3 = await groups();
ok('po przeładowaniu wpis nadal tam, gdzie go przeniosłem  ['+g3.join(', ')+']',
   g3.length===1 && g3[0].toUpperCase()===target.toUpperCase());

// ── da się przenieść jeszcze raz, także z powrotem ─────────────────────────
await openFirstEntry();
const segs2 = p.locator('#sheet .field').filter({has:p.locator('label:text-is("Posiłek")')}).locator('.seg button');
await segs2.filter({hasText:new RegExp('^'+startGroup.replace(/^(.)(.*)$/,(m,a,r)=>a+r.toLowerCase())+'$','i')}).tap();
await p.waitForTimeout(200);
await p.locator('#sheet .sheetrow .btn').nth(1).tap(); await p.waitForTimeout(500);
const g4 = await groups();
ok('powrót do pierwotnego posiłku też działa  ['+g4.join(', ')+']',
   g4.length===1 && g4[0].toUpperCase()===startGroup.toUpperCase());

// ── przenoszenie nie psuje grupowania przy kilku wpisach ───────────────────
await p.locator('.tab').nth(1).tap(); await p.waitForTimeout(300);
await p.locator('.addbtn').nth(1).tap(); await p.waitForTimeout(400);
await p.locator('.tab').nth(0).tap(); await p.waitForTimeout(400);
ok('dwa wpisy w jednej grupie  ['+(await groups()).join(', ')+']', (await groups()).length===1);
await p.locator('.entry').first().tap(); await p.waitForTimeout(400);
const segs3 = p.locator('#sheet .field').filter({has:p.locator('label:text-is("Posiłek")')}).locator('.seg button');
await segs3.filter({hasText:/^Przekąska$/}).tap(); await p.waitForTimeout(200);
await p.locator('#sheet .sheetrow .btn').nth(1).tap(); await p.waitForTimeout(500);
const g5 = await groups();
ok('rozdzielone na dwie grupy  ['+g5.join(', ')+']', g5.length===2);
ok('oba wpisy nadal są  ['+await p.locator('.entry').count()+']', await p.locator('.entry').count()===2);
const sums = await p.locator('.grouphead .k').allInnerTexts();
ok('każda grupa liczy swoją sumę  ['+sums.join(' | ')+']',
   sums.length===2 && sums.every(x=>/\d/.test(x)));

// ── usuwanie z arkusza nadal działa ────────────────────────────────────────
await p.locator('.entry').first().tap(); await p.waitForTimeout(400);
await p.locator('#sheet .btn.danger').tap(); await p.waitForTimeout(500);
ok('„Usuń” w tym samym arkuszu nadal usuwa  ['+await p.locator('.entry').count()+']',
   await p.locator('.entry').count()===1);

// ── wybór posiłku już przy DODAWANIU, nie tylko przy poprawianiu ───────────
/* Zgadywanie z godziny myli się dokładnie w tych porach, w których i tak się
   je. Poprawianie wpisu po fakcie to o dwa tapnięcia więcej niż wybór od razu. */
await p.evaluate(()=>localStorage.removeItem('makro.v1'));
await p.reload(); await p.waitForTimeout(600);
await p.locator('.tab').nth(1).tap(); await p.waitForTimeout(300);
await p.locator('.food .body').first().tap(); await p.waitForTimeout(450);
const labs2 = await p.locator('#sheet .field label').allInnerTexts();
ok('arkusz dodawania ma wybór posiłku  ['+labs2.join(', ')+']', labs2.some(l=>/Posiłek/i.test(l)));
const preset = await p.locator('#sheet .seg button[aria-pressed="true"]').last().innerText();
ok('zaznaczony jest ten zgadnięty z godziny  ['+preset+']',
   ['Śniadanie','Obiad','Kolacja','Przekąska'].includes(preset));
const other = ['Śniadanie','Obiad','Kolacja','Przekąska'].find(x=>x!==preset);
await p.locator('#sheet .seg button:has-text("'+other+'")').tap(); await p.waitForTimeout(200);
await p.locator('#sheet .sheetrow .btn').last().tap(); await p.waitForTimeout(500);
await p.locator('.tab').nth(0).tap(); await p.waitForTimeout(400);
ok('wpis ląduje w wybranym posiłku, nie w zgadniętym  ['+(await groups()).join(', ')+']',
   (await groups()).length===1 && (await groups())[0].toUpperCase()===other.toUpperCase());
ok('i wybór jest zapisany wprost',
   await p.evaluate(a=>{const L=JSON.parse(localStorage.getItem('makro.v1')).log;
     return Object.values(L).flat()[0].sl===a},other));

console.log('\n'+T.filter(t=>t.startsWith('PASS')).length+'/'+T.length+' PASS');
console.log(errs.length?'błędy JS: '+errs.join('; '):'błędy JS: brak');
await b.close();
process.exit(T.some(t=>t.startsWith('FAIL'))||errs.length?1:0);

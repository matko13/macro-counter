/* Gramatura da się wpisać z klawiatury, nie tylko dojechać plusem — dojście
   plusem do 275 g to kilkadziesiąt tapnięć. Wszystkie pola liczbowe w apce
   idą przez jeden komponent, bo inaczej każdy ekran zachowywałby się inaczej.

   Pułapka, którą to wprowadza: jeśli zmiana wartości przebudowuje arkusz, to
   input, w którym użytkownik pisze, zostaje zastąpiony nowym i fokus wypada po
   PIERWSZYM znaku. Dlatego każde pole jest tu sprawdzane pisaniem znak po
   znaku, a nie ustawieniem wartości na raz. */
import { chromium, devices, APP } from './lib.mjs';
const T=[],ok=(n,c)=>{T.push((c?'PASS':'FAIL')+'  '+n);console.log(T[T.length-1])};
const b=await chromium.launch();
const ctx=await b.newContext({...devices['iPhone 13'],locale:'pl-PL'});
const p=await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text())});
await p.goto(APP); await p.waitForTimeout(500);

/* Pisanie jak człowiek: znak po znaku, z fokusem sprawdzanym na końcu. */
const human = async (loc,txt) => {
  await loc.click(); await p.keyboard.press('Control+a');
  for (const ch of txt) { await p.keyboard.type(ch); await p.waitForTimeout(70) }
  return {val:await loc.inputValue(), focused:await p.evaluate(()=>document.activeElement.tagName)};
};

// ── arkusz porcji ──────────────────────────────────────────────────────────
await p.locator('.tab').nth(1).tap(); await p.waitForTimeout(300);
await p.locator('.search input').fill('ryż biały ugotowany'); await p.waitForTimeout(350);
await p.locator('.food .body').first().tap(); await p.waitForTimeout(450);
const gInp = p.locator('#sheet .stepper .val input');
ok('gramatura to pole, nie tylko wyświetlacz  ['+await gInp.inputValue()+']', await gInp.count()===1);
let r = await human(gInp,'275');
ok('da się wpisać znak po znaku  ['+r.val+']', r.val==='275');
ok('i fokus zostaje w polu  ['+r.focused+']', r.focused==='INPUT');
ok('kcal przelicza się od wpisanej wartości  ['+await p.locator('#sheet .preview .v').innerText()+']',
   (await p.locator('#sheet .preview .v').innerText())==='358');
await p.locator('#sheet .stepper button').last().tap(); await p.waitForTimeout(200);
ok('plus liczy dalej od wpisanej wartości, nie od starej  ['+await gInp.inputValue()+']',
   (await gInp.inputValue())==='285');
await gInp.fill('99999'); await p.locator('#sheet h3').tap(); await p.waitForTimeout(250);
ok('górna granica pilnowana  ['+await gInp.inputValue()+']', (await gInp.inputValue())==='5000');
await gInp.fill('0'); await p.locator('#sheet h3').tap(); await p.waitForTimeout(250);
ok('zero nie przechodzi  ['+await gInp.inputValue()+']', (await gInp.inputValue())==='1');
await gInp.fill('abc'); await p.locator('#sheet h3').tap(); await p.waitForTimeout(250);
ok('śmieci wracają do ostatniej dobrej wartości  ['+await gInp.inputValue()+']',
   (await gInp.inputValue())==='1');
await p.locator('#sheet .btn.alt').tap(); await p.waitForTimeout(300);

// ── waga: ułamek i przecinek ───────────────────────────────────────────────
await p.locator('.tab').nth(0).tap(); await p.waitForTimeout(300);
await p.locator('.nlcard').last().tap(); await p.waitForTimeout(450);
r = await human(p.locator('#sheet .stepper .val input'),'79,6');
ok('wagę wpisuje się z przecinkiem  ['+r.val+']', r.val==='79,6' && r.focused==='INPUT');
await p.locator('#sheet .sheetrow .btn').last().tap(); await p.waitForTimeout(450);
ok('i zapisuje się jako liczba  ['+await p.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('makro.v1')).wt)[0])+']',
   await p.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('makro.v1')).wt)[0])===79.6);

// ── kalkulator w „Ja” ──────────────────────────────────────────────────────
await p.locator('.tab').nth(3).tap(); await p.waitForTimeout(400);
const jaInp = p.locator('.card .stepper .val input');
ok('kalkulator ma trzy pola do wpisania  ['+await jaInp.count()+']', await jaInp.count()===3);
r = await human(jaInp.nth(2),'186');
ok('wzrost wpisany znak po znaku  ['+r.val+']', r.val==='186' && r.focused==='INPUT');
ok('zapotrzebowanie liczy się na żywo  ['+(await p.locator('.card .note').first().innerText()).slice(0,44)+'…]',
   /kcal/.test(await p.locator('.card .note').first().innerText()));

// ── podgląd rozpoznanego posiłku ───────────────────────────────────────────
await p.locator('.tab').nth(0).tap(); await p.waitForTimeout(300);
await p.locator(':text("Opisz albo podyktuj")').first().tap(); await p.waitForTimeout(400);
await p.locator('#sheet textarea').fill('200 g ryżu i 150 g piersi z kurczaka');
await p.locator('#sheet .btn').filter({hasText:/Rozpoznaj/}).first().tap(); await p.waitForTimeout(600);
const rowInp = p.locator('#sheet .nlrow .g .v input').first();
const totBefore = await p.locator('#sheet .nltot .v').innerText();
r = await human(rowInp,'345');
ok('gramatura składnika wpisana znak po znaku  ['+r.val+']', r.val==='345');
ok('i fokus nie wypada po pierwszym znaku  ['+r.focused+']', r.focused==='INPUT');
const totAfter = await p.locator('#sheet .nltot .v').innerText();
ok('suma posiłku idzie za wpisaną wartością  ['+totBefore+' → '+totAfter+']', totBefore!==totAfter);
const rowTxt = (await p.locator('#sheet .nlrow').first().innerText()).replace(/\n/g,' ');
ok('kcal i opis porcji w wierszu też  ['+rowTxt.slice(0,42)+']', /345/.test(rowTxt));
await p.locator('#sheet .nlrow').first().locator('.g button').last().tap(); await p.waitForTimeout(250);
ok('plus liczy dalej od wpisanej  ['+await rowInp.inputValue()+']', (await rowInp.inputValue())==='355');

// ── zestaw ─────────────────────────────────────────────────────────────────
await p.locator('#sheet .btn').filter({hasText:/Dodaj|Zapisz/}).last().tap(); await p.waitForTimeout(500);
await p.evaluate(()=>{
  const d=JSON.parse(localStorage.getItem('makro.v1'));
  d.sets=[{id:'s1',n:'Test',items:[{fid:'ryz-bialy-ugotowany',n:'Ryż',g:200,u:'g',s:150,k:260,p:5.4,c:56,f:0.6}]}];
  localStorage.setItem('makro.v1',JSON.stringify(d));
});
await p.reload(); await p.waitForTimeout(600);
await p.locator('.tab').nth(2).tap(); await p.waitForTimeout(400);
await p.locator('.card .edit').first().tap(); await p.waitForTimeout(450);
r = await human(p.locator('#sheet .nlrow .g .v input').first(),'325');
ok('gramatura składnika zestawu wpisana z klawiatury  ['+r.val+']', r.val==='325' && r.focused==='INPUT');
ok('suma zestawu przeliczona  ['+await p.locator('#sheet .per').innerText()+']',
   /423 kcal/.test(await p.locator('#sheet .per').innerText()));

// ── szybkie tapanie w „+” nie może przybliżać strony ───────────────────────
/* iOS bierze dwa szybkie tapnięcia w to samo miejsce za double-tap i robi
   zoom. touch-action:manipulation wyłącza sam ten gest, nie ruszając
   zsuwania palcami — i to jest sprawdzane na wszystkich kontrolkach. */
const noZoom = await p.evaluate(()=>{
  const bad=[];
  document.querySelectorAll('button,input,textarea,a,[role="button"]').forEach(e=>{
    const r=e.getBoundingClientRect(); if(!r.width) return;
    const ta=getComputedStyle(e).touchAction;
    if(!/manipulation|none/.test(ta)) bad.push((e.textContent||e.className||e.tagName).trim().slice(0,18)+':'+ta);
  });
  return bad;
});
ok('każda kontrolka ma wyłączony double-tap zoom  ['+(noZoom.slice(0,3).join(', ')||'wszystkie ok')+']',
   noZoom.length===0);
ok('ale zsuwanie palcami zostaje możliwe (brak user-scalable=no)',
   !/user-scalable\s*=\s*no/.test(await p.evaluate(()=>
     document.querySelector('meta[name=viewport]').getAttribute('content'))));

console.log('\n'+T.filter(t=>t.startsWith('PASS')).length+'/'+T.length+' PASS');
console.log(errs.length?'błędy JS: '+errs.join('; '):'błędy JS: brak');
await b.close();
process.exit(T.some(t=>t.startsWith('FAIL'))||errs.length?1:0);

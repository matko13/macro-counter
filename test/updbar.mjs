import { chromium, devices, SHOTS, WORK } from './lib.mjs';
import { copyFileSync } from 'fs';
const T=[],ok=(n,c)=>{T.push((c?'PASS':'FAIL')+'  '+n);console.log(T[T.length-1])};
const SP=WORK, URL='http://localhost:8211/app/';
const b=await chromium.launch();
const ctx=await b.newContext({...devices['iPhone 13'],locale:'pl-PL'});
const p=await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));

// ── pierwsza instalacja: pasek NIE może się pokazać ─────────────────────────
await p.goto(URL);
await p.evaluate(async()=>{ await navigator.serviceWorker.ready;
  for(let i=0;i<50&&!navigator.serviceWorker.controller;i++) await new Promise(r=>setTimeout(r,100)); });
ok('SW przejął stronę', await p.evaluate(()=>!!navigator.serviceWorker.controller));
await p.waitForTimeout(600);
ok('przy pierwszej instalacji nie ma paska aktualizacji', await p.locator('#updbar').count()===0);
ok('marka to „Makro” (wersja A)', (await p.locator('.brand b').innerText())==='Makro');

// zapisujemy dane, żeby sprawdzić, że aktualizacja ich nie gubi
await p.locator('.tab').nth(1).tap(); await p.waitForTimeout(250);
await p.locator('.addbtn').first().tap(); await p.waitForTimeout(250);
await p.locator('.tab').nth(0).tap(); await p.waitForTimeout(250);
const before=await p.locator('.entry').count();
ok('wpis dodany przed aktualizacją  ['+before+']', before===1);

// ── wdrożenie wersji B ──────────────────────────────────────────────────────
copyFileSync(SP+'/upd/b/sw.js',   SP+'/upd/app/sw.js');
copyFileSync(SP+'/upd/b/index.html', SP+'/upd/app/index.html');
await p.evaluate(async()=>{ const r=await navigator.serviceWorker.getRegistration(); await r.update(); });
await p.waitForSelector('#updbar',{timeout:15000}).catch(()=>{});
ok('pasek „Jest nowsza wersja apki” się pojawił', await p.locator('#updbar').count()===1);
ok('treść paska: '+(await p.locator('#updbar .tx').innerText().catch(()=>'brak')),
   /nowsza wersja/.test(await p.locator('#updbar .tx').innerText().catch(()=>'')));
ok('toast ustępuje paskowi', await p.evaluate(()=>document.body.classList.contains('hasupd')));
ok('stary kod nadal na ekranie, nic nie podmieniło się samo', (await p.locator('.brand b').innerText())==='Makro');
await p.screenshot({path:SP+'/updbar.png'});

// ── tapnięcie „Odśwież” ─────────────────────────────────────────────────────
await p.locator('#updbar button').tap();
await p.waitForFunction(()=>document.querySelector('.brand b')&&document.querySelector('.brand b').textContent==='Makro2',
  null,{timeout:15000}).catch(()=>{});
ok('po tapnięciu wchodzi wersja B  [marka: '+(await p.locator('.brand b').innerText())+']',
   (await p.locator('.brand b').innerText())==='Makro2');
ok('pasek zniknął po przeładowaniu', await p.locator('#updbar').count()===0);
// marka to statyczny HTML — trzeba poczekać, aż JS apki naprawdę się wykona
await p.waitForSelector('.bignum .v',{timeout:15000});
await p.waitForTimeout(500);
const store=await p.evaluate(()=>{const d=JSON.parse(localStorage.getItem('makro.v1')||'{}');
  const L=d.log||{};return Object.keys(L).reduce((a,k)=>a+L[k].length,0);});
ok('dane w pamięci przetrwały aktualizację  ['+store+' wpisów w localStorage]', store===before);
ok('i są widoczne w logu  ['+(await p.locator('.entry').count())+']', await p.locator('.entry').count()===before);
const cache=await p.evaluate(async()=>(await caches.keys()).join(','));
ok('cache przełączony na nową wersję  ['+cache+']', /bbbbbbb/.test(cache)&&!/aaaaaaa/.test(cache));

/* Sprzątanie po starym wdrożeniu nie może zabrać cache'u z danymi — to w nim
   leży migawka, dzięki której apka z ekranu głównego odnajduje dane z Safari. */
ok('cache z danymi przeżył aktualizację  ['+(/makro-dane/.test(cache)?'jest':'ZNIKNĄŁ')+']',
   /makro-dane/.test(cache));
const snapAfter = await p.evaluate(async()=>{
  const c=await caches.open('makro-dane');const r=await c.match('./__dane.json');
  return r?(await r.json()):null;});
ok('i migawka nadal ma wpisy  ['+(snapAfter?Object.values(snapAfter.data.log).flat().length:0)+']',
   !!snapAfter && Object.values(snapAfter.data.log).flat().length===before);

console.log('\n'+T.filter(t=>t.startsWith('PASS')).length+'/'+T.length+' PASS');
console.log(errs.length?'BŁĘDY: '+errs.join('\n'):'błędy JS: brak');
await b.close();
process.exit(T.some(t=>t.startsWith('FAIL'))?1:0);

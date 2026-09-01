/* Co się dzieje z danymi, gdy apka wstaje pusta. Powód realny: na iOS apka
   dodana do ekranu głównego ma osobną pamięć niż Safari, więc po zapisaniu
   ikonki dzień wygląda na wyczyszczony, choć wpisy nadal są w przeglądarce.
   Testy chodzą po HTTP, bo Cache Storage wymaga bezpiecznego kontekstu. */
import { chromium, devices, SHOTS } from './lib.mjs';
const T=[],ok=(n,c)=>{T.push((c?'PASS':'FAIL')+'  '+n);console.log(T[T.length-1])};
const URL='http://localhost:8215/app/';
const b=await chromium.launch();
const errs=[];

const fresh = async (opts={}) => {
  const ctx=await b.newContext({...devices['iPhone 13'],locale:'pl-PL',...opts});
  const p=await ctx.newPage();
  p.on('pageerror',e=>errs.push(e.message));
  return {ctx,p};
};
const entries = p => p.locator('.entry').count();
const addOne = async p => {
  await p.locator('.tab').nth(1).tap(); await p.waitForTimeout(300);
  await p.locator('.addbtn').first().tap(); await p.waitForTimeout(400);
  await p.locator('.tab').nth(0).tap(); await p.waitForTimeout(300);
};

// ── 1. zapis odkłada migawkę do Cache Storage ───────────────────────────────
let {ctx,p}=await fresh();
await p.goto(URL); await p.waitForTimeout(600);
await addOne(p);
ok('wpis dodany  ['+await entries(p)+']', await entries(p)===1);
await p.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
await p.waitForTimeout(400);
const snap = await p.evaluate(async()=>{
  const c=await caches.open('makro-dane');
  const r=await c.match('./__dane.json');
  return r ? await r.json() : null;
});
ok('migawka leży w Cache Storage  ['+(snap?Object.keys(snap.data.log).length+' dni':'brak')+']',
   !!snap && !!snap.data && !!snap.at);
const state = await p.evaluate(()=>localStorage.getItem('makro.v1'));
await ctx.close();

// ── 2. pusta pamięć + migawka = propozycja przeniesienia ────────────────────
({ctx,p}=await fresh());
await p.goto(URL); await p.waitForTimeout(400);
// odtwarzamy sytuację z iOS: Cache Storage jest wspólny, localStorage nie
await p.evaluate(async(snapStr)=>{
  localStorage.clear();
  const c=await caches.open('makro-dane');
  await c.put('./__dane.json',new Response(snapStr,{headers:{'Content-Type':'application/json'}}));
}, JSON.stringify({at:Date.now(),data:JSON.parse(state)}));
await p.reload(); await p.waitForTimeout(900);
ok('apka nie udaje, że nic nie było — pyta o przeniesienie',
   (await p.locator('#sheet.on h3').innerText())==='Kopia Twoich danych');
const per = await p.locator('#sheet .per').innerText();
ok('mówi, ile wpisów i kiedy zapisane  ['+per.slice(0,52)+'…]',
   /1 wpis/.test(per) && /ostatni zapis/.test(per));
ok('nic nie wczytuje się samo z siebie  ['+await entries(p)+' wpisów w tle]', await entries(p)===0);
await p.screenshot({path:SHOTS+'/ratunek.png'});
await p.locator('#sheet button:has-text("Przenieś tutaj")').tap(); await p.waitForTimeout(500);
ok('po tapnięciu dane są na miejscu  ['+await entries(p)+']', await entries(p)===1);
ok('i zapisane, nie tylko na ekranie',
   await p.evaluate(()=>{const d=JSON.parse(localStorage.getItem('makro.v1')||'{}');
     return Object.values(d.log||{}).flat().length===1}));
await p.reload(); await p.waitForTimeout(700);
ok('po przeładowaniu nie pyta drugi raz', await p.locator('#sheet.on').count()===0);
await ctx.close();

// ── 3. „Nie teraz” nie kasuje migawki ──────────────────────────────────────
({ctx,p}=await fresh());
await p.goto(URL); await p.waitForTimeout(400);
await p.evaluate(async(snapStr)=>{
  localStorage.clear();
  const c=await caches.open('makro-dane');
  await c.put('./__dane.json',new Response(snapStr,{headers:{'Content-Type':'application/json'}}));
}, JSON.stringify({at:Date.now(),data:JSON.parse(state)}));
await p.reload(); await p.waitForTimeout(900);
await p.locator('#sheet button:has-text("Nie teraz")').tap(); await p.waitForTimeout(300);
ok('„Nie teraz” zamyka i nic nie rusza  ['+await entries(p)+']', await entries(p)===0);
await p.reload(); await p.waitForTimeout(900);
ok('propozycja wraca przy następnym otwarciu',
   (await p.locator('#sheet.on h3').count())===1);
await ctx.close();

// ── 4. „Wyczyść wszystko” czyści też migawkę ────────────────────────────────
({ctx,p}=await fresh());
await p.goto(URL); await p.waitForTimeout(600);
await addOne(p);
await p.locator('.tab').nth(3).tap(); await p.waitForTimeout(400);
await p.locator('button:has-text("Wyczyść wszystko")').tap(); await p.waitForTimeout(400);
await p.locator('#sheet button:has-text("Usuń wszystko")').tap(); await p.waitForTimeout(500);
const left = await p.evaluate(async()=>{
  const c=await caches.open('makro-dane');
  return !!(await c.match('./__dane.json'));
});
ok('po wyczyszczeniu migawki nie ma  [migawka: '+(left?'jest':'brak')+']', !left);
await p.reload(); await p.waitForTimeout(900);
ok('i wyczyszczone dane nie wracają zza grobu',
   await entries(p)===0 && (await p.locator('#sheet.on h3').count())===0);
await ctx.close();

// ── 5. brak migawki + tryb standalone = wyjaśnienie, nie pusty ekran ───────
({ctx,p}=await fresh());
await ctx.addInitScript(()=>{ Object.defineProperty(navigator,'standalone',{get:()=>true}) });
await p.goto(URL); await p.waitForTimeout(900);
const h3 = await p.locator('#sheet.on h3').innerText().catch(()=>'');
ok('z ekranu głównego bez danych apka tłumaczy, gdzie one są  ['+h3+']',
   h3==='Dane zostały w Safari');
const txt = await p.locator('#sheet .per').innerText();
ok('podaje drogę odzyskania, nie samo „przepraszam”',
   /Kopia zapasowa/.test(txt) && /Safari/.test(txt) && /wklej/i.test(txt));
await p.locator('#sheet button:has-text("Otwórz kopię zapasową")').tap(); await p.waitForTimeout(600);
ok('przycisk prowadzi prosto do kopii zapasowej',
   (await p.locator('#sheet.on h3').innerText())==='Kopia zapasowa');
await p.locator('#sheet button:has-text("Kopiuj")').first().tap().catch(()=>{});
await p.reload(); await p.waitForTimeout(900);
ok('wyjaśnienie pokazuje się raz, nie przy każdym wejściu',
   (await p.locator('#sheet.on').count())===0);
await ctx.close();

// ── 6. w Safari (nie standalone) nie ma czego tłumaczyć ────────────────────
({ctx,p}=await fresh());
await p.goto(URL); await p.waitForTimeout(900);
ok('w zwykłej karcie żaden arkusz nie wyskakuje', (await p.locator('#sheet.on').count())===0);
await ctx.close();

// ── 7. uszkodzony zapis nie zostaje nadpisany ──────────────────────────────
({ctx,p}=await fresh());
await p.goto(URL); await p.waitForTimeout(400);
await p.evaluate(()=>{localStorage.setItem('makro.v1','{"log":{"2026-08-19":[{oj');});
await p.reload(); await p.waitForTimeout(700);
ok('apka wstaje mimo połamanego JSON-a', await p.locator('.bignum .v').isVisible());
const t = await p.locator('.toast').innerText().catch(()=>'');
ok('i mówi, że zapis był uszkodzony  ['+t.slice(0,40)+']', /uszkodzony/.test(t));
await addOne(p);
ok('uszkodzona kopia zostaje odłożona, nie zniknęła',
   await p.evaluate(()=>(localStorage.getItem('makro.v1.uszkodzone')||'').indexOf('{"log"')===0));
await ctx.close();

console.log('\n'+T.filter(t=>t.startsWith('PASS')).length+'/'+T.length+' PASS');
console.log(errs.length?'błędy JS: '+errs.join('; '):'błędy JS: brak');
await b.close();
process.exit(T.some(t=>t.startsWith('FAIL'))||errs.length?1:0);

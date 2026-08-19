import { chromium, APP, SHOTS, WORK } from './lib.mjs';
import { readFileSync, readlinkSync } from 'fs';
import { readdirSync } from 'fs';
/* http-server podmienia sobie nazwe procesu, wiec pid z  bywa nie ten —
   szukamy wszystkiego, co siedzi w serwowanym katalogu. */
const SERVE = WORK+'/serve';
const pids = () => readdirSync('/proc').filter(d=>/^[0-9]+$/.test(d)).filter(d=>{
  try { return readlinkSync('/proc/'+d+'/cwd')===SERVE } catch(e){ return false }
}).map(Number);
const T=[],ok=(n,c)=>{T.push((c?'PASS':'FAIL')+'  '+n);console.log(T[T.length-1]);};
const URL='http://localhost:8199/test/';
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:414,height:900},locale:'pl-PL'});
const p=await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));

await p.goto(URL,{timeout:15000});
const st = await p.evaluate(async () => {
  const r = await navigator.serviceWorker.ready;
  for(let i=0;i<40 && !navigator.serviceWorker.controller;i++) await new Promise(r=>setTimeout(r,100));
  return {scope:r.scope, state:r.active&&r.active.state, controller:!!navigator.serviceWorker.controller};
});
ok('service worker aktywny  [state='+st.state+']', st.state==='activated');
ok('SW kontroluje stronę  [controller='+st.controller+']', st.controller);

const cached = await p.evaluate(async () => {
  const ks=await caches.keys(); if(!ks.length) return [];
  const c=await caches.open(ks[0]);
  return (await c.keys()).map(r=>r.url.replace(/^.*\/test\//,'')||'./');
});
ok('app shell w cache  ['+cached.length+' plików]', cached.length>=6);

await p.locator('.nlcard').first().click(); await p.waitForTimeout(300);
await p.locator('.sheet textarea').fill('na obiad 150 g piersi z kurczaka i 200 g ryżu');
await p.locator('.sheet .sheetrow .btn').nth(1).click(); await p.waitForTimeout(300);
await p.locator('.sheet .sheetrow .btn').nth(1).click(); await p.waitForTimeout(400);
const before = await p.locator('.entry').count();
ok('wpisy dodane, gdy sieć była  ['+before+']', before===2);

// TWARDE ODCIĘCIE: gasimy serwer po PID
const victims = pids();
for (const q of victims) { try { process.kill(q,'SIGKILL') } catch(e){} }
await new Promise(r=>setTimeout(r,800));
let dead=false;
try { await fetch(URL,{signal:AbortSignal.timeout(2500)}); } catch(e){ dead=true; }
ok('serwer faktycznie zgaszony  [ubite pid: '+victims.join(',')+']', dead && victims.length>0);

await p.reload({timeout:15000});
await p.waitForTimeout(800);
ok('apka wstaje bez serwera', await p.locator('.bignum .v').isVisible());
ok('dane przetrwały  ['+(await p.locator('.entry').count())+' wpisów]', await p.locator('.entry').count()===before);

await p.locator('.nlcard').first().click(); await p.waitForTimeout(300);
await p.locator('.sheet textarea').fill('banan i garść migdałów');
await p.locator('.sheet .sheetrow .btn').nth(1).click(); await p.waitForTimeout(300);
ok('parser działa bez sieci  ['+(await p.locator('.nlrow').count())+' pozycji]', await p.locator('.nlrow').count()===2);
await p.locator('.sheet .sheetrow .btn').nth(1).click(); await p.waitForTimeout(400);
ok('zapis bez sieci  ['+(await p.locator('.entry').count())+' wpisów]', await p.locator('.entry').count()===4);

const p2=await ctx.newPage();
await p2.goto(URL,{timeout:15000}); await p2.waitForTimeout(800);
ok('nowa karta bez serwera też wstaje', await p2.locator('.bignum .v').isVisible());
await p2.screenshot({path:SHOTS+'/offline.png'});

console.log('\nw cache: '+cached.sort().join(', '));
console.log(errs.length?'BŁĘDY: '+errs.join('\n'):'błędy JS: brak');
await b.close();
process.exit(T.some(t=>t.startsWith('FAIL'))?1:0);

/* Licznik dni bez alkoholu. Zwykły „streak” po pierwszej wpadce kasuje się do
   zera i udaje, że poprzednich czterdziestu dni nie było — to nieprawda i
   zniechęca. Dlatego liczby są trzy: dni od ostatniego razu, czyste dni
   w ostatnich trzydziestu (tej jedna wpadka nie kasuje) i kalorie niewypite,
   liczone z WŁASNEGO spożycia sprzed rzucenia, nie ze średniej. */
import { chromium, devices, APP } from './lib.mjs';
const T=[],ok=(n,c)=>{T.push((c?'PASS':'FAIL')+'  '+n);console.log(T[T.length-1])};
const b=await chromium.launch();
const ctx=await b.newContext({...devices['iPhone 13'],locale:'pl-PL'});
const p=await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text())});
await p.goto(APP); await p.waitForTimeout(400);

/* dni: mapa „ile dni temu” → co tego dnia było (null = brak zapisu) */
const seed = (spec) => p.evaluate(c=>{
  const dk=n=>{const d=new Date();d.setDate(d.getDate()-n);
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
  const t=h=>{const d=new Date();d.setHours(h,0,0,0);return d.getTime()};
  const log={};
  c.forEach((what,i)=>{
    if(what===null)return;                       /* dzień bez zapisu */
    const day=[{fid:'jajko',n:'Jajko',g:110,u:'szt',s:55,k:157,p:14,c:1,f:11,t:t(8)}];
    if(what) day.push({fid:what.fid,n:what.n,g:what.g,u:'ml',s:500,k:what.k,p:1,c:5,f:0,t:t(21)});
    log[dk(i)]=day;
  });
  localStorage.setItem('makro.v1',JSON.stringify({log,wt:{},custom:[],sets:[],usage:{},
    goal:{k:2370,p:178,c:237,f:79},profile:null,theme:'auto',split:'bal'}));
}, spec);
const reload = async () => { await p.reload(); await p.waitForTimeout(600) };
const beer = {fid:'piwo-jasne',n:'Piwo jasne',g:1000,k:430};
const nab  = {fid:'piwo-bezalkoholowe',n:'Piwo bezalkoholowe',g:500,k:130};
const stat = () => p.evaluate(()=>window.MAKRO.alko());

// ── nic w historii = brak licznika ─────────────────────────────────────────
await seed(Array.from({length:10},()=>false));
await reload();
ok('bez alkoholu w historii licznika nie ma  ['+await p.locator('.strip').count()+']',
   !(await stat()).any);
const rows0 = await p.locator('.nlcard').count();

// ── liczenie dni od ostatniego razu ────────────────────────────────────────
/* 40 dni: piwo co drugi dzień, ale ostatnie 9 dni czysto */
await seed(Array.from({length:40},(_,i)=> (i>=9 && i%2===1) ? beer : false));
await reload();
let a = await stat();
ok('licznik pojawia się, gdy alkohol jest w historii', a.any);
ok('dni od ostatniego razu  ['+a.streak+']', a.streak===9);
ok('czyste dni w oknie 30 dni  ['+a.clean+' z '+a.logged+']', a.clean===19 && a.logged===30);
ok('pamięta, co i kiedy było ostatnio  ['+a.lastName+' '+a.lastG+' ml, '+a.last+']',
   a.lastName==='Piwo jasne' && a.lastG===1000);

// ── kalorie liczone z WŁASNEGO spożycia ────────────────────────────────────
/* 430 kcal co drugi dzień = 215 kcal/dzień średnio przed rzuceniem */
ok('podstawa to Twoje spożycie sprzed rzucenia  ['+Math.round(a.perDay)+' kcal/dzień]',
   Math.abs(a.perDay-215)<3);
ok('niewypite kalorie = podstawa × dni  ['+Math.round(a.saved)+' kcal]',
   Math.abs(a.saved-215*9)<30);
ok('i przeliczone na tłuszcz  ['+(Math.round(a.kg*100)/100)+' kg]', Math.abs(a.kg-1935/7700)<0.02);

// ── piwo bezalkoholowe NIE jest alkoholem ──────────────────────────────────
await seed(Array.from({length:20},(_,i)=> i===0 ? nab : (i===12 ? beer : false)));
await reload();
a = await stat();
ok('piwo bezalkoholowe nie zeruje licznika  ['+a.streak+' dni]', a.streak===12);

// ── wpadka nie kasuje historii ─────────────────────────────────────────────
/* 30 czystych dni, wpadka wczoraj */
await seed(Array.from({length:30},(_,i)=> i===1 ? beer : false));
await reload();
a = await stat();
ok('po wpadce licznik dni startuje od nowa  ['+a.streak+']', a.streak===1);
ok('ale czyste dni zostają prawie nietknięte  ['+a.clean+' z '+a.logged+']',
   a.clean===29 && a.logged===30);

// ── dzień bez zapisu to nie dzień bez alkoholu ─────────────────────────────
await seed(Array.from({length:20},(_,i)=> i===5 ? beer : (i<3 ? null : false)));
await reload();
a = await stat();
ok('dni bez zapisu nie są liczone jako czyste  ['+a.clean+' z '+a.logged+', okno 30]',
   a.logged<30 && a.clean===a.logged-1);

// ── ekran ──────────────────────────────────────────────────────────────────
await seed(Array.from({length:40},(_,i)=> (i>=9 && i%2===1) ? beer : false));
await reload();
const row = await p.locator('.nlcard').last().innerText();
ok('wiersz na Dziś podaje dni i kalorie  ['+row.replace(/\n/g,' · ')+']',
   /9 dni bez alkoholu/.test(row) && /nie wypiłeś/.test(row));
await p.locator('.nlcard').last().tap(); await p.waitForTimeout(450);
ok('arkusz otwarty', (await p.locator('#sheet h3').innerText())==='Bez alkoholu');
ok('pasek ma 30 kropek  ['+await p.locator('#sheet .strip i').count()+']',
   await p.locator('#sheet .strip i').count()===30);
ok('dni z alkoholem są oznaczone inaczej  ['+await p.locator('#sheet .strip i.alko').count()+']',
   await p.locator('#sheet .strip i.alko').count()===11);
const sheet = await p.locator('#sheet').innerText();
/* Liczby, nie sformułowania: podstawa i czyste dni mają być widoczne. */
ok('podaje podstawę z własnego spożycia  [215 kcal dziennie]', /215/.test(sheet));
ok('i czyste dni w oknie  [19 z 30]', /19/.test(sheet) && /30/.test(sheet));
/* Przy małych liczbach kilogramy zaokrąglają się do zera i „około 0 kg”
   byłoby szumem — wtedy tej części ma nie być wcale. */
const maloSheet = await p.evaluate(()=>{
  const a=window.MAKRO.alko();
  return {kg:a.kg, saved:a.saved};
});
ok('przy dużej oszczędności kilogramy są podane  ['+(Math.round(maloSheet.kg*100)/100)+' kg]',
   maloSheet.kg>=0.1 && /kg tłuszczu/.test(sheet));
ok('bez moralizowania — sam fakt i data', /Ostatnio: Piwo jasne/.test(sheet));

console.log('\n'+T.filter(t=>t.startsWith('PASS')).length+'/'+T.length+' PASS');
console.log(errs.length?'błędy JS: '+errs.join('; '):'błędy JS: brak');
await b.close();
process.exit(T.some(t=>t.startsWith('FAIL'))||errs.length?1:0);

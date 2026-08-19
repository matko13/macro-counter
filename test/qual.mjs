import { chromium, APP, SHOTS } from './lib.mjs';
const T=[],ok=(n,c)=>T.push((c?'PASS':'FAIL')+'  '+n);
const b=await chromium.launch();
const p=await (await b.newContext({locale:'pl-PL'})).newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(APP); await p.waitForTimeout(300);

const meta = await p.evaluate(() => {
  const fs=window.MAKRO.foods(),seen={},dup=[];
  fs.forEach(f=>{if(seen[f.id])dup.push(f.id);seen[f.id]=1});
  return {n:fs.length,dup,badAlias:Object.keys(window.MAKRO.alias).filter(k=>!window.MAKRO.byId(k))};
});
ok('id produktów unikalne  ['+meta.n+' produktów]', meta.dup.length===0);
ok('każdy alias wskazuje na istniejący produkt', meta.badAlias.length===0);

const P = t => p.evaluate(txt => {
  const r=window.MAKRO.parse(txt);
  return {items:r.items.map(i=>({n:i.f.n,g:i.g,kcal:Math.round(window.MAKRO.scale(i.f,i.g).k),warn:i.warn||null})),skipped:r.skipped};
}, t);

let r = await P('wypiłem piwo zero');
ok('„piwo zero” → Piwo bezalkoholowe  ['+(r.items[0]||{}).n+' '+(r.items[0]||{}).kcal+' kcal]',
   r.items.length===1 && r.items[0].n==='Piwo bezalkoholowe' && r.items[0].kcal<150);
r = await P('wypiłem 2 piwa zero');
ok('liczebnik + zero  ['+(r.items[0]||{}).g+' ml]', r.items.length===1 && r.items[0].g===1000);
r = await P('piwo light');
ok('brak wersji „light” → ostrzeżenie, nie cisza  [⚠ '+(r.items[0]||{}).warn+']',
   r.items.length===1 && r.items[0].warn==='light');
r = await P('jogurt bez cukru');
ok('„bez cukru” nie dodaje cukru i daje ostrzeżenie  [⚠ '+(r.items[0]||{}).warn+']',
   r.items.length===1 && !r.items.some(i=>/Cukier/.test(i.n)) && r.items[0].warn==='bez cukru');
r = await P('mleko odtłuszczone');
ok('„odtłuszczone” trafia w wariant, bez ostrzeżenia  ['+(r.items[0]||{}).n+']',
   r.items[0].n==='Mleko 0%' && !r.items[0].warn);
r = await P('kurczak panierowany');
ok('„kurczak panierowany” → kotlet panierowany  ['+(r.items[0]||{}).n+']',
   r.items[0].n==='Kotlet z kurczaka panierowany' && !r.items[0].warn);
r = await P('jakieś resztki z lodówki');
ok('brak fałszywych trafień na zwykłych słowach  ['+r.items.map(i=>i.n).join(',')+']', r.items.length===0);
r = await P('na śniadanie zapiekanka z 4 jaj, 2 serków wiejskich i 8 oliwek, zjadłem połowę');
ok('stare zdanie nadal działa  ['+r.items.length+' pozycji]', r.items.length===3);

/* Rozszerzanie bazy potrafi wstawić produkt, który przypadkiem wygląda jak
   zwykłe słowo z opisu ("Beza" ~ "bez cukru", "Sola" ~ "solone",
   "Węgorz" ~ "wege", "Łosoś wędzony" ~ "ser wędzony"). Takie trafienie jest
   groźniejsze niż brak trafienia, bo dolicza kalorie, których nikt nie zjadł. */
r = await P('jogurt bez cukru');
ok('„bez” to przyimek, nie beza  ['+r.items.map(i=>i.n).join(',')+']',
   r.items.length===1 && /Jogurt/.test(r.items[0].n));
r = await P('ser wędzony');
ok('„ser wędzony” nie dokłada łososia  ['+r.items.map(i=>i.n).join(',')+']',
   r.items.length===1 && /Ser/.test(r.items[0].n) && r.items[0].warn==='wędzony');
r = await P('marchewka surowa');
ok('„surowa” nie dokłada surówki  ['+r.items.map(i=>i.n).join(',')+']',
   r.items.length===1 && /Marchew/.test(r.items[0].n));
r = await P('solone orzeszki');
ok('„solone” nie dokłada soli (ryby)  ['+r.items.map(i=>i.n).join(',')+']',
   r.items.length===1 && /Orzeszki/.test(r.items[0].n));
r = await P('2 parówki wege');
ok('„parówki wege” to parówki wegańskie  ['+r.items.map(i=>i.n).join(',')+']',
   r.items.length===1 && /wega/i.test(r.items[0].n) && r.items[0].g===200);
r = await P('garść pomidorów suszonych');
ok('odmiana „suszonych” nadal łapie całą nazwę  ['+r.items.map(i=>i.n).join(',')+']',
   r.items.length===1 && /suszone/i.test(r.items[0].n));

// wyszukiwarka po aliasach
await p.locator('.tab').nth(1).click(); await p.waitForTimeout(200);
await p.locator('.search input').fill('piwo zero'); await p.waitForTimeout(250);
const hits = await p.locator('.food .body b').allInnerTexts();
ok('szukanie „piwo zero” zwraca wynik  ['+(hits[0]||'brak')+']', hits.length>0 && /bezalkoholowe/i.test(hits[0]));
await p.locator('.search input').fill('kwakwa'); await p.waitForTimeout(250);
const offer = await p.locator('.empty').innerText().catch(()=>'');
ok('brak wyniku mówi to wprost i proponuje własny produkt',
   /Nie mam/.test(offer) && await p.locator('button:has-text("jako własny produkt")').count()>0);

console.log(T.join('\n'));
console.log(errs.length?'\nBŁĘDY: '+errs.join('\n'):'\nbłędy JS: brak');
await b.close();
process.exit(T.some(t=>t.startsWith('FAIL'))||errs.length?1:0);

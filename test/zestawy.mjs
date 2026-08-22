/* Zestaw dawało się tylko dodać do dnia albo usunąć w całości. Zmiana
   gramatury, wyrzucenie składnika czy poprawienie nazwy wymagały zbudowania
   posiłku od nowa w dzienniku i zapisania go jeszcze raz — czyli tej samej
   pracy, którą zestaw miał oszczędzić. */
import { chromium, devices, APP } from './lib.mjs';
const T=[],ok=(n,c)=>{T.push((c?'PASS':'FAIL')+'  '+n);console.log(T[T.length-1])};
const b=await chromium.launch();
const ctx=await b.newContext({...devices['iPhone 13'],locale:'pl-PL'});
const p=await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text())});

const seed = () => p.evaluate(()=>{
  localStorage.setItem('makro.v1',JSON.stringify({log:{},wt:{},custom:[],usage:{},
    sets:[{id:'s1',n:'Owsianka',items:[
      {fid:'platki-owsiane',n:'Płatki owsiane',g:50,u:'g',s:50,k:186,p:6.5,c:30,f:3.5},
      {fid:'mleko-2',n:'Mleko 2%',g:250,u:'ml',s:250,k:125,p:8.3,c:12,f:5},
      {fid:'banan',n:'Banan',g:120,u:'szt',s:120,k:107,p:1.3,c:27.6,f:0.4}]}],
    goal:{k:2400,p:180,c:250,f:80},profile:null,theme:'auto',split:'bal'}));
});
const stored = () => p.evaluate(()=>JSON.parse(localStorage.getItem('makro.v1')).sets[0]);
const rows = () => p.locator('#sheet .nlrow .n b').allInnerTexts();
const openSet = async () => {
  await p.locator('.tab').nth(2).tap(); await p.waitForTimeout(400);
  await p.locator('.card .edit').first().tap(); await p.waitForTimeout(450);
};

await p.goto(APP); await p.waitForTimeout(400);
await seed(); await p.reload(); await p.waitForTimeout(600);

// ── wejście w edycję ───────────────────────────────────────────────────────
await p.locator('.tab').nth(2).tap(); await p.waitForTimeout(400);
ok('karta zestawu ma przycisk poprawiania i usuwania  ['+await p.locator('.card .edit').count()+']',
   await p.locator('.card .edit').count()===2);
/* Kosz był tu wcześniej innym kształtem przycisku niż ołówek, a jego ikona
   zapadała do zera — czyli przycisk bez żadnego oznaczenia. */
const actGeo = await p.evaluate(()=>[...document.querySelector('.card .sheetrow').children].map(e=>{
  const r=e.getBoundingClientRect(), sv=e.querySelector('svg');
  const sr=sv?sv.getBoundingClientRect():null;
  return {cls:e.className, w:Math.round(r.width), h:Math.round(r.height),
          icon:sr?Math.round(sr.width):0};
}));
ok('kosz ma widoczną ikonę  ['+actGeo.map(a=>a.cls+':'+a.icon+'px').join(', ')+']',
   actGeo.filter(a=>/edit/.test(a.cls)).every(a=>a.icon>=12));
ok('oba przyciski drugorzędne mają tę samą formę  ['+
   actGeo.filter(a=>/edit/.test(a.cls)).map(a=>a.w+'×'+a.h).join(' i ')+']',
   (function(){var e=actGeo.filter(a=>/edit/.test(a.cls));
     return e.length===2 && e[0].w===e[1].w && e[0].h===e[1].h})());
await p.locator('.card .edit').first().tap(); await p.waitForTimeout(450);
ok('arkusz zestawu otwarty', (await p.locator('#sheet h3').innerText())==='Zestaw');
ok('widać wszystkie składniki  ['+(await rows()).join(', ')+']', (await rows()).length===3);
ok('i sumę na wierzchu  ['+await p.locator('#sheet .per').innerText()+']',
   /418 kcal/.test(await p.locator('#sheet .per').innerText()));

// ── gramatura ──────────────────────────────────────────────────────────────
const first = p.locator('#sheet .nlrow').first();
await first.locator('.g button').last().tap();
await first.locator('.g button').last().tap();
await p.waitForTimeout(250);
const ftxt = (await first.innerText()).replace(/\n/g,' ');
const fval = await first.locator('.g .v input').inputValue();
ok('stepper zmienia gramaturę składnika  ['+fval+' g]', fval==='60');
ok('i kcal składnika idzie za nią, nie zostaje na starej  ['+ftxt+']', /223 kcal/.test(ftxt));
ok('suma przelicza się od razu  ['+await p.locator('#sheet .per').innerText()+']',
   /455 kcal/.test(await p.locator('#sheet .per').innerText()));

// ── usuwanie i dokładanie składnika ────────────────────────────────────────
await p.locator('#sheet .nlrow').filter({hasText:'Banan'}).locator('.rm').tap();
await p.waitForTimeout(250);
ok('składnik da się wyrzucić  ['+(await rows()).join(', ')+']',
   (await rows()).length===2 && !(await rows()).includes('Banan'));
await p.locator('#sheet input[type="search"]').fill('jajko'); await p.waitForTimeout(350);
const hints = await p.locator('#sheet .chip .n').allInnerTexts();
ok('szukanie proponuje produkty  ['+hints.slice(0,2).join(' / ')+']',
   hints.length>0 && /Jajko/.test(hints[0]));
await p.locator('#sheet .chip').first().tap(); await p.waitForTimeout(300);
ok('i dokłada wybrany do zestawu  ['+(await rows()).join(', ')+']',
   (await rows()).length===3 && (await rows()).includes('Jajko'));
ok('pole szukania czyści się po dodaniu',
   (await p.locator('#sheet input[type="search"]').inputValue())==='');

// ── anulowanie naprawdę nie zapisuje ───────────────────────────────────────
await p.locator('#sheet .btn.alt').tap(); await p.waitForTimeout(400);
let st = await stored();
ok('„Anuluj” nie rusza zestawu  ['+st.items.length+' składniki, „'+st.n+'”]',
   st.items.length===3 && st.n==='Owsianka' && st.items[0].g===50);

// ── zapis ──────────────────────────────────────────────────────────────────
await openSet();
await p.locator('#sheet .nlrow').first().locator('.g button').last().tap();
await p.locator('#sheet .nlrow').filter({hasText:'Banan'}).locator('.rm').tap();
await p.waitForTimeout(200);
await p.locator('#sheet .field > input[type="text"]').fill('Owsianka mocniejsza');
await p.locator('#sheet .sheetrow .btn').last().tap(); await p.waitForTimeout(500);
st = await stored();
ok('zapis zmienia nazwę  ['+st.n+']', st.n==='Owsianka mocniejsza');
ok('zapis zmienia gramaturę i kcal  ['+st.items[0].g+' g / '+Math.round(st.items[0].k)+' kcal]',
   st.items[0].g===55 && Math.round(st.items[0].k)===205);
ok('zapis usuwa wyrzucony składnik  ['+st.items.map(i=>i.n).join(', ')+']',
   st.items.length===2 && !st.items.some(i=>i.n==='Banan'));
const card = (await p.locator('.card').first().innerText()).replace(/\n/g,' ');
ok('karta pokazuje nowy stan  ['+card.slice(0,52)+'…]',
   /Owsianka mocniejsza/.test(card) && /55 g/.test(card) && !/Banan/.test(card));
ok('mililitry nie są pokazywane jako gramy  ['+card+']', /250 ml/.test(card));

// ── dodanie poprawionego zestawu do dnia liczy nowe wartości ───────────────
await p.locator('.card .btn').first().tap(); await p.waitForTimeout(600);
const day = await p.evaluate(()=>{
  const L=JSON.parse(localStorage.getItem('makro.v1')).log;
  return Object.values(L).flat().map(e=>e.n+' '+Math.round(e.g)+'g');
});
ok('do dnia wpada poprawiona wersja  ['+day.join(', ')+']',
   day.length===2 && day.some(x=>/Płatki owsiane 55g/.test(x)) && !day.some(x=>/Banan/.test(x)));

// ── zestaw bez składników nie zapisuje się po cichu ────────────────────────
await p.locator('.tab').nth(2).tap(); await p.waitForTimeout(400);
await p.locator('.card .edit').first().tap(); await p.waitForTimeout(450);
for (let i=0;i<2;i++){ await p.locator('#sheet .nlrow .rm').first().tap(); await p.waitForTimeout(200) }
ok('pusty zestaw mówi, że nie ma czego dodawać',
   /nie ma czego dodawać/.test(await p.locator('#sheet .per').innerText()));
await p.locator('#sheet .sheetrow .btn').last().tap(); await p.waitForTimeout(400);
ok('i nie daje się zapisać', await p.locator('#sheet.on').count()===1);
st = await stored();
ok('zestaw w pamięci nietknięty  ['+st.items.length+' składniki]', st.items.length===2);

// ── nazwa jest wymagana ────────────────────────────────────────────────────
await p.locator('#sheet input[type="search"]').fill('banan'); await p.waitForTimeout(300);
await p.locator('#sheet .chip').first().tap(); await p.waitForTimeout(250);
await p.locator('#sheet .field > input[type="text"]').fill('');
await p.locator('#sheet .sheetrow .btn').last().tap(); await p.waitForTimeout(400);
ok('bez nazwy też nie zapisuje', await p.locator('#sheet.on').count()===1);

// ── usunięty produkt nie blokuje edycji ────────────────────────────────────
await p.locator('#sheet .btn.alt').tap(); await p.waitForTimeout(300);
await p.evaluate(()=>{
  const d=JSON.parse(localStorage.getItem('makro.v1'));
  d.sets[0].items=[{fid:'own-znikniety',n:'Znikniony produkt',g:100,u:'g',s:100,k:200,p:10,c:20,f:5}];
  localStorage.setItem('makro.v1',JSON.stringify(d));
});
await p.reload(); await p.waitForTimeout(600);
await openSet();
await p.locator('#sheet .nlrow').first().locator('.g button').last().tap();
await p.waitForTimeout(250);
const orphG = await p.locator('#sheet .nlrow .g .v input').first().inputValue();
const orph = (await p.locator('#sheet .nlrow').first().innerText()).replace(/\n/g,' ');
ok('składnik po usuniętym produkcie nadal skaluje się proporcjonalnie  ['+orphG+' g / '+orph+']',
   orphG==='110' && /220 kcal/.test(orph));

console.log('\n'+T.filter(t=>t.startsWith('PASS')).length+'/'+T.length+' PASS');
console.log(errs.length?'błędy JS: '+errs.join('; '):'błędy JS: brak');
await b.close();
process.exit(T.some(t=>t.startsWith('FAIL'))||errs.length?1:0);

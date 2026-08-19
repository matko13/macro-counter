/* Wariant produktu decyduje o kaloriach mocniej niż sam produkt: ryż suchy
   ma 355 kcal, ugotowany 130. Ta partia sprawdza, czy zdanie trafia w tę
   wersję, o której mówi użytkownik. */
import { chromium, APP, SHOTS } from './lib.mjs';
const T=[],ok=(n,c)=>{T.push((c?'PASS':'FAIL')+'  '+n);console.log(T[T.length-1])};
const b=await chromium.launch();
const p=await (await b.newContext({locale:'pl-PL'})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto(APP); await p.waitForTimeout(300);
const P = t => p.evaluate(txt=>window.MAKRO.parse(txt).items.map(x=>
  ({n:x.f.n,g:Math.round(x.g),kcal:Math.round(window.MAKRO.scale(x.f,x.g).k),warn:x.warn})),t);
const one = r => r.length===1 ? r[0] : {n:'('+r.length+' pozycji: '+r.map(x=>x.n).join(',')+')'};

// ── procenty tłuszczu ───────────────────────────────────────────────────────
let r=one(await P('szklanka mleka 3,2%'));
ok('„mleko 3,2%” to nie mleko 2%  ['+r.n+' '+r.g+' g]', r.n==='Mleko 3,2%' && r.g===250);
r=one(await P('2 łyżki śmietany 30%'));
ok('śmietana 30% ≠ 18%  ['+r.n+' '+r.kcal+' kcal]', r.n==='Śmietana 30%');
r=one(await P('jogurt grecki 0% 200 g'));
ok('procent nie zjada gramatury  ['+r.n+' '+r.g+' g]', r.n==='Jogurt grecki 0%' && r.g===200);
r=one(await P('mleko'));
ok('bez procentu zostaje wersja domyślna  ['+r.n+']', r.n==='Mleko 2%');
r=one(await P('mleko 7%'));
ok('nieistniejący procent nie podmienia produktu  ['+r.n+']', /Mleko/.test(r.n));

// ── warianty z nawiasu ──────────────────────────────────────────────────────
r=one(await P('100 g ryżu białego suchego'));
ok('ryż suchy to 355 kcal, nie 130  ['+r.n+' '+r.kcal+' kcal]', /suchy/.test(r.n) && r.kcal>300);
r=one(await P('150 g piersi z kurczaka z grilla'));
ok('kurczak z grilla ≠ surowy  ['+r.n+']', /grill/.test(r.n));
r=one(await P('makaron 300 g'));
ok('makaron domyślnie ugotowany  ['+r.n+']', /ugotowany/.test(r.n));

// ── nazwa zaczynająca się słowem funkcyjnym ─────────────────────────────────
r=one(await P('łyżka sosu sojowego'));
ok('„sos sojowy” to sos, nie napój sojowy  ['+r.n+']', r.n==='Sos sojowy');
r=one(await P('sos czosnkowy'));
ok('„sos czosnkowy” to nie ząbek czosnku  ['+r.n+']', r.n==='Sos czosnkowy');
r=await P('na wierzchu był topping z fety');
ok('a samo „topping” nadal nie jest produktem  ['+r.map(x=>x.n).join(',')+']',
   r.length===1 && r[0].n==='Feta');

// ── pisownia: łącznik, obce znaki ───────────────────────────────────────────
r=one(await P('chleb pszenno-żytni 2 kromki'));
ok('łącznik w nazwie nie blokuje trafienia  ['+r.n+' '+r.g+' g]',
   r.n==='Chleb pszenno-żytni' && r.g===80);
r=one(await P('crème brûlée'));
ok('obce znaki diakrytyczne działają  ['+r.n+']', r.n==='Crème brûlée');
r=one(await P('piña colada'));
ok('„piña colada” to nie cola  ['+r.n+']', r.n==='Piña colada');

// ── nazwa, w której siedzi jednostka ────────────────────────────────────────
r=one(await P('pomidory z puszki'));
ok('„z puszki” to część nazwy  ['+r.n+' '+r.g+' g]', r.n==='Pomidory z puszki');
r=one(await P('puszka pomidorów'));
ok('a „puszka pomidorów” to nadal miara  ['+r.n+' '+r.g+' g]', r.n==='Pomidor' && r.g===400);

// ── całe zdanie z wariantami ────────────────────────────────────────────────
r=await P('na obiad 150 g piersi z kurczaka z grilla, 100 g ryżu białego suchego i łyżka sosu sojowego');
ok('zdanie z trzema wariantami  ['+r.map(x=>x.n+' '+x.kcal).join(' | ')+']',
   r.length===3 && /grill/.test(r[0].n) && /suchy/.test(r[1].n) && r[2].n==='Sos sojowy');
const sum = r.reduce((a,x)=>a+x.kcal,0);
ok('suma zdania mieści się w rozsądku  ['+sum+' kcal]', sum>550 && sum<700);

console.log('\n'+T.filter(t=>t.startsWith('PASS')).length+'/'+T.length+' PASS');
console.log(errs.length?'błędy JS: '+errs.join('; '):'błędy JS: brak');
await b.close();
process.exit(T.some(t=>t.startsWith('FAIL'))||errs.length?1:0);

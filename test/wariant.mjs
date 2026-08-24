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

// ── ile waży łyżka zależy od tego, co się nabiera ──────────────────────────
/* Produkty liczone w łyżkach mają swoją wagę w bazie (oliwa 10 g), ale danie
   mierzone w porcjach spadało na ogólne 15 g — a czubata łyżka gęstej sałatki
   to 25–30 g. Efekt był najgorszego rodzaju: liczba wyglądała porządnie i była
   dwa razy za mała. */
const spoon = async (txt) => (await P(txt))[0];
let sp = await spoon('trzy łyżki sałatki jarzynowej');
ok('łyżka gęstej sałatki to ~28 g, nie 15  ['+sp.g+' g / '+sp.kcal+' kcal]',
   sp.g===84 && sp.kcal>140);
sp = await spoon('3 łyżki oliwy');
ok('a produkt z własną łyżką liczy się po swojemu  ['+sp.g+' g]', sp.g===30);
sp = await spoon('3 łyżki ryżu');
ok('ugotowany ryż to nie mąka — łyżka waży 18 g  ['+sp.g+' g]', sp.g===54);
sp = await spoon('2 łyżki płatków owsianych');
ok('a płatki są lekkie  ['+sp.g+' g]', sp.g===12);
sp = await spoon('łyżeczka cukru');
ok('łyżeczka to trzecia część łyżki  ['+sp.g+' g]', sp.g>=3&&sp.g<=5);
sp = await spoon('3 łyżki bigosu');
ok('każde danie dostaje wagę łyżki dania  ['+sp.f0+sp.g+' g]', sp.g===75);

// ── „na oko” w arkuszu dania ───────────────────────────────────────────────
/* Przy sałatce na imprezie „½ porcji” nic nie znaczy, a „trzy łyżki” znaczy. */
await p.locator('.tab').nth(1).click(); await p.waitForTimeout(300);
await p.locator('.search input').fill('sałatka jarzynowa'); await p.waitForTimeout(350);
await p.locator('.food .body').first().click(); await p.waitForTimeout(450);
const labs = (await p.locator('#sheet .field label').allInnerTexts()).join(' | ');
ok('danie ma wybór „na oko”  ['+labs+']', /Na oko/.test(labs));
const eyeChips = await p.locator('#sheet .field').filter({has:p.locator('label:text-is("Na oko")')})
  .locator('.seg button').allInnerTexts();
ok('w mowie potocznej, nie w ułamkach porcji  ['+eyeChips.join(' · ')+']',
   eyeChips[0]==='łyżka' && eyeChips.includes('3 łyżki') && eyeChips.includes('talerzyk'));
/* Pięć etykiet nie mieściło się w szerokości ekranu i ostatnia była ucięta. */
const fit = await p.evaluate(()=>{
  const seg=[...document.querySelectorAll('#sheet .seg')][0], r=seg.getBoundingClientRect();
  return [...seg.children].filter(k=>k.getBoundingClientRect().right>r.right+1).length;
});
ok('i żadna etykieta nie jest ucięta  ['+eyeChips.length+' zmieściło się]', fit===0);
await p.locator('#sheet .seg button:has-text("3 łyżki")').click(); await p.waitForTimeout(250);
const prev = (await p.locator('#sheet .preview').innerText()).replace(/\n/g,' ');
ok('tapnięcie daje gramy i kcal  ['+prev+']', /84 g/.test(prev) && /151/.test(prev));
await p.locator('#sheet .btn.alt').click(); await p.waitForTimeout(250);
await p.locator('.search input').fill('ryż biały ugotowany'); await p.waitForTimeout(350);
await p.locator('.food .body').first().click(); await p.waitForTimeout(450);
const gLabs = (await p.locator('#sheet .field label').allInnerTexts()).join(' | ');
ok('produkt w gramach zostaje przy gramach  ['+gLabs+']', !/Na oko/.test(gLabs));
await p.locator('#sheet .btn.alt').click(); await p.waitForTimeout(250);

console.log('\n'+T.filter(t=>t.startsWith('PASS')).length+'/'+T.length+' PASS');
console.log(errs.length?'błędy JS: '+errs.join('; '):'błędy JS: brak');
await b.close();
process.exit(T.some(t=>t.startsWith('FAIL'))||errs.length?1:0);

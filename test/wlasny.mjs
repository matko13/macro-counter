/* Etykiety odżywek, batonów i saszetek podają wartości NA PORCJĘ (30 g miarka),
   a nie na 100 g. Wcześniej formularz przyjmował tylko „na 100 g", więc trzeba
   było przeliczać w głowie — a to najkrótsza droga do złych liczb w bazie,
   których potem nikt nie wyłapie. */
import { chromium, devices, APP } from './lib.mjs';
const T=[],ok=(n,c)=>{T.push((c?'PASS':'FAIL')+'  '+n);console.log(T[T.length-1])};
const b=await chromium.launch();
const ctx=await b.newContext({...devices['iPhone 13'],locale:'pl-PL'});
const p=await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text())});
await p.goto(APP); await p.waitForTimeout(500);

const openForm = async () => {
  await p.locator('.tab').nth(1).tap(); await p.waitForTimeout(300);
  await p.locator('button:has-text("Dodaj własny produkt")').tap(); await p.waitForTimeout(400);
};
const inp = i => p.locator('#sheet .field input').nth(i);
const store = () => p.evaluate(()=>{
  /* po wyczyszczeniu klucza jeszcze nic nie ma — to normalny stan, nie błąd */
  const d=JSON.parse(localStorage.getItem('makro.v1')||'{}')||{};
  const es=Object.values(d.log||{}).flat();
  return {custom:d.custom||[], last:es[es.length-1]||null};
});
const wipe = () => p.evaluate(()=>localStorage.removeItem('makro.v1'));

// ── tryb „na porcję": etykieta odżywki przepisana wprost ───────────────────
await openForm();
ok('domyślnie wartości są na 100 g',
   (await p.locator('#sheet .seg button[aria-pressed="true"]').first().innerText())==='100 g');
await inp(0).fill('Whey wanilia');
await p.locator('#sheet .seg button:has-text("porcję")').tap(); await p.waitForTimeout(250);
const labs = (await p.locator('#sheet .field label').allInnerTexts()).join(' | ');
ok('etykiety pól mówią „na porcję”  ['+labs+']', /kcal \/ porcję/.test(labs) && /Ile waży porcja/.test(labs));
ok('domyślne 100 g w porcji wyczyszczone, żeby nie przeliczyć 1:1 po cichu',
   (await inp(5).inputValue())==='');
const hint = await p.locator('#sheet .note').innerText();
ok('i apka mówi, czego brakuje  ['+hint+']', /ile gramów waży jedna porcja/i.test(hint));

await inp(1).fill('120'); await inp(2).fill('24'); await inp(3).fill('2.5'); await inp(4).fill('1.5');
await inp(5).fill('30'); await p.waitForTimeout(250);
const prev = await p.locator('#sheet .note').innerText();
ok('podgląd pokazuje, co wyląduje w bazie  ['+prev+']',
   /400/.test(prev) && /80/.test(prev) && /100 g/.test(prev) && /30 g/.test(prev));

await p.locator('#sheet .sheetrow .btn').nth(1).tap(); await p.waitForTimeout(500);
let st = await store();
ok('w bazie wartości na 100 g  ['+st.custom[0].k+' kcal, B '+st.custom[0].p+']',
   st.custom[0].k===400 && st.custom[0].p===80 && st.custom[0].s===30);
ok('a wpis w dniu zgadza się z etykietą  ['+Math.round(st.last.k)+' kcal, B '+Math.round(st.last.p)+
   ', W '+(Math.round(st.last.c*10)/10)+', T '+Math.round(st.last.f)+' na '+st.last.g+' g]',
   st.last.g===30 && Math.round(st.last.k)===120 && Math.round(st.last.p)===24 &&
   Math.abs(st.last.c-2.5)<0.02 && Math.abs(st.last.f-1.5)<0.02);

// ── ten sam produkt dodany drugi raz liczy się tak samo ────────────────────
await p.locator('.tab').nth(1).tap(); await p.waitForTimeout(300);
await p.locator('.search input').fill('whey'); await p.waitForTimeout(300);
await p.locator('.addbtn').first().tap(); await p.waitForTimeout(400);
st = await store();
ok('drugie dodanie daje te same liczby  ['+Math.round(st.last.k)+' kcal / '+st.last.g+' g]',
   st.last.g===30 && Math.round(st.last.k)===120);

// ── tryb „na 100 g" nadal działa bez przeliczania ──────────────────────────
await wipe(); await p.reload(); await p.waitForTimeout(600);
await openForm();
await inp(0).fill('Ryż z paczki');
await inp(1).fill('350'); await inp(2).fill('7'); await inp(3).fill('78'); await inp(4).fill('1');
await inp(5).fill('60'); await p.waitForTimeout(200);
ok('w trybie 100 g nie ma podglądu przeliczenia (nie ma czego przeliczać)',
   (await p.locator('#sheet .note').innerText()).trim()==='');
await p.locator('#sheet .sheetrow .btn').nth(1).tap(); await p.waitForTimeout(500);
st = await store();
ok('wartości zapisane bez zmian  ['+st.custom[0].k+' kcal/100 g, porcja '+st.custom[0].s+' g]',
   st.custom[0].k===350 && st.custom[0].s===60);
ok('a wpis to porcja, nie 100 g  ['+Math.round(st.last.k)+' kcal / '+st.last.g+' g]',
   st.last.g===60 && Math.round(st.last.k)===210);

// ── porcja niecodzienna: 27 g baton ────────────────────────────────────────
await wipe(); await p.reload(); await p.waitForTimeout(600);
await openForm();
await inp(0).fill('Baton 27 g');
await p.locator('#sheet .seg button:has-text("porcję")').tap(); await p.waitForTimeout(200);
await inp(1).fill('131'); await inp(2).fill('11.4'); await inp(3).fill('9.9'); await inp(4).fill('5.2');
await inp(5).fill('27'); await p.waitForTimeout(200);
await p.locator('#sheet .sheetrow .btn').nth(1).tap(); await p.waitForTimeout(500);
st = await store();
ok('niecodzienna porcja odczytuje się z powrotem  ['+Math.round(st.last.k)+' kcal, B '+
   (Math.round(st.last.p*10)/10)+' na '+st.last.g+' g]',
   Math.round(st.last.k)===131 && Math.abs(st.last.p-11.4)<0.05 && st.last.g===27);

// ── brak wagi porcji nie zapisuje śmieci ───────────────────────────────────
await wipe(); await p.reload(); await p.waitForTimeout(600);
await openForm();
await inp(0).fill('Bez porcji');
await p.locator('#sheet .seg button:has-text("porcję")').tap(); await p.waitForTimeout(200);
await inp(1).fill('200'); await p.waitForTimeout(150);
await p.locator('#sheet .sheetrow .btn').nth(1).tap(); await p.waitForTimeout(400);
ok('bez wagi porcji arkusz nie zapisuje', await p.locator('#sheet.on').count()===1);
ok('i mówi dlaczego', /ile gramów waży jedna porcja/i.test(await p.locator('#sheet .note').innerText()));
st = await store();
ok('nic nie wpadło do bazy  ['+(st.custom?st.custom.length:0)+' własnych]', !st.custom || st.custom.length===0);

// ── powrót do 100 g przywraca sensowną porcję ──────────────────────────────
await p.locator('#sheet .seg button:has-text("100 g")').tap(); await p.waitForTimeout(200);
ok('powrót na 100 g przywraca porcję 100  ['+(await inp(5).inputValue())+']',
   (await inp(5).inputValue())==='100');
ok('etykiety wracają na 100 g',
   /kcal \/ 100 g/.test((await p.locator('#sheet .field label').allInnerTexts()).join(' | ')));

// ── nazwa jest wymagana ────────────────────────────────────────────────────
await inp(0).fill('');
await p.locator('#sheet .sheetrow .btn').nth(1).tap(); await p.waitForTimeout(300);
ok('bez nazwy też nie zapisuje', await p.locator('#sheet.on').count()===1);

// ── poprawianie i usuwanie własnego produktu ───────────────────────────────
/* Do tej pory własny produkt raz utworzony zostawał na zawsze — jedyną drogą
   było „Wyczyść wszystko", czyli skasowanie całej historii razem z nim.
   A błąd w wartościach własnego produktu liczy się dalej przy każdym dodaniu. */
await wipe(); await p.reload(); await p.waitForTimeout(600);
await openForm();
await inp(0).fill('Odżywka test');
await inp(1).fill('400'); await inp(2).fill('80'); await inp(3).fill('8'); await inp(4).fill('5');
await inp(5).fill('30');
await p.locator('#sheet .sheetrow .btn').last().tap(); await p.waitForTimeout(500);
st = await store();
ok('produkt utworzony i dodany do dnia  ['+Math.round(st.last.k)+' kcal]', Math.round(st.last.k)===120);

await p.locator('.tab').nth(1).tap(); await p.waitForTimeout(300);
await p.locator('.search input').fill('odżywka test'); await p.waitForTimeout(350);
ok('własny produkt ma na wierszu przycisk poprawiania', await p.locator('.food .edit').count()===1);
await p.locator('.search input').fill('jajko'); await p.waitForTimeout(350);
ok('a produkt z bazy go nie ma  ['+await p.locator('.food').count()+' wierszy]',
   await p.locator('.food').count()>0 && await p.locator('.food .edit').count()===0);

await p.locator('.search input').fill('odżywka test'); await p.waitForTimeout(350);
await p.locator('.food .edit').first().tap(); await p.waitForTimeout(450);
ok('otwiera się poprawianie, nie tworzenie nowego',
   (await p.locator('#sheet h3').innerText())==='Popraw produkt');
ok('z wypełnionymi wartościami  ['+await inp(1).inputValue()+' kcal, porcja '+await inp(5).inputValue()+']',
   (await inp(1).inputValue())==='400' && (await inp(5).inputValue())==='30');

await inp(1).fill('370');
await p.locator('#sheet .sheetrow .btn').last().tap(); await p.waitForTimeout(500);
ok('po zmianie wartości apka pyta o zapisane pozycje',
   (await p.locator('#sheet h3').innerText())==='Przeliczyć zapisane pozycje?');
const per = await p.locator('#sheet .per').innerText();
ok('podaje ile pozycji i jaka będzie różnica  ['+per.slice(0,60)+'…]',
   /1 zapisanej pozycji/.test(per) && /111/.test(per) && /120/.test(per));

// „Zostaw jak było” nie rusza dziennika
await p.locator('#sheet button:has-text("Zostaw jak było")').tap(); await p.waitForTimeout(400);
st = await store();
ok('„Zostaw jak było” nie przepisuje historii  ['+Math.round(st.last.k)+' kcal]', Math.round(st.last.k)===120);
ok('ale produkt jest już poprawiony  ['+st.custom[0].k+' kcal/100 g]', st.custom[0].k===370);

// nowe dodanie liczy się już nową wartością
await p.locator('.tab').nth(1).tap(); await p.waitForTimeout(300);
await p.locator('.search input').fill('odżywka test'); await p.waitForTimeout(350);
await p.locator('.addbtn').first().tap(); await p.waitForTimeout(450);
st = await store();
ok('kolejne dodanie używa nowej wartości  ['+Math.round(st.last.k)+' kcal]', Math.round(st.last.k)===111);

// przeliczenie historii, gdy poprzednie liczby były po prostu błędne
await p.locator('.food .edit').first().tap(); await p.waitForTimeout(450);
await inp(1).fill('300');
await p.locator('#sheet .sheetrow .btn').last().tap(); await p.waitForTimeout(500);
await p.locator('#sheet button:has-text("Przelicz")').tap(); await p.waitForTimeout(500);
st = await store();
const allK = await p.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('makro.v1')).log)
  .flat().map(e=>Math.round(e.k)));
ok('„Przelicz” poprawia wszystkie pozycje tego produktu  ['+allK.join(', ')+']',
   allK.length===2 && allK.every(k=>k===90));

// ── zmiana nazwy musi odświeżyć wyszukiwanie ───────────────────────────────
/* Indeks przeliczał się, gdy zmieniała się LICZBA własnych produktów — przy
   edycji liczba zostaje ta sama, więc stara nazwa dalej by się dopasowywała. */
await p.locator('.food .edit').first().tap(); await p.waitForTimeout(450);
await inp(0).fill('Maślanka babci');
await p.locator('#sheet .sheetrow .btn').last().tap(); await p.waitForTimeout(600);
if (await p.locator('#sheet.on').count()) { await p.locator('#sheet .btn.alt').tap(); await p.waitForTimeout(300) }
const found = await p.evaluate(()=>window.MAKRO.parse('maślanka babci').items.map(i=>i.f.n));
ok('nowa nazwa jest do znalezienia od razu  ['+found.join(',')+']', found[0]==='Maślanka babci');
const gone = await p.evaluate(()=>window.MAKRO.parse('odżywka test').items.map(i=>i.f.n));
ok('a stara nazwa nie wskazuje już na ten produkt  ['+(gone.join(',')||'nic')+']',
   !gone.some(n=>/Odżywka test/.test(n)));
/* Wyszukiwarka to inna ścieżka niż parser i ma własny cache (słowa nazwy
   zapamiętane na produkcie) — po zmianie nazwy produkt z niej wypadał. */
await p.locator('.tab').nth(1).tap(); await p.waitForTimeout(300);
await p.locator('.search input').fill('maślanka babci'); await p.waitForTimeout(400);
ok('i wyszukiwarka też widzi nową nazwę  ['+(await p.locator('.food b').allInnerTexts()).join(', ')+']',
   (await p.locator('.food b').allInnerTexts()).some(t=>t==='Maślanka babci'));

// ── usuwanie ───────────────────────────────────────────────────────────────
await p.locator('.tab').nth(1).tap(); await p.waitForTimeout(300);
await p.locator('.search input').fill('maślanka babci'); await p.waitForTimeout(350);
await p.locator('.food .edit').first().tap(); await p.waitForTimeout(450);
await p.locator('#sheet button:has-text("Usuń produkt")').tap(); await p.waitForTimeout(450);
ok('usuwanie prosi o potwierdzenie', /Usunąć/.test(await p.locator('#sheet h3').innerText()));
const warn = await p.locator('#sheet .per').innerText();
ok('i mówi wprost, że dziennik zostaje  ['+warn.slice(0,50)+'…]',
   /2 zapisane pozycje/.test(warn) && /bez zmian/.test(warn));
await p.locator('#sheet button:has-text("Usuń")').last().tap(); await p.waitForTimeout(500);
st = await store();
ok('produkt zniknął z bazy  ['+st.custom.length+' własnych]', st.custom.length===0);
const kept = await p.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('makro.v1')).log).flat().length);
ok('a historia została nietknięta  ['+kept+' pozycji w dzienniku]', kept===2);
ok('jest Cofnij', /Cofnij/.test(await p.locator('.toast').innerText()));
await p.locator('.toast button').tap(); await p.waitForTimeout(450);
st = await store();
ok('Cofnij przywraca produkt  ['+st.custom.length+' własnych]', st.custom.length===1);

console.log('\n'+T.filter(t=>t.startsWith('PASS')).length+'/'+T.length+' PASS');
console.log(errs.length?'błędy JS: '+errs.join('; '):'błędy JS: brak');
await b.close();
process.exit(T.some(t=>t.startsWith('FAIL'))||errs.length?1:0);

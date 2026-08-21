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

console.log('\n'+T.filter(t=>t.startsWith('PASS')).length+'/'+T.length+' PASS');
console.log(errs.length?'błędy JS: '+errs.join('; '):'błędy JS: brak');
await b.close();
process.exit(T.some(t=>t.startsWith('FAIL'))||errs.length?1:0);

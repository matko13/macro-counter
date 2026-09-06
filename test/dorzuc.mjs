/* Dokładanie produktu do podyktowanego posiłku.

   Dyktowanie nigdy nie złapie wszystkiego: jedna rzecz spoza bazy albo
   zwyczajnie zapomniana i trzeba było powtarzać cały opis. Ten zestaw
   pilnuje, że da się ją dołożyć na miejscu — i że dołożona pozycja
   zachowuje się jak każda inna: da się jej zmienić gramaturę, usunąć ją,
   wchodzi do sumy, do dziennika i do zapisanego zestawu. */
import { chromium, devices, APP } from './lib.mjs';
const T=[],ok=(n,c)=>{T.push((c?'PASS':'FAIL')+'  '+n);console.log(T[T.length-1])};
const b=await chromium.launch();
const ctx=await b.newContext({...devices['iPhone 13'],locale:'pl-PL'});
const p=await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto(APP); await p.waitForTimeout(400);

const dyktuj = async (tekst) => {
  await p.locator('.tab').nth(0).click(); await p.waitForTimeout(250);
  await p.locator('.nlmain').first().tap(); await p.waitForTimeout(400);
  await p.locator('#sheet textarea').fill(tekst);
  await p.getByRole('button',{name:'Rozpoznaj'}).tap(); await p.waitForTimeout(450);
};
const wiersze = () => p.locator('#sheet .nlrow .n b').allInnerTexts();
/* Suma siedzi w podglądzie (.preview .v), a nie w wierszach — czytanie
   pierwszego „N kcal" ze arkusza łapie kalorie pierwszej pozycji. */
const suma = async () => {
  const t = await p.locator('#sheet .nltot .v').first().innerText();
  return +t.replace(/\s/g,'');
};

// ── pole jest tam, gdzie ma być ────────────────────────────────────────────
await dyktuj('dwa jajka i 150 g ryżu');
ok('podgląd pokazuje, co rozpoznano  ['+(await wiersze()).join(', ')+']',
   (await wiersze()).length===2);
const pole = p.locator('#sheet input[placeholder="Dorzuć produkt"]');
ok('jest pole do dołożenia produktu', await pole.count()===1);

// ── szukanie i dołożenie ───────────────────────────────────────────────────
await pole.fill('masło orzechowe'); await p.waitForTimeout(300);
const podpowiedzi = await p.locator('#sheet .chip.ghost').allInnerTexts();
ok('podpowiada produkty z bazy  ['+podpowiedzi.slice(0,2).join(' | ')+']',
   podpowiedzi.length>0 && /orzechowe/i.test(podpowiedzi[0]));

const przedK = await suma();
await p.locator('#sheet .chip.ghost').first().tap(); await p.waitForTimeout(400);
const po = await wiersze();
ok('dołożony produkt wchodzi na listę  ['+po.join(', ')+']',
   po.length===3 && po.some(x=>/orzechowe/i.test(x)));
ok('i podnosi sumę  ['+przedK+' → '+await suma()+' kcal]', (await suma())>przedK);

/* Pole ma się wyczyścić po dołożeniu — inaczej druga rzecz wymaga
   kasowania poprzedniego wpisu. */
ok('pole jest puste i gotowe na następny  ['+JSON.stringify(await pole.inputValue())+']',
   (await pole.inputValue())==='');
ok('podpowiedzi znikają', await p.locator('#sheet .chip.ghost').count()===0);

// ── dołożona pozycja zachowuje się jak każda inna ──────────────────────────
const rzad = p.locator('#sheet .nlrow').filter({hasText:/orzechowe/i}).first();
const przedG = await rzad.innerText();
await rzad.getByRole('button',{name:/Więcej/}).tap(); await p.waitForTimeout(300);
ok('da się jej zmienić gramaturę  ['+przedG.split('\n')[1]+' → '+
   (await p.locator('#sheet .nlrow').filter({hasText:/orzechowe/i}).first().innerText()).split('\n')[1]+']',
   (await p.locator('#sheet .nlrow').filter({hasText:/orzechowe/i}).first().innerText())!==przedG);

// ── druga pozycja z rzędu ──────────────────────────────────────────────────
await pole.fill('banan'); await p.waitForTimeout(300);
await p.locator('#sheet .chip.ghost').first().tap(); await p.waitForTimeout(400);
ok('da się dołożyć kolejny  ['+(await wiersze()).length+' pozycje]',
   (await wiersze()).length===4);

// ── i da się ją usunąć ─────────────────────────────────────────────────────
await p.locator('#sheet .nlrow').filter({hasText:/Banan/i}).first()
  .getByRole('button',{name:/Usuń|Wyrzuć|^×$/}).first().tap().catch(async()=>{
    await p.locator('#sheet .nlrow').filter({hasText:/Banan/i}).first().locator('.rm').tap();
  });
await p.waitForTimeout(350);
ok('i usunąć  ['+(await wiersze()).length+' pozycje]', (await wiersze()).length===3);

// ── trafia do dziennika ────────────────────────────────────────────────────
await p.getByRole('button',{name:/^Dodaj \d/}).tap(); await p.waitForTimeout(600);
const dziennik = await p.evaluate(()=>{
  const S=JSON.parse(localStorage.getItem('makro.v1'));
  const d=new Date(), k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  return (S.log[k]||[]).map(e=>e.n);
});
ok('dołożony produkt trafia do dziennika  ['+dziennik.join(', ')+']',
   dziennik.length===3 && dziennik.some(x=>/orzechowe/i.test(x)));

// ── i do zapisanego zestawu ────────────────────────────────────────────────
await p.evaluate(()=>localStorage.removeItem('makro.v1'));
await p.reload(); await p.waitForTimeout(500);
await dyktuj('dwa jajka i 150 g ryżu');
await p.locator('#sheet input[placeholder="Dorzuć produkt"]').fill('banan');
await p.waitForTimeout(300);
await p.locator('#sheet .chip.ghost').first().tap(); await p.waitForTimeout(400);
await p.locator('#sheet .toggle').scrollIntoViewIfNeeded();
await p.locator('#sheet .toggle').tap(); await p.waitForTimeout(300);
/* Pól type=text jest kilka — gramatury też nimi są. Nazwę zestawu bierzemy
   po etykiecie, nie po kolejności. */
await p.locator('#sheet .field').filter({hasText:'Nazwa zestawu'})
  .locator('input').fill('Śniadanie testowe');
await p.getByRole('button',{name:/^Dodaj \d/}).tap(); await p.waitForTimeout(600);
const zestaw = await p.evaluate(()=>{
  const S=JSON.parse(localStorage.getItem('makro.v1'));
  return (S.sets||[]).map(s=>s.n+': '+s.items.map(i=>i.n).join(', '));
});
ok('dołożony produkt trafia też do zapisanego zestawu  ['+(zestaw[0]||'BRAK')+']',
   zestaw.length===1 && /Banan/i.test(zestaw[0]));

// ── ułamek obejmuje też dołożone ───────────────────────────────────────────
/* Decyzja, nie przeoczenie. „Ile z tego zjadłeś” odnosi się do CAŁEJ listy,
   a dołożona pozycja jest już jej częścią. Gdyby ułamek omijał dołożone,
   połowa wierszy skalowałaby się, a połowa nie — i nie dałoby się na oko
   powiedzieć, które. Podgląd pokazuje pełną gramaturę dania, dziennik
   zjedzoną — tak samo dla wszystkich pozycji. */
await p.evaluate(()=>localStorage.removeItem('makro.v1'));
await p.reload(); await p.waitForTimeout(500);
await dyktuj('zapiekanka z 4 jaj i 2 serków wiejskich, zjadłem połowę');
const cz = p.locator('#sheet .field').filter({hasText:'Ile z tego zjadłeś'});
ok('opis ustawił ½  ['+await cz.locator('button[aria-pressed="true"]').innerText()+']',
   (await cz.locator('button[aria-pressed="true"]').innerText())==='½');
await p.locator('#sheet input[placeholder="Dorzuć produkt"]').fill('banan');
await p.waitForTimeout(300);
await p.locator('#sheet .chip.ghost').first().tap(); await p.waitForTimeout(400);
const wBanan = await p.locator('#sheet .nlrow').filter({hasText:/Banan/}).first().innerText();
ok('podgląd pokazuje pełną gramaturę  ['+wBanan.split('\n')[1]+']', /120 g/.test(wBanan));
await p.getByRole('button',{name:/^Dodaj \d/}).tap(); await p.waitForTimeout(600);
const wpisy = await p.evaluate(()=>{
  const S=JSON.parse(localStorage.getItem('makro.v1'));
  const d=new Date(), k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  return (S.log[k]||[]).map(e=>e.n+':'+e.g);
});
ok('a do dziennika idzie połowa — tak samo jak reszta  ['+wpisy.join(', ')+']',
   wpisy.some(x=>x==='Banan:60'));

console.log('\n'+T.filter(t=>t.startsWith('PASS')).length+'/'+T.length+' PASS');
console.log(errs.length?'błędy JS: '+errs.join('; '):'błędy JS: brak');
await b.close();
process.exit(T.some(t=>t.startsWith('FAIL'))||errs.length?1:0);

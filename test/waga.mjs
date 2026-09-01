/* Cel liczony z pomiaru zamiast ze wzoru. Wzór Mifflina opisuje statystycznego
   człowieka o danych wymiarach, a mnożnik aktywności użytkownik zgaduje sam.
   Przy znanym spożyciu tempo zmiany wagi mówi, ile realnie spala:

       zapotrzebowanie = średnie spożycie − (zmiana wagi × 7700 kcal/kg)

   Ta partia pilnuje i matematyki, i tego, kiedy apce NIE wolno podać wyniku. */
import { chromium, devices, APP } from './lib.mjs';
const T=[],ok=(n,c)=>{T.push((c?'PASS':'FAIL')+'  '+n);console.log(T[T.length-1])};
const b=await chromium.launch();
const ctx=await b.newContext({...devices['iPhone 13'],locale:'pl-PL'});
const p=await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text())});
await p.goto(APP); await p.waitForTimeout(500);

/* Wstawiamy historię: spożycie stałe, waga po prostej o zadanym nachyleniu.
   skipLog: co ile dni pominąć zapis jedzenia. noise: amplituda szumu wagi. */
const seed = (o) => p.evaluate(c=>{
  const dk=n=>{const d=new Date();d.setDate(d.getDate()-n);
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
  const log={},wt={};
  for(let i=0;i<c.days;i++){
    if(!(c.skipLog && i%c.skipLog===0))
      log[dk(i)]=[{fid:'jajko',n:'Dzień',g:100,u:'g',s:100,k:c.intake,p:10,c:10,f:10,t:Date.now()-i*86400000}];
    if(!(c.everyN && i%c.everyN!==0))
      wt[dk(i)]=Math.round((80 - i*c.kgWeek/7 + (c.noise?Math.sin(i*2.3)*c.noise:0))*100)/100;
  }
  localStorage.setItem('makro.v1',JSON.stringify({log,wt,custom:[],sets:[],usage:{},
    goal:{k:2200,p:150,c:230,f:70},profile:{sex:'m',age:32,w:80,h:181,act:1.55,aim:-0.2},
    theme:'auto',split:'bal'}));
}, o);
const reload = async () => { await p.reload(); await p.waitForTimeout(600) };
const stat = () => p.evaluate(()=>{
  const r=window.MAKRO.tdee();
  return {ok:r.ok,why:r.why,need:r.need,tdee:r.tdee,mean:r.mean,logged:r.logged,span:r.span,
          kgw:r.fit?Math.round(r.fit.slope*7*100)/100:null};
});
const expect = (intake,kgWeek) => Math.round((intake - kgWeek/7*7700)/10)*10;

// ── matematyka ─────────────────────────────────────────────────────────────
for (const [intake,kgWeek,days] of [[2400,-0.5,28],[2400,0,28],[2000,-1,21],[3000,0.5,28]]) {
  await seed({intake,kgWeek,days});
  await reload();
  const r=await stat();
  ok(`spożycie ${intake} przy ${kgWeek} kg/tyg → ${r.tdee} kcal  [oczekiwane ${expect(intake,kgWeek)}]`,
     r.ok && r.tdee===expect(intake,kgWeek));
}

// ── szum dzienny nie może przewrócić wyniku ────────────────────────────────
await seed({intake:2400,kgWeek:-0.5,days:28,noise:0.9});
await reload();
let r=await stat();
ok('szum ±0,9 kg nie psuje tempa  ['+r.kgw+' kg/tyg, '+r.tdee+' kcal]',
   r.ok && Math.abs(r.kgw+0.5)<0.12 && Math.abs(r.tdee-2950)<120);

// ── kiedy apka NIE ma prawa podać wyniku ───────────────────────────────────
await seed({intake:2400,kgWeek:-0.5,days:28,everyN:99});
await reload();
r=await stat();
ok('jeden pomiar to nie trend  [why='+r.why+', brakuje '+r.need+']', !r.ok && r.why==='wagi');

await seed({intake:2400,kgWeek:-0.5,days:8});
await reload();
r=await stat();
ok('osiem dni to za krótko  [why='+r.why+']', !r.ok && (r.why==='czas'||r.why==='wagi'));

await seed({intake:2400,kgWeek:-0.5,days:28,skipLog:2});
await reload();
r=await stat();
ok('połowa dni bez zapisu jedzenia = brak wyniku  [why='+r.why+', dni '+r.logged+'/'+r.span+']',
   !r.ok && r.why==='dni');

await seed({intake:2400,kgWeek:-0.5,days:28,skipLog:8});
await reload();
r=await stat();
ok('kilka dni bez zapisu jeszcze przechodzi  ['+r.logged+'/'+r.span+' dni]', r.ok);

// ── ekran: karta w „Ja” ────────────────────────────────────────────────────
await seed({intake:2400,kgWeek:-0.5,days:28});
await reload();
const rowTxt = await p.locator('.nlcard').last().innerText();
ok('wiersz wagi na Dziś pokazuje pomiar i trend  ['+rowTxt.replace(/\n/g,' · ')+']',
   /Waga/.test(rowTxt) && /trend/.test(rowTxt) && /kg\/tyg/.test(rowTxt));
await p.locator('.tab').nth(3).tap(); await p.waitForTimeout(500);
const kal = (await p.locator('.card').allInnerTexts()).find(c=>/Cel z Twoich danych/.test(c))||'';
ok('karta kalibracji podaje liczbę  ['+(kal.match(/\d{4}/)||[''])[0]+' kcal]', /2950/.test(kal));
/* Sprawdzamy liczby, na których stoi wynik, a nie zdania wokół nich —
   inaczej każde skrócenie tekstu wygląda jak zepsuta funkcja. */
ok('podaje, z ilu dni i z jakiego tempa liczy', /28 dni/.test(kal) && /0,50/.test(kal));
ok('zestawia pomiar ze wzorem  ['+(kal.match(/Wzór[^·\n]*/)||[''])[0].trim()+']',
   /Wzór/.test(kal) && /Pomiar/.test(kal));

// ── ustawienie celu z pomiaru ──────────────────────────────────────────────
const goalBefore = await p.evaluate(()=>JSON.parse(localStorage.getItem('makro.v1')).goal.k);
await p.locator('button:has-text("Ustaw cel z pomiaru")').tap(); await p.waitForTimeout(500);
const goalAfter = await p.evaluate(()=>JSON.parse(localStorage.getItem('makro.v1')).goal.k);
ok('cel ustawiony z pomiaru, z uwzględnieniem redukcji  ['+goalBefore+' → '+goalAfter+']',
   goalAfter===Math.round(2950*0.8/10)*10);
const mac = await p.evaluate(()=>{const g=JSON.parse(localStorage.getItem('makro.v1')).goal;
  return Math.abs(g.p*4+g.c*4+g.f*9-g.k)<60});
ok('makro przeliczone pod nowy cel', mac);

// ── wpisywanie wagi ────────────────────────────────────────────────────────
await p.evaluate(()=>localStorage.setItem('makro.v1',JSON.stringify({log:{},wt:{},custom:[],sets:[],
  usage:{},goal:{k:2200,p:150,c:230,f:70},profile:{sex:'m',age:32,w:80,h:181,act:1.55,aim:0},
  theme:'auto',split:'bal'})));
await reload();
const empty = await p.locator('.nlcard').last().innerText();
ok('bez pomiarów apka zaprasza, nie pokazuje zera  ['+empty.replace(/\n/g,' · ')+']',
   /Dodaj wagę/.test(empty));
await p.locator('.nlcard').last().tap(); await p.waitForTimeout(450);
ok('arkusz wagi otwarty', (await p.locator('#sheet.on h3').innerText())==='Waga');
/* Liczba jest teraz wartością pola, nie tekstem — da się ją też wpisać. */
const wInp = p.locator('#sheet .stepper .val input');
ok('startuje od wagi z profilu, nie od zera  ['+await wInp.inputValue()+']',
   (await wInp.inputValue())==='80,0');
await p.locator('#sheet .seg button:has-text("+1")').tap(); await p.waitForTimeout(150);
await p.locator('#sheet .stepper button').last().tap(); await p.waitForTimeout(150);
ok('skok i krok po 0,1 kg  ['+await wInp.inputValue()+']', (await wInp.inputValue())==='81,1');
await p.locator('#sheet .sheetrow .btn').last().tap(); await p.waitForTimeout(500);
const saved = await p.evaluate(()=>{const d=JSON.parse(localStorage.getItem('makro.v1'));
  return {wt:Object.values(d.wt)[0],prof:d.profile.w}});
ok('pomiar zapisany  ['+saved.wt+' kg]', saved.wt===81.1);
ok('waga w kalkulatorze idzie za pomiarem  [profil: '+saved.prof+' kg]', saved.prof===81.1);
await reload();
ok('i przetrwał przeładowanie', /81,1/.test(await p.locator('.nlcard').last().innerText()));

// ── usunięcie pomiaru ──────────────────────────────────────────────────────
await p.locator('.nlcard').last().tap(); await p.waitForTimeout(450);
await p.locator('#sheet .btn.danger').tap(); await p.waitForTimeout(500);
ok('pomiar da się usunąć  ['+(await p.locator('.nlcard').last().innerText()).replace(/\n/g,' · ')+']',
   /Dodaj wagę/.test(await p.locator('.nlcard').last().innerText()));

// ── waga przechodzi przez kopię zapasową ───────────────────────────────────
await p.locator('.nlcard').last().tap(); await p.waitForTimeout(400);
await p.locator('#sheet .sheetrow .btn').last().tap(); await p.waitForTimeout(400);
await p.locator('.tab').nth(3).tap(); await p.waitForTimeout(400);
await p.locator('button:has-text("Kopia zapasowa")').first().tap(); await p.waitForTimeout(400);
const json = await p.locator('#sheet textarea').inputValue();
ok('kopia zapasowa zawiera wagę', /"wt"\s*:\s*\{\s*"\d{4}-\d{2}-\d{2}"/.test(json));

console.log('\n'+T.filter(t=>t.startsWith('PASS')).length+'/'+T.length+' PASS');
console.log(errs.length?'błędy JS: '+errs.join('; '):'błędy JS: brak');
await b.close();
process.exit(T.some(t=>t.startsWith('FAIL'))||errs.length?1:0);

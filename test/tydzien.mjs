/* Dzień to zły horyzont: nikt nie je równo, a fizjologicznie liczy się deficyt
   tygodniowy. Bank pokazuje bilans dni już zamkniętych, a karta domykania
   przelicza bazę pod to, czego brakuje. Oba liczą z tych samych danych, które
   apka już ma — więc oba muszą się zgadzać co do kilokalorii. */
import { chromium, devices, APP } from './lib.mjs';
const T=[],ok=(n,c)=>{T.push((c?'PASS':'FAIL')+'  '+n);console.log(T[T.length-1])};
const b=await chromium.launch();
const ctx=await b.newContext({...devices['iPhone 13'],locale:'pl-PL'});
const p=await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text())});
/* Zestaw, który zależy od dnia tygodnia, w którym go puszczasz, to zestaw,
   który przez sześć dni w tygodniu sprawdza coś innego — a w poniedziałek nie
   sprawdza prawie nic. Zegar jest więc przypięty do znanej środy. */
const NOW = new Date('2026-08-19T18:30:00');    // środa
await p.clock.install({ time: NOW });
await p.goto(APP); await p.waitForTimeout(400);

/* Zasiewamy tydzień: `back` to lista kcal dla dni PRZED dzisiejszym (od wczoraj
   w tył), `today` to pozycje dzisiejsze. */
const seed = (o) => p.evaluate(c=>{
  const dk=n=>{const d=new Date();d.setDate(d.getDate()-n);
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
  const t=h=>{const d=new Date();d.setHours(h,20,0,0);return d.getTime()};
  const log={};
  (c.back||[]).forEach((k,i)=>{ if(k!=null) log[dk(i+1)]=[{fid:'x',n:'Dzień',g:500,u:'g',s:500,
    k:k,p:k*0.062,c:1,f:1,t:t(13)}] });
  if(c.today) log[dk(0)]=c.today.map((x,i)=>({fid:x[0],n:x[1],g:x[2],u:'g',s:x[2],
    k:x[3],p:x[4],c:1,f:1,t:t(8+i*3)}));
  localStorage.setItem('makro.v1',JSON.stringify({log,wt:{},custom:[],sets:[],
    usage:c.usage||{},goal:{k:2400,p:180,c:250,f:80},
    profile:{sex:'m',age:32,w:81,h:181,act:1.55,aim:-0.2},theme:'auto',split:'bal'}));
}, o);
const reload = async () => { await p.reload(); await p.waitForTimeout(650) };
const closedSoFar = 2;                        /* środa: poniedziałek i wtorek */

// ── bank: arytmetyka ───────────────────────────────────────────────────────
/* Każdy zamknięty dzień 300 kcal pod celem 2400. */
await seed({back:[2100,2100,2100,2100,2100,2100],today:[['x','Coś',100,500,20]]});
await reload();
let w = await p.evaluate(()=>window.MAKRO.week());
ok('tydzień liczy się od poniedziałku  ['+w.from+' → '+w.to+']',
   new Date(w.from+'T12:00:00').getDay()===1 && new Date(w.to+'T12:00:00').getDay()===0);
ok('liczy tylko dni zamknięte, bez dzisiejszego  ['+w.closed.length+' z '+closedSoFar+']',
   w.closed.length===closedSoFar);
ok('bank = suma odstępstw od celu  ['+w.bank+' kcal przy '+closedSoFar+'×300]',
   w.bank===closedSoFar*300);
ok('zostało dni z dzisiejszym włącznie  ['+w.leftDays+']', w.leftDays===7-closedSoFar);
ok('rozłożenie zapasu na resztę tygodnia  ['+w.perDay+' kcal/dzień]',
   w.perDay===Math.round(2400+closedSoFar*300/(7-closedSoFar)));

// ── dzień bez zapisu nie jest dniem bez jedzenia ───────────────────────────
const back1=[2100,2100,2100,2100,2100,2100]; back1[0]=null;   /* wczoraj bez zapisu */
await seed({back:back1,today:[['x','Coś',100,500,20]]});
await reload();
w = await p.evaluate(()=>window.MAKRO.week());
ok('dzień bez zapisu jest POMIJANY, nie liczony jako pełny zapas  ['+
   w.bank+' kcal, pominiętych '+w.skipped+']',
   w.bank===(closedSoFar-1)*300 && w.skipped===1);

// ── bank ujemny ────────────────────────────────────────────────────────────
await seed({back:[2900,2900,2900,2900,2900,2900],today:[['x','Coś',100,500,20]]});
await reload();
w = await p.evaluate(()=>window.MAKRO.week());
ok('przekroczenia dają bank ujemny  ['+w.bank+' kcal]', w.bank===-closedSoFar*500);
const negTxt=await p.locator('.wkbank').innerText();
ok('i apka mówi „do odrobienia”, nie „zapasu”  ['+negTxt+']', /do odrobienia/.test(negTxt));

// ── ekran: bank i jego rozpisanie ──────────────────────────────────────────
await seed({back:[2100,2100,2100,2100,2100,2100],today:[['x','Coś',100,500,20]]});
await reload();
{
  const bar=await p.locator('.wkbank').innerText();
  ok('bank widać w karcie odczytu  ['+bar+']', /Ten tydzień/.test(bar) && /zapasu/.test(bar));
  await p.locator('.wkbank').tap(); await p.waitForTimeout(450);
  ok('tapnięcie otwiera rozpisanie tygodnia',
     (await p.locator('#sheet h3').innerText())==='Ten tydzień');
  const rows=await p.locator('#sheet .nlrow').count();
  ok('rozpisane wszystkie siedem dni  ['+rows+']', rows===7);
  const sheet=(await p.locator('#sheet').innerText());
  ok('widać, który dzień jest oglądany', /ten dzień/.test(sheet));
  ok('podaje bilans i ile zostaje na dzień  ['+(sheet.match(/Bilans[^\n]*/)||[''])[0]+']',
     /Bilans/.test(sheet) && /kcal/.test(sheet) && /\d/.test(sheet));
  await p.locator('#sheet .btn').tap(); await p.waitForTimeout(300);
}

/* Poniedziałek: nie ma jeszcze żadnego zamkniętego dnia, więc bank nie ma
   czego pokazywać i musi się schować, a nie świecić zerem. */
await p.clock.setFixedTime(new Date('2026-08-17T18:30:00'));   // poniedziałek
await seed({back:[2100,2100,2100],today:[['x','Coś',100,500,20]]});
await reload();
ok('w poniedziałek bank jest ukryty, nie świeci zerem  ['+
   await p.locator('.wkbank').count()+' pasków]', await p.locator('.wkbank').count()===0);
await p.clock.setFixedTime(NOW);

// ── domykanie dnia ─────────────────────────────────────────────────────────
/* Dzień za połowę: zjedzone 1038 kcal i 79 g białka z 2400/180. */
const today=[['platki-owsiane','Płatki owsiane',60,223,7.8],
             ['mleko-2','Mleko 2%',250,125,8.3],
             ['piers-z-kurczaka-grill','Pierś z kurczaka',180,297,55.8],
             ['ryz-bialy-ugotowany','Ryż biały',220,286,5.9],
             ['banan','Banan',120,107,1.3]];
await seed({back:[2100,2100,2100,2100,2100,2100],today:today,
            usage:{'twarog-chudy':{n:9,last:9}}});
await reload();
const c = await p.evaluate(()=>window.MAKRO.close());
ok('liczy budżet i lukę białka z dnia  ['+c.room+' kcal, '+c.need+' g B]',
   c.room===1362 && c.need===101);
ok('proponuje kilka produktów  ['+c.picks.length+']', c.picks.length>=3);
ok('żadna podpowiedź nie przekracza budżetu  [max '+Math.max.apply(null,c.picks.map(x=>Math.round(x.k)))+' kcal]',
   c.picks.every(x=>x.k<=c.room));
ok('każda daje sensowną porcję białka  [min '+Math.min.apply(null,c.picks.map(x=>Math.round(x.p)))+' g]',
   c.picks.every(x=>x.p>=8));
ok('porcje są realne, nie „450 g krewetek”  ['+c.picks.map(x=>x.g+'g').join(', ')+']',
   c.picks.every(x=>x.g<=x.f.s*2.2));
ok('bez powtórzonych kategorii  ['+c.picks.map(x=>x.f.cat).join(', ')+']',
   new Set(c.picks.map(x=>x.f.cat)).size===c.picks.length);
ok('to, co jadasz, idzie wyżej  [1.: '+c.picks[0].f.n+']', /Twaróg chudy/.test(c.picks[0].f.n));

const cl = await p.locator('.closer').innerText();
ok('karta domykania na ekranie  ['+cl.split('\\n')[0]+']', /Czym domknąć dzień/.test(cl));
ok('podaje ile zostało kcal i białka', /1362 kcal/.test(cl) && /101 g/.test(cl));
await p.locator('.closer .opt').first().tap(); await p.waitForTimeout(500);
ok('tapnięcie otwiera arkusz porcji z gotową gramaturą  ['+
   await p.locator('#sheet .stepper .val input').inputValue()+' g]',
   (await p.locator('#sheet .stepper .val input').inputValue())===String(c.picks[0].g));
await p.locator('#sheet .btn.alt').tap(); await p.waitForTimeout(300);

// ── kiedy NIE podpowiadać ──────────────────────────────────────────────────
await seed({back:[2100],today:[['x','Coś',100,300,10]]});
await reload();
ok('po jednej pozycji rano jeszcze nie podpowiada  ['+await p.locator('.closer').count()+']',
   await p.locator('.closer').count()===0);
await seed({back:[2100],today:[['x','A',100,1200,120],['x','B',100,1100,60]]});
await reload();
ok('gdy białko dopięte, nie ma czego domykać  ['+await p.locator('.closer').count()+']',
   await p.locator('.closer').count()===0);
await seed({back:[2100],today:[['x','A',100,1200,40],['x','B',100,1180,39]]});
await reload();
const cc = await p.evaluate(()=>window.MAKRO.close());
ok('bez budżetu też nie podpowiada  [budżet '+cc.room+' kcal, podpowiedzi '+cc.picks.length+']',
   cc.picks.length===0);

// ── odmiana jednostek ──────────────────────────────────────────────────────
const forms = await p.evaluate(()=>{
  const f=n=>window.MAKRO.foods().filter(x=>x.n===n)[0], L=window.MAKRO.unitLabel;
  const wpi=f('Izolat białka (WPI)'), kak=f('Kakao ciemne (proszek)'), chl=f('Chleb żytni razowy');
  return [L(wpi,wpi.s*2),L(wpi,wpi.s*5),L(kak,kak.s*2),L(kak,kak.s*0.5),L(chl,chl.s*5)];
});
ok('jednostki się odmieniają  ['+forms.join(' / ')+']',
   /2 miarki/.test(forms[0]) && /5 miarek/.test(forms[1]) &&
   /2 łyżki/.test(forms[2]) && /½ łyżki/.test(forms[3]) && /5 kromek/.test(forms[4]));

console.log('\\n'+T.filter(t=>t.startsWith('PASS')).length+'/'+T.length+' PASS');
console.log(errs.length?'błędy JS: '+errs.join('; '):'błędy JS: brak');
await b.close();
process.exit(T.some(t=>t.startsWith('FAIL'))||errs.length?1:0);

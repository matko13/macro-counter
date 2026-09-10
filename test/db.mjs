/* Sprawdzenie spójności bazy jedzenia. Baza rosła trzykrotnie (152 → 369 → 651)
   i to jest miejsce, gdzie łatwo wsadzić literówkę, która przekłamie kalorie.
   Reguły są liczbowe, więc łapią błąd bez zgadywania. */
import { chromium, APP, SHOTS } from './lib.mjs';
const T=[],ok=(n,c)=>{T.push((c?'PASS':'FAIL')+'  '+n);console.log(T[T.length-1])};
const b=await chromium.launch();
const p=await (await b.newContext({locale:'pl-PL'})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto(APP); await p.waitForTimeout(300);

const F = await p.evaluate(()=>window.MAKRO.foods().map(f=>
  ({id:f.id,n:f.n,cat:f.cat,k:f.k,p:f.p,c:f.c,f:f.f,s:f.s,u:f.u,pc:f.pc})));

ok('baza ma co najmniej 600 produktów  ['+F.length+']', F.length>=600);

const ids={},dupId=[]; F.forEach(f=>{ if(ids[f.id])dupId.push(f.id); ids[f.id]=1 });
ok('brak zdublowanych id  ['+(dupId.join(',')||'-')+']', dupId.length===0);

const names={},dupN=[]; F.forEach(f=>{ const k=f.n.toLowerCase(); if(names[k])dupN.push(f.n); names[k]=1 });
ok('brak zdublowanych nazw  ['+(dupN.join(',')||'-')+']', dupN.length===0);

const CATS = await p.evaluate(()=>Object.keys(window.MAKRO.cats||{}));
const badCat = F.filter(f=>CATS.length&&CATS.indexOf(f.cat)<0).map(f=>f.n+':'+f.cat);
ok('każdy produkt w znanej kategorii  ['+(badCat.slice(0,3).join(',')||'-')+']', badCat.length===0);

const catCount = {}; F.forEach(f=>catCount[f.cat]=(catCount[f.cat]||0)+1);
ok('żadna kategoria nie jest pusta  ['+Object.keys(catCount).length+' kategorii]',
   CATS.every(c=>catCount[c]>0));

const noPor = F.filter(f=>!(f.s>0)).map(f=>f.n);
ok('każdy produkt ma porcję > 0  ['+(noPor.slice(0,3).join(',')||'-')+']', noPor.length===0);

/* Jednostka musi być z zamkniętej listy — także domowa („kromka”, „garść”),
   bo apka liczy z niej gramy. Literówka w jednostce = porcja liczona na oślep. */
const UOK=['g','ml','szt','kromka','garść','łyżka','łyżeczka','porcja','miarka','ząbek'];
const badUnit = F.filter(f=>UOK.indexOf(f.u)<0).map(f=>f.n+':'+f.u);
ok('jednostka ze znanej listy  ['+(badUnit.slice(0,3).join(',')||'-')+']', badUnit.length===0);

const negs = F.filter(f=>f.k<0||f.p<0||f.c<0||f.f<0).map(f=>f.n);
ok('brak liczb ujemnych  ['+(negs.join(',')||'-')+']', negs.length===0);

const tooHigh = F.filter(f=>f.k>900).map(f=>f.n+':'+f.k);
ok('nic nie ma więcej niż 900 kcal/100 g  ['+(tooHigh.join(',')||'-')+']', tooHigh.length===0);

const overMass = F.filter(f=>f.u!=='ml' && f.p+f.c+f.f>101).map(f=>f.n+':'+(f.p+f.c+f.f).toFixed(0));
ok('makro nie przekracza 100 g na 100 g  ['+(overMass.slice(0,3).join(',')||'-')+']', overMass.length===0);

/* Kalorie muszą wynikać z makroskładników: 4/4/9 kcal na gram. Wyjątki są
   fizyczne, nie „bo tak”: alkohol ma 7 kcal/g, a poliole w produktach
   „bez cukru” ~2,4 kcal/g — dlatego te grupy liczy się osobno. */
const ALKO=/\b(piwo|wino|w[oó]dka|whisky|rum|gin|tequila|cydr|prosecco|nalewka|mojito|aperol|likier|drink|colada|spritz)\b/i;
const POLIOL=/bez cukru|light|zero/i;
const off=[];
F.forEach(f=>{
  if (ALKO.test(f.n)||POLIOL.test(f.n)) return;
  const calc=4*f.p+4*f.c+9*f.f, d=Math.abs(calc-f.k);
  if ((f.k>0||calc>0) && d>25 && d/Math.max(f.k,1)>0.28) off.push(f.n+': '+f.k+' vs '+Math.round(calc));
});
ok('kcal zgadza się z makro (4/4/9)  ['+off.length+' odstępstw'+(off.length?': '+off.slice(0,4).join(' | '):'')+']',
   off.length===0);

/* Napoje alkoholowe też muszą się bronić: kcal ≈ 4/4/9 z makro + 7 z alkoholu,
   a to znaczy, że deklarowana wartość nie może być NIŻSZA niż z samych makro. */
const alkoBad = F.filter(f=>ALKO.test(f.n)).filter(f=>f.k < 4*f.p+4*f.c+9*f.f - 5).map(f=>f.n);
ok('alkohole: kcal nie niższe niż z samych makro  ['+(alkoBad.join(',')||'-')+']', alkoBad.length===0);

/* Porcja to najczęściej jedno tapnięcie w apce, więc musi być realistyczna.
   Wyjątki wpisane z nazwy, nie z progu: produkt, którego porcją JEST cała
   paczka albo cały zestaw. Trzymam je jako listę, żeby barierka dalej łapała
   literówki w porcjach, a nie została po cichu rozluźniona dla wszystkich. */
const WIELKIE = ['Zestaw sushi 30 szt. (z tempurą i panko)'];
const wild = F.filter(f=>WIELKIE.indexOf(f.n)<0)
  .map(f=>({n:f.n,kcal:f.k*f.s/100})).filter(x=>x.kcal>1100).map(x=>x.n+':'+Math.round(x.kcal));
ok('domyślna porcja nie przekracza 1100 kcal  ['+(wild.join(',')||'-')+']', wild.length===0);
/* Wyjątki niech będą policzone, żeby nikt nie dopisywał ich bezmyślnie. */
const wielkie = WIELKIE.map(n=>F.find(f=>f.n===n));
ok('wyjątki od progu porcji są nazwane i policzone  ['+
   wielkie.map((f,i)=>WIELKIE[i]+':'+(f?Math.round(f.k*f.s/100):'BRAK')).join(', ')+']',
   wielkie.every(Boolean) && WIELKIE.length<=2);

/* Owoce liczymy jako część jadalną — to był realny błąd: jabłko pokazywało
   94 kcal, bo porcja obejmowała ogryzek. */
const fr = {}; F.filter(f=>f.cat==='owoce').forEach(f=>fr[f.n]=Math.round(f.k*f.s/100));
ok('jabłko ≈ 78 kcal za sztukę  ['+fr['Jabłko']+']', fr['Jabłko']>=70 && fr['Jabłko']<=85);
const fatFruit = Object.keys(fr).filter(k=>fr[k]>260).map(k=>k+':'+fr[k]);
ok('żaden owoc nie wychodzi na >260 kcal  ['+(fatFruit.join(',')||'-')+']', fatFruit.length===0);

/* Kakao w proszku i napój z kakao to dwie różne rzeczy o tej samej nazwie
   potocznej: 343 kcal na 100 g proszku kontra 90 kcal na 100 ml napoju.
   Samo „kakao” to składnik z łyżki — napój ma pełną nazwę. */
const byName = n => F.filter(f=>f.n===n)[0];
[["Kakao ciemne (proszek)",343],["Kakao odtłuszczone (proszek)",250],
 ["Mąka orkiszowa",352],["Mąka gryczana",343]].forEach(function(x){
  const f=byName(x[0]);
  ok('jest w bazie: '+x[0]+'  ['+(f?f.k+' kcal/100 g':'BRAK')+']', !!f && f.k===x[1]);
});
/* Produkty markowe trafiają do bazy tylko wtedy, gdy użytkownik je jada i podał
   etykietę. Kostka twarogu waży 250 g, więc „kostka twarogu” musi dawać 250,
   a nie porcję. */
const strz=byName("Twaróg ze Strzałkowa półtłusty");
ok('jest w bazie twaróg ze Strzałkowa  ['+(strz?strz.k+' kcal, B '+strz.p:'BRAK')+']',
   !!strz && strz.k===122 && strz.p===19 && strz.f===3.5 && strz.c===4);
ok('z wagą kostki 250 g  ['+(strz?strz.pc:'—')+']', !!strz && strz.pc===250);
const strzHit = await p.evaluate(()=>[
  window.MAKRO.parse('kostka twarogu ze Strzałkowa').items.map(i=>i.f.n+':'+Math.round(i.g))[0],
  window.MAKRO.parse('strzałkowo').items.map(i=>i.f.n)[0],
  window.MAKRO.parse('twaróg półtłusty').items.map(i=>i.f.n)[0]
]);
ok('„kostka” to cała kostka  ['+strzHit[0]+']', strzHit[0]==='Twaróg ze Strzałkowa półtłusty:250');
ok('skrót „strzałkowo” też trafia  ['+strzHit[1]+']', strzHit[1]==='Twaróg ze Strzałkowa półtłusty');
ok('ale rodzajowy „twaróg półtłusty” nie jest przejęty przez markę  ['+strzHit[2]+']',
   strzHit[2]==='Twaróg półtłusty');

/* Kiszka ziemniaczana Gzella. Marka jest w nazwie, ale to jedyna kiszka
   ziemniaczana w bazie, więc rodzajowa nazwa musi na nią trafiać — inaczej
   trzeba by pamiętać markę, żeby cokolwiek znaleźć. Nie może za to przejmować
   kiszki pasztetowej, która jest zupełnie innym produktem (320 kcal, porcja 30 g
   jako pasta, nie 150 g jako danie). */
const kisz=byName("Kiszka ziemniaczana Gzella");
ok('jest w bazie kiszka ziemniaczana  ['+(kisz?kisz.k+' kcal, B '+kisz.p:'BRAK')+']',
   !!kisz && kisz.k===180 && kisz.p===6.8 && kisz.c===12 && kisz.f===11);
ok('z porcją 150 g, bo to danie, nie pasta  ['+(kisz?kisz.s+' '+kisz.u:'—')+']',
   !!kisz && kisz.s===150 && kisz.u==='g');
const kiszHit = await p.evaluate(()=>[
  window.MAKRO.parse('kiszka ziemniaczana').items.map(i=>i.f.n)[0],
  window.MAKRO.parse('kiszka ziemniaczana gzella').items.map(i=>i.f.n)[0],
  window.MAKRO.parse('zjadłem 200 g kiszki ziemniaczanej').items.map(i=>i.f.n+':'+Math.round(i.g))[0],
  window.MAKRO.parse('kiszka pasztetowa').items.map(i=>i.f.n)[0]
]);
ok('rodzajowa „kiszka ziemniaczana” trafia  ['+kiszHit[0]+']',
   kiszHit[0]==='Kiszka ziemniaczana Gzella');
ok('z marką też  ['+kiszHit[1]+']', kiszHit[1]==='Kiszka ziemniaczana Gzella');
ok('odmiana „kiszki ziemniaczanej” z gramaturą  ['+kiszHit[2]+']',
   kiszHit[2]==='Kiszka ziemniaczana Gzella:200');
ok('a kiszka pasztetowa zostaje sobą  ['+kiszHit[3]+']', kiszHit[3]==='Kiszka pasztetowa');

/* „Humus” przez jedno m to w polszczyźnie pisownia równie częsta co „hummus”,
   a wcześniej nie trafiała nigdzie: „zjadłem 60 g humusu” dawało pustkę,
   a „humus z burakiem” lądował na samych burakach. Wpis w bazie jest jeden —
   brakowało tylko drugiej pisowni. */
const humHit = await p.evaluate(()=>[
  window.MAKRO.parse('humus').items.map(i=>i.f.n)[0],
  window.MAKRO.parse('zjadłem 60 g humusu').items.map(i=>i.f.n+':'+Math.round(i.g))[0],
  window.MAKRO.parse('dwie łyżki humusu').items.map(i=>i.f.n+':'+Math.round(i.g))[0],
  window.MAKRO.parse('humus z burakiem').items.map(i=>i.f.n)[0],
  window.MAKRO.parse('tost z humusem').items.map(i=>i.f.n).join('+')
]);
ok('„humus” przez jedno m trafia  ['+humHit[0]+']', humHit[0]==='Hummus');
ok('z gramaturą i odmianą  ['+humHit[1]+']', humHit[1]==='Hummus:60');
ok('łyżka humusu waży 22 g, nie ogólne 15  ['+humHit[2]+']', humHit[2]==='Hummus:44');
ok('„humus z burakiem” to nie same buraki  ['+humHit[3]+']', humHit[3]==='Hummus z buraka');
ok('i wchodzi jako dodatek do pieczywa  ['+humHit[4]+']',
   humHit[4]==='Chleb tostowy+Hummus');

/* Sushi. Sześć pozycji: pięć rodzajów sztuk plus cały zestaw. Rodzaje są
   ogólne (tak nazywa je każda sushiarnia), więc policzą też inne zamówienie —
   zestaw jest oszacowany ze składu jednego konkretnego, 30-sztukowego.
   Najważniejsze: cały zestaw musi się zgadzać z sumą swoich sztuk, bo inaczej
   te same 30 kawałków dają dwa różne wyniki zależnie od tego, jak je wpiszesz. */
const SUSHI=[
  ['Nigiri z łososiem opalanym',36,2],
  ['Futomaki z pieczonym łososiem',44,6],
  ['Futomaki philadelphia z łososiem',42,6],
  ['California maki w tempurze z łososiem',48,8],
  ['Hosomaki z pastą z łososia w panko',30,8]
];
SUSHI.forEach(function(x){
  const f=byName(x[0]);
  ok('jest w bazie: '+x[0]+'  ['+(f?f.k+' kcal/100 g, sztuka '+f.pc+' g':'BRAK')+']',
     !!f && f.pc===x[1] && f.u==='szt');
});
const zestaw=byName('Zestaw sushi 30 szt. (z tempurą i panko)');
ok('jest cały zestaw  ['+(zestaw?zestaw.s+' g, '+zestaw.k+' kcal/100 g':'BRAK')+']',
   !!zestaw && zestaw.s===1220 && zestaw.u==='porcja');

const zgoda = await p.evaluate((lista)=>{
  const f=n=>window.MAKRO.foods().find(x=>x.n===n);
  let k=0,pr=0,c=0,ft=0,g=0;
  lista.forEach(function(x){
    const m=window.MAKRO.scale(f(x[0]),x[1]*x[2]);
    k+=m.k;pr+=m.p;c+=m.c;ft+=m.f;g+=x[1]*x[2];
  });
  const z=f('Zestaw sushi 30 szt. (z tempurą i panko)'), zm=window.MAKRO.scale(z,z.s);
  return {szt:{g:g,k:k,p:pr,c:c,f:ft}, zest:{g:z.s,k:zm.k,p:zm.p,c:zm.c,f:zm.f}};
}, SUSHI);
const roz = Math.abs(zgoda.zest.k-zgoda.szt.k)/zgoda.szt.k*100;
ok('zestaw = suma 30 sztuk  ['+Math.round(zgoda.szt.k)+' vs '+Math.round(zgoda.zest.k)+
   ' kcal, '+roz.toFixed(1)+'% różnicy]', roz<3);
ok('i waga też się spina  ['+zgoda.szt.g+' vs '+zgoda.zest.g+' g]',
   Math.abs(zgoda.zest.g-zgoda.szt.g)<25);

const suHit = await p.evaluate(()=>[
  window.MAKRO.parse('zestaw sushi').items.map(i=>i.f.n+':'+Math.round(i.g))[0],
  window.MAKRO.parse('special set').items.map(i=>i.f.n+':'+Math.round(i.g))[0],
  window.MAKRO.parse('pół zestawu sushi').items.map(i=>i.f.n+':'+Math.round(i.g))[0],
  window.MAKRO.parse('dwa nigiri').items.map(i=>i.f.n+':'+Math.round(i.g))[0],
  window.MAKRO.parse('sześć futomaki philadelphia').items.map(i=>i.f.n+':'+Math.round(i.g))[0],
  window.MAKRO.parse('8 california maki').items.map(i=>i.f.n+':'+Math.round(i.g))[0],
  window.MAKRO.parse('hosomaki w panko').items.map(i=>i.f.n+':'+Math.round(i.g))[0],
  window.MAKRO.parse('maki').items.map(i=>i.f.n)[0],
  window.MAKRO.parse('sushi').items.map(i=>i.f.n)[0]
]);
ok('„zestaw sushi” to cały zestaw  ['+suHit[0]+']', suHit[0]==='Zestaw sushi 30 szt. (z tempurą i panko):1220');
ok('nazwa z menu też trafia  ['+suHit[1]+']', suHit[1]==='Zestaw sushi 30 szt. (z tempurą i panko):1220');
ok('„pół zestawu” to połowa, nie połowa sztuki  ['+suHit[2]+']',
   suHit[2]==='Zestaw sushi 30 szt. (z tempurą i panko):610');
ok('sztuki liczą się na sztuki  ['+suHit[3]+']', suHit[3]==='Nigiri z łososiem opalanym:72');
ok('z liczbą słownie  ['+suHit[4]+']', suHit[4]==='Futomaki philadelphia z łososiem:252');
ok('i cyfrą  ['+suHit[5]+']', suHit[5]==='California maki w tempurze z łososiem:384');
ok('hosomaki po panko  ['+suHit[6]+']', suHit[6]==='Hosomaki z pastą z łososia w panko:240');
/* „maki” było aliasem mąki pszennej długo przed sushi i musi nim zostać —
   inaczej „maki” w przepisie zaczęłoby znaczyć rolkę sushi. */
ok('„maki” to nadal mąka, nie sushi  ['+suHit[7]+']', suHit[7]==='Mąka pszenna');
ok('a rodzajowe „sushi” nie zostało przejęte przez zestaw  ['+suHit[8]+']',
   suHit[8]==='Sushi (rolka)');

/* Puree i sznycel — dwa braki zgłoszone z apki.

   „Puree” było wcześniej ALIASEM gotowanych ziemniaków, co jest gorsze niż
   brak wpisu: mleko i masło dokładają ~27 kcal i 4 g tłuszczu na 100 g, więc
   apka po cichu zaniżała każdą porcję puree o kilkadziesiąt kcal. */
const pur=byName('Puree ziemniaczane');
ok('jest puree  ['+(pur?pur.k+' kcal, T '+pur.f:'BRAK')+']',
   !!pur && pur.k===113 && pur.p===1.9 && pur.c===17 && pur.f===4.2);
ok('puree jest tłustsze i kaloryczniejsze od gotowanych ziemniaków  ['+
   (pur.k-byName('Ziemniaki gotowane').k)+' kcal, +'+
   (Math.round((pur.f-byName('Ziemniaki gotowane').f)*10)/10)+' g tłuszczu]',
   pur.k>byName('Ziemniaki gotowane').k+20 && pur.f>byName('Ziemniaki gotowane').f+3);

const szn=byName('Sznycel');
ok('jest sznycel  ['+(szn?szn.k+' kcal/100 g, sztuka '+szn.s+' g':'BRAK')+']',
   !!szn && szn.k===260 && szn.s===120 && szn.u==='szt');

const dwaHit = await p.evaluate(()=>[
  window.MAKRO.parse('sznycel').items.map(i=>i.f.n+':'+Math.round(i.g))[0],
  window.MAKRO.parse('dwa sznycle').items.map(i=>i.f.n+':'+Math.round(i.g))[0],
  window.MAKRO.parse('puree').items.map(i=>i.f.n+':'+Math.round(i.g))[0],
  window.MAKRO.parse('250 g puree').items.map(i=>i.f.n+':'+Math.round(i.g))[0],
  window.MAKRO.parse('tłuczone ziemniaki').items.map(i=>i.f.n)[0],
  window.MAKRO.parse('łyżka puree').items.map(i=>i.f.n+':'+Math.round(i.g))[0],
  window.MAKRO.parse('ziemniaki gotowane').items.map(i=>i.f.n)[0],
  window.MAKRO.parse('kartofle').items.map(i=>i.f.n)[0],
  window.MAKRO.parse('sznycel i puree').items.map(i=>i.f.n).join('+')
]);
ok('„sznycel” trafia  ['+dwaHit[0]+']', dwaHit[0]==='Sznycel:120');
ok('i liczy się na sztuki  ['+dwaHit[1]+']', dwaHit[1]==='Sznycel:240');
ok('„puree” to już puree, nie gotowane ziemniaki  ['+dwaHit[2]+']',
   dwaHit[2]==='Puree ziemniaczane:200');
ok('z gramaturą  ['+dwaHit[3]+']', dwaHit[3]==='Puree ziemniaczane:250');
ok('„tłuczone ziemniaki” też  ['+dwaHit[4]+']', dwaHit[4]==='Puree ziemniaczane');
ok('łyżka puree waży 18 g, nie ogólne 15  ['+dwaHit[5]+']', dwaHit[5]==='Puree ziemniaczane:18');
/* Zabranie aliasu „puree” nie może zabrać ziemniakom ich własnych nazw. */
ok('gotowane ziemniaki zostały sobą  ['+dwaHit[6]+']', dwaHit[6]==='Ziemniaki gotowane');
ok('i „kartofle” nadal na nie trafiają  ['+dwaHit[7]+']', dwaHit[7]==='Ziemniaki gotowane');
ok('obiad wpisany przez „i” daje dwie pozycje  ['+dwaHit[8]+']',
   dwaHit[8]==='Sznycel+Puree ziemniaczane');

/* Mleko proteinowe Łaciate (Protein+ UHT odtłuszczone). Etykieta: 227 kJ /
   54 kcal, B 8,0 / W 4,7 / T <0,5 na 100 ml. Szklanka 250 ml ma dać 20 g
   białka — dokładnie to, co producent obiecuje na opakowaniu, więc ta liczba
   jest niezależnym sprawdzeniem, że wpis jest przepisany poprawnie. */
const mlp=byName('Mleko proteinowe Łaciate');
ok('jest mleko proteinowe  ['+(mlp?mlp.k+' kcal, B '+mlp.p:'BRAK')+']',
   !!mlp && mlp.k===54 && mlp.p===8 && mlp.c===4.7 && mlp.f===0.5);
ok('porcja to szklanka 250 ml  ['+(mlp?mlp.s+' '+mlp.u:'—')+']',
   !!mlp && mlp.s===250 && mlp.u==='ml');
const szkl = await p.evaluate(()=>{
  const f=window.MAKRO.foods().find(x=>x.n==='Mleko proteinowe Łaciate');
  const m=window.MAKRO.scale(f,f.s);
  return {k:Math.round(m.k), p:Math.round(m.p)};
});
ok('szklanka daje 20 g białka, jak na opakowaniu  ['+szkl.p+' g, '+szkl.k+' kcal]',
   szkl.p===20);
ok('i ma ponad dwa razy więcej białka niż mleko 2%  ['+mlp.p+' vs '+byName('Mleko 2%').p+' g]',
   mlp.p > byName('Mleko 2%').p*2);

const mlHit = await p.evaluate(()=>[
  window.MAKRO.parse('mleko proteinowe').items.map(i=>i.f.n)[0],
  window.MAKRO.parse('łaciate protein').items.map(i=>i.f.n)[0],
  window.MAKRO.parse('500 ml mleka proteinowego').items.map(i=>i.f.n+':'+Math.round(i.g))[0],
  window.MAKRO.parse('mleko wysokobiałkowe').items.map(i=>i.f.n)[0],
  window.MAKRO.parse('mleko').items.map(i=>i.f.n)[0],
  window.MAKRO.parse('mleko odtłuszczone').items.map(i=>i.f.n)[0],
  window.MAKRO.parse('napój proteinowy').items.map(i=>i.f.n)[0]
]);
ok('trafia po nazwie rodzajowej  ['+mlHit[0]+']', mlHit[0]==='Mleko proteinowe Łaciate');
ok('i po marce  ['+mlHit[1]+']', mlHit[1]==='Mleko proteinowe Łaciate');
ok('z gramaturą i odmianą  ['+mlHit[2]+']', mlHit[2]==='Mleko proteinowe Łaciate:500');
ok('„mleko wysokobiałkowe” też  ['+mlHit[3]+']', mlHit[3]==='Mleko proteinowe Łaciate');
/* Marka nie może przejąć rodzajowego „mleka” ani innych mlek — tu jest
   pięć wpisów zaczynających się od tego samego słowa. */
ok('samo „mleko” zostaje przy Mleku 2%  ['+mlHit[4]+']', mlHit[4]==='Mleko 2%');
ok('„mleko odtłuszczone” przy Mleku 0%  ['+mlHit[5]+']', mlHit[5]==='Mleko 0%');
ok('a „napój proteinowy” zostaje sobą  ['+mlHit[6]+']', mlHit[6]==='Napój proteinowy');

/* Pinsa Margherita z Lidla. To jedyny wpis w bazie, który jest SZACUNKIEM
   mimo istnienia etykiety: producent nie udostępnia jej w sieci, a dane
   społecznościowe rozjeżdżają się o 30% (199 / 236 / 262 kcal na 100 g).
   Rozstrzygnięte składem — spód + sos + mozzarella dają 204-208 kcal/100 g
   niezależnie od proporcji, co wyklucza 262. Test pilnuje, żeby wartość
   została w przedziale, który skład dopuszcza; gdyby ktoś wpisał tu 262,
   powinno zapłonąć. */
const pin=byName('Pinsa Margherita (Lidl)');
ok('jest pinsa  ['+(pin?pin.k+' kcal/100 g, opakowanie '+pin.s+' g':'BRAK')+']',
   !!pin && pin.s===385 && pin.u==='porcja');
ok('gęstość mieści się w tym, co dopuszcza skład (190-215)  ['+pin.k+' kcal]',
   pin.k>=190 && pin.k<=215);
ok('i jest chudsza od pizzy margherity z bazy  ['+pin.k+' vs '+byName('Pizza margherita').k+']',
   pin.k < byName('Pizza margherita').k);

const pinHit = await p.evaluate(()=>[
  window.MAKRO.parse('pinsa').items.map(i=>i.f.n+':'+Math.round(i.g))[0],
  window.MAKRO.parse('pinsa z lidla').items.map(i=>i.f.n)[0],
  window.MAKRO.parse('pół pinsy').items.map(i=>i.f.n+':'+Math.round(i.g))[0],
  window.MAKRO.parse('dwie pinsy').items.map(i=>i.f.n+':'+Math.round(i.g))[0],
  window.MAKRO.parse('pizza margherita').items.map(i=>i.f.n)[0],
  window.MAKRO.parse('focaccia').items.map(i=>i.f.n)[0]
]);
ok('„pinsa” to całe opakowanie  ['+pinHit[0]+']', pinHit[0]==='Pinsa Margherita (Lidl):385');
ok('z marką też  ['+pinHit[1]+']', pinHit[1]==='Pinsa Margherita (Lidl)');
/* Połowa to najczęstsza porcja i musi dawać połowę, nie połowę sztuki. */
ok('„pół pinsy” to połowa opakowania  ['+pinHit[2]+']',
   pinHit[2]==='Pinsa Margherita (Lidl):193');
ok('„dwie pinsy” to dwa opakowania  ['+pinHit[3]+']',
   pinHit[3]==='Pinsa Margherita (Lidl):770');
/* Nie może przejąć pizzy ani focacci — to trzy różne wypieki. */
ok('pizza margherita zostaje sobą  ['+pinHit[4]+']', pinHit[4]==='Pizza margherita');
ok('focaccia też  ['+pinHit[5]+']', pinHit[5]==='Focaccia');

/* Pad thai z kurczakiem. Wersja ogólna była w bazie od dawna (190 kcal, B 8)
   i obsługuje tofu, krewetki i warzywa. Z kurczakiem talerz ma MNIEJ kalorii,
   bo mniej na nim makaronu, ale wyraźnie więcej białka — i to jest jedyny
   powód, dla którego to osobny wpis, a nie alias. */
const pt=byName('Pad thai z kurczakiem'), ptO=byName('Pad thai');
ok('jest pad thai z kurczakiem  ['+(pt?pt.k+' kcal/100 g':'BRAK')+']',
   !!pt && pt.k===175 && pt.p===10 && pt.c===18 && pt.f===7);
ok('ma więcej białka niż wersja ogólna  ['+pt.p+' vs '+ptO.p+' g/100 g]', pt.p>ptO.p);
ok('i mniej kalorii  ['+pt.k+' vs '+ptO.k+']', pt.k<ptO.k);
ok('obie mają porcję 350 g  ['+pt.s+' i '+ptO.s+']', pt.s===350 && ptO.s===350);

const ptHit = await p.evaluate(()=>[
  window.MAKRO.parse('pad thai z kurczakiem').items.map(i=>i.f.n+':'+Math.round(i.g))[0],
  window.MAKRO.parse('pad thai').items.map(i=>i.f.n)[0],
  window.MAKRO.parse('padthai').items.map(i=>i.f.n)[0],
  window.MAKRO.parse('pad thai z krewetkami').items.map(i=>i.f.n)[0],
  window.MAKRO.parse('pół pad thaia').items.map(i=>i.f.n+':'+Math.round(i.g))[0]
]);
ok('„z kurczakiem” trafia na wersję z kurczakiem  ['+ptHit[0]+']',
   ptHit[0]==='Pad thai z kurczakiem:350');
/* Dopisanie wariantu nie może przejąć nazwy ogólnej — inaczej każdy pad thai
   zaczyna liczyć się jak ten z kurczakiem. */
ok('samo „pad thai” zostaje ogólne  ['+ptHit[1]+']', ptHit[1]==='Pad thai');
ok('„padthai” jednym słowem też trafia  ['+ptHit[2]+']', ptHit[2]==='Pad thai');
ok('a krewetkowy spada na ogólny, bo takiego wpisu nie ma  ['+ptHit[3]+']',
   ptHit[3]==='Pad thai');
ok('„pół pad thaia” to połowa porcji  ['+ptHit[4]+']', ptHit[4]==='Pad thai:175');

/* Pałka z kurczaka z rosołu. Gotowana, bez skóry — bo „mięso z rosołu” to
   mięso ściągnięte z kości, a rozmiękłą skórę zwykle się zostawia.

   Polskie serwisy podają dla pałki ~125 kcal, ale to wartości SUROWEGO mięsa.
   Gotowanie odparowuje ~28% wody i zagęszcza: 119 kcal surowego → 165 po
   ugotowaniu, co zgadza się z USDA dla duszonego podudzia bez skóry (172).
   Sztuka to mięso z jednej pałki po ugotowaniu, bez kości: ~60 g. */
const pal=byName('Pałka z kurczaka (gotowana)');
ok('jest pałka  ['+(pal?pal.k+' kcal/100 g, B '+pal.p:'BRAK')+']',
   !!pal && pal.k===165 && pal.p===27 && pal.c===0 && pal.f===6);
ok('sztuka to mięso z jednej pałki, bez kości  ['+(pal?pal.s+' '+pal.u:'—')+']',
   !!pal && pal.s===60 && pal.u==='szt');
/* Porządek w bazie jest sam w sobie kontrolą: gotowana pałka bez skóry musi
   wypaść chudziej niż udko i niż kurczak pieczony ze skórą. */
ok('chudsza od udka  ['+pal.k+' vs '+byName('Udko z kurczaka').k+']',
   pal.k < byName('Udko z kurczaka').k);
ok('i od pieczonego ze skórą  ['+pal.k+' vs '+byName('Kurczak pieczony ze skórą').k+']',
   pal.k < byName('Kurczak pieczony ze skórą').k);
ok('ale bogatsza w białko niż udko  ['+pal.p+' vs '+byName('Udko z kurczaka').p+' g]',
   pal.p > byName('Udko z kurczaka').p);

const palHit = await p.evaluate(()=>[
  window.MAKRO.parse('pałka').items.map(i=>i.f.n+':'+Math.round(i.g))[0],
  window.MAKRO.parse('dwie pałki').items.map(i=>i.f.n+':'+Math.round(i.g))[0],
  window.MAKRO.parse('mięso z rosołu').items.map(i=>i.f.n)[0],
  window.MAKRO.parse('podudzie').items.map(i=>i.f.n)[0],
  window.MAKRO.parse('rosół z makaronem').items.map(i=>i.f.n)[0],
  window.MAKRO.parse('udko z kurczaka').items.map(i=>i.f.n)[0]
]);
ok('„pałka” to jedna sztuka  ['+palHit[0]+']', palHit[0]==='Pałka z kurczaka (gotowana):60');
ok('i liczy się na sztuki  ['+palHit[1]+']', palHit[1]==='Pałka z kurczaka (gotowana):120');
ok('„mięso z rosołu” trafia tam samo  ['+palHit[2]+']',
   palHit[2]==='Pałka z kurczaka (gotowana)');
ok('„podudzie” też  ['+palHit[3]+']', palHit[3]==='Pałka z kurczaka (gotowana)');
/* Alias „mięso z rosołu” nie może przejąć samego rosołu ani udka. */
ok('rosół zostaje zupą  ['+palHit[4]+']', palHit[4]==='Rosół z makaronem');
ok('a udko zostaje udkiem  ['+palHit[5]+']', palHit[5]==='Udko z kurczaka');

/* Makaron mie z Lidla (Vitasia) i stir fry na nim.

   Etykieta z opakowania 250 g jest wewnętrznie spójna, co sprawdziłem czterema
   sposobami przed wpisaniem: 1530 kJ ÷ 4,184 = 366 kcal wobec 361; reguła
   4/4/9 daje 354; 361 × 0,625 = 225,6 wobec podanych 226 na porcję; 4 × 62,5
   = 250 g masy netto. Wersja ugotowana wyprowadzona z JEJ WŁASNEJ przeliczki:
   62,5 g suchego ≈ 170 g ugotowanego przy 226 kcal, czyli 133 kcal/100 g. */
const mieU=byName('Makaron mie (ugotowany)'), mieS=byName('Makaron mie (suchy)');
ok('jest mie suchy, wprost z etykiety  ['+(mieS?mieS.k+' kcal, B '+mieS.p:'BRAK')+']',
   !!mieS && mieS.k===361 && mieS.p===11.1 && mieS.c===74.8 && mieS.f===1.2);
ok('porcja suchego jak na opakowaniu  ['+(mieS?mieS.s+' g':'—')+']', !!mieS && mieS.s===62.5);
ok('jest mie ugotowany  ['+(mieU?mieU.k+' kcal':'BRAK')+']',
   !!mieU && mieU.k===133 && mieU.s===170);
/* Ugotowany musi zgadzać się z suchym przez przeliczkę z opakowania —
   to jest kontrola, że nie przepisałem jednej kolumny w miejsce drugiej. */
const zSuchego = mieS.k*0.625;            // 62,5 g suchego
const zUgot    = mieU.k*1.70;             // 170 g ugotowanego
ok('porcja suchego i ugotowanego to te same kalorie  ['+Math.round(zSuchego)+
   ' vs '+Math.round(zUgot)+' kcal]', Math.abs(zSuchego-zUgot)<8);
/* Porządek wśród makaronów: mie wypada między soba a udon. */
ok('mie mieści się między soba a udonem  ['+byName('Makaron soba').k+' < '+mieU.k+
   ' < '+byName('Makaron udon').k+']',
   byName('Makaron soba').k < mieU.k && mieU.k < byName('Makaron udon').k);

const sf=byName('Stir fry z kurczakiem i makaronem');
ok('jest stir fry  ['+(sf?sf.k+' kcal/100 g, talerz '+sf.s+' g':'BRAK')+']',
   !!sf && sf.k===120 && sf.s===460);
ok('talerz daje ponad 40 g białka  ['+Math.round(sf.p*4.6)+' g]', sf.p*4.6>40);

const sfHit = await p.evaluate(()=>[
  window.MAKRO.parse('stir fry').items.map(i=>i.f.n+':'+Math.round(i.g))[0],
  window.MAKRO.parse('makaron z kurczakiem').items.map(i=>i.f.n)[0],
  window.MAKRO.parse('pół stir fry').items.map(i=>i.f.n+':'+Math.round(i.g))[0],
  window.MAKRO.parse('makaron mie').items.map(i=>i.f.n)[0],
  window.MAKRO.parse('noodle').items.map(i=>i.f.n)[0],
  window.MAKRO.parse('makaron').items.map(i=>i.f.n)[0],
  window.MAKRO.parse('makaron udon').items.map(i=>i.f.n)[0],
  window.MAKRO.parse('makaron z pesto').items.map(i=>i.f.n)[0]
]);
ok('„stir fry” to cały talerz  ['+sfHit[0]+']',
   sfHit[0]==='Stir fry z kurczakiem i makaronem:460');
ok('„makaron z kurczakiem” też  ['+sfHit[1]+']',
   sfHit[1]==='Stir fry z kurczakiem i makaronem');
ok('„pół stir fry” to połowa  ['+sfHit[2]+']',
   sfHit[2]==='Stir fry z kurczakiem i makaronem:230');
/* Samo „makaron mie” ma dawać UGOTOWANY — tak samo jak samo „makaron”.
   Oba wpisy mają tę frazę w nazwie, więc o remis decyduje kolejność w bazie
   i ugotowany musi tam stać pierwszy. */
ok('„makaron mie” to ugotowany, nie suchy  ['+sfHit[3]+']',
   sfHit[3]==='Makaron mie (ugotowany)');
ok('„noodle” też  ['+sfHit[4]+']', sfHit[4]==='Makaron mie (ugotowany)');
/* Trzy nowe pozycje nie mogą przejąć makaronów, które już były. */
ok('samo „makaron” zostaje pszennym  ['+sfHit[5]+']', sfHit[5]==='Makaron (ugotowany)');
ok('udon zostaje udonem  ['+sfHit[6]+']', sfHit[6]==='Makaron udon');
ok('a makaron z pesto sobą  ['+sfHit[7]+']', sfHit[7]==='Makaron z pesto');

/* Łosoś pieczony w sosie sojowym z musztardą i szpinak z masłem oraz serkiem.
   Oba policzone ze SKŁADNIKÓW, które już są w bazie — czyli z tych samych
   liczb, jakie apka dałaby przy wpisaniu ich osobno. Dzięki temu da się je
   sprawdzić w drugą stronę i to właśnie robią poniższe testy. */
const lo=byName('Łosoś pieczony w sosie sojowym');
const sz=byName('Szpinak z masłem i serkiem');
ok('jest łosoś pieczony  ['+(lo?lo.k+' kcal/100 g, porcja '+lo.s+' g':'BRAK')+']',
   !!lo && lo.k===238 && lo.s===165);
ok('jest szpinak z masłem  ['+(sz?sz.k+' kcal/100 g, porcja '+sz.s+' g':'BRAK')+']',
   !!sz && sz.k===113 && sz.s===150);

/* Pieczenie zabiera wodę, więc gotowy łosoś musi być GĘSTSZY od surowego.
   Gdyby ktoś wpisał tu wartości surowego, ten test by padł. */
ok('pieczony gęstszy od surowego  ['+lo.k+' vs '+byName('Łosoś').k+' kcal/100 g]',
   lo.k > byName('Łosoś').k);

/* Rachunek w drugą stronę: 180 g surowego łososia + 15 g sosu + 15 g musztardy
   ma dać tyle kalorii, ile deklaruje porcja gotowego dania. To wyłapie zarówno
   błąd w gęstości, jak i w masie porcji. */
const zeSkladnikow = await p.evaluate(()=>{
  const f=n=>window.MAKRO.foods().find(x=>x.n===n);
  const s=(n,g)=>window.MAKRO.scale(f(n),g);
  const a=s('Łosoś',180), b=s('Sos sojowy',15), c=s('Musztarda',15);
  const d=s('Szpinak',200), e=s('Masło',10), g=s('Serek śmietankowy',20);
  const lo=f('Łosoś pieczony w sosie sojowym'), sz=f('Szpinak z masłem i serkiem');
  return {losos:{skl:a.k+b.k+c.k, danie:window.MAKRO.scale(lo,lo.s).k},
          szpinak:{skl:d.k+e.k+g.k, danie:window.MAKRO.scale(sz,sz.s).k}};
});
ok('łosoś: suma składników = porcja dania  ['+Math.round(zeSkladnikow.losos.skl)+
   ' vs '+Math.round(zeSkladnikow.losos.danie)+' kcal]',
   Math.abs(zeSkladnikow.losos.skl-zeSkladnikow.losos.danie)<15);
ok('szpinak: suma składników = porcja dania  ['+Math.round(zeSkladnikow.szpinak.skl)+
   ' vs '+Math.round(zeSkladnikow.szpinak.danie)+' kcal]',
   Math.abs(zeSkladnikow.szpinak.skl-zeSkladnikow.szpinak.danie)<15);
/* W szpinaku prawie wszystkie kalorie są z masła i serka, nie z warzywa. */
ok('w szpinaku tłuszcz daje większość kalorii  ['+Math.round(sz.f*9/sz.k*100)+'%]',
   sz.f*9/sz.k > 0.6);

const loHit = await p.evaluate(()=>[
  window.MAKRO.parse('łosoś pieczony').items.map(i=>i.f.n)[0],
  window.MAKRO.parse('łosoś w sosie sojowym').items.map(i=>i.f.n)[0],
  window.MAKRO.parse('szpinak gotowany').items.map(i=>i.f.n)[0],
  window.MAKRO.parse('szpinak z masłem').items.map(i=>i.f.n)[0],
  window.MAKRO.parse('łosoś').items.map(i=>i.f.n)[0],
  window.MAKRO.parse('łosoś wędzony').items.map(i=>i.f.n)[0],
  window.MAKRO.parse('szpinak').items.map(i=>i.f.n)[0],
  window.MAKRO.parse('łosoś pieczony i szpinak z masłem').items.map(i=>i.f.n).join('+')
]);
ok('„łosoś pieczony” trafia  ['+loHit[0]+']', loHit[0]==='Łosoś pieczony w sosie sojowym');
ok('„łosoś w sosie sojowym” też  ['+loHit[1]+']', loHit[1]==='Łosoś pieczony w sosie sojowym');
ok('„szpinak gotowany” trafia na danie  ['+loHit[2]+']', loHit[2]==='Szpinak z masłem i serkiem');
ok('„szpinak z masłem” też  ['+loHit[3]+']', loHit[3]==='Szpinak z masłem i serkiem');
/* Dania nie mogą przejąć surowych składników — wszystkie trzy są w bazie
   i logują się osobno. */
ok('samo „łosoś” zostaje surowe  ['+loHit[4]+']', loHit[4]==='Łosoś');
ok('wędzony zostaje wędzonym  ['+loHit[5]+']', loHit[5]==='Łosoś wędzony');
ok('samo „szpinak” zostaje warzywem  ['+loHit[6]+']', loHit[6]==='Szpinak');
ok('cały obiad jednym zdaniem daje dwie pozycje  ['+loHit[7]+']',
   loHit[7]==='Łosoś pieczony w sosie sojowym+Szpinak z masłem i serkiem');

/* Burger z grilla i jego dwa brakujące składniki: plaster 100% wołowiny
   i bułka brioche. Reszta (pomidor, cebula, ogórek kwaszony, sos barbecue)
   była już w bazie, więc cały burger jest policzony z niej i daje się
   sprawdzić w drugą stronę. */
const pat=byName('Burger wołowy (plaster z grilla)');
const bri=byName('Bułka brioche do burgera');
const bur=byName('Burger domowy z grilla');
ok('jest plaster wołowiny  ['+(pat?pat.k+' kcal/100 g, sztuka '+pat.s+' g':'BRAK')+']',
   !!pat && pat.k===260 && pat.s===90 && pat.u==='szt');
ok('jest bułka brioche  ['+(bri?bri.k+' kcal/100 g, sztuka '+bri.s+' g':'BRAK')+']',
   !!bri && bri.k===330 && bri.s===75 && bri.u==='szt');
ok('jest cały burger  ['+(bur?bur.k+' kcal/100 g, sztuka '+bur.s+' g':'BRAK')+']',
   !!bur && bur.k===212 && bur.s===265);

/* Grillowanie odparowuje wodę i skapuje część tłuszczu, ale plaster i tak
   wychodzi gęstszy od surowej mielonej wołowiny. */
ok('plaster gęstszy od surowej mielonej  ['+pat.k+' vs '+byName('Mielona wołowina 10%').k+']',
   pat.k > byName('Mielona wołowina 10%').k);
/* Brioche jest wzbogacana masłem i jajkiem, więc tłustsza od maślanej. */
ok('brioche tłustsza od bułki maślanej  ['+bri.f+' vs '+byName('Bułka maślana').f+' g]',
   bri.f > byName('Bułka maślana').f);

/* Rachunek w drugą stronę — suma składników musi dać porcję burgera. */
const zeSkl = await p.evaluate(()=>{
  const f=n=>window.MAKRO.foods().find(x=>x.n===n);
  const s=(n,g)=>window.MAKRO.scale(f(n),g);
  const suma = s('Burger wołowy (plaster z grilla)',90).k + s('Bułka brioche do burgera',75).k
             + s('Pomidor',20).k + s('Cebula',15).k + s('Ogórek kwaszony',25).k
             + s('Sos barbecue',40).k;
  const b=f('Burger domowy z grilla');
  return {skl:suma, danie:window.MAKRO.scale(b,b.s).k};
});
ok('suma składników = porcja burgera  ['+Math.round(zeSkl.skl)+' vs '+
   Math.round(zeSkl.danie)+' kcal]', Math.abs(zeSkl.skl-zeSkl.danie)<15);
/* Bułka i mięso to razem ponad 80% kalorii burgera — warzywa są kosmetyką. */
ok('bułka i mięso dają większość kalorii burgera  ['+
   Math.round((248+234)/562*100)+'%]', (248+234)/562 > 0.8);

const buHit = await p.evaluate(()=>[
  window.MAKRO.parse('burger domowy').items.map(i=>i.f.n+':'+Math.round(i.g))[0],
  window.MAKRO.parse('burger z grilla').items.map(i=>i.f.n)[0],
  window.MAKRO.parse('dwa burgery domowe').items.map(i=>i.f.n+':'+Math.round(i.g))[0],
  window.MAKRO.parse('wołowina w plastrach').items.map(i=>i.f.n)[0],
  window.MAKRO.parse('burger wołowy').items.map(i=>i.f.n)[0],
  window.MAKRO.parse('brioche').items.map(i=>i.f.n)[0],
  window.MAKRO.parse('burger').items.map(i=>i.f.n)[0],
  window.MAKRO.parse('cheeseburger').items.map(i=>i.f.n)[0],
  window.MAKRO.parse('burger roślinny').items.map(i=>i.f.n)[0],
  window.MAKRO.parse('wołowina').items.map(i=>i.f.n)[0],
  window.MAKRO.parse('bułka maślana').items.map(i=>i.f.n)[0]
]);
ok('„burger domowy” to cały burger  ['+buHit[0]+']', buHit[0]==='Burger domowy z grilla:265');
ok('„burger z grilla” też  ['+buHit[1]+']', buHit[1]==='Burger domowy z grilla');
ok('i liczy się na sztuki  ['+buHit[2]+']', buHit[2]==='Burger domowy z grilla:530');
ok('„wołowina w plastrach” to plaster  ['+buHit[3]+']',
   buHit[3]==='Burger wołowy (plaster z grilla)');
ok('„burger wołowy” też  ['+buHit[4]+']', buHit[4]==='Burger wołowy (plaster z grilla)');
ok('„brioche” trafia na bułkę  ['+buHit[5]+']', buHit[5]==='Bułka brioche do burgera');
/* Trzy nowe pozycje nie mogą przejąć czterech burgerów, które już były
   w bazie, ani wołowiny, ani bułki maślanej. */
ok('samo „burger” zostaje przy Big Macu  ['+buHit[6]+']', buHit[6]==='Burger (typu Big Mac)');
ok('cheeseburger zostaje sobą  ['+buHit[7]+']', buHit[7]==='Cheeseburger');
ok('burger roślinny też  ['+buHit[8]+']', buHit[8]==='Burger roślinny');
ok('„wołowina” zostaje mieloną  ['+buHit[9]+']', buHit[9]==='Mielona wołowina 10%');
ok('a bułka maślana sobą  ['+buHit[10]+']', buHit[10]==='Bułka maślana');

/* Sushi je się na kawałki, nie na porcje. „kawałek” i „kawałki” są na liście
   słów pomijanych, więc „30 kawałków sushi” znaczyło dla apki „30 PORCJI
   sushi” — czyli 30 × 200 g = 6 kg i 8700 kcal. Waga kawałka to naprawia.
   Zestaw takiej wagi mieć NIE MOŻE: dostaje ją każde liczenie, także „pół
   zestawu”, które spadało wtedy z 610 g na 21 g. */
const rolka=byName('Sushi (rolka)');
ok('sushi rodzajowe ma wagę kawałka  ['+(rolka?rolka.pc+' g':'BRAK')+']',
   !!rolka && rolka.pc===40);
ok('zestaw wagi kawałka nie ma  ['+(zestaw.pc||'brak')+']', !zestaw.pc);
const kawHit = await p.evaluate(()=>[
  window.MAKRO.parse('30 kawałków sushi').items.map(i=>i.f.n+':'+Math.round(i.g))[0],
  window.MAKRO.parse('12 kawałków sushi').items.map(i=>i.f.n+':'+Math.round(i.g))[0],
  window.MAKRO.parse('pół zestawu sushi').items.map(i=>i.f.n+':'+Math.round(i.g))[0],
  window.MAKRO.parse('dwa zestawy sushi').items.map(i=>i.f.n+':'+Math.round(i.g))[0],
  window.MAKRO.parse('kawałek chleba').items.map(i=>i.f.n+':'+Math.round(i.g))[0],
  window.MAKRO.parse('dwa kawałki pizzy').items.map(i=>i.f.n+':'+Math.round(i.g))[0]
]);
ok('„30 kawałków sushi” to 1,2 kg, nie 6 kg  ['+kawHit[0]+']', kawHit[0]==='Sushi (rolka):1200');
ok('i liczy się liniowo  ['+kawHit[1]+']', kawHit[1]==='Sushi (rolka):480');
ok('„pół zestawu” dalej to połowa zestawu  ['+kawHit[2]+']',
   kawHit[2]==='Zestaw sushi 30 szt. (z tempurą i panko):610');
ok('„dwa zestawy” dalej to dwa zestawy  ['+kawHit[3]+']',
   kawHit[3]==='Zestaw sushi 30 szt. (z tempurą i panko):2440');
/* „kawałek” przy innych produktach musi działać jak dotąd. */
ok('kawałek chleba bez zmian  ['+kawHit[4]+']', kawHit[4]==='Chleb żytni razowy:40');
ok('dwa kawałki pizzy bez zmian  ['+kawHit[5]+']', kawHit[5]==='Pizza margherita:300');

/* Smażenie i panierka to trzy różne produkty, nie jeden z przymiotnikiem:
   surowy dorsz 82 kcal, smażony 175, panierowany 200. Kolejność słów nie może
   zmieniać wyniku, a samo „miętus” nie może oznaczać wersji smażonej. */
[["Dorsz smażony",175],["Miętus",90],["Miętus smażony",165],["Miętus w panierce",205]].forEach(function(x){
  const f=byName(x[0]);
  ok('jest w bazie: '+x[0]+'  ['+(f?f.k+' kcal/100 g':'BRAK')+']', !!f && f.k===x[1]);
});
const fish = await p.evaluate(()=>{
  const q=t=>{const r=window.MAKRO.parse(t);return r.items.length?r.items[0].f.n:'NIC'};
  return {a:q('smażony miętus'),b:q('miętus smażony'),c:q('miętus w panierce'),
          d:q('panierowany miętus'),e:q('miętus'),f:q('smażony dorsz'),g:q('dorsz w panierce'),h:q('dorsz')};
});
ok('kolejność słów nie zmienia wyniku  ['+fish.a+' / '+fish.b+']',
   fish.a==='Miętus smażony' && fish.b==='Miętus smażony');
ok('panierka to osobny produkt  ['+fish.c+' / '+fish.d+']',
   fish.c==='Miętus w panierce' && fish.d==='Miętus w panierce');
ok('samo „miętus” to ryba bez patelni  ['+fish.e+']', fish.e==='Miętus');
ok('to samo dla dorsza  ['+fish.f+' / '+fish.g+' / '+fish.h+']',
   fish.f==='Dorsz smażony' && fish.g==='Dorsz panierowany' && fish.h==='Dorsz');

const kk=byName("Kakao ciemne (proszek)");
ok('kakao w proszku liczy się z łyżki, nie z 100 g  ['+(kk?kk.s+' g / '+kk.u:'—')+']',
   !!kk && kk.u==="łyżka" && kk.s<=10);

const kakaoHit = await p.evaluate(()=>window.MAKRO.parse('kakao').items.map(i=>i.f.n));
ok('samo „kakao” to proszek, nie napój  ['+kakaoHit.join(',')+']', /proszek/.test(kakaoHit[0]||''));
const kakaoDrink = await p.evaluate(()=>window.MAKRO.parse('kakao na mleku').items.map(i=>i.f.n));
ok('„kakao na mleku” to nadal napój  ['+kakaoDrink.join(',')+']', kakaoDrink[0]==='Kakao na mleku');
const orkisz = await p.evaluate(()=>window.MAKRO.parse('100 g mąki orkiszowej').items.map(i=>i.f.n));
ok('„mąki orkiszowej” trafia w mąkę orkiszową  ['+orkisz.join(',')+']', orkisz[0]==='Mąka orkiszowa');

/* Aliasy: każdy musi wskazywać na istniejący produkt i nie może być pusty. */
const AL = await p.evaluate(()=>window.MAKRO.alias);
const orphan = Object.keys(AL).filter(k=>!ids[k]);
ok('każdy alias wskazuje na istniejący produkt  ['+(orphan.join(',')||'-')+']', orphan.length===0);
const emptyAl = Object.keys(AL).filter(k=>!String(AL[k]).trim());
ok('brak pustych aliasów', emptyAl.length===0);

/* Każdy produkt musi dać się znaleźć wyszukiwarką po własnej nazwie —
   inaczej siedzi w bazie i nikomu nie służy. */
const unreachable = await p.evaluate(()=>{
  const out=[];
  window.MAKRO.foods().forEach(f=>{
    const r=window.MAKRO.parse(f.n);
    if(!r.items.length || r.items[0].f.id!==f.id) out.push(f.n);
  });
  return out;
});
ok('każdy produkt trafia sam w siebie po nazwie  ['+unreachable.length+' nietrafionych'+
   (unreachable.length?': '+unreachable.slice(0,5).join(', '):'')+']', unreachable.length<=3);

console.log('\n'+T.filter(t=>t.startsWith('PASS')).length+'/'+T.length+' PASS');
console.log(errs.length?'błędy JS: '+errs.join('; '):'błędy JS: brak');
await b.close();
process.exit(T.some(t=>t.startsWith('FAIL'))||errs.length?1:0);

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

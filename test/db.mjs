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

/* Porcja to najczęściej jedno tapnięcie w apce, więc musi być realistyczna. */
const wild = F.map(f=>({n:f.n,kcal:f.k*f.s/100})).filter(x=>x.kcal>1100).map(x=>x.n+':'+Math.round(x.kcal));
ok('domyślna porcja nie przekracza 1100 kcal  ['+(wild.join(',')||'-')+']', wild.length===0);

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
/* Jedyny produkt markowy w bazie — dodany z etykiety, bo użytkownik go jada.
   Kostka waży 250 g, więc „kostka twarogu” musi dawać 250, a nie porcję. */
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

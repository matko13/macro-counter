import { chromium, devices, APP, SHOTS } from './lib.mjs';
import { readFileSync } from 'fs';
const T=[],ok=(n,c)=>{T.push((c?'PASS':'FAIL')+'  '+n);console.log(T[T.length-1])};
/* Wyliczane z położenia samego testu, nie zaszyte: repo bywa klonowane
   w różne miejsca i zaszyta ścieżka wywracała cały zestaw na ENOENT. */
const src=readFileSync(new URL('../index.html',import.meta.url),'utf8');

// 1. statycznie: żadna reguła :hover nie może wisieć poza media query
const css=src.split('<style>')[1].split('</style>')[0].replace(/\/\*[\s\S]*?\*\//g,'');  // komentarze też zawierają słowo :hover
const mStart=css.indexOf('@media (hover:hover)');
const before=css.slice(0,mStart), block=css.slice(mStart);
const mEnd=(()=>{ let d=0; for(let i=block.indexOf('{');i<block.length;i++){ if(block[i]==='{')d++; else if(block[i]==='}'){d--; if(d===0)return i;} } return -1; })();
const inside=block.slice(0,mEnd), after=block.slice(mEnd+1);
const outside=(before.match(/:hover/g)||[]).length+(after.match(/:hover/g)||[]).length;
ok('reguł :hover poza media query: '+outside+' (ma być 0)', outside===0);
ok('reguł :hover wewnątrz: '+(inside.match(/:hover/g)||[]).length, (inside.match(/:hover/g)||[]).length>=10);

const b=await chromium.launch();

// 2. arkusz CSS wciąż parsuje się w całości (przenoszenie reguł nic nie zepsuło)
{
  const p=await (await b.newContext({locale:'pl-PL'})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(APP); await p.waitForTimeout(400);
  const rules=await p.evaluate(()=>{
    const ss=[...document.styleSheets].filter(s=>!s.href);
    let total=0,hoverMedia=0;
    for(const s of ss) for(const r of s.cssRules){
      total++;
      if(r.type===CSSRule.MEDIA_RULE && r.conditionText.includes('hover')) hoverMedia=r.cssRules.length;
    }
    return {total,hoverMedia};
  });
  ok('CSS sparsowany, reguł w bloku hover: '+rules.hoverMedia+' (z '+rules.total+' reguł łącznie)',
     rules.total>60 && rules.hoverMedia>=10);
  ok('brak błędów JS', errs.length===0);
  await p.screenshot({path:SHOTS+'/after-hover-fix.png'});
}

// 3. urządzenie dotykowe: JEDNO tapnięcie zatwierdza posiłek
{
  const ctx=await b.newContext({...devices['iPhone 13'], locale:'pl-PL'});
  const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(APP); await p.waitForTimeout(500);
  ok('kontekst dotykowy (bez myszy)', await p.evaluate(()=>matchMedia('(pointer: coarse)').matches));
  ok('styl :hover nie obowiązuje na dotyku', await p.evaluate(()=>!matchMedia('(hover: hover) and (pointer: fine)').matches));

  await p.locator('.nlcard .nlmain').tap(); await p.waitForTimeout(400);
  await p.locator('.sheet textarea').fill('na obiad 150 g piersi z kurczaka i 200 g ryżu');
  await p.locator('.sheet .sheetrow .btn').nth(1).tap(); await p.waitForTimeout(400);
  ok('jedno tapnięcie w „Rozpoznaj”  ['+(await p.locator('.nlrow').count())+' pozycji]', await p.locator('.nlrow').count()===2);
  await p.locator('.sheet .sheetrow .btn').nth(1).tap(); await p.waitForTimeout(500);
  ok('jedno tapnięcie w „Dodaj”  ['+(await p.locator('.entry').count())+' wpisów]', await p.locator('.entry').count()===2);

  // i to samo na liście produktów
  await p.locator('.tab').nth(1).tap(); await p.waitForTimeout(300);
  const n0=await p.evaluate(()=>JSON.parse(localStorage.getItem('makro.v1')).log[Object.keys(JSON.parse(localStorage.getItem('makro.v1')).log)[0]].length);
  await p.locator('.addbtn').first().tap(); await p.waitForTimeout(400);
  const n1=await p.evaluate(()=>{const L=JSON.parse(localStorage.getItem('makro.v1')).log;return L[Object.keys(L)[0]].length});
  ok('jedno tapnięcie w „+” na liście  ['+n0+' → '+n1+']', n1===n0+1);
  /* Apple podaje 44×44 pt jako minimum trafialne kciukiem. Sam tekst albo
     mała ikonka wygląda dobrze na zrzucie i frustruje w ręce. */
  const tapz = await p.evaluate(()=>{
    const out=[];
    document.querySelectorAll('button,a,[role="button"],input,select,textarea').forEach(e=>{
      const r=e.getBoundingClientRect(); if(!r.width||!r.height) return;
      const cs=getComputedStyle(e); if(cs.display==='none'||cs.visibility==='hidden') return;
      if(r.height<44) out.push((e.getAttribute('aria-label')||e.textContent||e.className||e.tagName)
        .trim().slice(0,22)+' '+Math.round(r.width)+'×'+Math.round(r.height));
    });
    return out;
  });
  ok('każdy element dotykowy ma ≥44 px wysokości  ['+(tapz.join(', ')||'wszystkie ok')+']', tapz.length===0);
  /* Toast miał left:50% bez right — a to przycina dostępną szerokość do POŁOWY
     ekranu, więc max-width nigdy nie wchodził w grę i nazwa produktu łamała się
     na cztery linijki w wąskim pasku. Geometria pasków cicho się psuje przy
     każdej zmianie CSS, więc jest mierzona. */
  const tgeo = async (msg,act) => {
    await p.evaluate(a=>window.MAKRO.toast(a[0],a[1],()=>{}),[msg,act]);
    await p.waitForTimeout(380);
    return p.evaluate(()=>{
      const t=document.querySelector('.toast'), r=t.getBoundingClientRect();
      const tx=t.querySelector('.tx'), b=t.querySelector('button');
      const lh=parseFloat(getComputedStyle(tx).lineHeight);
      return {w:Math.round(r.width), left:Math.round(r.left),
              right:Math.round(innerWidth-r.right), vw:innerWidth,
              lines:Math.round(tx.getBoundingClientRect().height/lh),
              btn:b?Math.round(b.getBoundingClientRect().width):0,
              btnH:b?Math.round(b.getBoundingClientRect().height):0,
              over:r.right>innerWidth+1||r.left<-1};
    });
  };
  let g=await tgeo('Zapisane');
  ok('toast zajmuje szerokość treści, nie połowę ekranu  ['+g.w+' z '+g.vw+' px]',
     g.w>=g.vw-40 || g.w>=420);
  ok('i ma równe marginesy  [lewy '+g.left+', prawy '+g.right+']', Math.abs(g.left-g.right)<=1);
  g=await tgeo('Odżywka białkowa (wanilia) · 120 kcal','Cofnij');
  ok('długa nazwa mieści się w dwóch linijkach  ['+g.lines+']', g.lines<=2);
  ok('„Cofnij” nie jest ściśnięty  ['+g.btn+'×'+g.btnH+' px]', g.btn>=60 && g.btnH>=44);
  ok('szerokość nie zmienia się od treści  ['+g.w+' px]', g.w>=g.vw-40 || g.w>=420);
  g=await tgeo('Bardzo długa nazwa produktu która się nie zmieści w żadnym rozsądnym toaście · 1234 kcal','Cofnij');
  ok('skrajnie długi komunikat nie rozpycha toastu poza ekran  ['+g.lines+' linijki]',
     !g.over && g.lines<=2);
  /* Funkcja svg() nie podaje wymiarów, a bezwymiarowy inline-SVG zachowuje się
     zależnie od kontenera: w gridzie rozciąga się na całe pole (ołówek wyszedł
     44 px), we fleksie ZAPADA DO ZERA i ikona znika (kosz przy zestawie).
     Ta pułapka wystąpiła trzy razy, więc rozmiary ikon są mierzone na każdym
     ekranie, a nie oglądane. */
  const iconScan = async () => p.evaluate(()=>{
    const bad=[];
    document.querySelectorAll('svg').forEach(sv=>{
      const r=sv.getBoundingClientRect();
      const host=sv.closest('button,div')||{};
      const where=(host.className||'')||host.getAttribute&&host.getAttribute('aria-label')||'?';
      if(!r.width&&!r.height){bad.push('ZERO w .'+where);return}
      if(r.width<11||r.width>28)bad.push(Math.round(r.width)+'px w .'+where);
    });
    return bad;
  });
  const screens=[['Dziś',0],['Dodaj',1],['Zestawy',2],['Ja',3]];
  const iconBad=[];
  for (const [name,ix] of screens){
    await p.locator('.tab').nth(ix).tap(); await p.waitForTimeout(350);
    (await iconScan()).forEach(x=>iconBad.push(name+': '+x));
  }
  ok('żadna ikona nie zapada do zera ani nie rozpycha się na cały przycisk  ['+
     (iconBad.slice(0,3).join(', ')||'wszystkie 11–28 px')+']', iconBad.length===0);
  ok('brak błędów JS na dotyku  ['+(errs.join(' | ')||'brak')+']', errs.length===0);
  await ctx.close();
}


/* ── arkusz a klawiatura iOS ───────────────────────────────────────────────

   iOS NIE zmniejsza okna, kiedy wyjeżdża klawiatura — nakrywa nią dolną część
   ekranu. Arkusz jest przyklejony do dołu, więc krótki arkusz z polami do
   wpisania chował się pod klawiaturą w całości i nie dało się go zatwierdzić:
   „Cel ręcznie" miał cztery pola i Zapisz na samym dole, a przewinięcie nie
   pomagało, bo arkusz mieścił się w swojej (zasłoniętej) wysokości.

   Test udaje dokładnie ten stan: visualViewport kurczy się, window.innerHeight
   zostaje. */
{
  const ctx = await b.newContext({viewport:{width:390,height:664},
    isMobile:true, hasTouch:true, deviceScaleFactor:3, locale:'pl-PL'});
  const p = await ctx.newPage();
  await p.goto(APP); await p.waitForTimeout(400);
  await p.locator('.tab').nth(3).tap(); await p.waitForTimeout(400);
  const btn = p.getByRole('button',{name:'Ustaw ręcznie'});
  await btn.scrollIntoViewIfNeeded(); await btn.tap(); await p.waitForTimeout(400);
  const zap = p.locator('#sheet').getByRole('button',{name:'Zapisz'});

  let box = await zap.boundingBox();
  ok('bez klawiatury Zapisz jest w kadrze  [y do '+Math.round(box.y+box.height)+' / 664]',
     box.y+box.height <= 664);

  const KLAW = 364;   // tyle zostaje nad klawiaturą numeryczną na iPhonie 13
  await p.evaluate(h => {
    Object.defineProperty(window.visualViewport,'height',{get:()=>h,configurable:true});
    window.visualViewport.dispatchEvent(new Event('resize'));
  }, KLAW);
  await p.waitForTimeout(300);

  const st = await p.locator('#sheet').evaluate(e => ({b:e.style.bottom, m:e.style.maxHeight}));
  ok('arkusz podnosi się nad klawiaturę  [bottom '+st.b+']', st.b === (664-KLAW)+'px');
  ok('i przycina wysokość do widocznej części  [maxHeight '+st.m+']',
     parseInt(st.m,10) > 0 && parseInt(st.m,10) <= KLAW);

  box = await zap.boundingBox();
  ok('Zapisz zostaje nad klawiaturą  [y '+Math.round(box.y)+'..'+Math.round(box.y+box.height)+
     ' / '+KLAW+']', box.y+box.height <= KLAW);

  /* i faktycznie da się zatwierdzić w tym stanie */
  await p.locator('#sheet input').nth(0).fill('2750');
  await zap.tap(); await p.waitForTimeout(500);
  const cel = await p.evaluate(()=>JSON.parse(localStorage.getItem('makro.v1')).goal.k);
  ok('cel da się zapisać przy otwartej klawiaturze  ['+cel+' kcal]', cel===2750);

  /* po zamknięciu arkusz wraca do swojej geometrii — inaczej następny
     otwarty arkusz startowałby przesunięty o wysokość klawiatury */
  await p.evaluate(()=>document.getElementById('scrim').click());
  await p.waitForTimeout(450);
  const po = await p.locator('#sheet').evaluate(e => e.style.bottom+'|'+e.style.maxHeight);
  ok('po zamknięciu geometria wraca do domyślnej  ['+JSON.stringify(po)+']', po==='|');
  await ctx.close();
}

console.log('\n'+T.filter(t=>t.startsWith('PASS')).length+'/'+T.length+' PASS');
await b.close();
process.exit(T.some(t=>t.startsWith('FAIL'))?1:0);

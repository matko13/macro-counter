import { chromium, devices, APP, SHOTS } from './lib.mjs';
import { readFileSync } from 'fs';
const T=[],ok=(n,c)=>{T.push((c?'PASS':'FAIL')+'  '+n);console.log(T[T.length-1])};
const src=readFileSync('/workspace/macro-counter/index.html','utf8');

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
  ok('brak błędów JS na dotyku', errs.length===0);
  await ctx.close();
}

console.log('\n'+T.filter(t=>t.startsWith('PASS')).length+'/'+T.length+' PASS');
await b.close();
process.exit(T.some(t=>t.startsWith('FAIL'))?1:0);

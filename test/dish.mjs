import { chromium, APP, SHOTS } from './lib.mjs';
const T=[],ok=(n,c)=>{T.push((c?'PASS':'FAIL')+'  '+n);console.log(T[T.length-1])};
const b=await chromium.launch();
const p=await (await b.newContext({locale:'pl-PL'})).newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(APP); await p.waitForTimeout(300);
const P = t => p.evaluate(txt=>{const r=window.MAKRO.parse(txt);
  return {n:r.items.map(x=>x.f.n), kcal:r.items.map(x=>Math.round(window.MAKRO.scale(x.f,x.g).k)),
          dish:r.dish||null, inside:r.inside||[]};},t);

let r=await P('zjadłem burgera z wołowiną');
ok('burger z wołowiną = jeden burger  ['+r.n.join('+')+' '+r.kcal[0]+' kcal]', r.n.length===1&&/Burger/.test(r.n[0]));
ok('pominięty składnik jest zaraportowany  [inside: '+r.inside.join(',')+']', r.inside.length===1&&/wołowina/i.test(r.inside[0]));
r=await P('burger z wołowiną i serem');
ok('dwa opisowe składniki też nie dublują  ['+r.n.join('+')+']', r.n.length===1&&/Burger/.test(r.n[0]));
r=await P('kanapka z szynką i serem');
ok('5-wyrazowa nazwa łapie się całościowo  ['+r.n.join('+')+']', r.n.length===1&&/Kanapka/.test(r.n[0]));
r=await P('pizza z pieczarkami');
ok('dodatek na pizzy nie liczy się osobno  ['+r.n.join('+')+']', r.n.length===1&&/Pizza/.test(r.n[0]));
r=await P('chleb z masłem');
ok('ale chleb z masłem to nadal dwa składniki  ['+r.n.join('+')+']', r.n.length===2);
r=await P('kanapka z 2 kromek chleba i 50 g szynki');
ok('z podanymi ilościami liczą się składniki  ['+r.n.join('+')+' | danie: '+r.dish+']', r.n.length===2&&/Kanapka/.test(r.dish||''));
r=await P('na śniadanie zapiekanka z 4 jaj, 2 serków wiejskich i 8 oliwek');
ok('przepis własny nadal rozbijany  ['+r.n.length+' pozycji, danie: '+r.dish+']', r.n.length===3&&/Zapiekanka/.test(r.dish||''));
r=await P('kanapka z serem');
ok('„ser” to ser żółty, nie feta  ['+r.n.join('+')+']', !r.n.some(x=>/Feta/.test(x)));
r=await P('zjadłem ser');
ok('samo „ser” → Ser żółty  ['+r.n.join('+')+']', r.n.length===1&&/Ser żółty/.test(r.n[0]));

// porcje owoców
const fruit = await p.evaluate(()=>['jablko','gruszka','pomarancza','grejpfrut'].map(id=>{
  const f=window.MAKRO.byId(id); return f.n+': '+f.s+' g = '+Math.round(window.MAKRO.scale(f,f.s).k)+' kcal';}));
const apple = await p.evaluate(()=>{const f=window.MAKRO.byId('jablko');return Math.round(window.MAKRO.scale(f,f.s).k)});
ok('jabłko to porcja jadalna, nie owoc z ogryzkiem  ['+apple+' kcal]', apple>=70&&apple<=82);
console.log('   '+fruit.join('  |  '));

console.log('\n'+T.filter(t=>t.startsWith('PASS')).length+'/'+T.length+' PASS');
console.log(errs.length?'BŁĘDY: '+errs.join('\n'):'błędy JS: brak');
await b.close();
process.exit(T.some(t=>t.startsWith('FAIL'))||errs.length?1:0);

import { chromium, APP, SHOTS } from './lib.mjs';
const T=[],ok=(n,c)=>{T.push((c?'PASS':'FAIL')+'  '+n);console.log(T[T.length-1])};
const b=await chromium.launch();

const STUB = () => {
  const H = { instances: [], cfg: [] };
  function FakeRec(){ H.instances.push(this); this.started=0; this.stopped=0; }
  FakeRec.prototype.start=function(){ this.started++; H.cfg.push({lang:this.lang,cont:this.continuous,interim:this.interimResults}); };
  FakeRec.prototype.stop=function(){ this.stopped++; if(this.onend) this.onend(); };
  window.SpeechRecognition = FakeRec;
  window.__rec = {
    H,
    last(){ return H.instances[H.instances.length-1]; },
    emit(text,isFinal){ const r=this.last(); const res=[{0:{transcript:text},isFinal:!!isFinal}]; r.onresult({resultIndex:0,results:res}); },
    end(){ const r=this.last(); if(r.onend) r.onend(); },
    err(code){ const r=this.last(); if(r.onerror) r.onerror({error:code}); },
    starts(){ return H.instances.reduce((a,r)=>a+r.started,0); }
  };
};

// ── A. z obsługą mowy ────────────────────────────────────────────────────────
{
  const ctx=await b.newContext({viewport:{width:414,height:900},locale:'pl-PL'});
  const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(STUB);
  await p.goto(APP); await p.waitForTimeout(400);

  ok('mikrofon na karcie ekranu Dziś', await p.locator('.nlcard .nlmic').count()===1);

  await p.locator('.nlcard .nlmic').click(); await p.waitForTimeout(350);
  const cfg = await p.evaluate(()=>window.__rec.H.cfg[0]);
  ok('nasłuch startuje od razu, po polsku  ['+JSON.stringify(cfg)+']',
     cfg && cfg.lang==='pl-PL' && cfg.cont===true && cfg.interim===true);
  ok('przycisk w stanie „słucham”', (await p.locator('.dictate').getAttribute('class')).includes('on'));
  ok('ostrzeżenie o wysyłaniu nagrania jest widoczne',
     /serwery/.test(await p.locator('.dictnote').innerText()));

  // częściowy wynik pojawia się na żywo
  await p.evaluate(()=>window.__rec.emit('na obiad zjadłem',false));
  await p.waitForTimeout(120);
  ok('częściowy tekst wchodzi do pola  ['+(await p.locator('.sheet textarea').inputValue())+']',
     (await p.locator('.sheet textarea').inputValue())==='na obiad zjadłem');

  // wynik końcowy + stop -> od razu podgląd
  await p.evaluate(()=>window.__rec.emit('na obiad 150 g piersi z kurczaka i 200 g ryżu',true));
  await p.locator('.dictate').click(); await p.waitForTimeout(400);
  const rows = await p.locator('.nlrow').count();
  ok('stop prowadzi prosto do podglądu  ['+rows+' pozycji]', rows===2);
  const names = await p.locator('.nlrow .n b').allInnerTexts();
  ok('rozpoznane z mowy: '+names.join(' + '), /kurczaka/.test(names[0]) && /Ryż/.test(names[1]));
  const slot = await p.locator('.sheet .field .seg button[aria-pressed="true"]').first().innerText();
  ok('posiłek z podyktowanego zdania  ['+slot+']', slot==='Obiad');
  await ctx.close();
  if(errs.length) console.log('BŁĘDY(A): '+errs.join('\n'));
}

// ── B. dyktowanie bez przecinków (mowa ich nie ma) ───────────────────────────
{
  const ctx=await b.newContext({locale:'pl-PL'});
  const p=await ctx.newPage();
  await p.addInitScript(STUB);
  await p.goto(APP); await p.waitForTimeout(300);
  await p.locator('.nlcard .nlmic').click(); await p.waitForTimeout(300);
  await p.evaluate(()=>window.__rec.emit('na śniadanie zapiekanka z 4 jaj 2 serków wiejskich i 8 oliwek zjadłem połowę',true));
  await p.locator('.dictate').click(); await p.waitForTimeout(400);
  const n = await p.locator('.nlrow').count();
  const part = await p.locator('.sheet .field').nth(1).locator('button[aria-pressed="true"]').innerText();
  ok('bez przecinków nadal 3 składniki  ['+n+']', n===3);
  ok('„zjadłem połowę” z mowy → ½  ['+part+']', part==='½');
  await ctx.close();
}

// ── C. odmowa mikrofonu ─────────────────────────────────────────────────────
{
  const ctx=await b.newContext({locale:'pl-PL'});
  const p=await ctx.newPage();
  await p.addInitScript(STUB);
  await p.goto(APP); await p.waitForTimeout(300);
  await p.locator('.nlcard .nlmic').click(); await p.waitForTimeout(300);
  await p.evaluate(()=>{window.__rec.err('not-allowed'); window.__rec.end();});
  await p.waitForTimeout(200);
  const txt = await p.locator('.dictate').innerText();
  ok('odmowa mikrofonu tłumaczy się po polsku  ['+txt.replace(/\n/g,' / ')+']', /zgody na mikrofon/.test(txt));
  ok('po błędzie krytycznym nie ponawia w pętli  [startów: '+(await p.evaluate(()=>window.__rec.starts()))+']',
     await p.evaluate(()=>window.__rec.starts())===1);
  await ctx.close();
}

// ── D. iOS: sesja kończy się sama, dyktowanie ma trwać ──────────────────────
{
  const ctx=await b.newContext({locale:'pl-PL'});
  const p=await ctx.newPage();
  await p.addInitScript(STUB);
  await p.goto(APP); await p.waitForTimeout(300);
  await p.locator('.nlcard .nlmic').click(); await p.waitForTimeout(300);
  await p.evaluate(()=>{window.__rec.end(); window.__rec.end();});
  await p.waitForTimeout(200);
  ok('samoczynny koniec frazy wraca do słuchania  [startów: '+(await p.evaluate(()=>window.__rec.starts()))+']',
     await p.evaluate(()=>window.__rec.starts())===3);
  ok('nadal w stanie „słucham”', (await p.locator('.dictate').getAttribute('class')).includes('on'));

  // zamknięcie arkusza musi zgasić mikrofon
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  ok('zamknięcie arkusza zatrzymuje nasłuch  [stopów: '+(await p.evaluate(()=>window.__rec.last().stopped))+']',
     await p.evaluate(()=>window.__rec.last().stopped)>=1);
  await ctx.close();
}

// ── E. przeglądarka bez rozpoznawania mowy ──────────────────────────────────
{
  const ctx=await b.newContext({locale:'pl-PL'});
  const p=await ctx.newPage();
  await p.addInitScript(()=>{ try{delete window.SpeechRecognition}catch(e){} try{delete window.webkitSpeechRecognition}catch(e){} });
  await p.goto(APP); await p.waitForTimeout(300);
  ok('bez obsługi mowy nie ma przycisku mikrofonu na karcie', await p.locator('.nlcard .nlmic').count()===0);
  await p.locator('.nlcard .nlmain').click(); await p.waitForTimeout(300);
  const d = p.locator('.dictate');
  ok('w arkuszu przycisk wyłączony z wyjaśnieniem  ['+((await d.count())?(await d.innerText()).replace(/\n/g,' / '):'brak')+']',
     await d.count()===1 && await d.getAttribute('disabled')!==null && /nie ma rozpoznawania mowy/.test(await d.innerText()));
  ok('wpisywanie ręczne nadal działa', await p.locator('.sheet textarea').isVisible());
  await ctx.close();
}

console.log('\n'+T.filter(t=>t.startsWith('PASS')).length+'/'+T.length+' PASS');
await b.close();
process.exit(T.some(t=>t.startsWith('FAIL'))?1:0);

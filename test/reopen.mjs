import { chromium, devices, APP, SHOTS } from './lib.mjs';
const T=[],ok=(n,c)=>{T.push((c?'PASS':'FAIL')+'  '+n);console.log(T[T.length-1])};
const b=await chromium.launch();
const ctx=await b.newContext({...devices['iPhone 13'],locale:'pl-PL'});
const p=await ctx.newPage();
await p.addInitScript(()=>{
  const H={instances:[]};
  function F(){H.instances.push(this);this.started=0;this.stopped=0}
  F.prototype.start=function(){this.started++};
  F.prototype.stop=function(){this.stopped++; if(this.onend) this.onend();};
  window.SpeechRecognition=F;
  window.__rec={last(){return H.instances[H.instances.length-1]},
    emit(t,f){const r=this.last();r.onresult({resultIndex:0,results:[{0:{transcript:t},isFinal:!!f}]})},
    end(){const r=this.last(); if(r.onend) r.onend();}};
});
await p.goto(APP); await p.waitForTimeout(400);

// dyktujemy tak, jak na telefonie: iOS kończy frazę sam, kod wraca do słuchania
await p.locator('.nlcard .nlmic').tap(); await p.waitForTimeout(300);
await p.evaluate(()=>window.__rec.emit('wypiłem dwa piwa zero',true));
await p.evaluate(()=>window.__rec.end());          // iOS kończy frazę → restart nasłuchu
await p.waitForTimeout(150);
await p.locator('.dictate').tap();                  // użytkownik tapie STOP
await p.waitForTimeout(400);
ok('podgląd otwarty po dyktowaniu  ['+(await p.locator('.nlrow').count())+' pozycji]', await p.locator('.nlrow').count()===1);

await p.locator('.sheet .sheetrow .btn').nth(1).tap();   // Dodaj
await p.waitForTimeout(400);
const added=await p.locator('.entry').count();
ok('wpis dodany  ['+added+']', added===1);
ok('arkusz zamknięty po zatwierdzeniu', !(await p.locator('.sheet').getAttribute('class')).includes('on'));

// TERAZ: spóźnione onend z sesji rozpoznawania, którą iOS zamknął po swojemu
await p.evaluate(()=>window.__rec.end());
await p.waitForTimeout(400);
const cls=await p.locator('.sheet').getAttribute('class');
ok('spóźniony koniec sesji NIE otwiera arkusza znowu  [class="'+cls+'"]', !cls.includes('on'));
ok('i nie dubluje wpisu  ['+(await p.locator('.entry').count())+']', await p.locator('.entry').count()===added);
await p.screenshot({path:SHOTS+'/reopen.png'});


// przypadek bliźniaczy A: zamknięcie arkusza w trakcie dyktowania
await p.evaluate(()=>localStorage.removeItem('makro.v1'));
await p.reload(); await p.waitForTimeout(500);
await p.locator('.nlcard .nlmic').tap(); await p.waitForTimeout(300);
await p.evaluate(()=>window.__rec.emit('zjadłem banana',true));
await p.keyboard.press('Escape'); await p.waitForTimeout(400);
ok('zamknięcie arkusza przy dyktowaniu nie otwiera podglądu',
   !(await p.locator('.sheet').getAttribute('class')).includes('on'));
ok('i nic nie zapisuje  ['+(await p.locator('.entry').count())+' wpisów]', await p.locator('.entry').count()===0);

// przypadek bliźniaczy B: dwa szybkie tapnięcia w "Dodaj" = jeden zapis
await p.locator('.nlcard .nlmain').tap(); await p.waitForTimeout(300);
await p.locator('.sheet textarea').fill('2 jajka');
await p.locator('.sheet .sheetrow .btn').nth(1).tap(); await p.waitForTimeout(350);
const btn=p.locator('.sheet .sheetrow .btn').nth(1);
await btn.dispatchEvent('click'); await btn.dispatchEvent('click');
await p.waitForTimeout(400);
ok('podwójne kliknięcie w „Dodaj” zapisuje raz  ['+(await p.locator('.entry').count())+' wpisów]',
   await p.locator('.entry').count()===1);

console.log('\n'+T.filter(t=>t.startsWith('PASS')).length+'/'+T.length+' PASS');
await b.close();
process.exit(T.some(t=>t.startsWith('FAIL'))?1:0);

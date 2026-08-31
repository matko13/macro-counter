/* Zgłaszanie problemów. Apka nie ma serwera, więc nie wyśle zgłoszenia sama —
   ale może zebrać to, czego przy zgłoszeniu zwykle brakuje: wersję,
   przeglądarkę i treść błędu. Najważniejsze w tych testach: raport NIE MOŻE
   zawierać niczego o jedzeniu. Kolega wysyła go obcej osobie. */
import { chromium, devices, APP } from './lib.mjs';
const T=[],ok=(n,c)=>{T.push((c?'PASS':'FAIL')+'  '+n);console.log(T[T.length-1])};
const b=await chromium.launch();
const ctx=await b.newContext({...devices['iPhone 13'],locale:'pl-PL',
  permissions:['clipboard-read','clipboard-write']});
const p=await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto(APP); await p.waitForTimeout(400);

/* dziennik z rozpoznawalnymi nazwami — gdyby wyciekły, będzie je widać */
await p.evaluate(()=>{
  const d=new Date(), k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  localStorage.setItem('makro.v1',JSON.stringify({
    log:{[k]:[{fid:'kiszka-ziemniaczana-gzella',n:'Kiszka ziemniaczana Gzella',g:150,u:'g',s:150,k:270,p:10,c:18,f:17,t:Date.now()}]},
    wt:{[k]:87.4}, custom:[{n:'Odżywka białkowa Olimp',k:370,p:80,c:5,f:3,s:30,u:'g'}],
    sets:[], usage:{}, goal:{k:2370,p:178,c:237,f:79},
    profile:{sex:'m',age:34,h:183,w:87.4,act:1.5}, theme:'auto', split:'bal'}));
});
await p.reload(); await p.waitForTimeout(500);

// ── raport ────────────────────────────────────────────────────────────────
const raport = await p.evaluate(()=>window.MAKRO.diag());
console.log('\n--- raport ---\n'+raport+'\n');

ok('raport ma sekcję na opis problemu', /## Co się stało/.test(raport));
ok('podaje wersję  ['+(raport.match(/- wersja: (.*)/)||[])[1]+']', /- wersja: /.test(raport));
ok('podaje przeglądarkę', /iPhone/.test(raport));
ok('mówi, czy z ekranu początkowego  ['+(raport.match(/- z ekranu początkowego: (.*)/)||[])[1]+']',
   /- z ekranu początkowego: (tak|nie)/.test(raport));
ok('sprawdza, czy localStorage działa  ['+(raport.match(/- localStorage: (.*)/)||[])[1]+']',
   /- localStorage: działa/.test(raport));
ok('podaje liczniki, nie treść  ['+(raport.match(/- dni w dzienniku: (.*)/)||[])[1]+']',
   /dni w dzienniku: 1, własnych produktów: 1, profil: ustawiony/.test(raport));

// ── to jest najważniejsze: żadnych danych o jedzeniu ──────────────────────
const wyciek = ['Kiszka','Gzella','Olimp','białkowa','87,4','87.4','2370','178','183']
  .filter(x=>raport.indexOf(x)>=0);
ok('raport nie zawiera NICZEGO o jedzeniu, wadze ani celach  ['+(wyciek.join(',')||'czysto')+']',
   wyciek.length===0);
ok('i mówi o tym wprost w treści', /nie zawiera nic o jedzeniu/.test(raport));

// ── błędy trafiają do raportu ─────────────────────────────────────────────
await p.evaluate(()=>{window.MAKRO.errLog('TypEroor: cos sie zepsulo @index.html:123')});
let r2 = await p.evaluate(()=>window.MAKRO.diag());
ok('zapisany błąd trafia do raportu', /TypEroor: cos sie zepsulo/.test(r2));

/* prawdziwy, nieprzechwycony błąd też ma się zapisać — inaczej raport kłamie */
await p.evaluate(()=>{setTimeout(()=>{null.boom()},0)});
await p.waitForTimeout(250);
const lista = await p.evaluate(()=>window.MAKRO.errList());
ok('prawdziwy wyjątek jest łapany sam  ['+(lista[lista.length-1]||'').slice(17,60)+']',
   lista.some(x=>/boom|null|undefined/i.test(x)));

// błędy przeżywają odświeżenie — awaria zwykle kończy się przeładowaniem
await p.reload(); await p.waitForTimeout(450);
ok('błędy przeżywają przeładowanie  ['+(await p.evaluate(()=>window.MAKRO.errList().length))+']',
   (await p.evaluate(()=>window.MAKRO.errList())).some(x=>/TypEroor/.test(x)));

// i nie rosną bez końca
await p.evaluate(()=>{for(let i=0;i<40;i++)window.MAKRO.errLog('błąd numer '+i)});
const ile = await p.evaluate(()=>window.MAKRO.errList().length);
ok('lista błędów jest ograniczona  ['+ile+']', ile<=5);

// osobny klucz — zgłoszenia nie mogą uszkodzić dziennika
const dziennik = await p.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('makro.v1')).log).length);
ok('dziennik nietknięty przez zbieranie błędów  ['+dziennik+' dzień]', dziennik===1);

// ── ekran ─────────────────────────────────────────────────────────────────
await p.locator('.tab').nth(3).click(); await p.waitForTimeout(350);
const btn = p.getByRole('button',{name:'Zgłoś problem'});
ok('przycisk jest na ekranie Ja', await btn.count()===1);
await btn.tap(); await p.waitForTimeout(400);
ok('arkusz się otwiera', (await p.locator('#sheet h3').innerText())==='Zgłoś problem');
const pole = p.locator('#sheet textarea');
ok('treść jest do wglądu i do edycji  ['+(await pole.inputValue()).length+' znaków]',
   (await pole.inputValue()).indexOf('## Co się stało')===0);
ok('są obie drogi: GitHub i schowek',
   await p.getByRole('button',{name:'Wyślij na GitHuba'}).count()===1 &&
   await p.getByRole('button',{name:/^Skopiuj tekst/}).count()===1);

/* <button> kurczy się do treści, więc przyciski jeden pod drugim potrafią mieć
   różne szerokości i stykać się bez odstępu. To już rozjechało w tej apce
   ołówek i toast, więc tu jest pilnowane. */
const gh = await p.getByRole('button',{name:'Wyślij na GitHuba'}).boundingBox();
const kop = await p.getByRole('button',{name:/^Skopiuj tekst/}).boundingBox();
ok('oba przyciski tej samej szerokości  ['+Math.round(gh.width)+' i '+Math.round(kop.width)+' px]',
   Math.abs(gh.width-kop.width)<2);
ok('i nie stykają się  [odstęp '+Math.round(kop.y-(gh.y+gh.height))+' px]',
   kop.y-(gh.y+gh.height)>=6);
ok('oba dotykalne (min. 44 px wysokości)  ['+Math.round(gh.height)+' px]',
   gh.height>=44 && kop.height>=44);

// dopisany opis użytkownika musi wejść do zgłoszenia
await pole.fill('Zniknęły mi dane po dodaniu do ekranu.\n\n- wersja: abc1234');
const link = await p.evaluate(()=>{
  const ta=document.querySelector('#sheet textarea');
  return 'https://github.com/matko13/macro-counter/issues/new?labels=zgloszenie&title='+
    encodeURIComponent('Zgłoszenie z apki')+'&body='+encodeURIComponent(ta.value);
});
ok('link celuje w Issues właściwego repo', link.indexOf('https://github.com/matko13/macro-counter/issues/new')===0);
ok('i nosi opis użytkownika', decodeURIComponent(link).indexOf('Zniknęły mi dane')>0);

await p.getByRole('button',{name:/^Skopiuj tekst/}).tap(); await p.waitForTimeout(350);
const schowek = await p.evaluate(()=>navigator.clipboard.readText());
ok('„Skopiuj” wkłada treść do schowka  ['+schowek.slice(0,28)+'…]', /Zniknęły mi dane/.test(schowek));

console.log('\n'+T.filter(t=>t.startsWith('PASS')).length+'/'+T.length+' PASS');
/* Celowo wywołany wyjątek jest oczekiwany, więc nie liczymy go jako awarii. */
const realne = errs.filter(e=>!/boom|null|Cannot read/i.test(e));
console.log(realne.length?'błędy JS: '+realne.join('; '):'błędy JS: brak (poza celowym)');
await b.close();
process.exit(T.some(t=>t.startsWith('FAIL'))||realne.length?1:0);

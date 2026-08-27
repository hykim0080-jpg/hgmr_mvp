import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const b=await puppeteer.launch({executablePath:CHROME,headless:'new',args:['--no-sandbox']});
const p=await b.newPage();
await p.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1');
await p.setViewport({width:390,height:844,deviceScaleFactor:3,isMobile:true,hasTouch:true});
const vis=s=>p.evaluate(x=>{const e=document.querySelector(x);return !!e&&getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().height>0;},s);
const click=async s=>{await p.waitForSelector(s,{timeout:20000});await p.evaluate(x=>document.querySelector(x).click(),s);};
const words=JSON.parse(fs.readFileSync(process.env.HOME+'/Desktop/hgmr/words.json','utf8'));
const bySent=new Map(words.map(w=>[w.sentence.replace(/_+/g,'').trim(),w]));
const cur=async()=>bySent.get(await p.evaluate(()=>(document.getElementById('sentence-text')?.textContent||'').replace(/_+/g,'').trim()));
const ans=async t=>{await p.evaluate(()=>{const el=document.getElementById('answer-input');el.value='';el.focus();});await p.type('#answer-input',t,{delay:8});await p.evaluate(()=>document.getElementById('submit-btn').click());};
await p.goto('https://hgmr.co.kr/shot.html',{waitUntil:'networkidle2',timeout:60000});
await click('#anon-login-btn');
for(let t=0;t<25;t++){await sleep(1000); if(await vis('#placement-intro-modal')||await vis('#start-study-btn')) break;}
if(!await vis('#placement-intro-modal')) await click('#start-study-btn');
await sleep(700); await click('#placement-start-btn'); await sleep(2500);
for(let i=0;i<60;i++){ if(await vis('#placement-result-modal'))break; if(!await vis('#quiz-box'))break;
  const w=await cur(); await ans(w?w.target:'아무말아무말'); await sleep(850);
  for(let k=0;k<6&&await vis('#next-btn');k++){await click('#next-btn');await sleep(550);} }
if(await vis('#placement-result-modal')){await click('#placement-result-home-btn');await sleep(2200);}
await p.waitForSelector('#home-box',{visible:true,timeout:20000});
await click('#start-study-btn'); await sleep(3000);
if(await vis('#topic-modal')){await click('#close-topic-btn');await sleep(800);}
await p.waitForSelector('#quiz-box',{visible:true,timeout:20000});

const probe = async (label) => p.evaluate((label)=>{
  const c=document.getElementById('inline-stats-container');
  const r=c.getBoundingClientRect();
  const sc=c.querySelector('.stats-scroll');
  const nb=document.getElementById('next-btn');
  return { label,
    kbHeight: getComputedStyle(document.documentElement).getPropertyValue('--kb-height').trim() || '(미설정)',
    클래스: c.className,
    컨테이너: `top=${Math.round(r.top)} h=${Math.round(r.height)} (뷰포트 ${innerHeight})`,
    스크롤영역: sc? `h=${Math.round(sc.getBoundingClientRect().height)} 내용=${sc.scrollHeight}` : '없음',
    다음버튼: nb? `h=${Math.round(nb.getBoundingClientRect().height)} bottom=${Math.round(nb.getBoundingClientRect().bottom)}` : '없음',
    잘림: sc ? sc.scrollHeight - Math.round(sc.getBoundingClientRect().height) : 0
  };
}, label);

for(let i=1;i<=3;i++){
  const w=await cur(); await ans(w?w.target:'아무말아무말'); await sleep(2600);
  if(await vis('#inline-stats-container')){
    console.log(JSON.stringify(await probe(`${i}번째 문제`),null,1));
    if(i===1) await p.screenshot({path:'/tmp/first.png'});
  }
  for(let k=0;k<3&&await vis('#next-btn');k++){await click('#next-btn');await sleep(700);}
}
await b.close();

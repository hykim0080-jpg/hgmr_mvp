import puppeteer from 'puppeteer-core';
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const b=await puppeteer.launch({executablePath:CHROME,headless:'new',args:['--no-sandbox','--allow-file-access-from-files']});
const p=await b.newPage();
await p.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148');
await p.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
const errs=[], logs=[];
p.on('pageerror',e=>errs.push('PAGEERROR: '+e.message));
p.on('console',m=>{ if(m.type()==='error') errs.push('CONSOLE: '+m.text().slice(0,200)); else logs.push(m.text().slice(0,120)); });
await p.goto('file://'+process.env.HOME+'/Desktop/hgmr/www/index.html',{waitUntil:'domcontentloaded',timeout:30000});
await sleep(6000);
const st = await p.evaluate(()=>{
  const d=id=>{const e=document.getElementById(id);return e?getComputedStyle(e).display:'없음';};
  return { 로그인화면:d('login-screen'), 버튼그룹:d('login-btn-group'), 터치문구:d('start-prompt'),
           앱화면:d('app-screen'), auth:typeof window.mountainEdgeX };
});
console.log('=== 화면 상태:', JSON.stringify(st));
console.log('=== 에러', errs.length, '건');
errs.slice(0,6).forEach(e=>console.log('  '+e));
console.log('=== 로그(마지막 6):');
logs.slice(-6).forEach(l=>console.log('  '+l));
await b.close();

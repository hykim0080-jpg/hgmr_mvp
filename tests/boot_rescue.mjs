// 🛟 부팅 안전망 — 모듈이 죽어도 로그인 화면과 이유가 뜨는지.
//    index.html 은 통짜 module 하나라, 예외 하나에 전체가 멈추고 민트 화면만 남는다.
import puppeteer from 'puppeteer-core';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });

const check = async (label, breakIt) => {
    const p = await b.newPage();
    await p.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148');
    await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    if (breakIt) {
        // 모듈 평가 중 예외를 강제로 일으킨다 (Firebase CDN 을 막는다 = 실기기에서 가장 흔한 실패)
        await p.setRequestInterception(true);
        p.on('request', r => r.url().includes('gstatic.com/firebasejs') ? r.abort() : r.continue());
    }
    await p.goto('https://hgmr.co.kr/shot.html', { waitUntil: 'domcontentloaded', timeout: 40000 });
    await sleep(breakIt ? 10000 : 6000);
    const st = await p.evaluate(() => {
        const d = id => { const e = document.getElementById(id); return e ? getComputedStyle(e).display : '없음'; };
        const be = document.getElementById('boot-error');
        return { 버튼그룹: d('login-btn-group'), 터치문구: d('start-prompt'), 앱화면: d('app-screen'),
                 안내: be ? be.textContent.trim().slice(0, 60) : null };
    });
    console.log(`${label}: ${JSON.stringify(st)}`);
    await p.close();
    return st;
};

const ok = await check('정상', false);
const broken = await check('모듈 강제 실패', true);
console.log('');
console.log('정상일 때 로그인 버튼 뜸:', ok.버튼그룹 === 'flex' ? '✅' : `❌ (${ok.버튼그룹})`);
console.log('정상일 때 안내 없음:', ok.안내 === null ? '✅' : `❌ (${ok.안내})`);
console.log('실패해도 화면이 비지 않음:', broken.버튼그룹 === 'flex' ? '✅' : `❌ (${broken.버튼그룹})`);
console.log('실패 이유가 화면에 뜸:', broken.안내 ? '✅ ' + broken.안내 : '❌');
await b.close();

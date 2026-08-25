// 🔍 구글 로그인 실패 진단 — 어디서 막히는지만 본다. 실제 로그인은 하지 않는다.
// 팝업이 열리는지, Firebase가 그 전에 던지는지, 콘솔에 무엇이 찍히는지.
import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = process.env.TARGET || 'https://hgmr.co.kr/';
const log = (...a) => console.log(...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1');
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

const 콘솔 = [], 팝업 = [], 실패요청 = [];
page.on('console', m => 콘솔.push(`[${m.type()}] ${m.text().slice(0, 220)}`));
page.on('pageerror', e => 콘솔.push(`[pageerror] ${e.message.slice(0, 220)}`));
page.on('requestfailed', r => { if (!/analytics|gtag|firebaselogging/.test(r.url())) 실패요청.push(`${r.url().slice(0, 90)} — ${r.failure()?.errorText}`); });
browser.on('targetcreated', async t => { if (t.type() === 'page') 팝업.push(t.url()); });

log(`대상: ${URL}\n`);
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
await sleep(2500);

const 상태 = await page.evaluate(() => ({
    로그인화면: !!document.getElementById('login-screen') && getComputedStyle(document.getElementById('login-screen')).display !== 'none',
    구글버튼: !!document.getElementById('google-login-btn'),
    standalone: window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true,
    출처: location.origin,
}));
log('화면 상태:', JSON.stringify(상태));

// 구글 버튼을 눌러 본다 — 팝업이 뜨는지, 그 전에 던지는지
const 던진에러 = await page.evaluate(async () => {
    const errs = [];
    const orig = window.onerror;
    try { document.getElementById('google-login-btn').click(); } catch (e) { errs.push(String(e)); }
    return errs;
});
await sleep(6000);

log(`\n열린 팝업/탭: ${팝업.length ? 팝업.join(' | ') : '없음'}`);
log(`동기 예외: ${던진에러.length ? 던진에러.join(' | ') : '없음'}`);
log('\n콘솔 기록:');
콘솔.slice(-25).forEach(l => log('  ' + l));
if (실패요청.length) { log('\n실패한 요청:'); 실패요청.slice(0, 10).forEach(l => log('  ' + l)); }

const 토스트 = await page.evaluate(() => {
    const t = [...document.querySelectorAll('div')].find(d => /로그인에 실패|다시 시도/.test(d.textContent) && d.getBoundingClientRect().height > 0 && d.children.length === 0);
    return t ? t.textContent.trim() : null;
});
log(`\n화면 토스트: ${토스트 || '없음'}`);
await browser.close();

// 🧭 화면 배치 선택 창 — 카드가 화면을 넘지 않고 설명이 접히는지, 다크 모드에서 경계가 보이는지.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SHOT = process.env.HOME + '/Desktop/hgmr/tests/shots';
fs.mkdirSync(SHOT, { recursive: true });
const log = (...a) => console.log(...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1');
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);   // 다크 모드로 확인
page.on('pageerror', e => log('  [page error]', e.message));

const click = async sel => { await page.waitForSelector(sel, { timeout: 20000 }); await page.evaluate(s => document.querySelector(s).click(), sel); };
const visible = sel => page.evaluate(s => {
    const el = document.querySelector(s); if (!el) return false;
    return getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0;
}, sel);

await page.goto('https://hgmr.co.kr/shot.html', { waitUntil: 'networkidle2', timeout: 60000 });
await click('#anon-login-btn');
let ready = false;
for (let t = 0; t < 25 && !ready; t++) { await sleep(1000); ready = await visible('#placement-intro-modal') || await visible('#start-study-btn'); }
if (await visible('#placement-intro-modal')) { await click('#placement-later-btn'); await sleep(1500); }
await sleep(1000);

await click('#edit-profile-trigger'); await sleep(900);
const 진입 = await page.evaluate(() => {
    const b = document.getElementById('open-layout-btn');
    const r = b.getBoundingClientRect();
    const sheet = b.parentElement.getBoundingClientRect();
    const cs = n => getComputedStyle(document.getElementById(n)).borderColor;
    return {
        너비: Math.round(r.width), 부모너비: Math.round(document.getElementById('open-account-btn').getBoundingClientRect().width),
        글자크기: getComputedStyle(b).fontSize,
        경계색: { 닉네임: cs('input-nickname'), 칭호: cs('title-collapse-btn'), 계정: cs('open-account-btn') },
        배경: getComputedStyle(document.body).backgroundColor,
    };
});
log(`진입 행: 너비 ${진입.너비} / 옆 행(계정 관리) ${진입.부모너비} · 글자 ${진입.글자크기}`);
log(`배경 ${진입.배경}`);
log(`경계색  닉네임 ${진입.경계색.닉네임} · 칭호 ${진입.경계색.칭호} · 계정 ${진입.경계색.계정}`);
await page.screenshot({ path: `${SHOT}/dark-profile.png` });

await click('#open-layout-btn'); await sleep(900);
const 카드 = await page.evaluate(() => {
    const opts = [...document.querySelectorAll('#layout-modal .layout-opt')];
    return opts.map(o => {
        const r = o.getBoundingClientRect();
        const d = o.querySelector('.layout-desc');
        const dr = d.getBoundingClientRect();
        const lh = parseFloat(getComputedStyle(d).fontSize) * 1.6;
        return { 오른끝: Math.round(r.right), 설명너비: Math.round(dr.width), 설명줄수: Math.round(dr.height / lh) };
    });
});
const vw = await page.evaluate(() => window.innerWidth);
카드.forEach((c, i) => log(`  카드${i + 1}  오른끝 ${c.오른끝} (화면 ${vw}) · 설명 폭 ${c.설명너비} · ${c.설명줄수}줄`));
await page.screenshot({ path: `${SHOT}/dark-layout.png` });

log('\n판정');
log(`  · 진입 행이 한 줄을 다 씀: ${Math.abs(진입.너비 - 진입.부모너비) <= 2 ? '✅' : '❌'}`);
log(`  · 진입 글자는 작게 유지: ${parseFloat(진입.글자크기) <= 12.5 ? '✅' : '❌ ' + 진입.글자크기}`);
log(`  · 카드가 화면을 넘지 않음: ${카드.every(c => c.오른끝 <= vw) ? '✅' : '❌'}`);
log(`  · 설명이 여러 줄로 접힘: ${카드.every(c => c.설명줄수 >= 2) ? '✅' : '❌ ' + 카드.map(c => c.설명줄수)}`);
const 회색 = /rgb\((\d+), \1, \1\)/;
log(`  · 다크에서 컨트롤 경계가 배경과 구분됨: ${Object.values(진입.경계색).every(v => v !== 'rgb(48, 48, 48)') ? '✅' : '❌'}`);
await browser.close();

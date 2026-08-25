// 📖 낱말 이야기 — 홈 진입점과 모달이 실제로 뜨는지, 읽음 표시가 남는지 확인.
// 학습 세션을 돌지 않으므로 word_stats를 오염시키지 않는다.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = 'https://hgmr.co.kr/shot.html';
const SHOT = process.env.HOME + '/Desktop/hgmr/tests/shots';
fs.mkdirSync(SHOT, { recursive: true });
const log = (...a) => console.log(...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1');
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
page.on('pageerror', e => log('  [page error]', e.message));
page.on('console', m => { if (m.type() === 'error') log('  [console]', m.text().slice(0, 160)); });

const click = async sel => { await page.waitForSelector(sel, { timeout: 20000 }); await page.evaluate(s => document.querySelector(s).click(), sel); };
const visible = sel => page.evaluate(s => {
    const el = document.querySelector(s); if (!el) return false;
    return getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0;
}, sel);

await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
await click('#anon-login-btn');
let ready = false;
for (let t = 0; t < 25 && !ready; t++) { await sleep(1000); ready = await visible('#placement-intro-modal') || await visible('#start-study-btn'); }
if (await visible('#placement-intro-modal')) { await click('#placement-later-btn'); await sleep(1500); }
await sleep(1500);

// ── 홈 진입점 ──
const chip = await page.evaluate(() => {
    const c = document.getElementById('home-story-chip');
    const btn = document.getElementById('start-study-btn');
    if (!c || !btn) return null;
    const cb = c.getBoundingClientRect(), bb = btn.getBoundingClientRect();
    return {
        보임: getComputedStyle(c).display !== 'none',
        제목: document.getElementById('home-story-title').textContent.trim(),
        읽음배지: getComputedStyle(document.getElementById('home-story-read')).display !== 'none',
        시작버튼_아래: cb.top >= bb.bottom,
        시작버튼_화면안: bb.bottom <= window.innerHeight,
        칩_화면안: cb.bottom <= window.innerHeight,
    };
});
log('홈 진입점:', JSON.stringify(chip, null, 0));
await page.screenshot({ path: `${SHOT}/story-1-홈.png` });

// ── 모달 ──
await click('#home-story-chip');
await sleep(900);
const modal = await page.evaluate(() => {
    const m = document.getElementById('story-modal');
    const b = document.getElementById('story-body');
    return {
        열림: getComputedStyle(m).display !== 'none',
        제목: document.getElementById('story-title').textContent.trim(),
        구역: [...b.querySelectorAll('div')].map(d => d.textContent.trim()).filter(t => ['같은 자리, 다른 낱말', '왜 갈리는가', '시험틀'].includes(t)),
        본문길이: b.textContent.trim().length,
        공식: (b.textContent.match(/분간은 하는 일[^.]*\./) || [''])[0],
        굵게렌더: b.querySelectorAll('b').length,
        원시마크업노출: b.textContent.includes('**'),
    };
});
log('모달:', JSON.stringify(modal, null, 0));
await page.screenshot({ path: `${SHOT}/story-2-모달.png` });

// ── 닫고 읽음 표시 확인 ──
await click('#story-close-btn');
await sleep(700);
const after = await page.evaluate(() => ({
    모달닫힘: getComputedStyle(document.getElementById('story-modal')).display === 'none',
    읽음배지: getComputedStyle(document.getElementById('home-story-read')).display !== 'none',
}));
log('닫은 뒤:', JSON.stringify(after, null, 0));

log('\n판정');
log(`  · 칩이 학습 시작 버튼 아래: ${chip?.시작버튼_아래 ? '✅' : '❌'}`);
log(`  · 학습 시작 버튼이 첫 화면 안: ${chip?.시작버튼_화면안 ? '✅' : '❌'}`);
log(`  · 모달 3구역 모두 렌더: ${modal.구역.length === 3 ? '✅' : '❌ ' + modal.구역}`);
log(`  · **굵게** 원시 마크업 노출 없음: ${!modal.원시마크업노출 ? '✅' : '❌'}`);
log(`  · 읽음 표시 남음: ${after.읽음배지 ? '✅' : '❌'}`);
await browser.close();

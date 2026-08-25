// 🦭 산으로 간 물범 — 하랑이가 지금 오른 고도에 서 있는지.
// 홈 산(B안)과 「어휘 고도란?」 모달 두 곳 모두 확인한다.
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
page.on('pageerror', e => log('  [page error]', e.message));

const click = async sel => { await page.waitForSelector(sel, { timeout: 20000 }); await page.evaluate(s => document.querySelector(s).click(), sel); };
const visible = sel => page.evaluate(s => {
    const el = document.querySelector(s); if (!el) return false;
    return getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0;
}, sel);

await page.goto('https://hgmr.co.kr/shot.html', { waitUntil: 'networkidle2', timeout: 60000 });
await click('#anon-login-btn');
let ready = false;
for (let t = 0; t < 25 && !ready; t++) { await sleep(1000); ready = await visible('#placement-intro-modal'); }
if (!ready) { log('배치고사 안내가 뜨지 않음 — 중단'); await browser.close(); process.exit(1); }

// 고도가 있어야 하랑이가 설 자리가 생긴다 — 배치고사를 끝까지 치른다
{
    const words = JSON.parse(fs.readFileSync(process.env.HOME + '/Desktop/hgmr/words.json', 'utf8'));
    await click('#placement-start-btn'); await sleep(2500);
    for (let i = 0; i < 40; i++) {
        await sleep(900);
        if (await visible('#placement-result-modal')) break;
        if (!(await visible('#quiz-box'))) break;
        const st = await page.evaluate(() => ({
            meaning: (document.getElementById('meaning-text')?.textContent || '').trim(),
            sentence: (document.getElementById('sentence-text')?.textContent || '').trim(),
        }));
        const head = st.sentence.split('____')[0].trim().slice(0, 8);
        const hit = words.filter(w => st.meaning.includes(w.meaning) && w.sentence.startsWith(head));
        await page.focus('#answer-input');
        await page.evaluate(() => { document.getElementById('answer-input').value = ''; });
        await page.type('#answer-input', hit.length ? hit[0].target : '모름', { delay: 12 });
        await page.evaluate(() => document.getElementById('submit-btn').click());
        await sleep(1700);
        if (await visible('#next-btn')) await click('#next-btn');
    }
    await sleep(1200);
    if (await visible('#placement-result-modal')) { await click('#placement-result-home-btn'); await sleep(2000); }
}
await sleep(1200);

// B안으로 바꿔 홈 산을 본다
await click('#edit-profile-trigger'); await sleep(900);
await click('#open-layout-btn'); await sleep(800);
await page.evaluate(() => document.querySelector('#layout-modal .layout-opt[data-layout="b"]').click());
await sleep(600);
await click('#layout-close-btn'); await sleep(500);
await click('#close-profile-edit-btn'); await sleep(1200);

const 홈 = await page.evaluate(() => {
    const line = document.getElementById('home-mtn-line');
    const h = document.getElementById('home-mtn-harang');
    const sh = document.getElementById('home-mtn-shadow');
    return {
        고도: document.getElementById('home-mtn-value').textContent.trim(),
        선y: Number(line.getAttribute('y1')),
        하랑y: Number(h.getAttribute('y')),
        하랑높이: Number(h.getAttribute('height')),
        그림자y: Number(sh.getAttribute('cy')),
        보임: h.getBoundingClientRect().height > 0,
    };
});
log(`홈 산   고도 ${홈.고도} · 선 y=${홈.선y} · 하랑 y=${홈.하랑y}(높이 ${홈.하랑높이}) · 그림자 y=${홈.그림자y} · 보임 ${홈.보임}`);
await page.screenshot({ path: `${SHOT}/harang-home-mtn.png` });

// 「어휘 고도란?」 모달
await click('#home-mtn-btn'); await sleep(900);
const 모달 = await page.evaluate(() => {
    const line = document.getElementById('alt-guide-marker-line');
    const h = document.getElementById('alt-guide-harang');
    const sh = document.getElementById('alt-guide-shadow');
    return {
        마커: document.getElementById('alt-guide-marker-text').textContent.trim(),
        선y: Number(line.getAttribute('y1')),
        하랑y: Number(h.getAttribute('y')),
        하랑높이: Number(h.getAttribute('height')),
        그림자y: Number(sh.getAttribute('cy')),
        보임: h.getBoundingClientRect().height > 0,
    };
});
const 한줄 = await page.evaluate(() => {
    const box = document.querySelector('#altitude-guide-modal > div');
    const p = [...box.querySelectorAll('p')].find(x => x.textContent.includes('산에 살지 않아'));
    if (!p) return { 있음: false };
    const r = p.getBoundingClientRect(), br = box.getBoundingClientRect();
    return { 있음: true, 문구: p.textContent.replace(/\s+/g, ' ').trim(),
             화면안: r.top >= 0 && r.bottom <= window.innerHeight,
             박스안: r.right <= br.right + 1, 줄수: Math.round(r.height / (parseFloat(getComputedStyle(p).fontSize) * 1.7)) };
});
log(`하랑이 한 줄: ${한줄.있음 ? `"${한줄.문구}" (${한줄.줄수}줄)` : '없음'}`);

log(`안내 모달  ${모달.마커} · 선 y=${모달.선y} · 하랑 y=${모달.하랑y}(높이 ${모달.하랑높이}) · 그림자 y=${모달.그림자y} · 보임 ${모달.보임}`);
await page.screenshot({ path: `${SHOT}/harang-guide-mtn.png` });

log('\n판정');
const ok = (t, v) => log(`  · ${t}: ${v ? '✅' : '❌'}`);
ok('홈 산에 하랑이가 보임', 홈.보임);
ok('홈: 하랑이 발끝이 고도선에 닿음', Math.abs((홈.하랑y + 홈.하랑높이) - 홈.선y) <= 3);
ok('홈: 그림자가 고도선 위에', 홈.그림자y === 홈.선y);
ok('모달 산에 하랑이가 보임', 모달.보임);
ok('모달: 하랑이 발끝이 고도선에 닿음', Math.abs((모달.하랑y + 모달.하랑높이) - 모달.선y) <= 3);
ok('모달: 그림자가 고도선 위에', 모달.그림자y === 모달.선y);
ok('하랑이 한 줄이 모달에 있음', 한줄.있음);
ok('한 줄이 박스를 넘지 않음', 한줄.박스안);
await browser.close();

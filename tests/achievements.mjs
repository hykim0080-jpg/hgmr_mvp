// 🏅 학습 업적 현황 — 목록이 ACHIEVEMENTS 배열대로 렌더되는지, 잠금/해제가 맞는지.
// 학습 세션을 돌지 않으므로 word_stats를 오염시키지 않는다.
import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
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
for (let t = 0; t < 25 && !ready; t++) { await sleep(1000); ready = await visible('#placement-intro-modal') || await visible('#start-study-btn'); }
if (await visible('#placement-intro-modal')) { await click('#placement-later-btn'); await sleep(1500); }
await sleep(1200);

const homeCount = await page.evaluate(() => document.getElementById('home-badges-text').textContent.trim());
await click('#home-badges-card');
await sleep(900);

const res = await page.evaluate(() => {
    const list = document.getElementById('modal-badge-list');
    const cards = [...list.querySelectorAll('.badge-card')];
    return {
        열림: getComputedStyle(document.getElementById('achievement-modal') || list.closest('.home-modal-overlay')).display !== 'none',
        개수: cards.length,
        목록: cards.map(c => ({
            이름: c.querySelector('strong').textContent.trim(),
            조건: (c.querySelector('strong')?.nextElementSibling?.textContent || '').trim(),
            잠김: c.classList.contains('locked-badge'),
        })),
        스크롤가능: list.scrollHeight > list.clientHeight,
    };
});

log(`홈 「업적 달성」 표시: ${homeCount}`);
log(`모달 열림: ${res.열림} · 카드 ${res.개수}장 · 목록 스크롤 ${res.스크롤가능}\n`);
log('  상태  이름            조건');
res.목록.forEach(b => log(`  ${b.잠김 ? '🔒' : '✅'}   ${b.이름.padEnd(14)} ${b.조건}`));

// 칭호 목록도 같은 12개인지 — 업적과 칭호가 한 목록이라는 게 이 기능의 핵심
await click('#close-achievement-btn'); await sleep(600);
await click('#edit-profile-trigger'); await sleep(900);
await click('#title-collapse-btn'); await sleep(500);
const 칭호 = await page.evaluate(() => {
    const p = document.getElementById('title-picker');
    const opts = [...p.querySelectorAll('.title-opt')];
    return {
        개수: opts.length,
        이름: opts.map(o => (o.childNodes[1]?.textContent || o.textContent).trim()),
        잠김수: opts.filter(o => o.classList.contains('locked')).length,
        장착: (() => { const o = opts.find(x => x.classList.contains('selected')); return o ? (o.childNodes[1]?.textContent || o.textContent).trim() : '(없음)'; })(),
        홈칭호: (() => { const e = document.getElementById('home-level-title'); return getComputedStyle(e).display === 'none' ? '' : e.textContent.trim(); })(),
    };
});
log(`\n칭호 목록: ${칭호.개수}개 · 잠김 ${칭호.잠김수}개 · 장착 "${칭호.장착}" · 홈 표시 "${칭호.홈칭호}"`);

const 해제 = res.목록.filter(b => !b.잠김).length;
log('\n판정');
log(`  · 카드 12장: ${res.개수 === 12 ? '✅' : '❌ ' + res.개수}`);
log(`  · 신규 계정에서 전부 잠김: ${해제 === 0 ? '✅' : '❌ 해제 ' + 해제 + '개'}`);
log(`  · 홈 카운트와 모달 해제 수 일치: ${homeCount === `${해제}개` ? '✅' : `❌ 홈 ${homeCount} vs 모달 ${해제}개`}`);
log(`  · 칭호 목록도 12개 (업적과 같은 목록): ${칭호.개수 === 12 ? '✅' : '❌ ' + 칭호.개수}`);
log(`  · 업적 이름과 칭호 이름이 같은 순서: ${JSON.stringify(칭호.이름) === JSON.stringify(res.목록.map(b => b.이름)) ? '✅' : '❌'}`);
log(`  · 잠김 수 일치: ${칭호.잠김수 === res.목록.filter(b => b.잠김).length ? '✅' : '❌'}`);
log(`  · 미해제 칭호는 홈에 뜨지 않음: ${칭호.홈칭호 === '' ? '✅' : `❌ "${칭호.홈칭호}"`}`);
await browser.close();

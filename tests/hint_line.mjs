// 💡 두 번째 오답에서 힌트 예문이 열리는지 — 실제 브라우저로 확인.
//
// 힌트가 있는 단어는 아직 40개뿐이라, 밀도가 가장 높은 「사회/문화」 주제로 세션을 열어
// 힌트 보유 단어를 만날 확률을 높인다. 판정은 정확히 "hint가 있는 단어 ⟺ 힌트 줄이 뜬다".
//
// ⚠️ 운영 word_stats에 답안이 기록된다. 실행 후 `node tests/clean_test_stats.js --apply`.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = 'https://hgmr.co.kr/shot.html';
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

await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
await click('#anon-login-btn');
let ready = false;
for (let t = 0; t < 25 && !ready; t++) { await sleep(1000); ready = await visible('#placement-intro-modal') || await visible('#start-study-btn'); }
if (await visible('#placement-intro-modal')) { await click('#placement-later-btn'); await sleep(1200); }

// 주제를 「사회/문화」로 — 힌트 보유 밀도가 가장 높다
await click('#home-topic-chip');
await sleep(900);
await page.evaluate(() => document.querySelector('#topic-modal .topic-btn[data-topic="사회"]').click());
await sleep(1200);
if (await visible('#topic-modal')) await click('#close-topic-btn');
await sleep(800);

await click('#start-study-btn');
await sleep(3000);
if (await visible('#topic-modal')) { await click('#close-topic-btn'); await sleep(800); }
await page.waitForSelector('#quiz-box', { visible: true, timeout: 20000 });

const words = JSON.parse(fs.readFileSync(process.env.HOME + '/Desktop/hgmr/words.json', 'utf8'));
const state = () => page.evaluate(() => ({
    meaning: (document.getElementById('meaning-text')?.textContent || '').trim(),
    sentence: (document.getElementById('sentence-text')?.textContent || '').trim(),
    hintText: (document.getElementById('hint-text')?.textContent || '').trim(),
}));
const type = async txt => {
    await page.focus('#answer-input');
    await page.evaluate(() => { document.getElementById('answer-input').value = ''; });
    await page.type('#answer-input', txt, { delay: 15 });
    await page.evaluate(() => document.getElementById('submit-btn').click());
};

const rows = [];
let negProbes = 0;
// 오답을 넣으면 그 단어가 재출제돼 같은 단어만 맴돈다.
// 힌트 보유 단어를 만났을 때만 오답 2회를 넣고, 나머지는 정답으로 빠르게 넘긴다.
for (let i = 0; i < 45; i++) {
    await sleep(1100);
    if (!(await visible('#quiz-box'))) { log('  세션 종료'); break; }
    const st = await state();
    const head = st.sentence.split('____')[0].trim().slice(0, 8);
    const hit = words.filter(w => st.meaning.includes(w.meaning) && w.sentence.startsWith(head));
    if (!hit.length) { log(`  ${i + 1}: 단어 특정 실패 — 정답 불가, 중단`); break; }
    const w = hit[0];

    const probe = !!w.hint || negProbes < 3;   // 힌트 있는 단어 + 대조군 3개만 오답 시험
    if (probe) {
        if (!w.hint) negProbes++;
        await type('엉뚱한답'); await sleep(1300);
        const after1 = await visible('#hint-line');
        await type('엉뚱한답'); await sleep(1500);
        const after2 = await visible('#hint-line');
        const shown = (await state()).hintText;
        rows.push({ target: w.target, hasHint: !!w.hint, after1, after2, shown, expect: w.hint || '' });
        log(`  ${String(i + 1).padStart(2)} ${w.target.padEnd(10)} hint=${w.hint ? 'O' : 'X'}  1회=${after1 ? '열림' : '닫힘'}  2회=${after2 ? '열림' : '닫힘'}`);
        if (after2 && shown) log(`       → "${shown}"`);
    }

    await type(w.target); await sleep(2100);
    if (await visible('#next-btn')) await click('#next-btn');
}

log('\n판정');
const withHint = rows.filter(r => r.hasHint);
const noHint = rows.filter(r => !r.hasHint);
log(`  · 힌트 보유 단어를 만난 횟수: ${withHint.length}`);
log(`  · 1회 오답에서는 절대 안 열림: ${rows.every(r => !r.after1) ? '✅' : '❌'}`);
log(`  · 힌트 보유 → 2회 오답에 열림: ${withHint.length ? (withHint.every(r => r.after2) ? '✅' : '❌') : '⚠️ 표본 없음'}`);
log(`  · 힌트 없음 → 끝까지 안 열림: ${noHint.every(r => !r.after2) ? '✅' : '❌'}`);
log(`  · 표시된 문장이 데이터와 일치: ${withHint.length ? (withHint.every(r => r.shown && r.expect.replace('____', '').slice(0, 10) && r.shown.includes(r.expect.split('____')[0].trim().slice(0, 6))) ? '✅' : '❌') : '-'}`);

await browser.close();

// 배치고사 진행 표시 검증 — 없는 분모를 보이지 않고, 막대가 뒤로 가지 않으며 100%로 끝나는지.
//
// ⚠️ handlePlacementAnswer()도 recordWordStat()을 호출한다. 즉 이 테스트가 넣는 오답이
//    운영 word_stats에 남는다. 돌린 뒤 `node tests/clean_test_stats.js --apply`로 정리할 것.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = 'https://hgmr.co.kr/shot.html';
const log = (...a) => console.log(...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
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
await sleep(3500);
if (!(await visible('#placement-intro-modal'))) { log('❌ 배치고사 안내가 뜨지 않음'); await browser.close(); process.exit(1); }

const intro = await page.evaluate(() => document.querySelector('#placement-intro-modal p:nth-of-type(2)')?.textContent.trim());
log('안내 문구:', JSON.stringify(intro));

await click('#placement-start-btn');
await sleep(3000);

const words = JSON.parse(fs.readFileSync(process.env.HOME + '/Desktop/hgmr/words.json', 'utf8'));
const state = () => page.evaluate(() => ({
    meaning: (document.getElementById('meaning-text')?.textContent || '').trim(),
    sentence: (document.getElementById('sentence-text')?.textContent || '').trim(),
    text: (document.getElementById('progress-text')?.textContent || '').trim(),
    width: document.getElementById('progress')?.style.width || '',
    done: !!document.getElementById('placement-result-modal') &&
          getComputedStyle(document.getElementById('placement-result-modal')).display !== 'none',
}));

const rows = [];
const seen = {};
let i = 0;
for (; i < 140; i++) {   // 오답 시 재입력 기회가 있어 제출 횟수 > 문항 수
    await sleep(900);
    const st = await state();
    if (st.done) break;
    rows.push({ n: i + 1, text: st.text, width: st.width });

    const head = st.sentence.split('____')[0].trim().slice(0, 8);
    const hit = words.filter(w => st.meaning.includes(w.meaning) && w.sentence.startsWith(head));
    // PROFILE=weak: 재입력 기회(3회)를 모두 소진해 실제 오답으로 채점되게 한다.
    // 전부 맞히면 추정이 상단(PLACEMENT_HIGH)에 머물러 수렴하지 않고 상한 22문항까지 간다.
    const weak = process.env.PROFILE === 'weak';
    const wrongTurn = weak ? (seen[st.meaning] = (seen[st.meaning] || 0) + 1) <= 4 : i % 3 === 2;
    const ans = (!hit.length || wrongTurn) ? '엉뚱한답' : hit[0].target;

    await page.focus('#answer-input');
    await page.evaluate(() => { document.getElementById('answer-input').value = ''; });
    await page.type('#answer-input', ans, { delay: 15 });
    await page.evaluate(() => document.getElementById('submit-btn').click());
    await sleep(2000);
    if (await visible('#next-btn')) await click('#next-btn');
}

const fin = await state();
log(`\n총 ${rows.length}문항 출제, 결과 모달=${fin.done}`);
log('\n  #  진행텍스트   막대폭');
rows.forEach(r => log(`  ${String(r.n).padStart(2)}  ${r.text.padEnd(10)} ${r.width}`));

// ── 검증 ──────────────────────────────────────────────
const pct = rows.map(r => parseFloat(r.width) || 0);
const monotonic = pct.every((v, k) => k === 0 || v >= pct[k - 1]);
const noFakeDenom = rows.every(r => !r.text.includes('/'));
const hasWrapUp = rows.some(r => r.text === '마무리');
log('\n판정');
log(`  · 가짜 분모(n/22) 없음: ${noFakeDenom ? '✅' : '❌ ' + rows.filter(r => r.text.includes('/')).map(r => r.text)}`);
log(`  · 막대가 뒤로 가지 않음: ${monotonic ? '✅' : '❌'}`);
log(`  · 확인 구간에서 '마무리' 표시: ${hasWrapUp ? '✅' : '⚠️ 이번 실행에선 수렴 없이 상한까지 감'}`);
log(`  · 마지막 막대 폭: ${rows.length ? rows[rows.length - 1].width : '-'} (마지막 문항 제출 후 100%)`);
const items = Math.max(...rows.map(r => parseInt(r.text) || 0), 0) + (hasWrapUp ? 0 : 1);
log(`  · 제출 ${rows.length}회 / 실제 문항 약 ${items}개 — 기대 범위 19~22`);

await browser.close();

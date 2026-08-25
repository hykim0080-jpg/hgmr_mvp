// 재도전(재출제) 문항에서 오답 통계 패널이 정상 표시되는지 실제 브라우저로 확인.
//
// ⚠️ 이 테스트는 운영 중인 hgmr.co.kr에 붙는다. 답을 제출하면 recordWordStat()이
//    실제 word_stats 컬렉션에 기록되므로, 여기서 넣는 더미 오답이 실사용자 통계에 섞인다.
//    돌린 뒤에는 반드시 `node tests/clean_test_stats.js --apply` 로 정리할 것.
// 화면 없는 맥에서 돌리기 위해 헤드리스 Chrome + 아이폰 UA로 모바일 경로(kb-slot)를 탄다.
//   node tests/retry_stats.mjs
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = 'https://hgmr.co.kr/shot.html';
const SHOT = process.env.HOME + '/Desktop/hgmr/tests/shots';
fs.mkdirSync(SHOT, { recursive: true });

const log = (...a) => console.log(...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=390,844'],
});
const page = await browser.newPage();
await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1');
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
page.on('pageerror', e => log('  [page error]', e.message));
page.on('console', m => { if (m.type() === 'error') log('  [console error]', m.text().slice(0, 200)); });

const shot = async name => { await page.screenshot({ path: `${SHOT}/${name}.png` }); log(`  📸 ${name}.png`); };
// 실제 좌표 클릭은 키보드 레이아웃 때문에 '클릭 불가' 판정이 나기도 해서 DOM click()으로 누른다.
const click = async sel => {
    await page.waitForSelector(sel, { timeout: 20000 });
    await page.evaluate(s => document.querySelector(s).click(), sel);
};
const visible = sel => page.evaluate(s => {
    const el = document.querySelector(s);
    if (!el) return false;
    const st = getComputedStyle(el);
    return st.display !== 'none' && st.visibility !== 'hidden' && el.getBoundingClientRect().height > 0;
}, sel);

log('▶ 접속');
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });

log('▶ 로그인 없이 둘러보기');
await click('#anon-login-btn');
await sleep(3500);

// 배치고사 안내가 뜨면 나중에 하기
if (await visible('#placement-intro-modal')) { log('▶ 배치고사 건너뛰기'); await click('#placement-later-btn'); await sleep(1200); }

log('▶ 학습 시작');
await click('#start-study-btn');
await sleep(3000);
if (await visible('#topic-modal')) { await click('#close-topic-btn'); await sleep(800); }
await page.waitForSelector('#quiz-box', { visible: true, timeout: 20000 });
await sleep(1500);

// 정답 사전 — 화면의 뜻풀이로 역인덱싱
const words = JSON.parse(fs.readFileSync(process.env.HOME + '/Desktop/hgmr/words.json', 'utf8'));
const current = async () => page.evaluate(() => ({
    meaning: (document.getElementById('meaning-text')?.textContent || '').trim(),
    sentence: (document.getElementById('sentence-text')?.textContent || '').trim(),
}));
const answerFor = async () => {
    const c = await current();
    const head = c.sentence.split('____')[0].trim().slice(0, 12);
    const hit = words.filter(w => c.meaning.includes(w.meaning) && w.sentence.startsWith(head.slice(0, 8)));
    return { ...c, target: hit.length ? hit[0].target : null, n: hit.length };
};
const type = async txt => {
    await page.focus('#answer-input');
    await page.evaluate(() => { document.getElementById('answer-input').value = ''; });
    await page.type('#answer-input', txt, { delay: 20 });
};
const submit = async () => { await page.evaluate(() => document.getElementById('submit-btn').click()); };
const statsShown = async () => (await visible('#inline-stats-container')) &&
    await page.evaluate(() => document.getElementById('quiz-box').classList.contains('stats-open'));

// ── 1) 첫 등장에서 일부러 오답 → 재입력 → 정답 ─────────────────────
log('\n▶ [1] 첫 등장: 일부러 오답');
const q1 = await answerFor();
log(`  뜻: ${q1.meaning.slice(0, 30)} / 정답후보 ${q1.n}개 → ${q1.target}`);
if (!q1.target) { log('  ❌ 정답을 특정하지 못함 — 중단'); await browser.close(); process.exit(1); }

await type('아무말아무말'); await submit(); await sleep(1800);
const afterWrong = {
    stats: await statsShown(),
    placeholder: await page.evaluate(() => document.getElementById('answer-input').placeholder),
};
log(`  오답 직후 → 통계표시=${afterWrong.stats} (기대 false), placeholder="${afterWrong.placeholder}" (기대 "다시 시도!")`);
await shot('1-오답직후');

log('▶ [1] 같은 등장에서 정답 재입력');
await type(q1.target); await submit(); await sleep(2600);
const afterRecover = await statsShown();
log(`  정답 후 → 통계표시=${afterRecover} (기대 true)`);
await shot('2-오답후정답-통계');

// ── 2) 재출제 사본이 다시 나올 때까지 정답으로 진행 ────────────────
log('\n▶ [2] 재출제 사본 추적 (최대 10문항)');
let found = null;
for (let i = 0; i < 10; i++) {
    await click('#next-btn');
    await sleep(1800);
    if (!(await visible('#quiz-box'))) { log('  세션 종료됨'); break; }
    const q = await answerFor();
    if (q.target === q1.target) { found = q; log(`  ✅ ${i + 1}문항 뒤 재출제 확인: ${q.target}`); break; }
    log(`  ${i + 1}: ${q.target} — 정답 처리 후 계속`);
    if (!q.target) { log('  정답 특정 실패 — 중단'); break; }
    await type(q.target); await submit(); await sleep(2200);
}

if (found) {
    log('▶ [2-a] 재출제 문항에서 또 오답');
    await type('엉뚱한답'); await submit(); await sleep(1600);
    log(`  또 오답 직후 → 통계표시=${await statsShown()} (기대 false), placeholder="${await page.evaluate(() => document.getElementById('answer-input').placeholder)}"`);
    await shot('3-재출제-또오답');

    log('▶ [2-b] 재출제 문항에 정답 입력');
    await type(q1.target); await submit(); await sleep(2600);
    const st = await statsShown();
    const bubble = await page.evaluate(() => {
        const b = document.getElementById('harang-bubble');
        return b && getComputedStyle(b).display !== 'none' ? b.textContent.trim() : '(표시 안 됨)';
    });
    const rows = await page.evaluate(() => [...document.querySelectorAll('#inline-stats-container .stats-scroll > div')]
        .map(d => d.textContent.replace(/\s+/g, ' ').trim()).filter(t => t).slice(0, 6));
    log(`  재출제 정답 후 → 통계표시=${st} (기대 true)`);
    log(`  하랑이 말풍선: "${bubble}"`);
    log('  통계 내용:'); rows.forEach(r => log('    · ' + r));
    await shot('4-재출제-통계');

    // 레이아웃 점검: 통계 패널이 화면 안에 들어오는지 / 입력행과 겹치지 않는지
    const geo = await page.evaluate(() => {
        const s = document.getElementById('inline-stats-container').getBoundingClientRect();
        const m = document.getElementById('meaning-text').getBoundingClientRect();
        const nb = document.getElementById('next-btn').getBoundingClientRect();
        return { statsTop: Math.round(s.top), statsBottom: Math.round(s.bottom), meaningBottom: Math.round(m.bottom),
                 nextTop: Math.round(nb.top), nextBottom: Math.round(nb.bottom), vh: window.innerHeight,
                 nextInStats: document.getElementById('inline-stats-container').contains(document.getElementById('next-btn')) };
    });
    log('  레이아웃:', JSON.stringify(geo));
    log(`  · 통계창이 뜻풀이와 겹침? ${geo.statsTop < geo.meaningBottom ? '❌ 겹침' : '✅ 안 겹침'}`);
    log(`  · 다음 버튼이 화면 안? ${geo.nextBottom <= geo.vh + 1 ? '✅' : '❌ 화면 밖'}`);
} else {
    log('  ⚠️ 재출제 사본을 만나지 못함');
}

await browser.close();
log('\n완료');

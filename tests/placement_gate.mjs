// 🦭 첫 학습은 무조건 배치고사 — 마치기 전에는 학습 시작 버튼이 배치고사로 간다.
// 중도 이탈(끝마치지 않은 상태)에서도 다시 막히는지까지 확인한다.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

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
const btnLabel = () => page.evaluate(() => document.querySelector('#start-study-btn span').textContent.trim());

await page.goto('https://hgmr.co.kr/shot.html', { waitUntil: 'networkidle2', timeout: 60000 });
await click('#anon-login-btn');
let ready = false;
for (let t = 0; t < 25 && !ready; t++) { await sleep(1000); ready = await visible('#placement-intro-modal'); }
if (!ready) { log('❌ 배치고사 안내가 뜨지 않음'); await browser.close(); process.exit(1); }

// ① 안내를 미루고 홈으로
await click('#placement-later-btn'); await sleep(1500);
const 라벨1 = await btnLabel();
log(`미실시 상태 버튼 문구: "${라벨1}"`);

// ② 학습 시작 버튼 → 배치고사 안내로 가야 한다
await click('#start-study-btn'); await sleep(1200);
const 게이트1 = { 안내: await visible('#placement-intro-modal'), 퀴즈: await visible('#quiz-box') };
log(`버튼 누름 → 안내 ${게이트1.안내 ? '열림' : '안 열림'} · 퀴즈 ${게이트1.퀴즈 ? '시작됨' : '시작 안 됨'}`);

// ③ 배치고사를 시작했다가 중간에 나온다 (끝마치지 않은 상태)
await click('#placement-start-btn'); await sleep(2500);
const words = JSON.parse(fs.readFileSync(process.env.HOME + '/Desktop/hgmr/words.json', 'utf8'));
for (let i = 0; i < 2; i++) {
    await sleep(1000);
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
await click('#quiz-home-btn'); await sleep(700);
await click('#exit-confirm-btn'); await sleep(2000);
const 라벨2 = await btnLabel();
log(`중도 이탈 후 버튼 문구: "${라벨2}"`);

await click('#start-study-btn'); await sleep(1200);
const 게이트2 = { 안내: await visible('#placement-intro-modal'), 퀴즈: await visible('#quiz-box') };
log(`다시 누름 → 안내 ${게이트2.안내 ? '열림' : '안 열림'} · 퀴즈 ${게이트2.퀴즈 ? '시작됨' : '시작 안 됨'}`);

// ④ 배치고사를 끝까지 마치면 학습이 열린다
await click('#placement-start-btn'); await sleep(2500);
for (let i = 0; i < 40; i++) {
    await sleep(850);
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
    await sleep(1600);
    if (await visible('#next-btn')) await click('#next-btn');
}
await sleep(1000);
if (await visible('#placement-result-modal')) { await click('#placement-result-home-btn'); await sleep(2000); }
const 라벨3 = await btnLabel();
log(`배치고사 완료 후 버튼 문구: "${라벨3}"`);
await click('#start-study-btn'); await sleep(2500);
const 게이트3 = { 안내: await visible('#placement-intro-modal'), 퀴즈: await visible('#quiz-box') };
log(`완료 후 누름 → 안내 ${게이트3.안내 ? '열림' : '안 열림'} · 퀴즈 ${게이트3.퀴즈 ? '시작됨' : '시작 안 됨'}`);

log('\n판정');
const ok = (t, v) => log(`  · ${t}: ${v ? '✅' : '❌'}`);
ok('미실시: 버튼 문구가 배치고사를 가리킴', 라벨1.includes('실력'));
ok('미실시: 버튼이 배치고사로 연결 (학습 시작 안 됨)', 게이트1.안내 && !게이트1.퀴즈);
ok('중도 이탈: 여전히 배치고사로 연결', 게이트2.안내 && !게이트2.퀴즈);
ok('완료 후: 버튼 문구가 학습으로 돌아옴', 라벨3.includes('학습'));
ok('완료 후: 학습이 실제로 시작됨', 게이트3.퀴즈 && !게이트3.안내);
await browser.close();

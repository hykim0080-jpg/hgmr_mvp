// 📸 스토어 스크린샷 원본 6컷 — 실제 앱 화면을 그대로 찍는다.
//    익명 로그인 → 배치고사 완주 → 홈/모달/퀴즈/통계 순으로 캡처.
//
// ⚠️ 운영 word_stats에 답안이 기록된다. 실행 후 `node tests/clean_test_stats.js --apply`.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = 'https://hgmr.co.kr/shot.html';
const OUT = '/tmp/store';
const DARK = process.env.DARK === '1';
fs.mkdirSync(OUT, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const words = JSON.parse(fs.readFileSync(process.env.HOME + '/Desktop/hgmr/words.json', 'utf8'));
const bySentence = new Map();
for (const w of words) bySentence.set(w.sentence.replace(/_+/g, '').trim(), w.target);

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1');
// 6.9" (iPhone 16 Pro Max) 논리 해상도 440×956, DSF 3 → 1320×2868
await page.setViewport({ width: 440, height: 956, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
if (DARK) await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
page.on('pageerror', e => log('  [page error]', e.message));

const click = async sel => { await page.waitForSelector(sel, { timeout: 20000 }); await page.evaluate(s => document.querySelector(s).click(), sel); };
const visible = sel => page.evaluate(s => {
    const el = document.querySelector(s); if (!el) return false;
    return getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0;
}, sel);
const shot = async name => { await sleep(500); await page.screenshot({ path: `${OUT}/${name}.png` }); log('  📸', name); };

await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
await click('#anon-login-btn');
for (let t = 0; t < 25; t++) { await sleep(1000); if (await visible('#placement-intro-modal') || await visible('#start-study-btn')) break; }

// ── 배치고사 완주 (3문제 중 1개는 일부러 틀려 중턱 언저리로 맞춘다)
if (!(await visible('#placement-intro-modal'))) await click('#start-study-btn');
await sleep(800);
await click('#placement-start-btn');
await sleep(2500);

const readQ = () => page.evaluate(() => ({
    sentence: (document.getElementById('sentence-text')?.textContent || '').replace(/_+/g, '').trim(),
    revealed: getComputedStyle(document.getElementById('input-group')).display === 'none'
}));
const type = async txt => {
    await page.evaluate(() => { const el = document.getElementById('answer-input'); el.value = ''; el.focus(); });
    await page.type('#answer-input', txt, { delay: 10 });
    await page.evaluate(() => document.getElementById('submit-btn').click());
};

let n = 0;
for (let i = 0; i < 60; i++) {
    if (await visible('#placement-result-modal')) break;
    if (!(await visible('#quiz-box'))) break;
    const q = await readQ();
    const ans = bySentence.get(q.sentence);
    if (q.revealed) { await click('#next-btn').catch(() => {}); await sleep(700); continue; }
    const wrong = (n % 3 === 2);
    await type(wrong || !ans ? '아무말아무말' : ans);   // 정리 스크립트가 아는 더미 문자열
    n++;
    await sleep(900);
    // 정답이 공개된 화면이면 다음으로
    for (let k = 0; k < 6 && await visible('#next-btn'); k++) { await click('#next-btn'); await sleep(600); }
}
log(`  배치고사 ${n}문항 응답`);

// ③ 배치고사 결과 → 홈
if (await visible('#placement-result-modal')) {
    await shot('0-배치결과');
    await click('#placement-result-home-btn');
    await sleep(2000);
}
await page.waitForSelector('#home-box', { visible: true, timeout: 20000 });
await sleep(1200);

// 갓 만든 계정은 업적이 하나뿐이라 스토어 컷으로 쓸 수 없다.
// 이 익명 테스트 계정에만 '어느 정도 해 본 사용자' 상태를 심고 새로고침한다.
// (화면을 손대는 게 아니라 앱이 자기 데이터로 다시 그리게 한다)
const uid = await page.evaluate(() => {
    const k = Object.keys(localStorage).find(x => x.startsWith('firebase:authUser'));
    return k ? JSON.parse(localStorage.getItem(k)).uid : null;
});
if (!uid) throw new Error('uid를 찾지 못함');
fs.writeFileSync('/tmp/store/uid.txt', uid);
const { execFileSync } = await import('node:child_process');
execFileSync('node', [process.env.HOME + '/Desktop/hgmr/tests/_seed_shot_user.js', uid], { stdio: 'inherit' });
// 서비스워커가 옛 셸을 물고 있으면 새로고침이 엉뚱한 상태로 뜬다 — 먼저 해제한다
await page.evaluate(async () => {
    if (navigator.serviceWorker) {
        const rs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(rs.map(r => r.unregister()));
    }
    if (window.caches) { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); }
});
await page.goto(URL + '?shots=' + Date.now(), { waitUntil: 'networkidle2', timeout: 60000 });
// 세션이 살아 있으면 앱은 '터치하여 시작' 게이트를 띄운다(의도된 동작).
// 여기서 익명 로그인을 다시 누르면 방금 상태를 심은 계정을 버리게 되니, 게이트만 눌러 들어간다.
for (let t = 0; t < 45; t++) {
    await sleep(1000);
    if (await visible('#home-box')) break;
    if (await visible('#start-prompt')) { await click('#login-screen'); await sleep(1500); }
}
if (!(await visible('#home-box'))) {
    const st = await page.evaluate(() => ['login-screen','home-box','quiz-box','placement-intro-modal','nickname-modal']
        .map(id => { const e = document.getElementById(id); return `${id}:${e ? getComputedStyle(e).display : '없음'}`; }).join(' '));
    throw new Error('새로고침 후 홈에 못 감 — ' + st);
}
await sleep(1800);
await page.evaluate(() => window.scrollTo(0, 0));
await shot('3-홈-산');

// ④ 어휘 고도 안내
await click('#home-mtn-btn'); await sleep(900); await shot('4-어휘고도');
await page.evaluate(() => document.getElementById('altitude-guide-modal').style.display = 'none');
await sleep(400);

// ⑤ 낱말 이야기
if (await visible('#home-story-chip')) {
    await click('#home-story-chip'); await sleep(900); await shot('5-낱말이야기');
    await page.evaluate(() => document.getElementById('story-modal').style.display = 'none');
    await sleep(400);
}

// ⑥ 업적·칭호
await click('#home-badges-card'); await sleep(900); await shot('6-업적');
await page.evaluate(() => document.getElementById('achievement-modal').style.display = 'none');
await sleep(400);

// ① 퀴즈 빈칸 — 아직 답하기 전
await click('#start-study-btn'); await sleep(3000);
if (await visible('#topic-modal')) { await click('#close-topic-btn'); await sleep(800); }
await page.waitForSelector('#quiz-box', { visible: true, timeout: 20000 });
await sleep(900);
await shot('1-퀴즈');

// ② 정답 + 오답 통계 — 응답이 갈린 단어라야 '사람들은 어떻게 답했을까'가 의미 있다.
//    한 가지 답만 100%인 화면이 나오면 다음 문제로 넘겨 다시 시도한다.
let statsOk = false;
for (let i = 0; i < 14 && !statsOk; i++) {
    const q = await readQ();
    const ans = bySentence.get(q.sentence);
    if (!ans) { await click('#next-btn').catch(() => {}); await sleep(800); continue; }
    await type(ans);
    await sleep(1500);
    const rows = await page.evaluate(() => {
        const box = document.getElementById('stats-box');
        if (!box || getComputedStyle(box).display === 'none') return 0;
        return (box.textContent.match(/%/g) || []).length;
    });
    if (rows >= 2) { statsOk = true; break; }
    for (let k = 0; k < 4 && await visible('#next-btn'); k++) { await click('#next-btn'); await sleep(700); }
}
log(statsOk ? '  통계: 응답이 갈린 단어 확보' : '  ⚠️ 통계: 응답이 한 가지뿐인 화면');
await sleep(700);
await shot('2-통계');

log('\n원본 6컷 → ' + OUT);
await browser.close();

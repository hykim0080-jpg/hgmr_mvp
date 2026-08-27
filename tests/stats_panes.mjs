// 📚 통계창 두 탭 — 유의어·예문이 어떤 문항에서도 채워지고, 탭 전환이 되는지.
//    ⚠️ 배치고사 화면에는 통계창이 없다. 반드시 배치고사를 끝낸 뒤 일반 세션에서 확인할 것.
//       (이걸 빠뜨리면 rows 가 비고, 빈 배열의 every() 는 전부 true라 헛되이 통과한다)
//    ⚠️ 운영 word_stats에 답안이 기록된다. 실행 후 `node tests/clean_test_stats.js --apply`.
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SHOT = process.env.SHOT === '1';

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1');
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: SHOT ? 3 : 2, isMobile: true, hasTouch: true });
p.on('pageerror', e => console.log('  [page error]', e.message));
const vis = s => p.evaluate(x => { const e = document.querySelector(x); return !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0; }, s);
const click = async s => { await p.waitForSelector(s, { timeout: 20000 }); await p.evaluate(x => document.querySelector(x).click(), s); };

const words = JSON.parse(fs.readFileSync(process.env.HOME + '/Desktop/hgmr/words.json', 'utf8'));
const bySent = new Map(words.map(w => [w.sentence.replace(/_+/g, '').trim(), w]));
const cur = async () => bySent.get(await p.evaluate(() => (document.getElementById('sentence-text')?.textContent || '').replace(/_+/g, '').trim()));
const answer = async txt => {
    await p.evaluate(() => { const el = document.getElementById('answer-input'); el.value = ''; el.focus(); });
    await p.type('#answer-input', txt, { delay: 8 });
    await p.evaluate(() => document.getElementById('submit-btn').click());
};

await p.goto('https://hgmr.co.kr/shot.html', { waitUntil: 'networkidle2', timeout: 60000 });
await click('#anon-login-btn');
for (let t = 0; t < 25; t++) { await sleep(1000); if (await vis('#placement-intro-modal') || await vis('#start-study-btn')) break; }

if (!(await vis('#placement-intro-modal'))) await click('#start-study-btn');
await sleep(700); await click('#placement-start-btn'); await sleep(2500);
for (let i = 0; i < 60; i++) {
    if (await vis('#placement-result-modal')) break;
    if (!(await vis('#quiz-box'))) break;
    const w = await cur();
    await answer(w ? w.target : '아무말아무말');
    await sleep(900);
    for (let k = 0; k < 6 && await vis('#next-btn'); k++) { await click('#next-btn'); await sleep(600); }
}
if (await vis('#placement-result-modal')) { await click('#placement-result-home-btn'); await sleep(2200); }
await p.waitForSelector('#home-box', { visible: true, timeout: 20000 });

await click('#start-study-btn'); await sleep(3000);
if (await vis('#topic-modal')) { await click('#close-topic-btn'); await sleep(800); }
await p.waitForSelector('#quiz-box', { visible: true, timeout: 20000 });

const rows = [];
for (let i = 0; i < 8 && rows.length < 4; i++) {
    if (!(await vis('#quiz-box'))) break;
    const w = await cur();
    await answer(w ? w.target : '아무말아무말');
    await sleep(2200);
    if (await vis('#inline-stats-container')) {
        const r = await p.evaluate(() => {
            const c = document.getElementById('inline-stats-container');
            const learn = c.querySelector('[data-pane-body="learn"]'), stats = c.querySelector('[data-pane-body="stats"]');
            return { 탭수: c.querySelectorAll('[data-pane]').length,
                     첫탭: learn && learn.style.display !== 'none' ? 'learn' : 'stats',
                     유의어패널: learn ? learn.textContent.trim().length : 0 };
        });
        if (SHOT) await p.screenshot({ path: `/tmp/pane_${rows.length}a.png` });
        await p.evaluate(() => document.querySelector('#inline-stats-container [data-pane="stats"]')?.click());
        await sleep(450);
        if (SHOT) await p.screenshot({ path: `/tmp/pane_${rows.length}b.png` });
        const after = await p.evaluate(() => {
            const c = document.getElementById('inline-stats-container');
            return { stats: c.querySelector('[data-pane-body="stats"]').style.display, learn: c.querySelector('[data-pane-body="learn"]').style.display };
        });
        rows.push({ 단어: w ? w.target : '?', 유의어: w ? (w.accepts || []).filter(a => a !== w.target).length : 0, 힌트: !!(w && w.hint), ...r, 전환후: after });
    }
    for (let k = 0; k < 3 && await vis('#next-btn'); k++) { await click('#next-btn'); await sleep(700); }
}

// ── 설정: 정답 후 첫 화면 바꾸기 → 다음 문항에서 반영되는지
let pref = null;
await p.evaluate(() => document.getElementById('profile-edit-modal').style.display = 'flex');
await sleep(600);
const chips = await p.evaluate(() => [...document.querySelectorAll('.pane-opt')].map(b => `${b.dataset.panePref}:${b.classList.contains('on') ? 'on' : 'off'}`));
await p.evaluate(() => document.querySelector('.pane-opt[data-pane-pref="learn"]').click());
await sleep(500);
const chipsAfter = await p.evaluate(() => [...document.querySelectorAll('.pane-opt')].map(b => `${b.dataset.panePref}:${b.classList.contains('on') ? 'on' : 'off'}`));
await p.evaluate(() => document.getElementById('profile-edit-modal').style.display = 'none');
await sleep(400);
for (let k = 0; k < 3 && await vis('#next-btn'); k++) { await click('#next-btn'); await sleep(700); }
if (await vis('#quiz-box')) {
    const w2 = await cur();
    await answer(w2 ? w2.target : '아무말아무말');
    await sleep(2200);
    if (await vis('#inline-stats-container')) {
        pref = await p.evaluate(() => {
            const l = document.querySelector('#inline-stats-container [data-pane-body="learn"]');
            return l && l.style.display !== 'none' ? 'learn' : 'stats';
        });
    }
}

rows.forEach(r => console.log(`${r.단어.padEnd(6)} 유의어${r.유의어} 힌트${r.힌트 ? 'O' : 'X'} | 첫탭:${r.첫탭} 유의어패널 ${r.유의어패널}자 | 전환후 stats:${r.전환후.stats} learn:${r.전환후.learn}`));
const ok = (label, cond) => console.log(`${label}: ${cond ? '✅' : '❌'}`);
console.log('');
ok(`통계창 표본 ${rows.length}건 확보`, rows.length > 0);
if (rows.length) {
    ok('탭 두 개', rows.every(r => r.탭수 === 2));
    ok('유의어 패널이 항상 채워짐', rows.every(r => r.유의어패널 > 40));
    ok('탭 전환 동작', rows.every(r => r.전환후.stats === 'block' && r.전환후.learn === 'none'));
}
console.log(`\n설정 칩 초기: ${chips.join(' ')} → 바꾼 뒤: ${chipsAfter.join(' ')}`);
ok('기본 첫 탭은 사람들의 답', rows.length > 0 && rows[0].첫탭 === 'stats');
ok('설정 칩이 stats 로 시작', chips.includes('stats:on'));
ok('칩을 누르면 learn 으로 바뀜', chipsAfter.includes('learn:on') && chipsAfter.includes('stats:off'));
ok('설정이 다음 문항에 반영됨', pref === 'learn');
await b.close();
process.exit(rows.length ? 0 : 1);

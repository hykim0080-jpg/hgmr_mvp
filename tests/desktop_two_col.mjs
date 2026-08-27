// 🖥 넓은 화면 2열 — 왼쪽 문제 / 오른쪽 패널. 좁은 화면은 1열 그대로여야 한다.
// ⚠️ 운영 word_stats 기록됨 — 실행 후 node tests/clean_test_stats.js --apply
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const words = JSON.parse(fs.readFileSync(process.env.HOME + '/Desktop/hgmr/words.json', 'utf8'));
const head = t => (t || '').split(/_+/)[0].trim();
const bySent = new Map(words.map(w => [head(w.sentence), w]));

const CASES = [
  { n: '넓은 화면 1440×900', w: 1440, h: 900, mobile: false, wide: true },
  { n: '좁은 창 1024×800',  w: 1024, h: 800, mobile: false, wide: false },
];
let fail = 0;
const ok = (label, cond, extra = '') => { console.log(`  ${label}: ${cond ? '✅' : '❌ ' + extra}`); if (!cond) fail++; };

for (const C of CASES) {
  console.log(`\n── ${C.n} ──`);
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const p = await b.newPage();
  p.on('pageerror', e => { console.log('  PAGE ERROR:', String(e).slice(0, 200)); fail++; });
  await p.setViewport({ width: C.w, height: C.h, deviceScaleFactor: 1, isMobile: C.mobile, hasTouch: C.mobile });
  const vis = s => p.evaluate(x => { const e = document.querySelector(x); return !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0; }, s);
  const click = async s => { await p.waitForSelector(s, { timeout: 20000 }); await p.evaluate(x => document.querySelector(x).click(), s); };
  const cur = async () => bySent.get(head(await p.evaluate(() => document.getElementById('sentence-text')?.textContent || '')));

  await p.goto('https://hgmr.co.kr/', { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(1300);
  await click('#anon-login-btn');
  for (let t = 0; t < 25; t++) { await sleep(1000); if (await vis('#placement-intro-modal') || await vis('#start-study-btn')) break; }
  // 배치고사 안내는 홈 진입 뒤 «지연 표시»라 아직 안 떴을 수 있다.
  // 안 떴으면 시작 버튼을 눌러 관문으로 연다 — 어느 쪽이든 배치고사로 들어간다.
  if (!await vis('#placement-intro-modal')) { await click('#start-study-btn'); await sleep(1200); }
  if (await vis('#placement-intro-modal')) { await click('#placement-start-btn'); await sleep(2500); }
  for (let i = 0; i < 40; i++) {
    if (await vis('#placement-result-modal')) break;
    if (!await vis('#quiz-box')) break;
    const w = await cur();
    await p.evaluate(() => { const el = document.getElementById('answer-input'); el.value = ''; el.focus(); });
    await p.type('#answer-input', w ? w.target : '아무말아무말', { delay: 4 });
    await p.keyboard.press('Enter'); await sleep(700);
    await p.evaluate(() => document.activeElement && document.activeElement.blur());
    await p.keyboard.press('Enter'); await sleep(500);
  }
  if (await vis('#placement-result-modal')) { await click('#placement-result-home-btn'); await sleep(2000); }
  await p.waitForSelector('#home-box', { visible: true, timeout: 20000 });

  // 홈에서 퀴즈 상자가 «사라져» 있어야 한다 (grid !important 사고 회귀 방지)
  ok('홈에서 퀴즈 상자 숨김', !(await vis('#quiz-box')));

  await click('#start-study-btn'); await sleep(2500);
  if (await vis('#topic-modal')) { await click('#close-topic-btn'); await sleep(800); }
  await p.waitForSelector('#quiz-box', { visible: true, timeout: 20000 });

  const geo = () => p.evaluate(() => {
    const r = id => { const e = document.getElementById(id); if (!e) return null;
      const b = e.getBoundingClientRect(); return { w: Math.round(b.width), l: Math.round(b.left), t: Math.round(b.top),
      shown: getComputedStyle(e).display !== 'none' && b.height > 0 }; };
    return { box: r('quiz-box'), main: r('quiz-main'), side: r('inline-stats-container'),
             탭수: document.querySelectorAll('[data-pane]').length,
             펼친창: document.querySelectorAll('[data-pane-body]').length,
             보이는창: [...document.querySelectorAll('[data-pane-body]')].filter(e => getComputedStyle(e).display !== 'none').length };
  });

  const g1 = await geo();
  if (C.wide) {
    ok('푸는 중 오른쪽 칸이 채워짐', !!g1.side && g1.side.shown, JSON.stringify(g1.side));
    ok('오른쪽 칸이 문제 카드 «옆»에 있음', !!g1.side && !!g1.main && g1.side.l > g1.main.l + g1.main.w - 10, JSON.stringify(g1));
    ok('두 열이 같은 높이에서 시작', !!g1.side && Math.abs(g1.side.t - g1.main.t) < 6, JSON.stringify(g1));
  } else {
    ok('푸는 중에는 오른쪽 칸 없음', !g1.side || !g1.side.shown);
    ok('1열 유지 (카드 480px 이하)', !!g1.main && g1.main.w <= 500, JSON.stringify(g1.main));
  }

  const w2 = await cur();
  await p.evaluate(() => document.getElementById('answer-input').focus());
  await p.type('#answer-input', w2 ? w2.target : '아무말아무말', { delay: 4 });
  await p.keyboard.press('Enter'); await sleep(2400);
  const g2 = await geo();
  if (C.wide) {
    ok('답 뒤 — 탭 없음', g2.탭수 === 0, `탭 ${g2.탭수}개`);
    ok('답 뒤 — 통계와 유의어 둘 다 펼침', g2.보이는창 === 2, JSON.stringify(g2));
    ok('답 뒤에도 2열 유지', !!g2.side && g2.side.l > g2.main.l + g2.main.w - 10, JSON.stringify(g2));
  } else {
    ok('답 뒤 — 탭 유지', g2.탭수 === 2, `탭 ${g2.탭수}개`);
    ok('답 뒤 — 한 번에 하나만', g2.보이는창 === 1, JSON.stringify(g2));
  }
  await b.close();
}
console.log(fail === 0 ? '\n전체 통과 ✅' : `\n실패 ${fail}건 ❌`);

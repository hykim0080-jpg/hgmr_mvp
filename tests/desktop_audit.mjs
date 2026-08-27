// 🖥 PC 웹 사용성 실측 — 데스크톱 뷰포트에서 화면을 찍고 레이아웃을 잰다.
// ⚠️ 운영 word_stats 기록됨 — 실행 후 node tests/clean_test_stats.js --apply
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = process.env.HOME + '/Desktop/hgmr/_desktop_audit';
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const words = JSON.parse(fs.readFileSync(process.env.HOME + '/Desktop/hgmr/words.json', 'utf8'));
const head = t => (t || '').split(/_+/)[0].trim();
const bySent = new Map(words.map(w => [head(w.sentence), w]));

const SIZES = [{ n: 'wide', w: 1440, h: 900 }, { n: 'hd', w: 1920, h: 1080 }, { n: 'laptop', w: 1280, h: 720 }];
const report = {};

for (const S of SIZES) {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', `--window-size=${S.w},${S.h}`] });
  const p = await b.newPage();
  await p.setViewport({ width: S.w, height: S.h, deviceScaleFactor: 1 });
  const vis = s => p.evaluate(x => { const e = document.querySelector(x); return !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0; }, s);
  const click = async s => { await p.waitForSelector(s, { timeout: 20000 }); await p.evaluate(x => document.querySelector(x).click(), s); };
  const cur = async () => bySent.get(head(await p.evaluate(() => document.getElementById('sentence-text')?.textContent || '')));
  const shot = async n => { await sleep(400); await p.screenshot({ path: `${OUT}/${S.n}-${n}.png` }); };

  await p.goto('https://hgmr.co.kr/', { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(1500);
  await shot('1-로그인');

  await click('#anon-login-btn');
  for (let t = 0; t < 25; t++) { await sleep(1000); if (await vis('#placement-intro-modal') || await vis('#start-study-btn')) break; }
  await shot('2-진입');

  // 배치고사 진행
  if (await vis('#placement-intro-modal')) { await click('#placement-start-btn'); await sleep(2500); await shot('3-배치문제'); }
  for (let i = 0; i < 40; i++) {
    if (await vis('#placement-result-modal')) break;
    if (!await vis('#quiz-box')) break;
    const w = await cur();
    await p.evaluate(() => { const el = document.getElementById('answer-input'); el.value = ''; el.focus(); });
    await p.type('#answer-input', w ? w.target : '아무말아무말', { delay: 5 });
    await p.evaluate(() => document.getElementById('submit-btn').click());
    await sleep(800);
    for (let k = 0; k < 6 && await vis('#next-btn'); k++) { await click('#next-btn'); await sleep(450); } }
  if (await vis('#placement-result-modal')) { await shot('4-배치결과'); await click('#placement-result-home-btn'); await sleep(2000); }

  await p.waitForSelector('#home-box', { visible: true, timeout: 20000 });
  await shot('5-홈');

  // 상세 통계 · 프로필
  if (await vis('#home-badges-card')) { await click('#home-badges-card'); await sleep(900); await shot('6-상세통계'); await p.keyboard.press('Escape'); await sleep(600); }
  const prof = await p.evaluate(() => !!document.getElementById('profile-chip'));
  if (prof) { await click('#profile-chip'); await sleep(900); await shot('7-프로필'); await p.keyboard.press('Escape'); await sleep(600); }

  // 학습 세션 — 문제 화면과 통계 패널
  await click('#start-study-btn'); await sleep(2500);
  if (await vis('#topic-modal')) { await shot('8-주제선택'); await click('#close-topic-btn'); await sleep(800); }
  await p.waitForSelector('#quiz-box', { visible: true, timeout: 20000 });
  await p.evaluate(() => document.getElementById('answer-input').focus());
  await shot('9-문제-입력중');
  const w2 = await cur();
  await p.type('#answer-input', w2 ? w2.target : '아무말아무말', { delay: 5 });
  // 엔터로 제출되는지
  const beforeUrlState = await p.evaluate(() => document.getElementById('answer-input').disabled);
  await p.keyboard.press('Enter'); await sleep(1800);
  const enterWorks = await p.evaluate(() => document.getElementById('answer-input').disabled) !== beforeUrlState;
  await shot('10-통계패널');

  const m = await p.evaluate(() => {
    const r = el => { if (!el) return null; const b = el.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height), l: Math.round(b.left), t: Math.round(b.top) }; };
    const q = document.querySelector('.quiz-container') || document.getElementById('quiz-box');
    const st = document.getElementById('inline-stats-container');
    return {
      뷰포트: { w: innerWidth, h: innerHeight },
      본문카드: r(q),
      통계패널: r(st),
      헤더: r(document.querySelector('#app-screen > header')),
      입력창: r(document.getElementById('answer-input')),
      가상키보드보임: (() => { const k = document.getElementById('custom-keyboard'); return !!k && getComputedStyle(k).display !== 'none'; })(),
      가로스크롤: document.documentElement.scrollWidth > innerWidth + 1,
      문장폰트: getComputedStyle(document.getElementById('sentence-text') || document.body).fontSize,
      본문폰트: getComputedStyle(document.body).fontSize,
    };
  });
  m.엔터로제출 = enterWorks;
  report[S.n] = m;
  console.log(S.n, JSON.stringify(m));
  await b.close();
}
fs.writeFileSync(OUT + '/report.json', JSON.stringify(report, null, 2));
console.log('\n→ ' + OUT);

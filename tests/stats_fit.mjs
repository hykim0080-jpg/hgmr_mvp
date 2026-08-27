// 📏 통계창에 막대가 몇 줄까지 잘리지 않고 보이는지.
//    "더 올라와야 해" 는 결국 '스크롤 없이 보이는 줄 수'의 문제다.
// ⚠️ 운영 word_stats 기록됨 — 실행 후 clean_test_stats --apply
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148');
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const vis = s => p.evaluate(x => { const e = document.querySelector(x); return !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0; }, s);
const click = async s => { await p.waitForSelector(s, { timeout: 20000 }); await p.evaluate(x => document.querySelector(x).click(), s); };
const words = JSON.parse(fs.readFileSync(process.env.HOME + '/Desktop/hgmr/words.json', 'utf8'));
const bySent = new Map(words.map(w => [w.sentence.replace(/_+/g, '').trim(), w]));
const cur = async () => bySent.get(await p.evaluate(() => (document.getElementById('sentence-text')?.textContent || '').replace(/_+/g, '').trim()));
const ans = async t => { await p.evaluate(() => { const el = document.getElementById('answer-input'); el.value = ''; el.focus(); }); await p.type('#answer-input', t, { delay: 8 }); await p.evaluate(() => document.getElementById('submit-btn').click()); };

await p.goto('https://hgmr.co.kr/shot.html', { waitUntil: 'networkidle2', timeout: 60000 });
await click('#anon-login-btn');
for (let t = 0; t < 25; t++) { await sleep(1000); if (await vis('#placement-intro-modal') || await vis('#start-study-btn')) break; }
if (!await vis('#placement-intro-modal')) await click('#start-study-btn');
await sleep(700); await click('#placement-start-btn'); await sleep(2500);
for (let i = 0; i < 60; i++) { if (await vis('#placement-result-modal')) break; if (!await vis('#quiz-box')) break;
  const w = await cur(); await ans(w ? w.target : '아무말아무말'); await sleep(850);
  for (let k = 0; k < 6 && await vis('#next-btn'); k++) { await click('#next-btn'); await sleep(550); } }
if (await vis('#placement-result-modal')) { await click('#placement-result-home-btn'); await sleep(2200); }
await p.waitForSelector('#home-box', { visible: true, timeout: 20000 });
await click('#start-study-btn'); await sleep(3000);
if (await vis('#topic-modal')) { await click('#close-topic-btn'); await sleep(800); }
await p.waitForSelector('#quiz-box', { visible: true, timeout: 20000 });

const rows = [];
for (let i = 0; i < 4; i++) {
  const w = await cur(); await ans(w ? w.target : '아무말아무말'); await sleep(2600);
  if (await vis('#inline-stats-container')) {
    const r = await p.evaluate(() => {
      const c = document.getElementById('inline-stats-container');
      const sc = c.querySelector('.stats-scroll');
      const pane = c.querySelector('[data-pane-body="stats"]');
      // 막대 행 = 표현 + 막대 + 비율(%) 이 든 flex 줄. 표 머리('표현/비율')는 % 가 없어 제외된다.
      const bars = [...pane.querySelectorAll(':scope > div')].filter(d =>
          d.style.display === 'flex' && d.style.alignItems === 'center' && /\d+%/.test(d.textContent));
      // 갓 만든 계정이라 실제 분포는 대개 1줄뿐이다. 5줄일 때의 기하를 보려고 행을 복제한다.
      //  (복제 없이 '보이는 줄 = 전체 줄' 만 보면 1줄짜리에서 늘 통과해 버린다)
      if (bars.length) { for (let i = bars.length; i < 5; i++) bars[0].parentNode.insertBefore(bars[0].cloneNode(true), bars[0].nextSibling); }
      const all = [...pane.querySelectorAll(':scope > div')].filter(d =>
          d.style.display === 'flex' && d.style.alignItems === 'center' && /\d+%/.test(d.textContent));
      const vw = sc.getBoundingClientRect();
      const 보이는줄 = all.filter(el => { const r = el.getBoundingClientRect(); return r.top >= vw.top - 1 && r.bottom <= vw.bottom + 1; }).length;
      return { 패널: Math.round(c.getBoundingClientRect().height), 스크롤영역: Math.round(vw.height),
               실제줄: bars.length, 복제후줄: all.length, 보이는줄, 스크롤필요: sc.scrollHeight - Math.round(vw.height) };
    });
    rows.push(r);
    console.log(JSON.stringify(r));
  }
  for (let k = 0; k < 3 && await vis('#next-btn'); k++) { await click('#next-btn'); await sleep(700); }
}
console.log('');
const 막대있음 = rows.filter(r => r.복제후줄 >= 5);
console.log(`5줄로 만들어 잰 문항 ${막대있음.length}건:`, 막대있음.length > 0 ? '✅' : '❌ (아래 판정 무의미)');
console.log('패널 380px 이상:', rows.length > 0 && rows.every(r => r.패널 >= 380) ? '✅' : '❌');
if (막대있음.length) {
  const 최소 = Math.min(...막대있음.map(r => r.보이는줄));
  console.log(`5줄일 때 스크롤 없이 보이는 줄: 최소 ${최소}줄`);
  console.log('두 줄 이상 보임:', 최소 >= 2 ? '✅' : '❌');
  console.log('세 줄 이상 보임:', 최소 >= 3 ? '✅' : '△ (스크롤 필요)');
}
await b.close();

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
  const w = await cur();
  // i>=2 는 '아주 긴 뜻풀이' 상황을 강제해 회피 로직(패널 낮추기)이 실제로 도는지 본다
  if (i >= 2) await p.evaluate(() => { document.getElementById('meaning-text').textContent =
      '아주 길고 긴 뜻풀이가 세 줄을 넘어가는 경우를 흉내 내기 위한 문장. 이렇게 길면 통계 패널이 그대로 올라올 때 뜻풀이 아랫부분이 잘린다. 그런 상황을 강제로 만든다.'; });
  await ans(w ? w.target : '아무말아무말'); await sleep(2600);
  if (await vis('#inline-stats-container')) {
    const r = await p.evaluate(() => {
      const top = document.getElementById('inline-stats-container').getBoundingClientRect().top;
      const box = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return Math.round(b.bottom); };
      return { 패널상단: Math.round(top), 패널높이: Math.round(document.getElementById('inline-stats-container').offsetHeight), 문장바닥: box('#sentence-text'), 뜻풀이바닥: box('#meaning-text') , vh: window.innerHeight };
    });
    rows.push(r); console.log(JSON.stringify(r));
  }
  for (let k = 0; k < 3 && await vis('#next-btn'); k++) { await click('#next-btn'); await sleep(700); }
}
const ok = rows.length > 0 && rows.every(r => r.문장바닥 !== null && r.문장바닥 <= r.패널상단 - 4);
console.log('문장이 패널에 안 가림:', ok ? '✅' : '❌');
const ok2 = rows.every(r => r.뜻풀이바닥 == null || r.뜻풀이바닥 <= r.패널상단 - 4);
console.log('뜻풀이가 패널에 안 가림:', ok2 ? '✅' : '❌');
console.log('뜻풀이 바닥 최대:', Math.max(...rows.map(r=>r.뜻풀이바닥||0)), '/ 패널상단', rows[0] && rows[0].패널상단);
await b.close();

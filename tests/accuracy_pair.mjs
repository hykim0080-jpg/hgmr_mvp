// 📊 평균 정답률 — 분자(첫 시도 정답)와 분모(확정 문항)가 짝을 유지하는지.
//    분자만 오르면 100%로 굳는다. 일부러 틀린 문항을 섞고 100%가 아닌지 본다.
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
const head = t => (t || '').split(/_+/)[0].trim();
const bySent = new Map(words.map(w => [head(w.sentence), w]));
const cur = async () => bySent.get(head(await p.evaluate(() => document.getElementById('sentence-text')?.textContent || '')));
const ans = async t => { await p.evaluate(() => { const el = document.getElementById('answer-input'); el.value = ''; el.focus(); }); await p.type('#answer-input', t, { delay: 8 }); await p.evaluate(() => document.getElementById('submit-btn').click()); };

await p.goto('https://hgmr.co.kr/shot.html', { waitUntil: 'networkidle2', timeout: 60000 });
await click('#anon-login-btn');
for (let t = 0; t < 25; t++) { await sleep(1000); if (await vis('#placement-intro-modal') || await vis('#start-study-btn')) break; }
if (!await vis('#placement-intro-modal')) await click('#start-study-btn');
await sleep(700); await click('#placement-start-btn'); await sleep(2500);

// 배치고사는 아무렇게나 통과시킨다 (정답률 지표엔 안 들어간다)
let 실패 = 0;
for (let i = 0; i < 90; i++) {
  if (await vis('#placement-result-modal')) break;
  if (!await vis('#quiz-box')) break;
  const w = await cur();
  await ans(w ? w.target : '아무말아무말'); await sleep(750);
  for (let k = 0; k < 6 && await vis('#next-btn'); k++) { await click('#next-btn'); await sleep(500); }
}
if (await vis('#placement-result-modal')) { await click('#placement-result-home-btn'); await sleep(2200); }
await p.waitForSelector('#home-box', { visible: true, timeout: 20000 });
const 배치직후 = await p.evaluate(() => document.getElementById('home-accuracy-text').textContent.trim());

await click('#start-study-btn'); await sleep(3000);
if (await vis('#topic-modal')) { await click('#close-topic-btn'); await sleep(800); }
await p.waitForSelector('#quiz-box', { visible: true, timeout: 20000 });

// 6문항: 홀수는 한 번에 정답, 짝수는 «틀린 뒤» 정답
for (let i = 1; i <= 6; i++) {
  if (!await vis('#quiz-box')) break;
  const w = await cur(); if (!w) { 실패++; }
  if (i % 2 === 0) { await ans('아무말아무말'); await sleep(900); }
  if (w && await p.evaluate(() => !document.getElementById('answer-input').disabled)) { await ans(w.target); await sleep(2200); }
  for (let k = 0; k < 4 && await vis('#next-btn'); k++) { await click('#next-btn'); await sleep(600); }
}
// 홈으로 나가 지표를 읽는다
await click('#quiz-home-btn'); await sleep(1200);
if (await vis('#exit-confirm-modal')) { await click('#exit-confirm-btn'); await sleep(1800); }
await p.waitForSelector('#home-box', { visible: true, timeout: 20000 });
const 학습후 = await p.evaluate(() => document.getElementById('home-accuracy-text').textContent.trim());
console.log(`배치고사 직후: ${배치직후} · 6문항 학습 후: ${학습후} (문장매칭실패 ${실패}개)`);
console.log('배치고사는 정답률에 안 들어감:', 배치직후 === '-' ? '✅' : `❌ (${배치직후})`);
console.log('틀린 문항이 있으니 100%가 아님:', 학습후 !== '100%' && 학습후 !== '-' ? '✅' : `❌ (${학습후})`);
await b.close();

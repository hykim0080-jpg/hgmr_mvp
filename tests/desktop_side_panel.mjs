// 🖥 오른쪽 칸이 «화면에 맞는 숫자»를 보여주는지 — 배치고사 / 학습 각각
// ⚠️ 운영 word_stats 기록됨 — 실행 후 node tests/clean_test_stats.js --apply
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const words = JSON.parse(fs.readFileSync(process.env.HOME + '/Desktop/hgmr/words.json', 'utf8'));
const head = t => (t || '').split(/_+/)[0].trim();
const bySent = new Map(words.map(w => [head(w.sentence), w]));
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
p.on('pageerror', e => console.log('PAGE ERROR:', String(e).slice(0, 200)));
await p.setViewport({ width: 1440, height: 900 });
const vis = s => p.evaluate(x => { const e = document.querySelector(x); return !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0; }, s);
const click = async s => { await p.waitForSelector(s, { timeout: 20000 }); await p.evaluate(x => document.querySelector(x).click(), s); };
const cur = async () => bySent.get(head(await p.evaluate(() => document.getElementById('sentence-text')?.textContent || '')));
const side = () => p.evaluate(() => (document.getElementById('inline-stats-container')?.innerText || '').replace(/\s+/g, ' ').trim());
let fail = 0;
const ok = (l, c, x = '') => { console.log(`  ${l}: ${c ? '✅' : '❌ ' + x}`); if (!c) fail++; };

await p.goto('https://hgmr.co.kr/', { waitUntil: 'networkidle2', timeout: 60000 });
await sleep(1300);
await click('#anon-login-btn');
for (let t = 0; t < 25; t++) { await sleep(1000); if (await vis('#placement-intro-modal') || await vis('#start-study-btn')) break; }
if (await vis('#placement-intro-modal')) { await click('#placement-start-btn'); await sleep(2500); }

// 배치고사 — 4문항 풀고 오른쪽 칸을 본다
for (let i = 0; i < 4; i++) {
  const w = await cur();
  await p.evaluate(() => { const el = document.getElementById('answer-input'); el.value = ''; el.focus(); });
  await p.type('#answer-input', w ? w.target : '아무말아무말', { delay: 4 });
  await p.keyboard.press('Enter'); await sleep(700);
  await p.evaluate(() => document.activeElement && document.activeElement.blur());
  await p.keyboard.press('Enter'); await sleep(600);
}
const sp = await side();
console.log('\n── 배치고사 오른쪽 칸 ──\n ', sp.slice(0, 220));
ok('배치고사 제목', sp.includes('실력 알아보는 중'), sp.slice(0, 60));
ok('「한 번에 맞힘」 표시', sp.includes('한 번에 맞힘'));
ok('「놓친 문항」 표시', sp.includes('놓친 문항'));
ok('학습용 문구가 안 섞임', !sp.includes('모은 조각') && !sp.includes('연속 정답'));
ok('숫자가 0으로 죽어 있지 않음', /한 번에 맞힘 [1-9]/.test(sp) || /놓친 문항 [1-9]/.test(sp), sp.slice(0, 120));
ok('「방금 지나온 말」 채워짐', sp.includes('방금 지나온 말'));
ok('결과 안내 문구', sp.includes('결과는 마지막에'));

for (let i = 0; i < 40; i++) {
  if (await vis('#placement-result-modal')) break;
  if (!await vis('#quiz-box')) break;
  const w = await cur();
  await p.evaluate(() => { const el = document.getElementById('answer-input'); el.value = ''; el.focus(); });
  await p.type('#answer-input', w ? w.target : '아무말아무말', { delay: 4 });
  await p.keyboard.press('Enter'); await sleep(650);
  await p.evaluate(() => document.activeElement && document.activeElement.blur());
  await p.keyboard.press('Enter'); await sleep(500);
}
if (await vis('#placement-result-modal')) { await click('#placement-result-home-btn'); await sleep(2000); }
await p.waitForSelector('#home-box', { visible: true, timeout: 20000 });
await click('#start-study-btn'); await sleep(2500);
if (await vis('#topic-modal')) { await click('#close-topic-btn'); await sleep(800); }
await p.waitForSelector('#quiz-box', { visible: true, timeout: 20000 });
for (let i = 0; i < 2; i++) {
  const w = await cur();
  await p.evaluate(() => { const el = document.getElementById('answer-input'); el.value = ''; el.focus(); });
  await p.type('#answer-input', w ? w.target : '아무말아무말', { delay: 4 });
  await p.keyboard.press('Enter'); await sleep(2200);
  await p.evaluate(() => document.activeElement && document.activeElement.blur());
  await p.keyboard.press('Enter'); await sleep(900);
}
const sl = await side();
console.log('\n── 학습 오른쪽 칸 ──\n ', sl.slice(0, 220));
ok('학습 제목', sl.includes('오늘의 학습'));
ok('「연속 정답」·「모은 조각」 표시', sl.includes('연속 정답') && sl.includes('모은 조각'));
ok('배치고사 문구가 안 섞임', !sl.includes('한 번에 맞힘') && !sl.includes('놓친 문항'));
ok('조각이 실제로 쌓임', /모은 조각 \+[1-9]/.test(sl), sl.slice(0, 140));
await b.close();
console.log(fail === 0 ? '\n전체 통과 ✅' : `\n실패 ${fail}건 ❌`);

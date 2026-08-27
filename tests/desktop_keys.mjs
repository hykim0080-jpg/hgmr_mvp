// ⌨️ 데스크톱 — Enter 로 다음 문항, Esc 로 모달 닫기, 카드 내부 스크롤 없음
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
await p.setViewport({ width: 1440, height: 700, deviceScaleFactor: 1 });   // 북마크바 있는 창
const vis = s => p.evaluate(x => { const e = document.querySelector(x); return !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0; }, s);
const click = async s => { await p.waitForSelector(s, { timeout: 20000 }); await p.evaluate(x => document.querySelector(x).click(), s); };
const cur = async () => bySent.get(head(await p.evaluate(() => document.getElementById('sentence-text')?.textContent || '')));
const sentence = () => p.evaluate(() => document.getElementById('sentence-text')?.textContent || '');
const clip = () => p.evaluate(() => { const e = document.getElementById('quiz-box');
  return e ? { 안쪽: e.scrollHeight, 보이는: e.clientHeight, 잘림: e.scrollHeight > e.clientHeight + 1 } : null; });

await p.goto('https://hgmr.co.kr/', { waitUntil: 'networkidle2', timeout: 60000 });
await sleep(1200);
// 🖱 hover — 고스트 버튼이 초록으로 칠해지지 않는지
await p.hover('#anon-login-btn'); await sleep(250);
const ghostBg = await p.evaluate(() => getComputedStyle(document.getElementById('anon-login-btn')).backgroundColor);
console.log('고스트 버튼 hover 배경:', ghostBg, ghostBg.includes('0, 0, 0, 0') || ghostBg === 'transparent' ? '✅ 투명' : '❌ 칠해짐');

await click('#anon-login-btn');
for (let t = 0; t < 25; t++) { await sleep(1000); if (await vis('#placement-intro-modal') || await vis('#start-study-btn')) break; }
if (await vis('#placement-intro-modal')) { await click('#placement-start-btn'); await sleep(2500); }

// 배치고사에서 Enter 로 다음 문항이 넘어가는지
let enterAdvance = 0, mouseNeeded = 0;
for (let i = 0; i < 40; i++) {
  if (await vis('#placement-result-modal')) break;
  if (!await vis('#quiz-box')) break;
  const w = await cur(); const before = await sentence();
  await p.evaluate(() => { const el = document.getElementById('answer-input'); el.value = ''; el.focus(); });
  await p.type('#answer-input', w ? w.target : '아무말아무말', { delay: 4 });
  await p.keyboard.press('Enter'); await sleep(900);
  if (await vis('#next-btn')) {
    await p.evaluate(() => document.activeElement && document.activeElement.blur());
    await p.keyboard.press('Enter'); await sleep(700);
    if (await sentence() !== before) enterAdvance++;
    else { mouseNeeded++; for (let k = 0; k < 4 && await vis('#next-btn'); k++) { await click('#next-btn'); await sleep(400); } }
  }
}
console.log(`배치고사 — Enter 로 넘어감 ${enterAdvance}회 / 마우스 필요 ${mouseNeeded}회`);
console.log('Enter 로 다음 문항:', enterAdvance > 0 && mouseNeeded === 0 ? '✅' : `❌ (${mouseNeeded}회 실패)`);
if (await vis('#placement-result-modal')) { await click('#placement-result-home-btn'); await sleep(2000); }
await p.waitForSelector('#home-box', { visible: true, timeout: 20000 });

// Esc 로 모달 닫기
await click('#home-mtn-btn'); await sleep(900);
const guideOpen = await vis('#altitude-guide-modal');
await p.keyboard.press('Escape'); await sleep(700);
const guideClosed = !(await vis('#altitude-guide-modal'));
console.log('Esc 로 어휘 고도 모달 닫힘:', guideOpen && guideClosed ? '✅' : `❌ (열림 ${guideOpen} / 닫힘 ${guideClosed})`);

// 학습 — 통계가 떠도 카드 안쪽 스크롤이 없어야 한다
await click('#start-study-btn'); await sleep(2500);
if (await vis('#topic-modal')) { await click('#close-topic-btn'); await sleep(800); }
await p.waitForSelector('#quiz-box', { visible: true, timeout: 20000 });
const w2 = await cur();
await p.evaluate(() => document.getElementById('answer-input').focus());
await p.type('#answer-input', w2 ? w2.target : '아무말아무말', { delay: 4 });
await p.keyboard.press('Enter'); await sleep(2300);
const c = await clip();
console.log('통계 표시 시 카드 내부:', JSON.stringify(c));
console.log('카드 안쪽 스크롤 없음:', c && !c.잘림 ? '✅' : '❌');
const before2 = await sentence();
await p.evaluate(() => document.activeElement && document.activeElement.blur());
await p.keyboard.press('Enter'); await sleep(900);
console.log('학습에서도 Enter 로 다음:', await sentence() !== before2 ? '✅' : '❌');
await b.close();

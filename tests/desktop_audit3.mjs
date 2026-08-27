// 🖥 데스크톱 — 카드 실폭·잘림 검사
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const words = JSON.parse(fs.readFileSync(process.env.HOME + '/Desktop/hgmr/words.json', 'utf8'));
const head = t => (t || '').split(/_+/)[0].trim();
const bySent = new Map(words.map(w => [head(w.sentence), w]));
const SIZES = [{ n: '1440×900', w: 1440, h: 900 }, { n: '1440×700(북마크바)', w: 1440, h: 700 }, { n: '1280×620(작은창)', w: 1280, h: 620 }];

for (const S of SIZES) {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const p = await b.newPage();
  await p.setViewport({ width: S.w, height: S.h, deviceScaleFactor: 1 });
  const vis = s => p.evaluate(x => { const e = document.querySelector(x); return !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0; }, s);
  const click = async s => { await p.waitForSelector(s, { timeout: 20000 }); await p.evaluate(x => document.querySelector(x).click(), s); };
  const cur = async () => bySent.get(head(await p.evaluate(() => document.getElementById('sentence-text')?.textContent || '')));
  const box = () => p.evaluate(() => {
    const g = id => { const e = document.querySelector(id); if (!e) return null;
      const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
      return { w: Math.round(r.width), h: Math.round(r.height), 안쪽높이: e.scrollHeight, 보이는높이: e.clientHeight,
               잘림: e.scrollHeight > e.clientHeight + 1, overflow: cs.overflowY, maxH: cs.maxHeight }; };
    return { 뷰포트: `${innerWidth}×${innerHeight}`, 퀴즈카드: g('#quiz-box'), 홈카드: g('#home-box'),
             본문바닥이화면밖: (() => { const e = document.querySelector('#quiz-box') || document.querySelector('#home-box');
               return e ? Math.round(e.getBoundingClientRect().bottom) > innerHeight : null; })() };
  });
  await p.goto('https://hgmr.co.kr/', { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(1200);
  await click('#anon-login-btn');
  for (let t = 0; t < 25; t++) { await sleep(1000); if (await vis('#placement-intro-modal') || await vis('#start-study-btn')) break; }
  if (await vis('#placement-intro-modal')) { await click('#placement-start-btn'); await sleep(2500); }
  console.log(S.n, '· 배치문제:', JSON.stringify(await box()));
  for (let i = 0; i < 40; i++) {
    if (await vis('#placement-result-modal')) break;
    if (!await vis('#quiz-box')) break;
    const w = await cur();
    await p.evaluate(() => { const el = document.getElementById('answer-input'); el.value = ''; el.focus(); });
    await p.type('#answer-input', w ? w.target : '아무말아무말', { delay: 4 });
    await p.keyboard.press('Enter'); await sleep(700);
    for (let k = 0; k < 6 && await vis('#next-btn'); k++) { await click('#next-btn'); await sleep(400); } }
  if (await vis('#placement-result-modal')) { await click('#placement-result-home-btn'); await sleep(2000); }
  await p.waitForSelector('#home-box', { visible: true, timeout: 20000 });
  console.log(S.n, '· 홈       :', JSON.stringify(await box()));
  await click('#start-study-btn'); await sleep(2500);
  if (await vis('#topic-modal')) { await click('#close-topic-btn'); await sleep(800); }
  await p.waitForSelector('#quiz-box', { visible: true, timeout: 20000 });
  console.log(S.n, '· 학습문제 :', JSON.stringify(await box()));
  const w2 = await cur();
  await p.evaluate(() => document.getElementById('answer-input').focus());
  await p.type('#answer-input', w2 ? w2.target : '아무말아무말', { delay: 4 });
  await p.keyboard.press('Enter'); await sleep(2200);
  console.log(S.n, '· 통계표시 :', JSON.stringify(await box()));
  console.log('');
  await b.close();
}

// 🖥 PC 웹 사용성 — 화면별 정밀 실측 (텍스트 리포트)
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const words = JSON.parse(fs.readFileSync(process.env.HOME + '/Desktop/hgmr/words.json', 'utf8'));
const head = t => (t || '').split(/_+/)[0].trim();
const bySent = new Map(words.map(w => [head(w.sentence), w]));

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
const vis = s => p.evaluate(x => { const e = document.querySelector(x); return !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0; }, s);
const click = async s => { await p.waitForSelector(s, { timeout: 20000 }); await p.evaluate(x => document.querySelector(x).click(), s); };
const cur = async () => bySent.get(head(await p.evaluate(() => document.getElementById('sentence-text')?.textContent || '')));

const probe = () => p.evaluate(() => {
  const W = innerWidth, H = innerHeight;
  const seen = new Set(); const cols = [];
  // 실제로 보이는 콘텐츠의 좌우 끝을 재서 «쓰는 폭»을 구한다
  let minL = W, maxR = 0, maxB = 0;
  document.querySelectorAll('body *').forEach(el => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    if (r.bottom < 0 || r.top > H * 3) return;
    if (el.id === 'app-screen' || el.tagName === 'HEADER' || el.closest('header')) return;
    minL = Math.min(minL, r.left); maxR = Math.max(maxR, r.right); maxB = Math.max(maxB, r.bottom);
  });
  // 클릭 가능한 요소들의 크기
  const clickable = [...document.querySelectorAll('button, a, [role=button], input, select')]
    .filter(el => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
      return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 2 && r.height > 2; });
  const sizes = clickable.map(el => { const r = el.getBoundingClientRect();
    return { t: (el.id || el.className || el.tagName).toString().slice(0, 28), w: Math.round(r.width), h: Math.round(r.height),
             cursor: getComputedStyle(el).cursor }; });
  return {
    뷰포트: `${W}×${H}`,
    콘텐츠_좌: Math.round(minL), 콘텐츠_우: Math.round(maxR),
    콘텐츠폭: Math.round(maxR - minL),
    빈공간비율: Math.round((1 - (maxR - minL) / W) * 100) + '%',
    문서높이: Math.round(document.documentElement.scrollHeight), 세로스크롤필요: document.documentElement.scrollHeight > H + 2,
    클릭요소수: clickable.length,
    커서포인터아님: sizes.filter(s => s.cursor !== 'pointer' && !/input/i.test(s.t)).length,
    큰버튼_56px이상: sizes.filter(s => s.h >= 56).map(s => `${s.t}(${s.w}×${s.h})`).slice(0, 8),
  };
});

const R = {};
await p.goto('https://hgmr.co.kr/', { waitUntil: 'networkidle2', timeout: 60000 });
await sleep(1500);
R['① 로그인'] = await probe();

await click('#anon-login-btn');
for (let t = 0; t < 25; t++) { await sleep(1000); if (await vis('#placement-intro-modal') || await vis('#start-study-btn')) break; }
if (await vis('#placement-intro-modal')) {
  R['② 배치 안내'] = await probe();
  await click('#placement-start-btn'); await sleep(2500);
}
R['③ 배치 문제'] = await probe();
for (let i = 0; i < 40; i++) {
  if (await vis('#placement-result-modal')) break;
  if (!await vis('#quiz-box')) break;
  const w = await cur();
  await p.evaluate(() => { const el = document.getElementById('answer-input'); el.value = ''; el.focus(); });
  await p.type('#answer-input', w ? w.target : '아무말아무말', { delay: 4 });
  await p.keyboard.press('Enter'); await sleep(750);
  for (let k = 0; k < 6 && await vis('#next-btn'); k++) { await click('#next-btn'); await sleep(420); } }
if (await vis('#placement-result-modal')) { R['④ 배치 결과'] = await probe(); await click('#placement-result-home-btn'); await sleep(2000); }
await p.waitForSelector('#home-box', { visible: true, timeout: 20000 });
R['⑤ 홈'] = await probe();

await click('#start-study-btn'); await sleep(2500);
if (await vis('#topic-modal')) { R['⑥ 주제 선택'] = await probe(); await click('#close-topic-btn'); await sleep(800); }
await p.waitForSelector('#quiz-box', { visible: true, timeout: 20000 });
R['⑦ 문제'] = await probe();
const w2 = await cur();
await p.evaluate(() => document.getElementById('answer-input').focus());
await p.type('#answer-input', w2 ? w2.target : '아무말아무말', { delay: 4 });
await p.keyboard.press('Enter'); await sleep(2200);
R['⑧ 정답 후 통계'] = await probe();

// 키보드 접근성 — Tab 순회
const tab = await p.evaluate(async () => {
  const path = []; document.body.focus();
  for (let i = 0; i < 12; i++) {
    const a = document.activeElement;
    path.push((a && (a.id || a.className || a.tagName) || '?').toString().slice(0, 26));
  }
  return path;
});
console.log(JSON.stringify(R, null, 1));
console.log('\n포커스 링(:focus-visible) 규칙 수:', await p.evaluate(() => {
  let n = 0; for (const s of document.styleSheets) { try { for (const r of s.cssRules) if (r.selectorText && /focus/.test(r.selectorText)) n++; } catch (e) {} } return n; }));
console.log('hover 규칙 수:', await p.evaluate(() => {
  let n = 0; for (const s of document.styleSheets) { try { for (const r of s.cssRules) if (r.selectorText && /:hover/.test(r.selectorText)) n++; } catch (e) {} } return n; }));
await b.close();

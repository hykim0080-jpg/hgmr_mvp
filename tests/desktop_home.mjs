// 🏔 넓은 화면 홈 — 풍경(꼬리섬 + 하랑이 산) + 아래 2열. 좁은 화면은 1열 크롭 그대로.
// ⚠️ 운영 word_stats 기록됨 — 실행 후 node tests/clean_test_stats.js --apply
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const words = JSON.parse(fs.readFileSync(process.env.HOME + '/Desktop/hgmr/words.json', 'utf8'));
const head = t => (t || '').split(/_+/)[0].trim();
const bySent = new Map(words.map(w => [head(w.sentence), w]));
let fail = 0;
const ok = (l, c, x = '') => { console.log(`  ${l}: ${c ? '✅' : '❌ ' + x}`); if (!c) fail++; };

for (const C of [{ n: '넓은 화면 1440×900', w: 1440, h: 900, wide: true },
                 { n: '좁은 창 1024×800', w: 1024, h: 800, wide: false }]) {
  console.log(`\n── ${C.n} ──`);
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const p = await b.newPage();
  p.on('pageerror', e => { console.log('  PAGE ERROR:', String(e).slice(0, 220)); fail++; });
  await p.setViewport({ width: C.w, height: C.h });
  const vis = s => p.evaluate(x => { const e = document.querySelector(x); return !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0; }, s);
  const click = async s => { await p.waitForSelector(s, { timeout: 20000 }); await p.evaluate(x => document.querySelector(x).click(), s); };
  const cur = async () => bySent.get(head(await p.evaluate(() => document.getElementById('sentence-text')?.textContent || '')));

  await p.goto('https://hgmr.co.kr/', { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(1300);
  await click('#anon-login-btn');
  for (let t = 0; t < 25; t++) { await sleep(1000); if (await vis('#placement-intro-modal') || await vis('#start-study-btn')) break; }
  if (await vis('#placement-intro-modal')) { await click('#placement-later-btn'); await sleep(900); }
  await p.waitForSelector('#home-box', { visible: true, timeout: 20000 });

  // 측정 전
  const pre = await p.evaluate(() => ({
    풍경: (() => { const e = document.getElementById('home-scene-wrap'); const r = e.getBoundingClientRect();
      return { shown: getComputedStyle(e).display !== 'none' && r.height > 0, w: Math.round(r.width), h: Math.round(r.height) }; })(),
    크롭: (() => { const e = document.getElementById('home-mountain'); return getComputedStyle(e).display !== 'none'; })(),
    올려다봄: (() => { const e = document.getElementById('home-scene-lookup'); return e && getComputedStyle(e).display !== 'none'; })(),
    고도: (document.getElementById('home-scene-value') || {}).textContent,
    섬라벨: (document.getElementById('home-scene-isle-label') || {}).textContent,
  }));
  if (C.wide) {
    ok('풍경이 창을 가로지름', pre.풍경.shown && pre.풍경.w > 900, JSON.stringify(pre.풍경));
    ok('좁은 화면용 크롭은 숨김', !pre.크롭);
    ok('측정 전 — 하랑이가 올려다봄', pre.올려다봄);
    ok('측정 전 — ???m', (pre.고도 || '').includes('???'), pre.고도);
    ok('측정 전 — 섬 라벨 「출발점」', (pre.섬라벨 || '').includes('출발점'), pre.섬라벨);
  } else {
    ok('좁은 화면엔 풍경 없음', !pre.풍경.shown);
    ok('좁은 화면은 크롭 유지', pre.크롭);
  }

  // 배치고사를 마치고 다시 홈
  await click('#start-study-btn'); await sleep(1200);
  if (await vis('#placement-intro-modal')) { await click('#placement-start-btn'); await sleep(2500); }
  for (let i = 0; i < 40; i++) {
    if (await vis('#placement-result-modal')) break;
    if (!await vis('#quiz-box')) break;
    const w = await cur();
    await p.evaluate(() => { const el = document.getElementById('answer-input'); el.value = ''; el.focus(); });
    await p.type('#answer-input', w ? w.target : '아무말아무말', { delay: 4 });
    await p.keyboard.press('Enter'); await sleep(650);
    await p.evaluate(() => document.activeElement && document.activeElement.blur());
    await p.keyboard.press('Enter'); await sleep(480);
  }
  if (await vis('#placement-result-modal')) { await click('#placement-result-home-btn'); await sleep(2200); }
  await p.waitForSelector('#home-box', { visible: true, timeout: 20000 });

  const post = await p.evaluate(() => {
    const g = id => document.getElementById(id);
    const r = id => { const e = g(id); if (!e) return null; const b = e.getBoundingClientRect(); return { w: Math.round(b.width), l: Math.round(b.left), t: Math.round(b.top), shown: getComputedStyle(e).display !== 'none' && b.height > 0 }; };
    return { 고도: (g('home-scene-value') || {}).textContent, 티어: (g('home-scene-tier') || {}).textContent,
             남은거리: (g('home-scene-left') || {}).textContent,
             하랑이보임: !!g('home-scene-harang') && getComputedStyle(g('home-scene-harang')).display !== 'none',
             하랑이: g('home-scene-harang') ? { x: +g('home-scene-harang').getAttribute('x'), y: +g('home-scene-harang').getAttribute('y') } : null,
             올려다봄: !!g('home-scene-lookup') && getComputedStyle(g('home-scene-lookup')).display !== 'none',
             풍경: r('home-scene-wrap'), 시작버튼: r('home-action'), 분석: r('home-stats') };
  });
  if (C.wide) {
    ok('측정 후 — 해발 숫자 표시', /해발 [\d,]+m/.test(post.고도 || ''), post.고도);
    ok('측정 후 — 올려다보기 하랑이 사라짐', !post.올려다봄);
    ok('측정 후 — 비탈 위 하랑이 보임', post.하랑이보임 && post.하랑이 && post.하랑이.y > 0, JSON.stringify(post.하랑이));
    ok('남은 거리 문구', /마루까지|마루에 닿았/.test(post.남은거리 || ''), post.남은거리);
    ok('아래가 2열 — 분석이 오른쪽', !!post.분석 && !!post.시작버튼 && post.분석.l > post.시작버튼.l + post.시작버튼.w - 10, JSON.stringify(post));
    ok('풍경이 그 위에 걸침', post.풍경.t < post.시작버튼.t, JSON.stringify({ s: post.풍경.t, a: post.시작버튼.t }));
  } else {
    ok('좁은 화면 — 풍경 여전히 없음', !post.풍경.shown);
    ok('좁은 화면 — 1열 (분석이 아래)', post.분석.t > post.시작버튼.t, JSON.stringify(post));
  }
  await b.close();
}
console.log(fail === 0 ? '\n전체 통과 ✅' : `\n실패 ${fail}건 ❌`);

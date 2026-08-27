// 🎯 배치고사 채점 — 재입력으로 맞힌 답이 점수에 새지 않는지.
//    문항마다 «일부러 한 번 틀린 뒤» 정답을 친다. 첫 시도만 채점하므로 결과는 낮게 나와야 한다.
//    새면 누구나 표시 상한(700m)에 붙는다 — 그게 이 테스트가 잡는 회귀다.
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

let 문항 = 0, 재시도정답 = 0, 매칭실패 = 0;
for (let i = 0; i < 90; i++) {
  if (await vis('#placement-result-modal')) break;
  if (!await vis('#quiz-box')) break;
  const w = await cur();
  if (!w) { console.log('  ⚠️ 문장 매칭 실패:', await p.evaluate(() => (document.getElementById('sentence-text')?.textContent || '').slice(0, 40))); 매칭실패++; }
  문항++;
  // 절반은 한 번에 맞히고, 절반은 «한 번 틀린 뒤» 맞힌다.
  // 옛 채점(재시도도 1점)이면 둘 다 정답이라 사실상 만점 → 700m 상한.
  // 첫 시도만 세면 실제 실력은 그 중간이어야 한다.
  const 한번에 = 문항 % 2 === 1;
  if (!한번에) { await ans('아무말아무말'); await sleep(650); }
  if (w && await p.evaluate(() => !document.getElementById('answer-input').disabled)) {
    await ans(w.target); await sleep(700); if (!한번에) 재시도정답++;
  }
  for (let k = 0; k < 6 && await vis('#next-btn'); k++) { await click('#next-btn'); await sleep(500); }
  if (i % 10 === 9) console.log('  …진행', i + 1, '회 · 문항', 문항, '· 결과창', await vis('#placement-result-modal'));
}
await p.waitForSelector('#placement-result-modal', { visible: true, timeout: 20000 });
const 결과 = await p.evaluate(() => ({
  고도: document.getElementById('placement-result-rating').textContent.trim(),
  칭호: document.getElementById('placement-result-tier').textContent.trim(),
}));
const m = parseInt((결과.고도.match(/([\d,]+)/) || [])[1]?.replace(/,/g, '') || '-1', 10);
console.log(`문항 ${문항}개 · 한 번에 맞힘 ${문항 - 재시도정답}개 · 재입력으로 맞힘 ${재시도정답}개 · 문장매칭실패 ${매칭실패}개`);
console.log(`결과: ${결과.고도} (${결과.칭호})`);
console.log('문장 매칭 성공:', 매칭실패 === 0 ? '✅' : `❌ (${매칭실패}개 실패 — 아래 판정 무의미)`);
console.log('700m 상한에 붙지 않음:', m >= 0 && m < 700 ? '✅' : `❌ (${m}m — 재시도가 점수에 새고 있다)`);
console.log('바닥(0m)도 아님 — 절반은 맞혔으므로:', m > 0 ? '✅' : '❌');
await b.close();

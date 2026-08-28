// 🧪 /test — 10초 어휘력 테스트. 로그인·서버 없이 5문항 → 결과 → 카드.
import puppeteer from 'puppeteer-core';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ANS = ['안도', '환희', '착잡', '겸양', '방증'];   // 3번은 어간만 — 용언 규칙 확인
let fail = 0;
const ok = (l, c, x = '') => { console.log(`  ${l}: ${c ? '✅' : '❌ ' + x}`); if (!c) fail++; };

for (const C of [{ n: '모바일 390×844', w: 390, h: 844, m: true }, { n: '데스크톱 1440×900', w: 1440, h: 900, m: false }]) {
  console.log(`\n── ${C.n} ──`);
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const p = await b.newPage();
  p.on('pageerror', e => { console.log('  PAGE ERROR:', String(e).slice(0, 200)); fail++; });
  await p.setViewport({ width: C.w, height: C.h, isMobile: C.m, hasTouch: C.m });
  const t0 = Date.now();
  await p.goto('https://hgmr.co.kr/test', { waitUntil: 'domcontentloaded', timeout: 60000 });
  const paint = Date.now() - t0;
  ok(`첫 화면 ${paint}ms (2초 이내)`, paint < 2000, `${paint}ms`);

  // 검색 크롤러가 읽을 «정적» 텍스트가 있는가
  const raw = await p.evaluate(() => document.documentElement.outerHTML);
  ok('제목·설명 메타', /10초 어휘력 테스트/.test(raw) && /name="description"/.test(raw));
  ok('OG 카드', /og:image.*og-test\.png/.test(raw));
  ok('구조화 데이터 FAQ', /"@type": "FAQPage"/.test(raw));
  const bodyText = await p.evaluate(() => document.body.innerText);
  ok('읽을거리가 실제 글자로 있음 (300자 이상)', bodyText.length > 300, `${bodyText.length}자`);
  ok('어휘 고도 설명 포함', bodyText.includes('어휘 고도'));

  await p.evaluate(() => document.getElementById('start').click());
  await sleep(400);
  for (let k = 0; k < 5; k++) {
    await p.evaluate(() => { const e = document.getElementById('ans'); e.value = ''; e.focus(); });
    await p.type('#ans', ANS[k], { delay: 5 });
    await p.keyboard.press('Enter'); await sleep(320);
    const rv = await p.evaluate(() => document.getElementById('reveal').className);
    if (k === 2) ok('용언은 어간만 써도 정답 (착잡 → 착잡하다)', rv.includes('ok'), rv);
    await p.evaluate(() => document.getElementById('next').click()); await sleep(320);
  }
  const r = await p.evaluate(() => ({
    보임: getComputedStyle(document.getElementById('result')).display !== 'none',
    고도: document.getElementById('alt').textContent,
    티어: document.getElementById('tier').textContent.trim(),
    칸: document.querySelectorAll('#cells .cell.o').length,
    안내: document.getElementById('note').textContent,
  }));
  ok('결과 화면 표시', r.보임);
  ok('5문항 모두 정답 처리', r.칸 === 5, `${r.칸}칸`);
  ok('마루 등급', r.티어 === '마루', r.티어);
  ok('해발 950~1,100m', (() => { const m = +(r.고도.match(/[\d,]+/) || [''])[0].replace(/,/g, ''); return m >= 950 && m <= 1100; })(), r.고도);
  ok('만점 안내 문구', r.안내.includes('모두 맞혔습니다'), r.안내.slice(0, 40));

  // 결과 카드가 실제로 그려지는가
  const card = await p.evaluate(async () => {
    try {
      const c = document.getElementById('cv');
      if (!window.__r) return 'no-result';
      const ev = new Event('click'); document.getElementById('share').dispatchEvent(ev);
      await new Promise(r => setTimeout(r, 900));
      const d = c.getContext('2d').getImageData(540, 300, 1, 1).data;
      return `${c.width}x${c.height} rgba(${d[0]},${d[1]},${d[2]},${d[3]})`;
    } catch (e) { return 'ERR ' + e.message; }
  });
  ok('결과 카드 1080×1350 그려짐', /^1080x1350 rgba\((?!0,0,0,0)/.test(card), card);
  await b.close();
}
console.log(fail === 0 ? '\n전체 통과 ✅' : `\n실패 ${fail}건 ❌`);

// 🖼 스토어 제출용 캡션 컷 — 원본 스크린샷 위에 캡션 띠를 얹어 정확한 규격으로 뽑는다.
//    6.9" 1320×2868 / 6.5" 1242×2688
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SRC = '/tmp/store';
const OUT = '/tmp/store_final';
fs.mkdirSync(OUT, { recursive: true });

// 브랜드 규약: '한글 공부'류 금지 — 어휘·낱말로 쓴다
const CUTS = [
    { file: '1-퀴즈.png',       cap: ['빈칸을 직접 채워야', '진짜 내 어휘가 됩니다'] },
    { file: '3-홈-산.png',      cap: ['단어 하나에 한 걸음,', '어휘의 산을 오릅니다'] },
    { file: '4-어휘고도.png',   cap: ['기슭에서 마루까지,', '오늘 내 자리를 봅니다'] },
    { file: '5-낱말이야기.png', cap: ['헷갈리는 두 낱말,', '하루 한 편으로 정리'] },
    { file: '6-업적.png',       cap: ['매일의 기록이', '칭호로 남습니다'] },
];

const SIZES = [
    { name: '6.9', w: 440, h: 956, dsf: 3 },   // 1320×2868
    { name: '6.5', w: 414, h: 896, dsf: 3 },   // 1242×2688
];

const page = await (await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })).newPage();

const html = (imgData, cap) => `<!doctype html><meta charset="utf-8">
<style>
  @font-face { font-family: 'AppleSD'; src: local('Apple SD Gothic Neo'); }
  html, body { margin: 0; height: 100%; }
  body {
    display: flex; flex-direction: column; align-items: center;
    background: linear-gradient(180deg, #E9F8F1 0%, #F7FCFA 62%, #FFFFFF 100%);
    font-family: 'Apple SD Gothic Neo', 'AppleSD', system-ui, sans-serif;
    overflow: hidden;
  }
  .cap { padding: 5.2% 7% 0; text-align: center; }
  .cap span {
    display: block; font-size: 6.6vw; line-height: 1.36; font-weight: 800;
    color: #065F46; letter-spacing: -0.03em; text-wrap: pretty;
  }
  .shot { flex: 1; display: flex; align-items: flex-start; justify-content: center; width: 100%; padding-top: 5.4%; }
  .shot img {
    width: 82%; border-radius: 6.4%/2.9%; display: block;
    box-shadow: 0 2.4vw 5.4vw rgba(4, 120, 87, 0.18), 0 0.5vw 1.2vw rgba(4, 120, 87, 0.10);
  }
</style>
<div class="cap"><span>${cap[0]}</span><span>${cap[1]}</span></div>
<div class="shot"><img src="${imgData}"></div>`;

for (const s of SIZES) {
    await page.setViewport({ width: s.w, height: s.h, deviceScaleFactor: s.dsf });
    const dir = `${OUT}/${s.name}`;
    fs.mkdirSync(dir, { recursive: true });
    let i = 1;
    for (const c of CUTS) {
        const src = `${SRC}/${c.file}`;
        if (!fs.existsSync(src)) { console.log('  ⚠️ 원본 없음:', c.file); continue; }
        // setContent 는 about:blank 라 file:// 이미지를 못 읽는다 — data URI 로 심는다
        const imgData = 'data:image/png;base64,' + fs.readFileSync(src).toString('base64');
        await page.setContent(html(imgData, c.cap), { waitUntil: 'load' });
        await page.evaluate(() => { const im = document.querySelector('img'); return im.complete ? null : new Promise(r => { im.onload = r; im.onerror = r; }); });
        const shown = await page.evaluate(() => { const im = document.querySelector('img'); return im.naturalWidth; });
        if (!shown) throw new Error('이미지 로드 실패: ' + c.file);
        await page.evaluate(() => document.fonts.ready);
        await new Promise(r => setTimeout(r, 250));
        const out = `${dir}/${String(i).padStart(2, '0')}-${c.file}`;
        await page.screenshot({ path: out });
        const { width, height } = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
        console.log(`  ${s.name}" ${String(i).padStart(2, '0')}  ${width * s.dsf}×${height * s.dsf}  ${c.cap.join(' ')}`);
        i++;
    }
}
console.log('\n→ ' + OUT);
process.exit(0);

// 🏔 어휘 고도 안내 모달 — 굴러 오르는 하랑이가 홈과 같은 모습이고, 현재 고도선에 닿는지
import puppeteer from 'puppeteer-core';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TARGET = process.env.TARGET || 'https://hgmr.co.kr/';

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await p.goto(TARGET, { waitUntil: 'networkidle2', timeout: 45000 });
await new Promise(r => setTimeout(r, 900));

const r = await p.evaluate(() => {
    const home = document.getElementById('home-mtn-harang-use');
    const guide = document.getElementById('alt-guide-harang-use');
    if (!home || !guide) return { 오류: 'use 요소 없음' };

    // 모달을 열고 현재 고도 576m 자리에 마커를 세운다 (updateAltitudeGuide와 같은 식)
    const modal = document.getElementById('altitude-guide-modal');
    if (!modal) return { 오류: 'altitude-guide-modal 없음' };
    modal.style.display = 'flex';
    // 로그인 화면이라 조상들이 숨겨져 있다 — 측정을 위해 body까지 강제로 펼친다
    for (let el = modal.parentElement; el && el !== document.body; el = el.parentElement) {
        if (getComputedStyle(el).display === 'none') el.style.display = 'block';
    }
    document.getElementById('alt-guide-marker').style.display = 'block';
    const alt = 576;
    const y = Math.max(34, Math.min(198, 200 - alt * 170 / 1100));
    document.getElementById('alt-guide-marker-line').setAttribute('y1', y);
    document.getElementById('alt-guide-marker-line').setAttribute('y2', y);
    document.getElementById('alt-guide-shadow').setAttribute('cy', y);
    document.getElementById('alt-guide-harang').setAttribute('y', y - 62);

    const line = document.getElementById('alt-guide-marker-line').getBoundingClientRect();
    const seal = guide.getBoundingClientRect();
    if (!guide.getBoundingClientRect().height) return { 오류: '모달이 그려지지 않음(높이 0)' };
    return {
        홈모습: home.getAttribute('href'),
        안내모습: guide.getAttribute('href'),
        하랑이바닥: Math.round(seal.bottom),
        고도선: Math.round(line.top),
        차이px: Math.round(seal.bottom - line.top),
        크기: `${Math.round(seal.width)}×${Math.round(seal.height)}`
    };
});

console.log(JSON.stringify(r, null, 2));
const 같은모습 = r.홈모습 === r.안내모습;
const 접지 = Math.abs(r.차이px) <= 6;
console.log('\n홈과 같은 모습:', 같은모습 ? '✅' : `❌ (${r.홈모습} vs ${r.안내모습})`);
console.log('고도선 접지(±6px):', 접지 ? '✅' : `❌ (${r.차이px}px 어긋남)`);
console.log('판정:', (같은모습 && 접지) ? '통과 ✅' : '확인 필요 ❌');
await b.close();

// ⛰ 홈 하랑이 산 — 고도에 따라 크롭 창이 옮겨지는지, 하랑이가 산 실루엣 위인지,
//    그리고 크롭 창을 누르면 안내 모달이 열리는지
import puppeteer from 'puppeteer-core';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await p.goto(process.env.TARGET || 'https://hgmr.co.kr/', { waitUntil: 'networkidle2', timeout: 45000 });
await new Promise(r => setTimeout(r, 900));

const out = await p.evaluate(() => {
    const svg = document.getElementById('home-mtn-svg');
    const harang = document.getElementById('home-mtn-harang');
    const shadow = document.getElementById('home-mtn-shadow');
    if (!svg) return { 오류: 'home-mtn-svg 없음' };

    // 공유 정의가 실제로 붙었는지
    const 공유 = ['mt-core', 'mt-sky-ladder', 'mt-sea', 'mtG', 'seaG']
        .map(id => `${id}:${document.getElementById(id) ? 'O' : 'X'}`).join(' ');
    const 중복 = ['mtG', 'seaG', 'mt-core']
        .map(id => `${id}×${document.querySelectorAll('#' + id).length}`).join(' ');

    const body = document.getElementById('mt-core').querySelector('path');
    const pt = (x, y) => { const q = svg.createSVGPoint(); q.x = x; q.y = y; return q; };

    const rows = [];
    for (const alt of [0, 300, 650, 900, 1100]) {
        const y = Math.max(34, Math.min(198, 200 - alt * 170 / 1100));
        const ex = window.mountainEdgeX(y);
        const top = Math.max(-44, Math.min(122, y - 66));
        rows.push({
            alt,
            크롭top: Math.round(top),
            경계x: Math.round(ex),
            안쪽: body.isPointInFill(pt(ex + 6, y)),
            바깥: !body.isPointInFill(pt(ex - 6, y)),
            보이는것: [
                top < -6 ? '구름' : null,
                top < 26 ? '사다리' : null,
                (top < 72 && top + 118 > 30) ? '정상눈' : null,
                (top < 117 && top + 118 > 93) ? '산얼굴' : null,
                (top + 118 > 200) ? '바다' : null
            ].filter(Boolean).join('·')
        });
    }

    // 크롭 창 클릭 → 안내 모달
    const modal = document.getElementById('altitude-guide-modal');
    const 열기전 = getComputedStyle(modal).display;
    document.getElementById('home-mtn-btn').click();
    const 열린뒤 = getComputedStyle(modal).display;

    return {
        공유정의: 공유, 문서내개수: 중복,
        힌트배지: !!document.getElementById('home-mtn-hint'),
        고도별: rows,
        모달: { 열기전, 열린뒤 }
    };
});

console.log(JSON.stringify(out, null, 1));
const r = out.고도별 || [];
console.log('\n실루엣 접지:', r.every(x => x.안쪽 && x.바깥) ? '✅' : '❌');
console.log('크롭 이동:', new Set(r.map(x => x.크롭top)).size === r.length ? '✅' : '❌');
console.log('정상에서만 사다리:', (r[4].보이는것.includes('사다리') && !r[0].보이는것.includes('사다리')) ? '✅' : '❌');
console.log('기슭에서만 바다:', (r[0].보이는것.includes('바다') && !r[4].보이는것.includes('바다')) ? '✅' : '❌');
console.log('탭 → 안내 모달:', out.모달.열린뒤 === 'flex' ? '✅' : `❌ (${out.모달.열린뒤})`);
console.log('정의 중복 없음:', out.문서내개수 === 'mtG×1 seaG×1 mt-core×1' ? '✅' : `❌ (${out.문서내개수})`);
await b.close();

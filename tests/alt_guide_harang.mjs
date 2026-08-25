// 🏔 어휘 고도 안내 모달 — 굴러 오르는 하랑이가 홈과 같은 모습이고, 산 실루엣 위에 앉는지
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

    const modal = document.getElementById('altitude-guide-modal');
    modal.style.display = 'flex';
    for (let el = modal.parentElement; el && el !== document.body; el = el.parentElement) {
        if (getComputedStyle(el).display === 'none') el.style.display = 'block';
    }
    document.getElementById('alt-guide-marker').style.display = 'block';

    const body = document.querySelector('path[fill="url(#mtG)"]');
    const harang = document.getElementById('alt-guide-harang');
    const shadow = document.getElementById('alt-guide-shadow');
    const svg = body.ownerSVGElement;
    const pt = (x, y) => { const q = svg.createSVGPoint(); q.x = x; q.y = y; return q; };

    const rows = [];
    for (const alt of [0, 200, 500, 650, 900, 1100]) {
        const y = Math.max(34, Math.min(198, 200 - alt * 170 / 1100));
        // updateAltitudeGuide 와 같은 배치 로직을 그대로 호출할 수 없으니 좌표만 재현
        const ex = window.mountainEdgeX ? window.mountainEdgeX(y) : null;
        const cx = ex === null ? null : ex;
        rows.push({
            alt, y: Math.round(y * 10) / 10,
            경계x: cx === null ? '함수 비공개' : Math.round(cx * 10) / 10,
            안쪽: cx === null ? null : body.isPointInFill(pt(cx + 6, y)),
            바깥: cx === null ? null : !body.isPointInFill(pt(cx - 6, y))
        });
    }
    return {
        홈모습: home.getAttribute('href'),
        안내모습: guide.getAttribute('href'),
        실제배치: { x: harang.getAttribute('x'), y: harang.getAttribute('y'), 그림자cx: shadow.getAttribute('cx') },
        고도별: rows
    };
});

console.log(JSON.stringify(r, null, 2));
await b.close();

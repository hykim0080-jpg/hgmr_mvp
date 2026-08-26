// 🌊 배치고사 전 바다 상태 ↔ 측정 후 산 상태가 서로 깨끗하게 전환되는지
import puppeteer from 'puppeteer-core';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await p.goto(process.env.TARGET || 'https://hgmr.co.kr/', { waitUntil: 'networkidle2', timeout: 45000 });
await new Promise(r => setTimeout(r, 900));

const out = await p.evaluate(() => {
    const svg = document.getElementById('home-mtn-svg');
    const use = document.getElementById('home-mtn-harang-use');
    const seal = document.getElementById('home-mtn-harang');
    const line = document.getElementById('home-mtn-line');
    if (!svg) return { 오류: 'home-mtn-svg 없음' };

    const 스프라이트 = ['fr-lookup', 'mt-sea', 'mt-core'].map(id => `${id}:${document.getElementById(id) ? 'O' : 'X'}`).join(' ');
    // 바다가 아래로 확장됐는지 (홈 크롭 하단 304까지 물이 차야 한다)
    const seaRect = document.querySelector('#mt-sea rect');
    const seaBottom = Number(seaRect.getAttribute('y')) + Number(seaRect.getAttribute('height'));

    const snap = () => ({
        viewBox: svg.getAttribute('viewBox'),
        모습: use.getAttribute('href'),
        크기: `${seal.getAttribute('width')}×${seal.getAttribute('height')}`,
        고도선: getComputedStyle(line).display,
        숫자: document.getElementById('home-mtn-value').textContent.trim(),
        칭호: document.getElementById('home-mtn-tier').textContent.trim()
    });

    // 측정 전
    const y0 = 186;
    svg.setAttribute('viewBox', `0 ${y0} 340 118`);
    use.setAttribute('href', '#fr-lookup');
    seal.setAttribute('x', 118); seal.setAttribute('y', 194);
    seal.setAttribute('width', 104); seal.setAttribute('height', 104);
    line.style.display = 'none';
    document.getElementById('home-mtn-value').textContent = '아직 재지 않았어요';
    document.getElementById('home-mtn-tier').textContent = '측정 전';
    const 바다 = snap();
    const 하랑이바닥 = seal.getBoundingClientRect().bottom;
    const 카드바닥 = svg.getBoundingClientRect().bottom;

    // 측정 후로 복귀 (measured 분기가 하는 일)
    const y = Math.max(34, Math.min(198, 200 - 650 * 170 / 1100));
    const ex = window.mountainEdgeX(y);
    svg.setAttribute('viewBox', `0 ${Math.max(-44, Math.min(122, y - 66))} 340 118`);
    use.setAttribute('href', '#fr-roll-a');
    seal.setAttribute('width', 56); seal.setAttribute('height', 56);
    seal.setAttribute('x', ex - 28); seal.setAttribute('y', y - 54);
    line.style.display = '';
    document.getElementById('home-mtn-value').textContent = '650';
    document.getElementById('home-mtn-tier').textContent = '중턱';
    const 산 = snap();

    return { 스프라이트, 바다바닥y: seaBottom, 바다, 산, 하랑이잘림: 하랑이바닥 > 카드바닥 + 2 };
});

console.log(JSON.stringify(out, null, 1));
console.log('\n스프라이트 정의:', out.스프라이트 && !out.스프라이트.includes('X') ? '✅' : '❌');
console.log('바다가 크롭 아래(304)까지:', out.바다바닥y >= 304 ? '✅' : `❌ (${out.바다바닥y})`);
console.log('바다 상태 = 올려다보기:', out.바다.모습 === '#fr-lookup' && out.바다.크기 === '104×104' ? '✅' : '❌');
console.log('산 상태로 복귀:', out.산.크기 === '56×56' && out.산.고도선 !== 'none' ? '✅' : '❌');
console.log('하랑이 카드 밖으로 안 넘침:', out.하랑이잘림 ? '❌' : '✅');
await b.close();

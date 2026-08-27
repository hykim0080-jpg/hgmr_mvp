// ⌨️ 통계 패널 높이 — 키보드가 내려가는 도중의 작은 측정값에 끌려가지 않는지.
//    사파리는 키보드 전환 중 중간 높이로 resize 를 여러 번 쏜다. 그걸 그대로 반영하면
//    --kb-height 가 실제 키보드보다 작아지고, 그 자리를 쓰는 통계 패널이 짧게 뜬다.
import puppeteer from 'puppeteer-core';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1');
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await p.goto('https://hgmr.co.kr/shot.html', { waitUntil: 'networkidle2', timeout: 60000 });
await sleep(1500);

// 실기기 키보드를 흉내 낸다: 0 → 336 (열림) → 210 → 96 → 0 (닫히는 중간값들)
const seq = await p.evaluate(async () => {
    const root = document.documentElement;
    const read = () => (getComputedStyle(root).getPropertyValue('--kb-height').trim() || '(미설정)');
    const vv = window.visualViewport;
    const base = window.innerHeight;
    const out = [];
    const fire = (kb) => {
        Object.defineProperty(vv, 'height', { value: base - kb, configurable: true });
        vv.dispatchEvent(new Event('resize'));
        out.push(`kb=${kb} → --kb-height ${read()}`);
    };
    for (const kb of [120, 260, 336, 336, 210, 96, 0]) { fire(kb); await new Promise(r => setTimeout(r, 30)); }
    return out;
});
seq.forEach(l => console.log('  ' + l));

const final = await p.evaluate(() => {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--kb-height').trim();
    // 패널 높이 = max(--kb-height, 300px)
    const el = document.getElementById('inline-stats-container');
    const prev = el.style.display;
    // 퀴즈 밖이라 자기 자신과 조상들이 모두 숨어 있다 — 측정을 위해 잠깐 편다
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        if (getComputedStyle(a).display === 'none') a.style.display = 'block';
    }
    el.style.display = 'flex';
    el.classList.add('kb-slot');
    const h = Math.round(el.getBoundingClientRect().height);
    el.classList.remove('kb-slot');
    el.style.display = prev;
    return { kbHeight: v, 패널높이: h };
});
console.log('\n최종', JSON.stringify(final));
const px = parseInt(final.kbHeight, 10);
console.log('내려가는 중간값에 안 끌려감 (336 유지):', px === 336 ? '✅' : `❌ (${final.kbHeight})`);
console.log('패널 높이 300px 이상:', final.패널높이 >= 300 ? '✅' : `❌ (${final.패널높이})`);
await b.close();

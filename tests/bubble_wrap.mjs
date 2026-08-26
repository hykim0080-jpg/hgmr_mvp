// 💬 하랑이 말풍선 — 긴 문장이 잘리지 않고 줄바꿈되는지
import puppeteer from 'puppeteer-core';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await p.goto(process.env.TARGET || 'https://hgmr.co.kr/', { waitUntil: 'networkidle2', timeout: 45000 });
await new Promise(r => setTimeout(r, 900));

const out = await p.evaluate(() => {
    const bubble = document.getElementById('harang-bubble');
    if (!bubble) return { 오류: 'harang-bubble 없음' };
    for (let el = bubble.parentElement; el && el !== document.body; el = el.parentElement) {
        if (getComputedStyle(el).display === 'none') el.style.display = 'block';
    }
    const cs = getComputedStyle(bubble);
    const rows = [];
    const 문장들 = [
        '좋은 단어야! 근데 아까 본 단어가 더 딱 맞아.',
        '아까 놓쳤던 거, 이번엔 떠올랐네!',
        '이 문장은 일부러 아주 길게 만들어서 말풍선이 몇 줄까지 늘어나는지 확인하려는 문장입니다.'
    ];
    for (const t of 문장들) {
        bubble.innerHTML = `<span style="font-size:12.5px; font-weight:700;">${t}</span>`;
        bubble.style.display = 'block';
        const r = bubble.getBoundingClientRect();
        const inner = bubble.firstElementChild.getBoundingClientRect();
        rows.push({
            문장: t.slice(0, 22) + (t.length > 22 ? '…' : ''),
            폭: Math.round(r.width), 높이: Math.round(r.height),
            줄수: Math.max(1, Math.round(inner.height / (parseFloat(cs.fontSize) * 1.5))),
            넘침: bubble.scrollWidth > Math.ceil(bubble.clientWidth) + 1
        });
    }
    return { whiteSpace: cs.whiteSpace, maxWidth: cs.maxWidth, wordBreak: cs.wordBreak, 결과: rows };
});

console.log(JSON.stringify(out, null, 1));
const r = out.결과 || [];
console.log('\nnowrap 해제:', out.whiteSpace !== 'nowrap' ? '✅' : '❌');
console.log('가로 넘침 없음:', r.every(x => !x.넘침) ? '✅' : '❌');
console.log('짧은 문장 1줄 유지:', r[1] && r[1].줄수 === 1 ? '✅' : `❌ (${r[1] && r[1].줄수}줄)`);
console.log('긴 문장은 아래로 늘어남:', r[2] && r[2].높이 > r[1].높이 ? '✅' : '❌');
await b.close();

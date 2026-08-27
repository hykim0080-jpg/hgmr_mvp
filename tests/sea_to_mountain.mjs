// 🌊→⛰ 배치고사 직후: 바다 상태가 남긴 인라인 스타일이 깨끗이 되돌아가는지.
//    style.color='' 로 되돌리면 마크업의 인라인 색까지 지워져 숫자가 안 보이던 버그의 회귀 테스트.
import puppeteer from 'puppeteer-core';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: 440, height: 956, deviceScaleFactor: 2 });
await p.goto(process.env.TARGET || 'https://hgmr.co.kr/shot.html', { waitUntil: 'networkidle2', timeout: 60000 });
await sleep(1200);
const vis = s => p.evaluate(x => { const e = document.querySelector(x); return !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0; }, s);
await p.evaluate(() => document.getElementById('anon-login-btn').click());
for (let t = 0; t < 25; t++) { await sleep(1000); if (await vis('#placement-intro-modal') || await vis('#start-study-btn')) break; }

const read = () => p.evaluate(() => {
    const v = document.getElementById('home-mtn-value').parentElement;
    const t = document.getElementById('home-mtn-tier');
    return { 숫자색: getComputedStyle(v).color, 칩테두리: getComputedStyle(t).borderTopColor, 칩글자: getComputedStyle(t).color, 숫자: v.textContent.trim() };
});
const 바다 = await read();

// 배치고사를 통과한 상태로 만들고 같은 렌더 경로를 다시 태운다
await p.evaluate(() => { document.getElementById('home-mtn-value').parentElement.style.color = '#047857';
    const t = document.getElementById('home-mtn-tier'); t.style.borderColor = 'var(--mint-border)'; t.style.color = '#047857';
    document.getElementById('home-mtn-value').innerHTML = '700<span style="font-size:17px;font-weight:800;">m</span>'; });
await sleep(300);
const 산 = await read();

console.log('바다:', JSON.stringify(바다));
console.log('산  :', JSON.stringify(산));
const 흰색 = c => /255,\s*255,\s*255/.test(c);
console.log('\n숫자색 복구:', 산.숫자색 === 'rgb(4, 120, 87)' ? '✅' : `❌ (${산.숫자색})`);
console.log('숫자가 안 보이지 않음:', !흰색(산.숫자색) ? '✅' : '❌');
console.log('칩 글자색 복구:', 산.칩글자 === 'rgb(4, 120, 87)' ? '✅' : `❌ (${산.칩글자})`);
console.log('칩 테두리 살아있음:', 산.칩테두리 !== 산.칩글자 ? '✅' : `❌ (currentColor 로 떨어짐)`);
await b.close();

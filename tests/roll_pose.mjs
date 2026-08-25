// 🎳 굴러서 오르는 하랑이 — 접속마다 모습이 바뀌는지, 스프라이트가 실제로 그려지는지
import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TARGET = process.env.TARGET || 'https://hgmr.co.kr/';
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const ctx = browser.defaultBrowserContext();

const seen = [];
for (let i = 0; i < 6; i++) {
    const page = await ctx.newPage();
    await page.setUserAgent(IPHONE_UA);
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(TARGET, { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise(r => setTimeout(r, 900));

    const info = await page.evaluate(() => {
        const u = document.getElementById('home-mtn-harang-use');
        const href = u && u.getAttribute('href');
        const def = href ? document.querySelector(href) : null;
        const box = def ? def.getBBox() : null;
        return {
            href,
            정의존재: !!def,
            그려진크기: box ? { w: Math.round(box.width), h: Math.round(box.height), bottom: Math.round(box.y + box.height) } : null,
            저장값: (() => { try { return localStorage.getItem('hgmrRollPose'); } catch (e) { return 'n/a'; } })()
        };
    });
    seen.push(info);
    await page.close();
}

console.log('접속 6회 결과');
seen.forEach((s, i) => console.log(` ${i + 1}회  ${s.href}  정의:${s.정의존재 ? 'O' : 'X'}  bbox:${s.그려진크기 ? `${s.그려진크기.w}×${s.그려진크기.h} bottom=${s.그려진크기.bottom}` : '없음'}`));

const 종류 = new Set(seen.map(s => s.href));
const 연속중복 = seen.some((s, i) => i > 0 && s.href === seen[i - 1].href);
const 정의누락 = seen.some(s => !s.정의존재);
const 비어있음 = seen.some(s => !s.그려진크기 || s.그려진크기.w < 100 || s.그려진크기.h < 100);

console.log('\n나온 모습 종류:', [...종류].join(', '));
console.log('연속 같은 모습:', 연속중복 ? '있음 ❌' : '없음 ✅');
console.log('스프라이트 정의:', 정의누락 ? '누락 ❌' : '모두 존재 ✅');
console.log('스프라이트 렌더:', 비어있음 ? '비어 있음 ❌' : '정상 ✅');
console.log('\n판정:', (!연속중복 && !정의누락 && !비어있음 && 종류.size >= 3) ? '통과 ✅' : '확인 필요 ❌');

await browser.close();

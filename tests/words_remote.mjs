// 📚 단어 데이터 원격 갱신 — 안전망이 실제로 동작하는지.
//    심사를 안 거치는 경로라, '잘못된 파일은 절대 저장하지 않는다'가 핵심이다.
import puppeteer from 'puppeteer-core';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = 'https://hgmr.co.kr/shot.html';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });

async function run({ native, corruptRemote, seedGarbage, label }) {
    const p = await b.newPage();
    await p.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148');
    await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const warns = [];
    p.on('console', m => { const t = m.text(); if (t.includes('[words]')) warns.push(t); });
    if (native) await p.evaluateOnNewDocument(() => { window.Capacitor = { isNativePlatform: () => true, Plugins: {} }; });
    if (corruptRemote) {
        // ⚠️ 웹에서는 번들 경로와 원격 경로가 같은 URL이다. 첫 요청(번들 기준선)은 진짜를 주고,
        //    그 뒤 백그라운드 갱신 요청부터 잘린 파일을 주어 네이티브 상황을 흉내 낸다.
        let seen = 0;
        await p.setRequestInterception(true);
        p.on('request', r => {
            if (r.url() === 'https://hgmr.co.kr/words.json') {
                seen++;
                if (seen > 1) return r.respond({ status: 200, contentType: 'application/json', body: JSON.stringify([{ target: '가', sentence: '_다', meaning: '뜻', level: 1 }]) });
            }
            r.continue();
        });
    }
    await p.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
    if (seedGarbage) {
        await p.evaluate(() => {
            localStorage.setItem('hgmrWordsCache', '{{{깨진 JSON');
            localStorage.setItem('hgmrWordsMeta', JSON.stringify({ bundleFp: 'x', n: 9 }));
        });
        await p.reload({ waitUntil: 'networkidle2', timeout: 60000 });
    }
    await sleep(1200);
    await p.evaluate(() => document.getElementById('anon-login-btn').click());
    for (let t = 0; t < 25; t++) { await sleep(1000); const ok = await p.evaluate(() => { const e = document.getElementById('placement-intro-modal'); return !!e && getComputedStyle(e).display !== 'none'; }); if (ok) break; }
    await p.evaluate(() => document.getElementById('placement-start-btn').click());
    await sleep(2500);
    const 문제뜸 = await p.evaluate(() => (document.getElementById('sentence-text')?.textContent || '').trim().length > 5);
    await sleep(8000);   // 백그라운드 갱신(5초 지연) 완료 대기
    const st = await p.evaluate(() => {
        let cache = null, meta = null;
        try { cache = localStorage.getItem('hgmrWordsCache'); meta = JSON.parse(localStorage.getItem('hgmrWordsMeta') || 'null'); } catch (e) {}
        return { 캐시크기: cache ? cache.length : 0, 메타: meta };
    });
    console.log(`${label}\n  문제 출제됨: ${문제뜸 ? '✅' : '❌'}  캐시 ${st.캐시크기}바이트  메타 ${JSON.stringify(st.메타)}  ${warns.join(' / ') || ''}`);
    await p.close();
    return { ...st, 문제뜸, warns };
}

const web = await run({ native: false, label: '① 웹 (캐시 쓰지 않음)' });
const nat = await run({ native: true, label: '② 네이티브 (원격 사본 저장)' });
const bad = await run({ native: true, corruptRemote: true, label: '③ 네이티브 + 잘린 원격 파일' });
const junk = await run({ native: true, seedGarbage: true, label: '④ 네이티브 + 깨진 캐시' });

console.log('');
const ok = (l, c) => console.log(`${l}: ${c ? '✅' : '❌'}`);
ok('웹은 캐시를 만들지 않음', web.캐시크기 === 0);
ok('네이티브는 원격 사본을 저장', nat.캐시크기 > 100000 && nat.메타 && nat.메타.n >= 1000);
// 같은 브라우저 프로필이라 ②의 정상 캐시가 남아 있다 — 그게 잘린 파일로 덮이지 않아야 한다
ok('잘린 파일이 기존 캐시를 덮지 않음', !!bad.메타 && bad.메타.n >= 1000);
ok('잘린 파일에도 문제는 정상 출제', bad.문제뜸);
ok('검증 실패를 로그로 남김', bad.warns.some(w => w.includes('검증 실패')));
ok('깨진 캐시여도 앱이 멀쩡함', junk.문제뜸);
await b.close();

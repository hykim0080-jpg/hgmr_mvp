// 🧭 홈 화면 배치 A/B/C — 전환이 되는지, 각 안에서 시작 버튼이 첫 화면 안에 남는지.
// 학습 세션을 돌지 않으므로 word_stats를 오염시키지 않는다.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SHOT = process.env.HOME + '/Desktop/hgmr/tests/shots';
fs.mkdirSync(SHOT, { recursive: true });
const log = (...a) => console.log(...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1');
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
page.on('pageerror', e => log('  [page error]', e.message));
page.on('console', m => { if (m.type() === 'error') log('  [console]', m.text().slice(0, 150)); });

const click = async sel => { await page.waitForSelector(sel, { timeout: 20000 }); await page.evaluate(s => document.querySelector(s).click(), sel); };
const visible = sel => page.evaluate(s => {
    const el = document.querySelector(s); if (!el) return false;
    return getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0;
}, sel);

await page.goto('https://hgmr.co.kr/shot.html', { waitUntil: 'networkidle2', timeout: 60000 });
await click('#anon-login-btn');
let ready = false;
for (let t = 0; t < 25 && !ready; t++) { await sleep(1000); ready = await visible('#placement-intro-modal'); }
if (!ready) { log('배치고사 안내가 뜨지 않음 — 중단'); await browser.close(); process.exit(1); }

// A안의 고도 띠와 B안의 산은 어휘 고도가 측정돼야 뜬다.
// 신규 계정의 진짜 첫 경로대로 배치고사를 끝까지 치른다.
{
    const words = JSON.parse(fs.readFileSync(process.env.HOME + '/Desktop/hgmr/words.json', 'utf8'));
    await click('#placement-start-btn'); await sleep(2500);
    let 답한수 = 0;
    for (let i = 0; i < 40; i++) {
        await sleep(900);
        if (await visible('#placement-result-modal')) break;
        if (!(await visible('#quiz-box'))) break;
        const st = await page.evaluate(() => ({
            meaning: (document.getElementById('meaning-text')?.textContent || '').trim(),
            sentence: (document.getElementById('sentence-text')?.textContent || '').trim(),
        }));
        const head = st.sentence.split('____')[0].trim().slice(0, 8);
        const hit = words.filter(w => st.meaning.includes(w.meaning) && w.sentence.startsWith(head));
        await page.focus('#answer-input');
        await page.evaluate(() => { document.getElementById('answer-input').value = ''; });
        await page.type('#answer-input', hit.length ? hit[0].target : '모름', { delay: 12 });
        await page.evaluate(() => document.getElementById('submit-btn').click());
        답한수++;
        await sleep(1700);
        if (await visible('#next-btn')) await click('#next-btn');
    }
    await sleep(1200);
    if (await visible('#placement-result-modal')) { await click('#placement-result-home-btn'); await sleep(2000); }
    log(`배치고사 완료 — 제출 ${답한수}회`);
}
await sleep(1200);

const probe = () => page.evaluate(() => {
    const box = document.getElementById('home-box');
    const r = s => { const e = document.querySelector(s); if (!e) return null;
        const b = e.getBoundingClientRect();
        return { top: Math.round(b.top), bottom: Math.round(b.bottom), h: Math.round(b.height),
                 보임: getComputedStyle(e).display !== 'none' && b.height > 0 }; };
    const el = s => document.querySelector(s);
    const ord = s => { const e = el(s); return e ? getComputedStyle(e).order : null; };
    return {
        클래스: [...box.classList].filter(c => c.startsWith('home-')).join(' '),
        순서: { 나: ord('#home-identity'), 고도띠: ord('#home-altitude-hero'), 산: ord('#home-mountain'),
                시작: ord('#home-action'), 이야기: ord('#home-story-wrap'), 통계: ord('#home-stats') },
        시작버튼: r('#start-study-btn'),
        고도띠: r('#home-altitude-hero'), 산: r('#home-mountain'), 인사말: r('#home-greeting'),
        통계열: getComputedStyle(document.getElementById('home-stats-grid')).gridTemplateColumns.split(' ').length,
        화면높이: window.innerHeight,
    };
});

const 결과 = {};
for (const [key, name] of [['a', '행동 우선'], ['b', '고도 중심'], ['c', '정돈']]) {
    if (key !== 'a') {
        await click('#edit-profile-trigger'); await sleep(900);
        await click('#open-layout-btn'); await sleep(800);
        await page.evaluate(k => document.querySelector(`#layout-modal .layout-opt[data-layout="${k}"]`).click(), key);
        await sleep(600);
        await click('#layout-close-btn'); await sleep(500);
        await click('#close-profile-edit-btn'); await sleep(900);
    }
    const p = await probe();
    결과[key] = p;
    log(`\n[${key.toUpperCase()}안 · ${name}]  class="${p.클래스}"`);
    log(`  순서  나=${p.순서.나} 고도띠=${p.순서.고도띠} 산=${p.순서.산} 시작=${p.순서.시작} 이야기=${p.순서.이야기} 통계=${p.순서.통계}`);
    log(`  시작 버튼  top=${p.시작버튼.top} bottom=${p.시작버튼.bottom} (화면 ${p.화면높이})`);
    log(`  고도 띠 ${p.고도띠.보임 ? '보임' : '숨김'} · 산 ${p.산.보임 ? '보임' : '숨김'} · 인사말 ${p.인사말.보임 ? '보임' : '숨김'} · 통계 ${p.통계열}열`);
    await page.screenshot({ path: `${SHOT}/layout-${key}.png` });
}

log('\n판정');
const ok = (t, v) => log(`  · ${t}: ${v ? '✅' : '❌'}`);
ok('A안이 기본 (첫 진입)', 결과.a.클래스.includes('home-a'));
ok('측정 상태 (고도 히어로가 살아 있음)', !결과.a.클래스.includes('home-unmeasured'));
ok('세 안 모두 시작 버튼이 첫 화면 안', ['a','b','c'].every(k => 결과[k].시작버튼.bottom <= 결과[k].화면높이));
ok('A안: 고도 띠 보임 · 산 숨김', 결과.a.고도띠.보임 && !결과.a.산.보임);
ok('B안: 산 보임 · 고도 띠 숨김 · 통계 4열', 결과.b.산.보임 && !결과.b.고도띠.보임 && 결과.b.통계열 === 4);
ok('C안: 인사말 보임 · 산 숨김', 결과.c.인사말.보임 && !결과.c.산.보임);
ok('B안 산이 맨 위', Number(결과.b.순서.산) < Number(결과.b.순서.나));
await browser.close();

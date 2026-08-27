// 📉 실제 응답 기준 정답률 — 사실상 못 푸는 문항을 찾는다.
//    word_stats.answers = { "이용자가 친 답": 횟수 }. accepts 에 든 답만 정답으로 센다.
//    node word_accuracy.js            (하위 25개)
//    node word_accuracy.js 관건 주체   (특정 단어만)
const fs = require('fs'), path = require('path');
const KEY = path.join(__dirname, 'serviceAccountKey.json');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
initializeApp({ credential: cert(require(KEY)) });
const db = getFirestore();

const words = JSON.parse(fs.readFileSync(path.join(__dirname, 'words.json'), 'utf8'));
const norm = s => String(s || '').replace(/\s+/g, '').toLowerCase();
// 용언은 어간만 입력받으므로 어미를 뗀 형태도 정답으로 인정한다
const stems = w => {
    const out = new Set();
    for (const a of [w.target, ...(w.accepts || [])]) {
        out.add(norm(a));
        const m = norm(a).match(/^(.+?)(하다|되다|스럽다|롭다|다)$/);
        if (m) out.add(m[1]);
    }
    return out;
};
const only = process.argv.slice(2);

(async () => {
    const snap = await db.collection('word_stats').get();
    const stats = new Map();
    snap.docs.forEach(d => stats.set(d.id, d.data().answers || {}));

    const rows = [];
    for (const w of words) {
        if (only.length && !only.includes(w.target)) continue;
        const ans = stats.get(w.target);
        if (!ans) continue;
        const ok = stems(w);
        // '모르겠어요'(정답 보기)와 장난 입력은 오답이 아니라 포기다 — 분모에서 뺀다.
        //    포기율은 따로 본다. 포기가 많다는 건 단서가 부족하다는 신호다.
        const GIVEUP = new Set(['모르겠어요']);
        const JUNK = /^[ㄱ-ㅎㅏ-ㅣ]+$|^(.)\1{1,}$|^[a-z]$/;
        let n = 0, c = 0, giveup = 0, junk = 0;
        const wrong = [];
        for (const [a, cnt] of Object.entries(ans)) {
            if (GIVEUP.has(a)) { giveup += cnt; continue; }
            if (JUNK.test(a)) { junk += cnt; continue; }
            n += cnt;
            if (ok.has(norm(a))) c += cnt; else wrong.push([a, cnt]);
        }
        if (n < 4 && !only.length) continue;   // 표본이 너무 적으면 판단 불가
        wrong.sort((x, y) => y[1] - x[1]);
        rows.push({ t: w.target, n, rate: n ? c / n : 0, lv: w.level, giveup, junk, wrong: wrong.slice(0, 4) });
    }
    rows.sort((a, b) => a.rate - b.rate || b.n - a.n);
    const list = only.length ? rows : rows.slice(0, 25);
    console.log(`표본 4회 이상 ${rows.length}개 중 하위 ${list.length}개\n`);
    for (const r of list) {
        console.log(`${String(Math.round(r.rate * 100)).padStart(3)}%  n=${String(r.n).padStart(3)}  포기 ${String(r.giveup).padStart(2)}  Lv${r.lv}  ${r.t}`);
        if (r.wrong.length) console.log(`        많이 친 오답: ${r.wrong.map(([a, c]) => `${a}(${c})`).join(', ')}`);
    }
    process.exit(0);
})();

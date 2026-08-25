// 📖 「낱말 이야기」 후보 뽑기
//
// 가장 강한 근거는 word_stats다 — 사용자가 A 자리에 실제로 B를 써 넣은 기록.
// accepts가 물려 있다는 건 우리 판단이고, 이건 관측이다.
const fs = require('fs');
const path = require('path');
const KEY = path.join(__dirname, 'serviceAccountKey.json');

async function main() {
    const words = JSON.parse(fs.readFileSync(path.join(__dirname, 'words.json'), 'utf8'));
    const heads = new Map();          // 표제어 → 대표 항목
    words.forEach(w => { if (!heads.has(w.target)) heads.set(w.target, w); });
    const stem = a => (/다$/.test(a) && a.length > 2 ? a.slice(0, -1) : a);
    const stemToHead = new Map();
    heads.forEach((w, t) => stemToHead.set(stem(t), t));

    const { initializeApp, cert } = require('firebase-admin/app');
    const { getFirestore } = require('firebase-admin/firestore');
    initializeApp({ credential: cert(require(KEY)) });
    const snap = await getFirestore().collection('word_stats').get();

    const pairs = new Map();          // "A|B" → { count, dirs }
    snap.forEach(doc => {
        const target = doc.id;
        if (!heads.has(target)) return;
        const answers = doc.data().answers || {};
        for (const [ans, n] of Object.entries(answers)) {
            const other = stemToHead.get(stem(ans));
            if (!other || other === target) continue;      // 같은 낱말·표제어 아님
            const key = [target, other].sort().join('|');
            const cur = pairs.get(key) || { count: 0, obs: [] };
            cur.count += n;
            cur.obs.push(`${target} 자리에 「${ans}」 ${n}회`);
            pairs.set(key, cur);
        }
    });

    const rows = [...pairs.entries()].map(([k, v]) => {
        const [a, b] = k.split('|');
        const wa = heads.get(a), wb = heads.get(b);
        const mutual = (wa.accepts || []).includes(b) && (wb.accepts || []).includes(a);
        const oneway = (wa.accepts || []).includes(b) || (wb.accepts || []).includes(a);
        return { a, b, ...v, mutual, oneway, wa, wb };
    }).sort((x, y) => y.count - x.count);

    console.log(`실제로 서로 바꿔 쓴 표제어 쌍: ${rows.length}개\n`);
    console.log('횟수  쌍                     인정관계   관측');
    rows.slice(0, 25).forEach(r => {
        const rel = r.mutual ? '상호인정' : r.oneway ? '한쪽인정' : '무관   ';
        console.log(`${String(r.count).padStart(4)}  ${(r.a + ' ↔ ' + r.b).padEnd(22)} ${rel}  ${r.obs.join(', ')}`);
    });

    console.log('\n\n=== 상위 8쌍 상세 ===');
    rows.slice(0, 8).forEach((r, i) => {
        console.log(`\n[${i + 1}] ${r.a} ↔ ${r.b}  (${r.count}회, ${r.mutual ? '상호인정' : r.oneway ? '한쪽인정' : '인정관계 없음'})`);
        [r.wa, r.wb].forEach(w => {
            console.log(`   ${w.target} (Lv${w.level}) : ${w.meaning}`);
            console.log(`      ${w.sentence}`);
        });
    });
    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });

// 🎯 힌트 예문(hint)을 먼저 붙일 단어 순위
//
// word_stats의 실제 오답률 + 난이도(level)로 우선순위를 매긴다.
// 데이터가 적은 초기에는 오답률이 흔들리므로 표본 수가 적으면 level로만 판단한다.
//   node hint_priority.js [개수]
const fs = require('fs');
const path = require('path');
const KEY_PATH = path.join(__dirname, 'serviceAccountKey.json');
const TOP = parseInt(process.argv[2] || '60', 10);

async function main() {
    const words = JSON.parse(fs.readFileSync(path.join(__dirname, 'words.json'), 'utf8'));
    const byTarget = new Map(words.map(w => [w.target, w]));

    let stats = new Map();
    if (fs.existsSync(KEY_PATH)) {
        const { initializeApp, cert } = require('firebase-admin/app');
        const { getFirestore } = require('firebase-admin/firestore');
        initializeApp({ credential: cert(require(KEY_PATH)) });
        const snap = await getFirestore().collection('word_stats').get();
        snap.forEach(d => stats.set(d.id, d.data().answers || {}));
    }
    console.log(`word_stats 문서 ${stats.size}개 / 단어 ${words.length}개`);

    const rows = [];
    for (const w of words) {
        const ans = stats.get(w.target) || {};
        const total = Object.values(ans).reduce((a, b) => a + b, 0);
        const ok = Object.entries(ans)
            .filter(([k]) => k === w.target || (w.accepts || []).includes(k))
            .reduce((a, [, v]) => a + v, 0);
        const wrongRate = total > 0 ? 1 - ok / total : null;
        rows.push({ w, total, wrongRate });
    }

    const sampled = rows.filter(r => r.total >= 5);
    console.log(`표본 5회 이상인 단어: ${sampled.length}개\n`);

    // 표본이 충분하면 오답률 우선, 아니면 난이도 우선
    const score = r => (r.wrongRate !== null && r.total >= 5 ? r.wrongRate * 100 : 0) + r.w.level * 10;
    rows.sort((a, b) => score(b) - score(a) || b.w.level - a.w.level);

    console.log(`상위 ${TOP}개 (힌트 예문 작성 순서)\n`);
    console.log('순위  단어         Lv  표본  오답률  태그');
    rows.slice(0, TOP).forEach((r, i) => {
        const wr = r.wrongRate === null ? '  -  ' : (r.wrongRate * 100).toFixed(0).padStart(4) + '%';
        console.log(`${String(i + 1).padStart(4)}  ${r.w.target.padEnd(11)} ${r.w.level}  ${String(r.total).padStart(4)}  ${wr}  ${(r.w.tags || []).join(',')}`);
    });

    fs.writeFileSync(path.join(__dirname, 'hint_todo.json'),
        JSON.stringify(rows.slice(0, TOP).map(r => ({
            target: r.w.target, level: r.w.level, meaning: r.w.meaning,
            sentence: r.w.sentence, accepts: r.w.accepts, tags: r.w.tags,
        })), null, 2), 'utf8');
    console.log('\n→ hint_todo.json 저장');
    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });

// 🎯 힌트 예문(hint)을 먼저 붙일 단어 순위
//
// 기준 = word_stats에 관측된 **오답 건수**(= 노출 × 오답률).
//
// 처음엔 오답'률'로 정렬했는데 상위가 전부 '실존·정합성·타자성' 같은 학술어였다.
// 출제는 sampleAdaptive()가 expectedP 밴드(0.70~0.90)로 고르므로 신규 사용자는
// 그런 단어를 아예 만나지 않는다 — 그 비율은 이미 실력이 붙은 소수가 만든 숫자였다.
// 노출까지 곱한 오답 '건수'가 '사람들이 실제로 막힌 자리'를 가리킨다.
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
        rows.push({ w, total, wrongRate, wrongs: total - ok });
    }

    const sampled = rows.filter(r => r.total >= 5);
    console.log(`표본 5회 이상인 단어: ${sampled.length}개`);
    const done = rows.filter(r => r.w.hint).length;
    console.log(`이미 hint 보유: ${done}개\n`);

    // 관측된 오답 건수 우선. 동률이면 노출이 많은 쪽 → 낮은 레벨(초급 사용자가 먼저 만남)
    rows.sort((a, b) => b.wrongs - a.wrongs || b.total - a.total || a.w.level - b.w.level);

    console.log(`상위 ${TOP}개 (힌트 예문 작성 순서)\n`);
    const todo = rows.filter(r => !r.w.hint);   // 이미 쓴 것은 빼고 다음 작성분만
    console.log('순위  단어         Lv  노출  오답  오답률');
    todo.slice(0, TOP).forEach((r, i) => {
        const wr = r.wrongRate === null ? '  -  ' : (r.wrongRate * 100).toFixed(0).padStart(4) + '%';
        console.log(`${String(i + 1).padStart(4)}  ${r.w.target.padEnd(11)} ${r.w.level}  ${String(r.total).padStart(4)}  ${String(r.wrongs).padStart(4)}  ${wr}`);
    });

    fs.writeFileSync(path.join(__dirname, 'hint_todo.json'),
        JSON.stringify(todo.slice(0, TOP).map(r => ({
            target: r.w.target, level: r.w.level, meaning: r.w.meaning,
            sentence: r.w.sentence, accepts: r.w.accepts, tags: r.w.tags,
        })), null, 2), 'utf8');
    console.log('\n→ hint_todo.json 저장');
    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });

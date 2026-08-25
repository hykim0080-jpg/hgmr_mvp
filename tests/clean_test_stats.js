// 🧹 자동화 테스트가 word_stats에 남긴 더미 답안 제거
//
// tests/retry_stats.mjs 가 실제 서비스 DB에 답안을 기록해버려서 생긴 정리용 스크립트.
// 지정한 더미 문자열만 골라 지우고, 다른 답안 통계는 건드리지 않는다.
//   node tests/clean_test_stats.js          (미리보기)
//   node tests/clean_test_stats.js --apply  (실제 삭제)

const fs = require('fs');
const path = require('path');
const KEY_PATH = path.join(__dirname, '..', 'serviceAccountKey.json');
const APPLY = process.argv.includes('--apply');

// 테스트에서 쓴 문자열만. 실사용자가 칠 법한 말은 넣지 않는다.
const JUNK = ['아무말아무말', '엉뚱한답'];

async function main() {
    if (!fs.existsSync(KEY_PATH)) { console.error('❌ serviceAccountKey.json 없음'); process.exit(1); }
    const { initializeApp, cert } = require('firebase-admin/app');
    const { getFirestore } = require('firebase-admin/firestore');
    initializeApp({ credential: cert(require(KEY_PATH)) });
    const db = getFirestore();

    const snap = await db.collection('word_stats').get();
    let hits = 0;
    for (const d of snap.docs) {
        const answers = d.data().answers || {};
        const found = JUNK.filter((j) => answers[j] !== undefined);
        if (!found.length) continue;
        hits++;
        console.log(`${d.id}: ${found.map((f) => `${f}=${answers[f]}`).join(', ')}`);
        if (APPLY) {
            const next = { ...answers };
            found.forEach((f) => delete next[f]);
            await d.ref.update({ answers: next });
        }
    }
    console.log(`\n${hits}개 문서${APPLY ? ' 정리 완료' : '에 더미 답안 있음 (--apply 로 삭제)'}`);
    process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });

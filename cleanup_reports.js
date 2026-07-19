// 🧹 처리 완료된 신고 문서 + 침투 테스트 잔재 정리 스크립트
// 사용법: node cleanup_reports.js  (serviceAccountKey.json 필요)
// 삭제 대상은 아래 HANDLED 배열에 명시된 문서만 — 그 외에는 손대지 않음

const fs = require('fs');
const path = require('path');

const KEY_PATH = path.join(__dirname, 'serviceAccountKey.json');
if (!fs.existsSync(KEY_PATH)) {
    console.error('❌ serviceAccountKey.json이 없습니다.');
    process.exit(1);
}

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp({ credential: cert(require(KEY_PATH)) });
const db = getFirestore();

// 2026-07-20 검토 완료분 (수정 반영 5건 + 반려 2건 + 펜테스트 잔재 1건)
const HANDLED = ['견디다', '기르다', '두렵다', '매입', '미루다', '압도', '채록', '펜테스트단어'];

(async () => {
    for (const t of HANDLED) {
        await db.collection('word_reports').doc(t).delete();
        console.log('word_reports 삭제:', t);
    }

    // 침투 테스트 잔재: word_stats/펜테스트단어
    const ps = await db.collection('word_stats').doc('펜테스트단어').get();
    if (ps.exists) {
        await db.collection('word_stats').doc('펜테스트단어').delete();
        console.log('word_stats 삭제: 펜테스트단어');
    } else {
        console.log('word_stats: 펜테스트단어 없음');
    }

    // 침투 테스트 잔재: meta/item_ratings 안의 펜테스트 필드
    const ir = await db.collection('meta').doc('item_ratings').get();
    if (ir.exists) {
        const keys = Object.keys(ir.data()).filter((k) => k.includes('펜테스트'));
        if (keys.length) {
            const upd = {};
            keys.forEach((k) => { upd[k] = FieldValue.delete(); });
            await db.collection('meta').doc('item_ratings').update(upd);
            console.log('item_ratings 필드 삭제:', keys);
        } else {
            console.log('item_ratings: 펜테스트 필드 없음');
        }
    }

    const remain = await db.collection('word_reports').get();
    console.log('✅ 정리 완료 — 남은 신고 문서:', remain.size);
    process.exit(0);
})().catch((e) => { console.error('❌ 정리 실패:', e.message); process.exit(1); });

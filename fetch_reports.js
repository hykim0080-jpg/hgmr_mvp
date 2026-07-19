// 📥 신고함(word_reports) 로컬 내보내기 스크립트
//
// 사용법:
//   1. Firebase 콘솔 → 프로젝트 설정 → 서비스 계정 → "새 비공개 키 생성"
//   2. 내려받은 JSON을 이 폴더에 serviceAccountKey.json 이름으로 저장 (gitignore 처리됨)
//   3. npm run fetch-reports
//   → word_reports_export.json 생성 (닉네임 등 개인 식별 정보는 제외)
//
// ⚠️ serviceAccountKey.json은 절대 커밋/공유 금지 — 프로젝트 전체 관리자 권한 키입니다.

const fs = require('fs');
const path = require('path');

const KEY_PATH = path.join(__dirname, 'serviceAccountKey.json');
const OUT_PATH = path.join(__dirname, 'word_reports_export.json');

async function main() {
    if (!fs.existsSync(KEY_PATH)) {
        console.error('❌ serviceAccountKey.json이 없습니다.');
        console.error('   Firebase 콘솔 → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성 후');
        console.error('   이 폴더에 serviceAccountKey.json으로 저장하세요.');
        process.exit(1);
    }

    let initializeApp, cert, getFirestore;
    try {
        ({ initializeApp, cert } = require('firebase-admin/app'));
        ({ getFirestore } = require('firebase-admin/firestore'));
    } catch {
        console.error('❌ firebase-admin 패키지가 없습니다. 먼저 실행: npm install --save-dev firebase-admin');
        process.exit(1);
    }

    initializeApp({ credential: cert(require(KEY_PATH)) });

    const db = getFirestore();
    const snap = await db.collection('word_reports').get();

    const reports = [];
    snap.forEach((d) => {
        const r = d.data();
        reports.push({
            target: r.target,
            level: r.level,
            meaning: r.meaning,
            sentence: r.sentence,
            accepts: r.accepts || [],
            // 닉네임 등 개인 식별 정보는 제외 — 검토에 필요한 내용만 추출
            reports: (r.reports || []).map((x) => ({
                reason: x.reason || '',
                detail: x.detail || '',
                d: x.d || '',
            })),
        });
    });

    const payload = {
        exportedAt: new Date().toISOString(),
        count: reports.length,
        reports: reports.sort((a, b) => a.target.localeCompare(b.target)),
    };

    fs.writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2));
    console.log(`✅ 신고 ${reports.length}건 → ${path.basename(OUT_PATH)} 저장 완료`);
    process.exit(0);
}

main().catch((e) => {
    console.error('❌ 신고 내보내기 실패:', e.message);
    process.exit(1);
});

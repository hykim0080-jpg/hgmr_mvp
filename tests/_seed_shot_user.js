// 스토어 촬영용 계정에 '어느 정도 해 본 사용자' 상태를 심는다 (익명 테스트 uid 전용).
// 실사용자 문서를 건드리지 않도록 uid를 인자로 명시해야 한다.
const fs = require('fs'), path = require('path');
const uid = process.argv[2];
if (!uid) { console.error('uid 인자 필요'); process.exit(1); }
const KEY = path.join(__dirname, '..', 'serviceAccountKey.json');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
initializeApp({ credential: cert(require(KEY)) });
const db = getFirestore();
(async () => {
    const ref = db.collection('users').doc(uid);
    const snap = await ref.get();
    if (!snap.exists) { console.error('문서 없음:', uid); process.exit(1); }
    if (snap.data().email) { console.error('❌ 이메일이 있는 계정 — 익명 테스트 계정이 아니다. 중단'); process.exit(1); }
    // totalLearnedWords는 저장값이 아니라 learnedWords에서 매번 다시 센다(masteredCount).
    // 그래서 실제 단어로 학습 이력을 만들어 준다 — 낱말카드에도 진짜 단어가 보인다.
    const words = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'words.json'), 'utf8'));
    const prev = snap.data().learnedWords || {};
    const learnedWords = { ...prev };
    const today = new Date();
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    let i = 0;
    for (const w of words) {
        if (Object.keys(learnedWords).length >= 96) break;
        if (learnedWords[w.target]) continue;
        const back = new Date(today); back.setDate(back.getDate() - (i % 9));
        const stage = 1 + (i % 4);
        const next = new Date(back); next.setDate(next.getDate() + [1, 3, 7, 14, 30][stage]);
        learnedWords[w.target] = { m: true, d: iso(back), c: 1 + (i % 3), w: i % 4 === 3 ? 1 : 0, s: stage, n: iso(next) };
        i++;
    }
    await ref.set({
        learnedWords,
        totalLearnedWords: Object.keys(learnedWords).length,
        // 평균 정답률의 분자·분모는 «짝으로» 심는다. 분자만 심으면 화면이 '-' 로 뜨고
        // (분모 0), 스토어 컷의 「평균 정답률」 칸이 비어 보인다.
        totalCorrectFirstTry: 71,
        totalAttempted: 96,
        streak: 9, exp: 2480, blueShards: 24,
        nickname: '한글마루'
    }, { merge: true });
    console.log('  learnedWords', Object.keys(learnedWords).length + '개');
    console.log('seeded', uid);
    process.exit(0);
})();

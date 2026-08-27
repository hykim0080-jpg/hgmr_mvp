// ♻️ 뜻풀이·예문이 바뀐 표제어의 응답 통계를 지운다.
//
// word_stats 는 표제어(target)로만 묶여 있어서, 문항을 고쳐도 옛 답안이 그대로 남는다.
// 그러면 「사람들은 이 문장을 어떻게 완성했을까요?」가 **지금 화면과 다른 문제**에 대한
// 답을 보여준다 (예: '관건'을 문빗장 뜻으로 물었을 때의 '잠금'·'보안').
//
//   node reset_word_stats.js --since 30            (미리보기: 30일 전 대비 바뀐 문항)
//   node reset_word_stats.js --since 30 --apply
//   node reset_word_stats.js --all --apply         (전체 초기화 — 출시 직전용)
//
// 지우기 전 항상 백업을 남긴다: ~/hgmr_wordstats_backup_<날짜>.json
const fs = require('fs'), path = require('path'), os = require('os');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const ALL = args.includes('--all');
const sinceIdx = args.indexOf('--since');
const SINCE = sinceIdx >= 0 ? args[sinceIdx + 1] : '30';

const KEY = path.join(__dirname, 'serviceAccountKey.json');
if (!fs.existsSync(KEY)) { console.error('❌ serviceAccountKey.json 없음'); process.exit(1); }
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
initializeApp({ credential: cert(require(KEY)) });
const db = getFirestore();

function changedTargets() {
    const ref = execSync(`git rev-list -1 --before="${SINCE} days ago" HEAD`).toString().trim();
    if (!ref) throw new Error(`${SINCE}일 전 커밋을 못 찾음`);
    const old = JSON.parse(execSync(`git show ${ref}:words.json`, { maxBuffer: 1 << 28 }).toString());
    const now = JSON.parse(fs.readFileSync(path.join(__dirname, 'words.json'), 'utf8'));
    const k = w => `${w.target}|${w.level}`;
    const oldMap = new Map(old.map(w => [k(w), w]));
    const out = new Set();
    for (const w of now) {
        const o = oldMap.get(k(w));
        if (o && (o.meaning !== w.meaning || o.sentence !== w.sentence)) out.add(w.target);
    }
    console.log(`기준 커밋 ${ref.slice(0, 7)} (${SINCE}일 전) 대비 바뀐 표제어 ${out.size}개`);
    return out;
}

(async () => {
    const snap = await db.collection('word_stats').get();
    const backup = {};
    snap.docs.forEach(d => { backup[d.id] = d.data(); });
    const stamp = new Date().toISOString().slice(0, 10);
    const bpath = path.join(os.homedir(), `hgmr_wordstats_backup_${stamp}.json`);
    fs.writeFileSync(bpath, JSON.stringify(backup, null, 1));
    console.log(`백업 ${snap.size}건 → ${bpath}`);

    const targets = ALL ? null : changedTargets();
    const hit = snap.docs.filter(d => ALL || targets.has(d.id));
    const answers = hit.reduce((s, d) => s + Object.values(d.data().answers || {}).reduce((a, b) => a + b, 0), 0);
    console.log(`\n지울 문서 ${hit.length}개 (응답 ${answers}건)`);
    console.log(hit.slice(0, 20).map(d => d.id).join(', ') + (hit.length > 20 ? ' …' : ''));

    if (!APPLY) { console.log('\n미리보기입니다. 실제로 지우려면 --apply'); process.exit(0); }
    let batch = db.batch(), n = 0;
    for (const d of hit) {
        batch.delete(d.ref); n++;
        if (n % 400 === 0) { await batch.commit(); batch = db.batch(); }
    }
    await batch.commit();
    console.log(`\n${hit.length}개 삭제 완료`);
    process.exit(0);
})();

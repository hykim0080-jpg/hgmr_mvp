// 잔여 문장 조각 2차 검수 결과 일괄 적용
// 사용: node scratch/apply_fixes3.js [--dry]
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const DRY = process.argv.includes('--dry');

const words = JSON.parse(fs.readFileSync(path.join(ROOT, 'words.json'), 'utf8'));
const fixes = ['fixes_r2_a.json', 'fixes_r2_b.json', 'fixes_r2_c.json']
    .flatMap(f => JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8')));

const flagged = JSON.parse(fs.readFileSync(path.join(__dirname, 'flagged_round2.json'), 'utf8'));
const flaggedIdx = new Set(flagged.map(x => x.i));

let stats = { sentence: 0, meaning: 0, both: 0, keep: 0 };
let errors = 0;

// 중복 판정 확인 (내용이 동일하면 뒤 항목 제거, 다르면 오류)
const byIdx = new Map();
for (const f of fixes) {
    const prev = byIdx.get(f.i);
    if (prev) {
        if (JSON.stringify(prev) !== JSON.stringify(f)) { console.error(`❌ 상충하는 중복 판정: index ${f.i}`); errors++; }
        continue;
    }
    byIdx.set(f.i, f);
}
const deduped = [...byIdx.values()];
fixes.length = 0;
fixes.push(...deduped);

for (const f of fixes) {
    const w = words[f.i];
    if (!w) { console.error(`❌ [${f.i}] 인덱스 없음`); errors++; continue; }
    if (!flaggedIdx.has(f.i)) { console.error(`❌ [${f.i}] 플래그되지 않은 항목 (${w.target})`); errors++; continue; }
    if (f.action === 'keep') { stats.keep++; continue; }

    if (f.sentence !== undefined) {
        if (!f.sentence.includes('____')) { console.error(`❌ [${f.i}] ${w.target}: 새 문장에 빈칸 없음`); errors++; continue; }
        if (f.sentence.replace(/_+/g, '').includes(w.target)) { console.error(`❌ [${f.i}] ${w.target}: 새 문장에 정답 노출`); errors++; continue; }
    }
    if (f.action === 'sentence') { words[f.i].sentence = f.sentence; stats.sentence++; }
    else if (f.action === 'meaning') { words[f.i].meaning = f.meaning; stats.meaning++; }
    else if (f.action === 'both') { words[f.i].sentence = f.sentence; words[f.i].meaning = f.meaning; stats.both++; }
}

// 미판정 항목 확인
const judged = new Set(fixes.map(f => f.i));
const missing = flagged.filter(x => !judged.has(x.i));
if (missing.length) console.warn(`⚠️ 판정 누락 ${missing.length}건:`, missing.map(x => `[${x.i}]${x.target}`).join(', '));

// 잔여 ≒ 찌꺼기 자동 정리 (에이전트가 keep 했더라도 ≒ 뒤 표기는 제거)
let tidied = 0;
words.forEach(w => {
    if (/≒/.test(w.meaning)) { w.meaning = w.meaning.replace(/\s*≒.*$/, '').trim(); tidied++; }
});

// 최종 무결성 검증
let finalErrors = 0;
words.forEach(w => {
    if (!w.sentence.includes('____')) finalErrors++;
    if (!w.accepts.includes(w.target)) finalErrors++;
    if (w.sentence.replace(/_+/g, '').includes(w.target)) { console.warn(`⚠️ 정답 노출: ${w.target}`); }
});

console.log(`\n=== 적용 결과 ${DRY ? '(DRY RUN)' : ''} ===`);
console.log(`문장 교체: ${stats.sentence} | 뜻 수정: ${stats.meaning} | 둘 다: ${stats.both} | 유지: ${stats.keep}`);
console.log(`≒ 찌꺼기 자동 정리: ${tidied}건`);
console.log(`판정 오류: ${errors} | 최종 무결성 오류: ${finalErrors}`);

if (!DRY && errors === 0 && finalErrors === 0) {
    fs.writeFileSync(path.join(ROOT, 'words.json'), JSON.stringify(words, null, 1) + '\n');
    console.log('✅ words.json 저장 완료');
} else if (errors > 0 || finalErrors > 0) {
    console.error('❌ 오류로 저장하지 않음');
    process.exit(1);
}

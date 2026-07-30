/**
 * add_words.js — 새 단어를 words.json 에 안전하게 추가
 *
 * merge_words.js 는 단어 배열이 코드에 박혀 있는 일회성 스크립트였다.
 * 이 스크립트는 외부 파일(CSV·JSON)을 받아 반복 사용할 수 있게 만든 것으로,
 * Cowork 가 콘텐츠를 파일로 작성 → Code 가 반영하는 협업 흐름에 맞춘다.
 *
 * 사용법:
 *   npm run add-words -- 새단어.csv          # 검증 후 반영
 *   npm run add-words -- 새단어.csv --dry    # 미리보기만 (파일 저장 안 함)
 *   npm run add-words -- 새단어.json
 *
 * 입력 형식 (CSV 헤더 / JSON 키):
 *   target    (필수) 정답 표제어
 *   meaning   (필수) 뜻풀이
 *   sentence  (필수) 예문 — 빈칸은 ____ (밑줄 4개)
 *   level     (필수) 1~3
 *   accepts   (선택) 인정 유의어. CSV 는 쉼표 구분 "인상,흔적,새김"
 *   tags      (선택) 주제 태그. CSV 는 쉼표 구분. 아래 ALLOWED_TAGS 만 허용
 *   ending    (선택) 용언일 때 빈칸 뒤에 붙는 어미 (예: 어긋나다 → "는")
 *
 * 검증 단계:
 *   1) 이 스크립트 — 필수 필드·빈칸·중복(기존/파일내)·태그 허용목록·level 범위
 *   2) check_words.js 위임 — 조사 결합 등 국어 규칙 (규칙 중복을 피하려 실행만 위임)
 *   둘 중 하나라도 실패하면 words.json 을 원상복구하고 종료한다.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WORDS_PATH = path.join(__dirname, 'words.json');

// index.html 의 TOPIC_TAGS 에 매핑된 태그만 허용.
// 여기 없는 태그를 달면 주제 학습에 노출되지 않고 '전체'에서만 나온다.
const ALLOWED_TAGS = new Set([
    '기초',
    '학술_논리', '교육_학술', '학술_윤리', '철학_인문', '학교_배움',
    '수능',
    '격식_비즈니스', '비즈니스', '경제_경영', '경제', '경제_금융', '사회_경제', '금융',
    '사회', '사회_문화', '사회_일반', '사회_제도', '사회_직업', '사회_행사',
    '사회_관계', '사회_정치', '문화_예술', '문화', '문화_스포츠',
    '법률', '법률_제도', '스포츠', '스포츠_게임', '미디어', '사회_기본', '관계_소통',
    '감정_심리', '심리', '감정_기분',
]);

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const inputPath = args.find(a => !a.startsWith('--'));

if (!inputPath) {
    console.error('사용법: npm run add-words -- <새단어.csv|json> [--dry]');
    process.exit(1);
}
if (!fs.existsSync(inputPath)) {
    console.error(`입력 파일을 찾을 수 없습니다: ${inputPath}`);
    process.exit(1);
}

// ─────────────────────────────────────────
// 입력 파싱
// ─────────────────────────────────────────
// 따옴표 안의 쉼표·줄바꿈을 보존하는 최소 CSV 파서 ("" 는 이스케이프된 따옴표)
function parseCSV(text) {
    const rows = [];
    let row = [], field = '', inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (inQuotes) {
            if (c === '"') {
                if (text[i + 1] === '"') { field += '"'; i++; }
                else inQuotes = false;
            } else field += c;
        } else if (c === '"') inQuotes = true;
        else if (c === ',') { row.push(field); field = ''; }
        else if (c === '\r') { /* CRLF 무시 */ }
        else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
        else field += c;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    if (!rows.length) return [];
    const header = rows[0].map(h => h.replace(/^﻿/, '').trim());  // BOM 제거
    return rows.slice(1)
        .filter(r => r.some(v => v.trim() !== ''))          // 빈 줄 skip
        .map(r => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? '').trim()])));
}

const raw = fs.readFileSync(inputPath, 'utf8');
let incoming;
if (inputPath.toLowerCase().endsWith('.json')) {
    incoming = JSON.parse(raw);
    if (!Array.isArray(incoming)) { console.error('JSON 최상위는 배열이어야 합니다.'); process.exit(1); }
} else {
    incoming = parseCSV(raw);
}

const splitList = v => Array.isArray(v) ? v
    : String(v || '').split(',').map(s => s.trim()).filter(Boolean);

// ─────────────────────────────────────────
// 1단계: 구조 검증 (파일을 건드리기 전에)
// ─────────────────────────────────────────
const words = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf8'));
const existing = new Set(words.map(w => w.target));
const seen = new Set();
const errors = [];
const prepared = [];

incoming.forEach((r, i) => {
    const at = `${i + 2}행`;   // 헤더가 1행
    const target = String(r.target || '').trim();
    const meaning = String(r.meaning || '').trim();
    const sentence = String(r.sentence || '').trim();
    const level = parseInt(r.level, 10);

    if (!target) { errors.push(`${at}: target 비어 있음`); return; }
    if (!meaning) errors.push(`${at} ${target}: meaning 비어 있음`);
    if (!sentence) errors.push(`${at} ${target}: sentence 비어 있음`);
    else if (!sentence.includes('____')) errors.push(`${at} ${target}: 예문에 빈칸(____)이 없음`);
    if (![1, 2, 3].includes(level)) errors.push(`${at} ${target}: level 은 1~3 (현재 "${r.level}")`);
    if (existing.has(target)) errors.push(`${at} ${target}: 이미 words.json 에 있음`);
    if (seen.has(target)) errors.push(`${at} ${target}: 입력 파일 안에서 중복`);
    seen.add(target);

    const accepts = splitList(r.accepts);
    const tags = splitList(r.tags);
    tags.forEach(t => {
        if (!ALLOWED_TAGS.has(t)) errors.push(`${at} ${target}: 허용되지 않은 태그 "${t}"`);
    });
    if (accepts.includes(target)) errors.push(`${at} ${target}: accepts 에 target 자신이 들어 있음`);

    const word = { target, accepts: accepts.length ? accepts : [target], meaning, sentence, level, tags };
    const ending = String(r.ending || '').trim();
    if (ending) word.ending = ending;
    prepared.push(word);
});

if (errors.length) {
    console.error(`\n❌ 구조 검증 실패 — ${errors.length}건 (아무것도 반영하지 않았습니다)\n`);
    errors.forEach(e => console.error('   ' + e));
    process.exit(1);
}

console.log(`입력 ${prepared.length}개 · 구조 검증 통과`);
const noTag = prepared.filter(w => !w.tags.length);
if (noTag.length) {
    console.log(`⚠️  태그 없는 단어 ${noTag.length}개 — 주제 학습에 노출되지 않고 '전체'에서만 나옵니다`);
    console.log('   ' + noTag.map(w => w.target).join(', '));
}

if (DRY) {
    console.log('\n[--dry] 미리보기 — 저장하지 않습니다.');
    prepared.slice(0, 10).forEach(w =>
        console.log(`   [Lv${w.level}] ${w.target} (${w.tags.join(',') || '태그없음'}) — ${w.meaning.slice(0, 30)}`));
    if (prepared.length > 10) console.log(`   … 외 ${prepared.length - 10}개`);
    console.log(`\n반영 시 ${words.length} → ${words.length + prepared.length}개`);
    process.exit(0);
}

// ─────────────────────────────────────────
// 2단계: 병합 → 저장 → check_words.js 위임 검증
// ─────────────────────────────────────────
const backupPath = path.join(__dirname, `words.backup.${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.json`);
fs.copyFileSync(WORDS_PATH, backupPath);

const merged = words.concat(prepared).sort((a, b) => a.target.localeCompare(b.target, 'ko'));
fs.writeFileSync(WORDS_PATH, JSON.stringify(merged, null, 4) + '\n', 'utf8');
console.log(`\n병합 완료: ${words.length} → ${merged.length}개 (가나다순 정렬)`);
console.log(`백업: ${path.basename(backupPath)}`);

console.log('\n=== 국어 규칙 검증 (check_words.js) ===');
try {
    execSync('node check_words.js', { cwd: __dirname, stdio: 'inherit' });
} catch (e) {
    // 조사 결합 오류 등 차단 사유 → 원상복구
    fs.copyFileSync(backupPath, WORDS_PATH);
    console.error('\n❌ 국어 규칙 검증 실패 — words.json 을 원래대로 되돌렸습니다.');
    console.error('   예문의 빈칸 뒤 조사가 target 의 받침과 맞는지 확인하세요.');
    process.exit(1);
}

console.log('\n✅ 추가 완료. 다음 단계: npm run build (배포는 firebase deploy --only hosting)');

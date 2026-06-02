/**
 * sync_words.js
 * Firestore word_edits / word_deletions → words.json 자동 반영 스크립트
 *
 * 사용법:
 *   npm run sync-words          # 반영 후 npm run build 자동 실행
 *   npm run sync-words -- --dry # 변경 내용만 미리보기 (파일 저장 안 함)
 */

const fetch = require('node-fetch');
const fs    = require('fs');
const path  = require('path');
const { execSync } = require('child_process');

// ─────────────────────────────────────────
// 설정
// ─────────────────────────────────────────
const PROJECT_ID  = 'hgmr-9109e';
const BASE_URL    = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const WORDS_PATH  = path.join(__dirname, 'words.json');
const DRY_RUN     = process.argv.includes('--dry');

// ─────────────────────────────────────────
// Firestore REST 파싱 헬퍼
// ─────────────────────────────────────────
function parseValue(val) {
    if (!val) return null;
    if ('stringValue'  in val) return val.stringValue;
    if ('integerValue' in val) return parseInt(val.integerValue, 10);
    if ('doubleValue'  in val) return parseFloat(val.doubleValue);
    if ('booleanValue' in val) return val.booleanValue;
    if ('nullValue'    in val) return null;
    if ('arrayValue'   in val) return (val.arrayValue.values || []).map(parseValue);
    if ('mapValue'     in val) {
        const obj = {};
        for (const [k, v] of Object.entries(val.mapValue.fields || {})) {
            obj[k] = parseValue(v);
        }
        return obj;
    }
    return null;
}

function parseDoc(raw) {
    if (!raw.fields) return null;
    const doc = { _id: raw.name.split('/').pop() };
    for (const [k, v] of Object.entries(raw.fields)) {
        doc[k] = parseValue(v);
    }
    return doc;
}

// 페이지네이션 포함 전체 컬렉션 조회
async function fetchAll(collectionName) {
    const docs = [];
    let pageToken = null;

    do {
        const url = `${BASE_URL}/${collectionName}?pageSize=300${pageToken ? '&pageToken=' + pageToken : ''}`;
        const res  = await fetch(url);

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Firestore ${collectionName} 요청 실패 (${res.status}): ${text}`);
        }

        const json = await res.json();
        if (json.documents) {
            docs.push(...json.documents.map(parseDoc).filter(Boolean));
        }
        pageToken = json.nextPageToken || null;
    } while (pageToken);

    return docs;
}

// ─────────────────────────────────────────
// 메인 로직
// ─────────────────────────────────────────
async function main() {
    console.log(DRY_RUN ? '🔍 DRY-RUN 모드 (파일 저장 없음)\n' : '');

    // 1. words.json 로드
    console.log('📂 words.json 로드...');
    let words = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf-8'));
    console.log(`   현재: ${words.length}개\n`);

    // 2. word_edits 적용
    console.log('📡 Firestore word_edits 조회...');
    const edits = await fetchAll('word_edits');
    console.log(`   ${edits.length}개 수정 항목 발견`);

    let editCount = 0;
    for (const edit of edits) {
        // 이름이 바뀐 경우 previousTarget으로 원본 탐색
        const key = (edit.previousTarget && edit.previousTarget !== edit.target)
            ? edit.previousTarget
            : edit.target;
        const idx = words.findIndex(w => w.target === key);
        if (idx === -1) continue;

        const before = JSON.stringify(words[idx]);

        words[idx].target   = edit.target;
        words[idx].meaning  = edit.meaning;
        words[idx].sentence = edit.sentence;
        words[idx].accepts  = edit.accepts;
        words[idx].level    = edit.level;
        if (edit.tags) words[idx].tags = edit.tags;

        const after = JSON.stringify(words[idx]);
        if (before !== after) {
            if (DRY_RUN) console.log(`   ✏️  수정: ${key}${key !== edit.target ? ' → ' + edit.target : ''}`);
            editCount++;
        }
    }
    console.log(`   적용: ${editCount}개\n`);

    // 3. word_deletions 적용
    console.log('📡 Firestore word_deletions 조회...');
    let deletions = [];
    try {
        deletions = await fetchAll('word_deletions');
    } catch (err) {
        console.warn(`   ⚠️  word_deletions 조회 실패: ${err.message}\n`);
    }
    const deletedSet = new Set(deletions.map(d => d._id));
    if (DRY_RUN) deletedSet.forEach(t => {
        if (words.find(w => w.target === t)) console.log(`   🗑️  삭제: ${t}`);
    });

    // 4. word_reviews — "수정 필요" 단어 제외
    console.log('📡 Firestore word_reviews 조회...');
    let reviews = [];
    try {
        reviews = await fetchAll('word_reviews');
    } catch (err) {
        console.warn(`   ⚠️  word_reviews 조회 실패: ${err.message}\n`);
    }

    // 검수자 중 한 명이라도 "수정 필요"로 판정했으면 제외
    const needsEditSet = new Set();
    for (const review of reviews) {
        const reviewers = Object.keys(review).filter(k => k !== '_id');
        const anyEdit   = reviewers.some(r => {
            const s = review[r]?.status;
            return s === 'edit' || s === 'awkward';
        });
        if (anyEdit) needsEditSet.add(review._id);
    }
    console.log(`   "수정 필요" 판정: ${needsEditSet.size}개 → 최종 제외`);
    if (DRY_RUN) needsEditSet.forEach(t => console.log(`   ⚠️  수정 필요: ${t}`));
    console.log();

    // 5. 삭제 + 수정 필요 단어 제거
    const beforeLen = words.length;
    words = words.filter(w => !deletedSet.has(w.target) && !needsEditSet.has(w.target));
    const removedCount  = beforeLen - words.length;
    const deletedCount  = [...deletedSet].filter(t => words.find ? false : true).length; // 참고용
    console.log(`   제거 합계: ${removedCount}개 (삭제 ${deletedSet.size} + 수정 필요 ${needsEditSet.size})\n`);

    // 6. 정제 후 저장
    const cleaned = words.map(w => ({
        target  : w.target,
        accepts : w.accepts || [w.target],
        meaning : w.meaning,
        sentence: w.sentence,
        level   : w.level,
        tags    : w.tags || []
    }));

    console.log(`📊 최종 단어 수: ${cleaned.length}개 (수정 적용 ${editCount}, 제거 ${removedCount}개)`);

    if (DRY_RUN) {
        console.log('\n✋ DRY-RUN — 파일 저장 및 빌드를 건너뜁니다.');
        return;
    }

    if (editCount === 0 && removedCount === 0) {
        console.log('\n✅ 변경 사항 없음 — words.json을 그대로 유지합니다.');
        return;
    }

    console.log('\n💾 words.json 저장...');
    fs.writeFileSync(WORDS_PATH, JSON.stringify(cleaned, null, 2), 'utf-8');

    console.log('🔨 npm run build 실행...');
    execSync('npm run build', { stdio: 'inherit' });

    console.log(`
✅ 완료!
   다음 명령으로 커밋하세요:
   git add words.json www/words.json && git commit -m "chore: 검수 반영 words.json 업데이트"
`);
}

main().catch(err => {
    console.error('\n❌ 오류 발생:', err.message);
    process.exit(1);
});

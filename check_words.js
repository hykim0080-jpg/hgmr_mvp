/**
 * check_words.js
 * words.json 품질 검사기 — 조사 결합·무결성 자동 검증
 *
 * 퀴즈 특성상 빈칸 뒤 조사(이/가, 을/를, 은/는, 와/과, (으)로)는 정답의
 * 받침 유무에 의해 고정된다. 따라서 정답(target)과 인정 유의어(accepts)는
 * 그 조사와 반드시 결합 가능해야 한다. 안 맞으면:
 *   - target 이 안 맞음  → 예문의 조사가 틀린 데이터 버그 (사람이 문장 수정 필요)
 *   - accepts 가 안 맞음 → 오답이 정답 처리되는 버그 (자동 제거 가능)
 *
 * 사용법:
 *   npm run check-words          # 검사만 (문제 있으면 종료코드 1)
 *   npm run check-words:fix      # accepts 조사 위반 자동 제거 후 저장 (문장 버그는 보고만)
 *
 * 검사 항목:
 *   1. 빈칸(____) 존재 및 필수 필드(target/meaning/sentence)
 *   2. 빈칸 뒤 조사와 target 의 결합 (문장 버그 탐지)
 *   3. 빈칸 뒤 조사와 각 accept 의 결합 (오인정 유의어 탐지)
 *   4. accepts 내 중복·target 중복·한글 외 문자
 */

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WORDS_PATH = path.join(__dirname, 'words.json');
const FIX = process.argv.includes('--fix');

// ─────────────────────────────────────────
// 한글 받침 판정
// ─────────────────────────────────────────
// 종성 인덱스 (0=받침 없음, 8=ㄹ). 한글 음절: (초성*21 + 중성)*28 + 종성 + 0xAC00
function jongseong(ch) {
  const c = ch.charCodeAt(0);
  if (c < 0xAC00 || c > 0xD7A3) return -1; // 한글 음절 아님
  return (c - 0xAC00) % 28;
}
function hasBatchim(word) { return jongseong(word[word.length - 1]) > 0; }
function isRieul(word)    { return jongseong(word[word.length - 1]) === 8; }

// 빈칸 뒤 조사가 word 와 결합 가능한지 (받침 규칙)
function particleFits(word, particle) {
  const bat = hasBatchim(word);
  switch (particle) {
    case '이': case '을': case '은': case '과': return bat;        // 받침 필요
    case '가': case '를': case '는': case '와': return !bat;       // 받침 없어야
    case '로':  return !bat || isRieul(word);                      // 모음 또는 ㄹ받침
    case '으로': return bat && !isRieul(word);                     // ㄹ 제외 받침
    default: return true;
  }
}

// 용언(-하다/-다 등)은 빈칸 뒤에 어미가 렌더되므로 조사 검사 제외
function isVerb(w) {
  if (w.ending !== undefined) return w.ending !== '';
  return /다$/.test(w.target) && w.target.length > 1;
}

// 빈칸 바로 뒤에 붙은 조사 추출 (조사 뒤가 공백/문장부호/끝일 때만 — '이다'·합성어 오탐 방지)
function trailingParticle(sentence) {
  const m = sentence.match(/____(으로|이|가|을|를|은|는|와|과|로)(?=[\s,.!?~)\]]|$)/);
  return m ? m[1] : null;
}

// ─────────────────────────────────────────
// 검사 실행
// ─────────────────────────────────────────
const words = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf8'));
const allTargets = new Set(words.map(w => w.target));

const integrity   = []; // 필수 필드/빈칸 누락
const targetBugs  = []; // 문장 조사가 target 과 안 맞음 (사람 수정 필요)
const acceptFixes = []; // 조사 위반 accepts (자동 제거 대상)
const hygiene     = []; // 중복/target중복/비한글 accepts

words.forEach((w, i) => {
  const loc = `#${i} ${w.target || '(target없음)'}`;

  // 1) 무결성
  if (!w.target)                        integrity.push(`${loc}: target 없음`);
  if (!w.meaning)                       integrity.push(`${loc}: meaning 없음`);
  if (!w.sentence)                      integrity.push(`${loc}: sentence 없음`);
  else if (!w.sentence.includes('____')) integrity.push(`${loc}: 빈칸(____) 없음`);
  if (!w.target || !w.sentence) return;

  // 4) accepts 위생 — accepts가 target을 포함하는 것은 정상 관례이므로 오류 아님
  const accepts = w.accepts || [];
  const seen = new Set();
  accepts.forEach(a => {
    if (a !== w.target && seen.has(a))          hygiene.push(`${loc}: accepts 내 중복 ("${a}")`);
    else if (!/^[가-힣]+$/.test(a))             hygiene.push(`${loc}: accepts에 비한글/공백 ("${a}")`);
    seen.add(a);
  });

  // 4-1) 힌트 예문(hint) — 두 번 틀렸을 때 여는 두 번째 빈칸 예문
  //      정답을 그대로 노출하면 힌트가 아니라 답이 되므로 target 포함은 차단 대상.
  if (w.hint !== undefined) {
    if (typeof w.hint !== 'string' || !w.hint.trim()) integrity.push(`${loc}: hint가 빈 값`);
    else {
      if (!w.hint.includes('____'))        integrity.push(`${loc}: hint에 빈칸(____) 없음`);
      if (w.hint.includes(w.target))       integrity.push(`${loc}: hint에 정답("${w.target}")이 그대로 노출됨`);
      if (w.hint === w.sentence)           integrity.push(`${loc}: hint가 본 예문과 동일`);
      if (w.hint.length < 12 || w.hint.length > 90) hygiene.push(`${loc}: hint 길이 ${w.hint.length}자 (12~90 권장)`);
      const hp = trailingParticle(w.hint);
      if (hp && !isVerb(w) && !particleFits(w.target, hp)) {
        targetBugs.push({ i, target: w.target, particle: hp, sentence: w.hint });
      }
      // 유의어도 정답으로 인정되므로, 힌트에 accepts가 노출되면 답을 준 것이나 같다.
      (w.accepts || []).forEach(a => {
        if (a === w.target) return;
        const stem = /다$/.test(a) && a.length > 2 ? a.slice(0, -1) : a;
        if (stem && w.hint.includes(stem)) {
          integrity.push(`${loc}: hint에 유의어("${a}")가 노출됨 — 그대로 입력하면 정답 처리된다`);
        }
      });
      // 동형이의어(수렴·지표·역학·수용성 …)는 표제어가 같아도 뜻이 다르다.
      // 같은 힌트를 공유하면 엉뚱한 뜻의 문맥을 보여주게 되므로 차단한다.
      const twin = words.find((o, j) => j !== i && o.target === w.target && o.hint === w.hint);
      if (twin) integrity.push(`${loc}: 같은 표제어의 다른 뜻과 hint가 동일 — 뜻별로 다르게 쓸 것`);
    }
  }

  // 5) 유의어 뉘앙스 대조 예문 — ref 는 words.json 에 실존하는 표제어여야 함
  //    (유의어_뉘앙스_설계.md: nuance = { 유의어: {ref} | {s} }. 참조 깨짐은 렌더 시 빈 화면이 되므로 차단)
  if (w.nuance && typeof w.nuance === 'object') {
    for (const [syn, v] of Object.entries(w.nuance)) {
      if (v && typeof v === 'object' && v.ref !== undefined) {
        if (!allTargets.has(v.ref)) integrity.push(`${loc}: nuance["${syn}"].ref = "${v.ref}" — words.json에 없는 표제어`);
      } else if (v && typeof v === 'object' && v.s !== undefined) {
        if (!String(v.s).includes('____')) integrity.push(`${loc}: nuance["${syn}"].s 에 빈칸(____) 없음`);
      }
    }
  }

  // 2·3) 조사 결합
  if (isVerb(w)) return;
  const p = trailingParticle(w.sentence);
  if (!p) return;

  if (!particleFits(w.target, p)) {
    targetBugs.push({ i, target: w.target, particle: p, sentence: w.sentence });
  }
  const bad = accepts.filter(a => a !== w.target && /^[가-힣]+$/.test(a) && !particleFits(a, p));
  if (bad.length) acceptFixes.push({ i, target: w.target, particle: p, bad });
});

// ─────────────────────────────────────────
// 리포트
// ─────────────────────────────────────────
const line = '─'.repeat(60);
console.log(line);
console.log(`words.json 검사 — 총 ${words.length}개 단어`);
console.log(line);

if (integrity.length) {
  console.log(`\n❌ 무결성 오류: ${integrity.length}건`);
  integrity.forEach(m => console.log('   ' + m));
}

if (hygiene.length) {
  console.log(`\n⚠️  accepts 위생: ${hygiene.length}건`);
  hygiene.forEach(m => console.log('   ' + m));
}

if (targetBugs.length) {
  console.log(`\n🔴 문장 조사 버그 (정답이 비문 — 예문 조사 수정 필요): ${targetBugs.length}건`);
  targetBugs.forEach(b => {
    const alt = altParticle(b.target, b.particle);
    console.log(`   [${b.target}] 빈칸 뒤 "${b.particle}" → "${alt}" 이어야 함`);
    console.log(`      ${b.sentence}`);
  });
}

const badCount = acceptFixes.reduce((s, f) => s + f.bad.length, 0);
if (acceptFixes.length) {
  console.log(`\n${FIX ? '🔧' : '🟡'} 조사 위반 accepts: ${acceptFixes.length}개 단어 / ${badCount}건${FIX ? ' (제거함)' : ' (--fix 로 제거)'}`);
  acceptFixes.forEach(f => console.log(`   [${f.target}] (빈칸 뒤 "${f.particle}") → 제거: ${f.bad.join(', ')}`));
}

// 조사에 맞는 반대 형태 알려주기 (문장 수정 힌트)
function altParticle(word, p) {
  const bat = hasBatchim(word);
  const map = { '이':'가','가':'이','을':'를','를':'을','은':'는','는':'은','와':'과','과':'와' };
  if (map[p]) return map[p];
  if (p === '로' || p === '으로') return (bat && !isRieul(word)) ? '으로' : '로';
  return p;
}

// ─────────────────────────────────────────
// --fix: accepts 조사 위반 자동 제거
// ─────────────────────────────────────────
if (FIX && acceptFixes.length) {
  acceptFixes.forEach(f => {
    const w = words[f.i];
    w.accepts = (w.accepts || []).filter(a => !f.bad.includes(a));
  });
  fs.writeFileSync(WORDS_PATH, JSON.stringify(words, null, 1), 'utf8');
  console.log(`\n💾 words.json 저장 완료 — accepts ${badCount}건 제거`);
  try {
    execSync('npm run build', { cwd: __dirname, stdio: 'ignore' });
    console.log('📦 npm run build 완료 (www 갱신)');
  } catch (e) {
    console.log('⚠️  build 실패 — 수동으로 npm run build 실행 필요');
  }
}

// ─────────────────────────────────────────
// 요약 & 종료 코드
// ─────────────────────────────────────────
const synTotal = words.reduce((s, w) => s + (w.accepts || []).filter(a => a !== w.target).length, 0);
console.log('\n' + line);
console.log(`유의어 총 ${synTotal}건 | 무결성 ${integrity.length} · 위생 ${hygiene.length} · 문장버그 ${targetBugs.length} · accepts위반 ${badCount}`);

// 차단 대상 = 퀴즈를 깨는 문제 (무결성·문장버그·미수정 조사위반). 위생은 경고(비차단).
const blocking = integrity.length + targetBugs.length + (FIX ? 0 : badCount);
if (blocking === 0) {
  console.log(hygiene.length ? `✅ 차단 오류 없음 (위생 경고 ${hygiene.length}건은 검토 권장)` : '✅ 이상 없음');
  process.exit(0);
} else {
  console.log(`❗ 조치 필요: ${blocking}건${targetBugs.length ? ' (문장 조사 버그는 수동 수정)' : ''}`);
  process.exit(1);
}

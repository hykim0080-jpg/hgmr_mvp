// ─────────────────────────────────────────────────────────────
// 오답 통계 패널용 비속어 필터 — 참고 구현
//
// 설계 원칙
//  1) 오탐이 미탐보다 나쁘다. 맞춤법 실수·근접 오답은 이 패널의 핵심 가치이므로 절대 막지 않는다.
//  2) 어휘 사전(words.json 표제어·유의어)에 있는 말은 어떤 경우에도 통과시킨다.
//  3) 초성체 우회는 "입력 전체가 자음뿐일 때"만 검사한다 — 정상 답은 절대 그렇지 않다.
//  4) 걸러진 답은 버리지 않고 「기타」로 합산해 비율의 총합을 지킨다.
// ─────────────────────────────────────────────────────────────

// 어간을 두 갈래로 나눈다 — 오탐을 줄이는 핵심 장치.
//   CONTAIN: 부분 문자열로 검사해도 안전한 것 (정상어에 잘 안 끼어든다)
//   EXACT  : 입력 전체가 그것일 때만 검사 ('보지'→보지락, '자지'→자지러지다 같은 오탐 차단)
const STEMS_CONTAIN = [
  '시발','씨발','시팔','씨팔','씨바','싀발','쓰발','시벌','씨벌',
  '존나','존내','졸라','좆','좇',
  '병신','븅신','빙신',
  '지랄','지럴',
  '개새끼','개색기','개세끼','개시키','새끼야','썅','쌍년','쌍놈',
  '미친놈','미친년','또라이','돌아이',
  '닥쳐','꺼져라','엿먹어',
  '걸레년','창녀','창남','느금',
  '머저리','썩을',
  'fuck','shit','bitch','asshole','dick',
];
const STEMS_EXACT = [
  '보지','자지','후장','애미','애비','니미','등신','호로','시바','병신아','미친',
];

// 자음만으로 쓰는 우회 (입력 전체가 자음일 때만 검사)
const CHOSEONG = ['ㅅㅂ','ㅆㅂ','ㅄ','ㅈㄴ','ㅁㅊ','ㅈㄹ','ㄲㅈ','ㅗ','ㅂㅅ','ㄷㅊ','ㄱㅅㄲ'];

// 어간을 포함하지만 욕이 아닌 정상어 — 사전에 없을 수 있어 따로 둔다
const ALLOW = [
  '시발점','시발역','시발지','효시발','개나리','개선','개혁','개시','개막','개성',
  '병실','병사','병행','병설','존경','존립','존엄성','존재','존중',
  '자지러지다','보지라기','미친듯이',
];

function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, '')                       // 공백 제거 — "시 발"
    .replace(/[.,!?~·\-_*^%$#@()[\]{}'"/\\|]/g, '')  // 기호 제거 — "시.발"
    .replace(/[0-9０-９]/g, '')                  // 숫자 제거 — "시1발"
    .replace(/(.)\1+/g, '$1');                 // 연속 중복 축약 — "시발발발"
}

// 한글 음절을 초성으로 분해
const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
function toChoseong(s) {
  return [...s].map(ch => {
    const c = ch.charCodeAt(0) - 0xAC00;
    return (c >= 0 && c <= 11171) ? CHO[Math.floor(c / 588)] : ch;
  }).join('');
}

/**
 * @param {string} answer   이용자가 입력한 답
 * @param {Set<string>} vocab  words.json의 표제어 + accepts 전체
 * @returns {boolean} true면 화면에 표시하지 않고 「기타」로 합산
 */
function isBlocked(answer, vocab) {
  const raw = String(answer || '').trim();
  if (!raw) return false;

  // ① 어휘 사전에 있는 말은 무조건 통과 (오탐 원천 차단)
  if (vocab && vocab.has(raw)) return false;

  const n = normalize(raw);
  if (!n) return false;
  if (vocab && vocab.has(n)) return false;
  if (ALLOW.some(w => n === w || n.includes(w))) return false;

  // 채움 모음을 끼워 넣는 우회("시이이발")에 대비한 축약형도 함께 검사한다
  const compact = n.replace(/[이으]/g, '');

  // ② 입력 전체가 자모(자음·모음)뿐일 때만 초성체 검사 — 정상 답은 이런 형태가 아니다
  if (/^[ㄱ-ㅎㅏ-ㅣ]+$/.test(n)) {
    return CHOSEONG.some(c => n.includes(c));
  }

  // ③ 어간 검사 — 부분 일치 / 완전 일치를 나눠 적용
  if (STEMS_CONTAIN.some(s => n.includes(s) || compact.includes(s))) return true;
  if (STEMS_EXACT.some(s => n === s || compact === s)) return true;

  // ④ 자모 분리 우회 — "ㅅㅣ발", "ㅂㅕㅇ신" 처럼 자음·모음이 섞인 경우
  if (/[ㄱ-ㅎㅏ-ㅣ]/.test(n)) {
    const cho = toChoseong(n.replace(/[ㅏ-ㅣ]/g, ''));
    if (CHOSEONG.some(c => cho.includes(c) && c.length >= 2)) return true;
  }
  return false;
}

module.exports = { isBlocked, normalize, STEMS_CONTAIN, STEMS_EXACT, CHOSEONG, ALLOW };

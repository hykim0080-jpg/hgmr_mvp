// 단어검수_수정제안.md 기반 words.json 일괄 수정 스크립트
// 사용: node scratch/apply_fixes.js [--dry]
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const DRY = process.argv.includes('--dry');

const words = JSON.parse(fs.readFileSync(path.join(ROOT, 'words.json'), 'utf8'));
const md = fs.readFileSync(path.join(ROOT, '단어검수_수정제안.md'), 'utf8');

const log = { deleted: [], sentence: [], meaning: [], accepts: [], target: [], skipped: [] };

// ─── 1) 삭제 목록 (중복 동음이의어는 유지; 완전 동일 중복 4, 441만 삭제) ───
const DELETE = new Set([
  4, 441, // 완전 동일 중복 (뜻·문장까지 같음)
  // 활용형 target — 기본형 항목 존재
  108, 132, 168, 178, 195, 205, 217, 225, 228, 232, 234, 378, 416, 422, 442, 468, 473, 511,
  // 활용형/구절 target — 학습 가치 낮음
  119, 120, 154, 210, 230, 274, 280, 302, 312, 365, 379,
  // 전문용어·고유명사·시사 합성어
  239, 276, 297, 376, 502, 503, 519, 524, 817, 931, 1058,
]);

// ─── 2) target 전환 (활용형 → 기본형) ───
const TARGET_CONV = {
  20:  { target: '갱신', accepts: ['갱신', '연장'] },            // 문장 유지 (빈칸 뒤 '했다')
  116: { target: '등판', accepts: ['등판'] },                    // 문장 유지 (빈칸 뒤 '해')
  118: { target: '마무리', accepts: ['마무리', '완료'], transform: s => s.replace('____', '____하면') },
  122: { target: '맞춤화', accepts: ['맞춤화'], sentence: '항공사는 승객 개개인의 필요와 요구에 맞게 ____된 서비스를 제공하기 위해 투자를 지속해 왔다.' },
  155: { target: '발화', accepts: ['발화'], sentence: '갑자기 자신의 몸에서 ____한 자는 순식간에 자아를 잃고 고통스럽게 불타 버린다.' },
  194: { target: '불과', accepts: ['불과'], sentence: '그러나 전 세계 인공지능 핵심 인재 500명 가운데 우리나라 출신 비율은 1.4%에 ____한 실정이다.' },
  196: { target: '불복', accepts: ['불복', '반발'], sentence: '주대법원은 8 대 1의 의견으로 그가 승소하였다고 판결했고, 대학 측은 이에 ____하여 연방대법원에 상고하였다.' },
  296: { target: '영업이익', accepts: ['영업이익', '순익'], sentence: '그 회사는 마케팅 비용을 줄인 덕분에 1분기 ____이 크게 늘었다.' },
  452: { target: '첨가', accepts: ['첨가'], sentence: '이 요리는 후추를 ____하여 매운맛을 살린 점이 호평받고 있다.' },
  457: { target: '초빙', accepts: ['초빙', '영입'], sentence: '대학은 해외의 저명한 학자를 교수로 ____하기로 했다.' },
  514: { target: '표현', accepts: ['표현'], sentence: '그는 자신의 감정을 솔직한 말로 ____하는 데 서툴렀다.' },
  531: { target: '향상', accepts: ['향상', '증진'], sentence: '꾸준한 독서는 사고력 ____에 큰 도움이 된다.' },
};

// ─── 3) 문장 교체: md 섹션 3 테이블 파싱 ───
const sec3 = md.split('## 3.')[1].split('## 4.')[0];
const SPECIAL = new Set([70, 94]); // 부분 수정 항목은 별도 처리
const sentenceRows = [];
for (const line of sec3.split('\n')) {
  const m = line.match(/^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*(.+?)\s*\|\s*$/);
  if (!m) continue;
  const i = +m[1];
  if (SPECIAL.has(i)) continue;
  // 셀 끝의 괄호 주석 제거: (accepts...), (meaning...), (오타...), (끝부분...)
  let s = m[3].replace(/\s*\((accepts|meaning|오타|끝부분)[^)]*\)/g, '').trim();
  sentenceRows.push({ i, t: m[2].trim(), s });
}

// ─── 4) meaning 수정 (섹션 4 + 섹션 3 괄호 주석분 통합) ───
const MEANING = {
  16: '잘못된 것이나 부족한 것, 나쁜 것 따위를 고쳐 더 좋게 만듦',
  37: '서로 맞서 겨룸',
  149: '국가나 사회를 구성하는 일반 국민',
  227: '여럿 가운데서 어떤 것을 뽑아 정함',
  242: '법원에 재판을 청구하여 권리나 의무를 다투는 절차',
  249: '행정부 등 조직의 우두머리, 으뜸가는 자리에 있는 사람',
  251: '어떤 재화나 서비스를 일정한 가격에 사고자 하는 욕구',
  261: '소송에서 이김',
  272: '끝이 보이지 않을 만큼 깊은 곳. 헤어나기 어려운 깊은 상태를 비유하는 말',
  292: '어떤 일이나 사물에 대하여 깊이 있게 조사하고 생각하여 진리를 따져 보는 일',
  336: '겉으로 드러나지 않는 속사정이나 숨겨진 부분',
  377: '앞날을 헤아려 내다봄. 또는 내다보이는 장래의 상황',
  400: '사물의 내용을 명확히 알기 위하여 자세히 살펴봄',
  429: '허물이나 잘못 따위를 꼭 집어 말함',
  440: '모임이나 행사 따위를 주최하여 엶',
  499: '널리 퍼져 있음',
  554: '어떤 사물이나 사업의 밑바탕이 되는 기초',
  562: '법정에서 재판장이 판결을 알림',
  576: '어떤 대상의 내용이나 본질을 확실하게 이해하여 앎',
  580: '누르는 힘',
  585: '병이 들거나 다침, 또는 품질·가치·명예 따위가 떨어짐',
  591: '뒤에 오는 말이 앞의 내용과 상반됨을 나타내는 말',
  592: '머릿속에서 그려지는 사물의 모습이나 광경',
  594: '컴퓨터 등에 문자나 정보를 넣음',
  616: '사물이나 현상이 본래 가지고 있는 고유한 특성',
  694: '사물의 중심이 되는 골자 또는 요점',
  704: '자원이나 물자 따위가 다하여 없어짐',
  706: '일정한 규칙에 따라 식을 계산함',
  708: '엔진, 발전기 따위가 내는 힘이나 에너지의 양',
  727: '뛰어난 힘이나 기세로 남을 눌러 꼼짝 못 하게 함',
  734: '사물의 본질과 존재의 근본 원리를 사유와 직관으로 탐구하는 학문',
  747: '어떤 일이 생기려는 기운이 싹틈',
  753: '시대의 사조나 유행 따위의 맨 앞장',
  757: '어떤 일을 한 뒤에 돌아오는 좋은 결과나 만족감',
  762: '시대에 따라 변하는 세태나 사상의 경향',
  781: '말이나 글에 겉으로 드러난 그대로의 내용',
  787: '훌륭한 사람이 되도록 몸과 마음을 닦아 기름',
  823: '인격, 역량, 사상 따위가 발전하도록 가르치고 키움',
  884: '한 나라의 영토. 또는 어떤 세력이 미치는 영역이나 범위',
  908: '헐거나 깨뜨려 못 쓰게 만듦',
  910: '어떤 일을 유도하거나 변화시키는 계기가 되는 것. 화학 반응의 속도를 변화시키는 물질',
  918: '강물의 원줄기. 또는 사상이나 학술 따위의 주된 경향이나 갈래',
  955: '어떤 일을 행하거나 타인에 대하여 당연히 요구할 수 있는 힘이나 자격',
  981: '한집에서 사는 가족. 또는 학문·기술·예술 분야에서 독자적인 경지나 체계를 이룬 상태',
  1007: '나쁜 부분이나 요소들을 깨끗이 없애 버림',
  1043: '평가하거나 측정할 때 의거할 기준',
  1136: '다른 것에 영향을 받아 어떤 현상이 나타남. 또는 의견 등을 결과에 담아 나타냄',
  1156: '논리나 사고 등이 단계를 밟지 않고 건너뜀',
  1157: '일정한 원리에 따라 부분들이 짜임새 있게 조직되어 통일된 전체를 이루는 것',
  1163: '목표나 이해관계가 달라 서로 적대시하거나 충돌함. 또는 마음속에서 상반된 요구가 맞서 괴로워함',
  1173: '각본을 바탕으로 배우의 연기, 무대 장치, 의상, 조명 등을 종합적으로 지도하여 작품을 완성하는 일',
  1177: '어떤 목적을 이루기 위해 사람, 물자, 수단 등을 한데 모음',
};

// ─── 5) accepts 수정 ───
const ACCEPTS = {
  32:  a => a.filter(x => x !== '기점'),
  70:  () => ['근무', '재직'],
  137: () => ['무반주'],
  139: () => ['무실점'],
  199: () => ['비율'],
  467: a => a.filter(x => x !== '단정'),
  506: a => a.filter(x => x !== '축소'),
  510: () => ['포효'],
};

// ─── 검증: 섹션3 행의 target이 실제 데이터와 일치하는지 ───
let abort = false;
for (const { i, t } of sentenceRows) {
  if (!words[i]) { console.error(`❌ [${i}] 인덱스 없음`); abort = true; continue; }
  if (words[i].target !== t) {
    console.error(`❌ [${i}] target 불일치: 데이터="${words[i].target}" vs 제안="${t}"`);
    abort = true;
  }
}
if (abort) { console.error('중단: target 불일치 항목을 확인하세요.'); process.exit(1); }

// ─── 적용 ───
// 문장 교체
for (const { i, s } of sentenceRows) {
  if (!s.includes('____')) { log.skipped.push(`[${i}] 빈칸 없음: ${s.slice(0, 30)}`); continue; }
  words[i].sentence = s;
  log.sentence.push(i);
}
// 특수 부분 수정
words[70].sentence = words[70].sentence.replace('근무했다', '일했다'); // 정답 노출 제거
words[94].sentence = words[94].sentence.replace('쥐하게', '취하게');   // 오타
log.sentence.push(70, 94);
// 기여(74): 훼손 문장 교체 (동음이의어 쌍 유지)
words[74].sentence = '그는 평생 의학 발전에 큰 ____를 한 공로로 훈장을 받았다.';
log.sentence.push(74);
// 기미(557): meaning 끝 자기참조 제거
words[557].meaning = words[557].meaning.replace(/\s*≒\s*기미\.?\s*$/, '');
// 치중(740): meaning 끝 파싱 찌꺼기 제거
words[740].meaning = words[740].meaning.replace(/\s*≒\s*주중\.?\s*$/, '');

// target 전환
for (const [i, conv] of Object.entries(TARGET_CONV)) {
  const w = words[+i];
  w.target = conv.target;
  w.accepts = conv.accepts;
  if (conv.sentence) w.sentence = conv.sentence;
  if (conv.transform) w.sentence = conv.transform(w.sentence);
  log.target.push(+i);
}
// meaning
for (const [i, m] of Object.entries(MEANING)) { words[+i].meaning = m; log.meaning.push(+i); }
// accepts
for (const [i, fn] of Object.entries(ACCEPTS)) { words[+i].accepts = fn(words[+i].accepts); log.accepts.push(+i); }
// target이 accepts에 없으면 추가
for (const w of words) { if (!w.accepts.includes(w.target)) w.accepts.unshift(w.target); }

// 삭제 (index 기준 filter)
const result = words.filter((_, i) => !DELETE.has(i));
log.deleted = [...DELETE].sort((a, b) => a - b);

// ─── 최종 검증 ───
let errors = 0;
result.forEach((w, i) => {
  if (!w.sentence.includes('____')) { console.error(`❌ 빈칸 없음: ${w.target}`); errors++; }
  if (!w.accepts.includes(w.target)) { console.error(`❌ accepts에 target 없음: ${w.target}`); errors++; }
  const rest = w.sentence.replace(/_+/g, '');
  if (rest.includes(w.target)) console.warn(`⚠️ 정답 노출 의심: ${w.target} :: ${w.sentence.slice(0, 50)}`);
});

console.log(`\n=== 적용 결과 ${DRY ? '(DRY RUN — 저장 안 함)' : ''} ===`);
console.log(`문장 교체: ${new Set(log.sentence).size}건`);
console.log(`target 전환: ${log.target.length}건`);
console.log(`meaning 수정: ${log.meaning.length}건`);
console.log(`accepts 수정: ${log.accepts.length}건`);
console.log(`삭제: ${log.deleted.length}건 → ${words.length}개 → ${result.length}개`);
if (log.skipped.length) console.log(`건너뜀: ${log.skipped.length}건\n  ${log.skipped.join('\n  ')}`);
console.log(`검증 오류: ${errors}건`);

if (!DRY && errors === 0) {
  fs.writeFileSync(path.join(ROOT, 'words.json'), JSON.stringify(result, null, 1) + '\n');
  console.log('\n✅ words.json 저장 완료');
} else if (errors > 0) {
  console.error('\n❌ 검증 오류로 저장하지 않음');
  process.exit(1);
}

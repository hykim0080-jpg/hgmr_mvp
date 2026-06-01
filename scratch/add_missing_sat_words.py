"""
new_sat_words.json에서 words.json에 없는 단어들을 추가하는 스크립트.
¶ 예문을 활용해 sentence 필드를 구성하고 tags: ['수능']을 부여합니다.
"""
import json
import re


# ──────────────────────────────────────────
# 1. 데이터 로드
# ──────────────────────────────────────────
with open('/Users/hyk/Desktop/hgmr/scratch/new_sat_words.json', 'r', encoding='utf-8') as f:
    sat = json.load(f)

with open('/Users/hyk/Desktop/hgmr/words.json', 'r', encoding='utf-8') as f:
    words = json.load(f)

existing_targets = set(w['target'] for w in words)
missing_items = [item for item in sat if item['word'] not in existing_targets]
print(f"words.json: {len(existing_targets)}개 / 누락 단어: {len(missing_items)}개")


# ──────────────────────────────────────────
# 2. 헬퍼 함수
# ──────────────────────────────────────────
def extract_meaning(csv_meaning: str) -> str:
    """첫 번째 뜻풀이만 깔끔하게 추출."""
    text = csv_meaning.strip()
    # (1) 번호 제거
    text = re.sub(r'^\(\d+\)\s*', '', text)
    # ¶ / ≪ / 줄바꿈 / 다음 번호 앞에서 자름
    text = re.split(r'[¶≪\n]|\s*\(\d+\)', text)[0]
    # {분야} 태그 제거
    text = re.sub(r'\{[^}]*\}\s*', '', text)
    return text.strip(' .。,;')


def pick_best_example(csv_meaning: str, word: str) -> str | None:
    """단어를 포함하는 ¶ 예문 중 가장 긴 것을 반환."""
    raw_blocks = re.findall(r'¶\s*([^¶≪≫\n]+)', csv_meaning)
    candidates = []
    for block in raw_blocks:
        for part in block.split('/'):
            part = part.strip()
            if word in part:
                candidates.append(part)
    if not candidates:
        return None
    return max(candidates, key=len)


def has_batchim(char: str) -> bool:
    code = ord(char)
    if 0xAC00 <= code <= 0xD7A3:
        return (code - 0xAC00) % 28 > 0
    return False


def make_sentence(fragment: str, word: str) -> str:
    """단어를 ____로 교체하고 문장 형태로 마무리."""
    sentence = fragment.replace(word, '____', 1).strip()
    if not sentence or sentence[-1] not in '.!?。':
        sentence += '.'
    return sentence


def make_fallback_sentence(word: str, meaning: str) -> str:
    """¶ 예문이 없을 때 뜻풀이를 바탕으로 최소 문장 생성."""
    # ____의 particle은 항상 '의'를 사용해 받침 여부를 피함
    return f"이 글에서 ____의 개념을 정확히 파악하는 것이 중요하다."


# Level 3 판별용 고급 어휘 마커
ADVANCED_MARKERS = {
    '철학', '논리', '추상', '인식론', '형이상', '연역', '귀납', '변증',
    '관념론', '실증', '경험론', '선험', '사변', '현상학', '존재론',
    '윤리학', '명제', '전제', '귀결', '함축', '범주', '역설', '상대주의',
    '구조주의', '해석학', '담론', '패러다임', '이데올로기', '변증법',
}

def guess_level(word: str, meaning: str) -> int:
    combined = word + meaning
    if any(m in combined for m in ADVANCED_MARKERS):
        return 3
    # 한자어 계열 학술 어휘 (3글자 이상, 한자가 많이 쓰이는 패턴)
    if len(word) >= 4:
        return 2
    if len(word) == 3:
        return 2
    return 1


# ──────────────────────────────────────────
# 3. 누락 단어 변환
# ──────────────────────────────────────────
new_entries = []
fallback_count = 0
short_sentence_count = 0

for item in missing_items:
    word = item['word']
    csv = item['csv_meaning']

    meaning = extract_meaning(csv)
    if not meaning:
        meaning = f"{word}에 관한 어휘"

    best_frag = pick_best_example(csv, word)

    if best_frag:
        sentence = make_sentence(best_frag, word)
        if len(best_frag) < 10:
            short_sentence_count += 1
    else:
        sentence = make_fallback_sentence(word, meaning)
        fallback_count += 1

    level = guess_level(word, meaning)

    new_entries.append({
        "target": word,
        "accepts": [word],
        "meaning": meaning,
        "sentence": sentence,
        "level": level,
        "tags": ["수능"]
    })


# ──────────────────────────────────────────
# 4. words.json에 병합 후 저장
# ──────────────────────────────────────────
words.extend(new_entries)

with open('/Users/hyk/Desktop/hgmr/words.json', 'w', encoding='utf-8') as f:
    json.dump(words, f, ensure_ascii=False, indent=2)

print(f"\n완료! 추가된 단어: {len(new_entries)}개")
print(f"  - ¶ 예문 활용: {len(new_entries) - fallback_count}개")
print(f"  - 10자 미만 짧은 예문: {short_sentence_count}개 (admin에서 검토 권장)")
print(f"  - 예문 없어 템플릿 사용: {fallback_count}개 (admin에서 검토 필요)")
print(f"\n최종 words.json 단어 수: {len(words)}개")

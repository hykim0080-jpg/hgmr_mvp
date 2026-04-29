import requests
import json
import xml.etree.ElementTree as ET
import urllib3
import time
import os

# HTTPS 보안 인증서 에러 무시
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

API_KEY = "5C049958CB421B7492EC7E47CD5D722B"

# 이번에 추가하고 싶은 단어들
target_words = [
    "가설", "가시화", "가변성", "객관화", "거시적", "검증", "고찰", "과도기", "구체화", "국한",
    "규명", "기조", "귀결", "귀납적", "내삽", "내재성", "논거", "다각적", "다변화", "당위성",
    "도식화", "도출", "동향", "매개", "맥락", "모순", "모형", "미시적", "발산", "반추",
    "방증", "범주", "범주화", "변동성", "변인", "병행", "복잡성", "부합", "산출", "상관관계",
    "상충", "선행", "수량화", "수렴", "수반", "수용성", "시각화", "시사점", "신뢰도", "실효성",
    "양상", "역학", "연역적", "외삽", "요인", "우위", "원론적", "위상", "유연성", "유의미",
    "유추", "융합", "인과관계", "인위적", "인프라", "일관성", "일반화", "잠재적", "접근성", "전제",
    "정량적", "정성적", "정합성", "제고", "제어", "조작적", "종단적", "종속", "지연", "지표",
    "직관적", "착안", "체계화", "초래", "촉발", "최적화", "추이", "타당도", "타당성", "통계적",
    "통찰", "통합", "파급", "패러다임", "편차", "편중", "편익", "포괄적", "표본", "할당",
    "핵심적", "횡단적", "활성화"
]

output_filename = "new_words_draft.json"

# 1. 기존 파일 불러오기 (안전장치 적용)
existing_data = []
if os.path.exists(output_filename):
    try:
        with open(output_filename, "r", encoding="utf-8") as f:
            existing_data = json.load(f)
        print(f"📂 기존 파일에서 {len(existing_data)}개의 단어를 불러왔습니다.")
    except Exception:
        existing_data = []

existing_targets = [item['target'] for item in existing_data]
new_quiz_data = []
print("데이터 추출을 시작합니다... (자동 업데이트 모드 🔄)")

for word in target_words:
    if word in existing_targets:
        print(f"⏩ [{word}]는 이미 파일에 존재하여 건너뜁니다.")
        continue

    # [1단계] 검색 API로 target_code 찾기
    search_url = f"https://krdict.korean.go.kr/api/search?key={API_KEY}&q={word}&advanced=y&method=exact"
    
    try:
        response = requests.get(search_url, verify=False)
        root = ET.fromstring(response.text)
        
        total_node = root.find('.//total')
        if total_node is not None and int(total_node.text) > 0:
            target_code_node = root.find('.//target_code')
            
            # 고유 번호가 아예 없는 경우 방어
            if target_code_node is None:
                print(f"❌ [{word}] 고유 번호를 찾을 수 없습니다.")
                continue
            
            target_code = target_code_node.text
            
            # [2단계] 상세 조회 API
            view_url = f"https://krdict.korean.go.kr/api/view?key={API_KEY}&method=target_code&q={target_code}"
            view_response = requests.get(view_url, verify=False)
            view_root = ET.fromstring(view_response.text)
            
            # 뜻풀이 안전 추출 (못 찾으면 기본 문구 삽입)
            meaning_node = view_root.find('.//definition')
            meaning = meaning_node.text if meaning_node is not None else "사전에 등록된 뜻풀이가 없습니다."
            
            # 예문 안전 추출
            example_node = view_root.find('.//example')
            if example_node is not None and example_node.text:
                sentence = example_node.text.strip()
                masked_sentence = sentence.replace(word, "____")
            else:
                masked_sentence = f"[{word}]이(가) 들어간 예문을 직접 작성해주세요."
            
            synonyms = []
            for rel in view_root.findall('.//rel_info'):
                rel_type = rel.find('type')
                rel_word = rel.find('word')
                
                # 타입이 '비슷한말'이거나 '유의어'인 경우 추출
                if rel_type is not None and rel_word is not None:
                    if "비슷한" in rel_type.text or "유의어" in rel_type.text:
                        # 사전에는 '통합1', '모음2' 처럼 숫자가 붙어있는 경우가 많아 숫자 제거
                        import re
                        clean_word = re.sub(r'[^가-힣]', '', rel_word.text)
                        if clean_word and clean_word not in synonyms and clean_word != word:
                            synonyms.append(clean_word)

            new_quiz_data.append({
                "target": word,
                "accepts": synonyms, 
                "meaning": meaning,
                "sentence": masked_sentence,
                "level": 3
            })
            print(f"✅ [{word}] 추출 성공")
        else:
            print(f"❌ [{word}] 검색 결과 없음")
            
    except Exception as e:
        print(f"⚠️ [{word}] 에러 발생: {e}")
    
    # 서버 과부하 방지
    time.sleep(0.5)

# 2. 데이터 병합 및 저장
final_data = existing_data + new_quiz_data

with open(output_filename, "w", encoding="utf-8") as f:
    json.dump(final_data, f, ensure_ascii=False, indent=4)

print(f"\n🎉 업데이트 완료! 현재 총 {len(final_data)}개의 단어가 [{output_filename}]에 저장되어 있습니다.")
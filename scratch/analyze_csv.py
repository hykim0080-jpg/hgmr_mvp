import csv
import json
import os

csv_path = "/Users/hyk/Desktop/hgmr/어휘_정리.csv"
words_json_path = "/Users/hyk/Desktop/hgmr/words.json"

# NFD 자소 분리 파일명 대응
if not os.path.exists(csv_path):
    # NFD 정규화 파일명 시도
    import unicodedata
    nfd_path = unicodedata.normalize('NFD', csv_path)
    if os.path.exists(nfd_path):
        csv_path = nfd_path
    else:
        # 디렉토리 목록을 직접 조회해 비슷한 이름 찾기
        dir_files = os.listdir("/Users/hyk/Desktop/hgmr")
        for f in dir_files:
            if "어휘" in f and f.endswith(".csv"):
                csv_path = os.path.join("/Users/hyk/Desktop/hgmr", f)
                break

print(f"Reading CSV from: {csv_path}")

csv_words = []
with open(csv_path, "r", encoding="utf-8") as f:
    # 헤더 건너뜀 또는 DictReader 사용
    reader = csv.DictReader(f)
    for row in reader:
        word = row.get("단어", "").strip()
        meaning = row.get("뜻", "").strip()
        part = row.get("품사", "").strip()
        if word:
            csv_words.append((word, meaning, part))

print(f"Total rows in CSV: {len(csv_words)}")

# 고유 단어 추출
unique_csv_words = {}
for word, meaning, part in csv_words:
    if word not in unique_csv_words:
        unique_csv_words[word] = {"meaning": meaning, "part": part}

print(f"Unique words in CSV: {len(unique_csv_words)}")

# 기존 words.json 읽기
with open(words_json_path, "r", encoding="utf-8") as f:
    existing_data = json.load(f)

existing_targets = {w["target"] for w in existing_data}
print(f"Existing targets in words.json: {len(existing_targets)}")

# 기존에 없는 단어
new_candidates = [w for w in unique_csv_words.keys() if w not in existing_targets]
print(f"New candidates (not in existing): {len(new_candidates)}")

# 840개 중복 배제 선별
# 가나다라 정렬하여 상위 840개를 고르거나, 앞에서부터 840개를 골라보자.
# 사용자가 "총 단어가 840개야. 50개씩 나눠서, 총 840개 어휘를 전부 추가해줘"라고 하였으므로,
# unique_csv_words 중 기존 단어와 중복되지 않는 것을 840개 골라 추가하면 될 것이다.
selected_words = new_candidates[:840]
print(f"Selected words count: {len(selected_words)}")
print(f"First 10 selected: {selected_words[:10]}")
print(f"Last 10 selected: {selected_words[-10:]}")

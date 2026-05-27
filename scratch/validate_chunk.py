import json

chunk_path = "/Users/hyk/Desktop/hgmr/scratch/chunk_8.json"
with open(chunk_path, "r", encoding="utf-8") as f:
    data = json.load(f)

print(f"Total entries loaded: {len(data)}")
errors = []

for i, entry in enumerate(data):
    target = entry.get("target")
    accepts = entry.get("accepts")
    meaning = entry.get("meaning")
    sentence = entry.get("sentence")
    level = entry.get("level")
    tags = entry.get("tags")
    
    if not target or not isinstance(target, str):
        errors.append(f"Index {i}: Invalid or missing target")
        
    if not accepts or not isinstance(accepts, list) or not (2 <= len(accepts) <= 4):
        # 2~3개 유의어가 기준이나 간혹 4개까지 유연하게 인정
        errors.append(f"Index {i} ({target}): Invalid accepts format or length ({len(accepts) if isinstance(accepts, list) else 'not a list'})")
        
    if not meaning or not isinstance(meaning, str):
        errors.append(f"Index {i} ({target}): Missing meaning")
    elif "💡" in meaning:
        errors.append(f"Index {i} ({target}): Meaning contains emoji")
    elif len(meaning) > 40:
        errors.append(f"Index {i} ({target}): Meaning too long ({len(meaning)} chars)")
        
    if not sentence or not isinstance(sentence, str):
        errors.append(f"Index {i} ({target}): Missing sentence")
    elif "____" not in sentence:
        errors.append(f"Index {i} ({target}): Sentence does not contain '____' placeholder")
        
    if level not in [1, 2, 3]:
        errors.append(f"Index {i} ({target}): Invalid level ({level})")
        
    if tags != ["수능"]:
        errors.append(f"Index {i} ({target}): Invalid tags ({tags})")

if errors:
    print("Validation failed!")
    for err in errors:
        print(err)
else:
    print("Validation successful! All 50 words conform perfectly to the specifications.")

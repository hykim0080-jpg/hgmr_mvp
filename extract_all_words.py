import json
import os

words_file = "/Users/hyk/Desktop/hgmr/words.json"
if os.path.exists(words_file):
    with open(words_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    targets = [item["target"] for item in data]
    print(f"Total: {len(targets)}")
    print(json.dumps(sorted(targets), ensure_ascii=False))
else:
    print("Not found")

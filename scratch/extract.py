import json

with open("/Users/hyk/Desktop/hgmr/scratch/new_sat_words.json", "r", encoding="utf-8") as f:
    data = json.load(f)

print(f"Total elements: {len(data)}")
for i in range(650, min(700, len(data))):
    item = data[i]
    print(f"Index {i}: {item['word']}")

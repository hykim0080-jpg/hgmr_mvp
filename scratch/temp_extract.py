import json

with open('/Users/hyk/Desktop/hgmr/scratch/new_sat_words.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

chunk = data[500:550]

for i, item in enumerate(chunk):
    print(f"[{500+i}] {item['word']}")
    print(item['csv_meaning'])
    print("-" * 50)

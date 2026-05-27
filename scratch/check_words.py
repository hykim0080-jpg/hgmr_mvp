import json

input_path = '/Users/hyk/Desktop/hgmr/scratch/new_sat_words.json'
with open(input_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"Total elements: {len(data)}")
for i, item in enumerate(data[700:]):
    print(f"Index {700 + i}: {item['word']}")

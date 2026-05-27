import json
import os

input_path = '/Users/hyk/Desktop/hgmr/scratch/new_sat_words.json'

with open(input_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"Total words: {len(data)}")
sub_data = data[600:650]
print(json.dumps(sub_data, ensure_ascii=False, indent=2))

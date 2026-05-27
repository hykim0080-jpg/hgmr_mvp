import json

input_path = "/Users/hyk/Desktop/hgmr/scratch/new_sat_words.json"
with open(input_path, "r", encoding="utf-8") as f:
    data = json.load(f)

selected = data[350:400]
output_path = "/Users/hyk/Desktop/hgmr/scratch/raw_selected.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(selected, f, ensure_ascii=False, indent=2)

print("Saved raw selected words to raw_selected.json")

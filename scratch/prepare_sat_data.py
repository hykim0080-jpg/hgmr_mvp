import csv
import json
import os
import unicodedata

csv_path = "/Users/hyk/Desktop/hgmr/어휘_정리.csv"
words_json_path = "/Users/hyk/Desktop/hgmr/words.json"

# NFD 자소 분리 파일명 대응
if not os.path.exists(csv_path):
    nfd_path = unicodedata.normalize('NFD', csv_path)
    if os.path.exists(nfd_path):
        csv_path = nfd_path
    else:
        dir_files = os.listdir("/Users/hyk/Desktop/hgmr")
        for f in dir_files:
            if "어휘" in f and f.endswith(".csv"):
                csv_path = os.path.join("/Users/hyk/Desktop/hgmr", f)
                break

print(f"Reading CSV from: {csv_path}")

csv_words = {}
with open(csv_path, "r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        word = row.get("단어", "").strip()
        meaning = row.get("뜻", "").strip()
        if word:
            csv_words[word] = meaning

print(f"Total unique CSV words: {len(csv_words)}")

# Load existing words.json
with open(words_json_path, "r", encoding="utf-8") as f:
    existing_data = json.load(f)

# Update tags for existing words that match CSV
updated_existing_count = 0
for w in existing_data:
    target = w["target"]
    if target in csv_words:
        if "tags" not in w:
            w["tags"] = ["수능"]
            updated_existing_count += 1
        elif "수능" not in w["tags"]:
            w["tags"].append("수능")
            updated_existing_count += 1

print(f"Updated tags for {updated_existing_count} existing words in words.json.")

# Save updated words.json
with open(words_json_path, "w", encoding="utf-8") as f:
    json.dump(existing_data, f, ensure_ascii=False, indent=4)

# Find truly new words that are not in existing_data
existing_targets = {w["target"] for w in existing_data}
new_sat_words = []
for word, meaning in csv_words.items():
    if word not in existing_targets:
        new_sat_words.append({
            "word": word,
            "csv_meaning": meaning
        })

print(f"Number of truly new SAT words: {len(new_sat_words)}")

# Save to scratch/new_sat_words.json
scratch_dir = "/Users/hyk/Desktop/hgmr/scratch"
os.makedirs(scratch_dir, exist_ok=True)
new_sat_words_path = os.path.join(scratch_dir, "new_sat_words.json")

with open(new_sat_words_path, "w", encoding="utf-8") as f:
    json.dump(new_sat_words, f, ensure_ascii=False, indent=4)

print(f"Saved {len(new_sat_words)} new SAT words to: {new_sat_words_path}")

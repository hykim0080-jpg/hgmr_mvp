const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch'); // fallback if fetch not available

const wordsPath = path.join(__dirname, 'words.json');

async function getSynonyms(word) {
  // Use Datamuse API to get synonyms (ml=means like) limited to 20
  const url = `https://api.datamuse.com/words?ml=${encodeURIComponent(word)}&max=20`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.map(item => item.word).filter(w => w && w !== word);
  } catch (e) {
    return [];
  }
}

function fitsSentence(sentence, synonym) {
  // Simple check: replace blank with synonym and ensure no double spaces
  const filled = sentence.replace(/____/g, synonym);
  return !/\s{2,}/.test(filled);
}

async function updateAccepts() {
  const raw = fs.readFileSync(wordsPath, 'utf8');
  let entries;
  try {
    entries = JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse words.json');
    process.exit(1);
  }
  let processed = 0;
  for (const entry of entries) {
    const target = entry.target;
    const sentence = entry.sentence || '';
    const synonyms = await getSynonyms(target);
    const filtered = [];
    for (const syn of synonyms) {
      if (filtered.length >= 10) break;
      if (fitsSentence(sentence, syn)) {
        filtered.push(syn);
      }
    }
    entry.accepts = filtered; // replace with new list (0-10 items)
    processed++;
  }
  // Write back prettified JSON
  fs.writeFileSync(wordsPath, JSON.stringify(entries, null, 2), 'utf8');
  console.log(`Processed ${processed} entries. Updated accepts in words.json.`);
}

updateAccepts();

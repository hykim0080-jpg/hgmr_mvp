const fs=require('fs'),path=require('path');
const {initializeApp,cert}=require('firebase-admin/app');const {getFirestore}=require('firebase-admin/firestore');
initializeApp({credential:cert(require(path.join(__dirname,'serviceAccountKey.json')))});
const db=getFirestore();
const words=JSON.parse(fs.readFileSync('words.json','utf8'));
(async()=>{
  const snap=await db.collection('word_stats').get();
  const n=new Map(); let total=0;
  snap.docs.forEach(d=>{const s=Object.values(d.data().answers||{}).reduce((a,b)=>a+b,0); n.set(d.id,s); total+=s;});
  const b={'0 (없음)':0,'1-2':0,'3-4':0,'5-9':0,'10-19':0,'20+':0};
  for(const w of words){const c=n.get(w.target)||0;
    if(c===0)b['0 (없음)']++;else if(c<3)b['1-2']++;else if(c<5)b['3-4']++;else if(c<10)b['5-9']++;else if(c<20)b['10-19']++;else b['20+']++;}
  console.log(`표제어 ${words.length}개 · 통계 문서 ${snap.size}개 · 총 응답 ${total}건`);
  for(const [k,v] of Object.entries(b)) console.log(`  ${k.padEnd(9)} ${String(v).padStart(5)}개  ${(v/words.length*100).toFixed(1)}%`);
  const ge5=b['5-9']+b['10-19']+b['20+'];
  console.log(`  → 5건 이상: ${ge5}개 (${(ge5/words.length*100).toFixed(1)}%)`);
  process.exit(0);
})();

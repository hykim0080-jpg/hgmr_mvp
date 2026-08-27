// 🎯 배치고사 추정 편향 시뮬레이션 — 재입력(최대 3회)이 점수에 어떻게 새는가
const fs = require('fs');
const words = JSON.parse(fs.readFileSync(__dirname + '/words.json', 'utf8'));
const RATING_MIN = 800, RATING_MAX = 1900;
const PLACEMENT_CONFIRM = 4, PLACEMENT_HIGH = 1450, PLACEMENT_MAX = 22, PLACEMENT_MIN = 15, PLACEMENT_RETRIES = 2;

function wordDifficulty(w) {
  const tags = w.tags || [];
  let b = tags.includes('기초') ? 1000 : (w.level === 3 ? 1650 : w.level === 2 ? 1450 : 1250);
  b += Math.max(-60, Math.min(60, ((w.sentence || '').length - 39) * 1.5));
  b -= 15 * Math.min(4, (w.accepts || []).filter(a => a !== w.target).length);
  if (tags.some(t => ['학술_논리', '감정_심리', '격식_비즈니스'].includes(t))) b += 30;
  return Math.max(900, Math.min(1800, b));
}
const expectedP = (th, b) => 1 / (1 + Math.pow(10, (b - th) / 400));

// SCORING: 'now' = 몇 번 만에 맞혔든 1점 / 'first' = 첫 시도만 1점 / 'partial' = 1, 0.5, 0.25
function runOne(trueTheta, scoring, rho) {
  let pool = [...words];
  const sorted = [...pool].sort((a, b) => (wordDifficulty(a) - wordDifficulty(b)) || a.target.localeCompare(b.target));
  const span = Math.max(1, Math.round(sorted.length * 0.04));
  const taken = new Set();
  const anchors = [0.12, 0.38, 0.62, 0.88].map(p => {
    const c = Math.floor(sorted.length * p), lo = Math.max(0, c - span), hi = Math.min(sorted.length - 1, c + span);
    let w = null;
    for (let t = 0; t < 12 && !w; t++) { const cd = sorted[lo + Math.floor(Math.random() * (hi - lo + 1))]; if (cd && !taken.has(cd.target)) w = cd; }
    w = w || sorted[c]; taken.add(w.target); return w;
  });
  anchors.forEach(w => { const i = pool.indexOf(w); if (i >= 0) pool.splice(i, 1); });
  const bandT = [wordDifficulty(sorted[Math.floor(sorted.length * 0.33)]), wordDifficulty(sorted[Math.floor(sorted.length * 0.67)])];
  const bandsSeen = new Set();
  let theta = 1200, n = 0, hist = [], items = [], outs = [], confirmLeft = -1;
  const pick = () => {
    if (anchors.length) return anchors.shift();
    const tgt = confirmLeft > 0 ? 0.5 : 0.65;
    const scored = pool.map((w, i) => ({ i, gap: Math.abs(expectedP(theta, wordDifficulty(w)) - tgt) })).sort((a, b) => a.gap - b.gap);
    const c = scored.slice(0, 12)[Math.floor(Math.random() * Math.min(12, scored.length))];
    return pool.splice(c.i, 1)[0];
  };
  const finished = () => {
    if (n >= PLACEMENT_MAX || pool.length === 0) return true;
    if (confirmLeft === 0) return true;
    if (confirmLeft > 0) return false;
    if (n >= PLACEMENT_MIN && bandsSeen.size >= 2) {
      const last6 = hist.slice(-6);
      if (Math.max(...last6) - Math.min(...last6) <= 100) {
        if (theta >= PLACEMENT_HIGH) return false;
        confirmLeft = PLACEMENT_CONFIRM; return false;
      }
    }
    return false;
  };
  while (!finished()) {
    const w = pick(); if (!w) break;
    const b = wordDifficulty(w);
    const p = expectedP(trueTheta, b);
    // 응답 모형: 1차 시도는 p, 재시도는 부분 지식이므로 p*rho 로 성공
    let attempt = 0, ok = false;
    for (let a = 0; a <= PLACEMENT_RETRIES; a++) { attempt = a; if (Math.random() < (a === 0 ? p : p * rho)) { ok = true; break; } }
    let out;
    if (!ok) out = 0;
    else if (scoring === 'now') out = 1;
    else if (scoring === 'first') out = attempt === 0 ? 1 : 0;
    else out = attempt === 0 ? 1 : attempt === 1 ? 0.5 : 0.25;
    bandsSeen.add(b < bandT[0] ? 0 : b < bandT[1] ? 1 : 2);
    const K = Math.max(40, 120 - 6 * n);
    theta = Math.max(RATING_MIN, Math.min(RATING_MAX, theta + K * (out - expectedP(theta, b))));
    items.push(b); outs.push(out); if (confirmLeft > 0) confirmLeft--; n++; hist.push(theta);
  }
  let lo = RATING_MIN, hi = RATING_MAX;
  for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; let d = 0; for (let i = 0; i < items.length; i++) d += outs[i] - expectedP(m, items[i]); if (d > 0) lo = m; else hi = m; }
  return { est: (lo + hi) / 2, n };
}

const RHO = parseFloat(process.env.RHO || '0.5');
const TRIALS = 200;
console.log(`재시도 성공률 계수 rho=${RHO} · 시행 ${TRIALS}회`);
console.log('실제θ(고도)  | 지금(재시도도 1점) | 첫 시도만 | 부분점수(1/.5/.25)');
for (const th of [1000, 1150, 1300, 1450, 1600]) {
  const r = {};
  for (const s of ['now', 'first', 'partial']) {
    let sum = 0, cap = 0;
    for (let t = 0; t < TRIALS; t++) { const o = runOne(th, s, RHO); sum += o.est; if (o.est >= 1500) cap++; }
    r[s] = { bias: Math.round(sum / TRIALS - th), cap: Math.round(cap / TRIALS * 100) };
  }
  console.log(`θ=${th} (${th - 800}m) | ${String(r.now.bias).padStart(5)}m (700m상한 ${r.now.cap}%) | ${String(r.first.bias).padStart(5)}m (${r.first.cap}%) | ${String(r.partial.bias).padStart(5)}m (${r.partial.cap}%)`);
}

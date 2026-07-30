#!/usr/bin/env python3
"""
한글마루 — 실사용 빈도 기반 단어 레벨 재배정

무엇을 하나
  인터넷 텍스트(위키백과·뉴스·자막·웹·도서)에서 집계한 한국어 단어 빈도를 가져와
  1,390개 단어의 레벨을 일관된 기준으로 다시 매긴다.
  앱에 쌓인 실측 정답률이 있으면 그것으로 구간 경계를 보정하고,
  "새 레벨이 기존 레벨보다 실제 난이도를 잘 설명하는지"까지 검증한다.

왜 빈도인가
  현재 레벨은 수능 단어 722개를 일괄 도입할 때 78%가 Lv1로 배정되면서 무너졌다.
  레벨은 표시용 라벨이 아니라 wordDifficulty()를 거쳐 어휘 고도(Elo) 계산에 들어가므로,
  틀린 레벨은 곧 측정 왜곡이다. 빈도는 사람이 매기는 것보다 일관되고 재현 가능하다.

실행
  pip install wordfreq
  python3 relevel_by_frequency.py --words words.json [--stats word_stats_export.json]

산출
  레벨_재배정_제안.csv   target, 뜻, 기존레벨, 제안레벨, zipf, 근거
  콘솔에 분포 변화와 검증 결과
"""

import argparse, csv, json, math, os, re, sys
from collections import Counter, defaultdict

# ── 용언·파생어 처리 ────────────────────────────────────────────────
# wordfreq는 표면형 기준이라 '착잡하다' 같은 사전형이나 '직관적' 같은 파생어는
# 빈도가 낮게 잡힌다. 어근을 함께 조회해 가장 높은 값을 쓴다.
SUFFIXES = ['하다', '되다', '스럽다', '롭다', '이다', '적', '성', '화', '감', '력', '적인', '적으로']

def candidates(word: str):
    """조회할 표면형 후보 — 원형 + 어근 + 어근+하다"""
    out = [word]
    for suf in sorted(SUFFIXES, key=len, reverse=True):
        if word.endswith(suf) and len(word) > len(suf) + 1:
            stem = word[: -len(suf)]
            out += [stem, stem + '하다', stem + '한']
            break
    return list(dict.fromkeys(out))


def build_freq_lookup():
    try:
        from wordfreq import zipf_frequency
    except ImportError:
        sys.exit("wordfreq가 없습니다.  pip install wordfreq  로 설치한 뒤 다시 실행하세요.")

    def lookup(word):
        best, via = 0.0, word
        for c in candidates(word):
            z = zipf_frequency(c, 'ko')
            if z > best:
                best, via = z, c
        return best, via
    return lookup


# ── 구간 경계 ──────────────────────────────────────────────────────
# 기본값은 한국어 zipf 분포의 통상 감각에 맞춘 값이다.
#   zipf 4.0 이상 = 일상에서 흔함 / 3.0~4.0 = 글말에서 보임 / 3.0 미만 = 드묾
DEFAULT_CUTS = (4.00, 3.00)

def assign(zipf, cuts):
    hi, lo = cuts
    return 1 if zipf >= hi else (2 if zipf >= lo else 3)


def calibrate(pairs, grid=None):
    """
    실측 정답률이 있을 때 경계를 데이터로 정한다.
    pairs: [(zipf, accuracy)] — accuracy는 0~1
    목표: 세 구간의 평균 정답률이 단조 감소(Lv1 > Lv2 > Lv3)하면서 가장 잘 벌어지는 경계
    """
    if len(pairs) < 30:
        return None
    best, best_score = None, -1
    grid = grid or [round(x * 0.1, 1) for x in range(20, 61)]
    for lo in grid:
        for hi in grid:
            if hi - lo < 0.4:
                continue
            buckets = defaultdict(list)
            for z, acc in pairs:
                buckets[assign(z, (hi, lo))].append(acc)
            if any(len(buckets[l]) < 8 for l in (1, 2, 3)):
                continue
            m = {l: sum(v) / len(v) for l, v in buckets.items()}
            if not (m[1] > m[2] > m[3]):
                continue
            score = m[1] - m[3]                      # 구간이 잘 벌어질수록 좋다
            if score > best_score:
                best_score, best = score, (hi, lo)
    return best


def spearman(xs, ys):
    """순위상관 — 표본이 작고 관계가 단조라 피어슨보다 적합하다"""
    n = len(xs)
    if n < 3:
        return float('nan')
    def rank(v):
        order = sorted(range(n), key=lambda i: v[i])
        r = [0.0] * n
        i = 0
        while i < n:
            j = i
            while j + 1 < n and v[order[j + 1]] == v[order[i]]:
                j += 1
            avg = (i + j) / 2 + 1
            for k in range(i, j + 1):
                r[order[k]] = avg
            i = j + 1
        return r
    rx, ry = rank(xs), rank(ys)
    mx, my = sum(rx) / n, sum(ry) / n
    num = sum((a - mx) * (b - my) for a, b in zip(rx, ry))
    den = math.sqrt(sum((a - mx) ** 2 for a in rx) * sum((b - my) ** 2 for b in ry))
    return num / den if den else float('nan')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--words', default='words.json')
    ap.add_argument('--stats', help='word_stats 내보내기 (있으면 경계 보정·검증에 사용)')
    ap.add_argument('--out', default='레벨_재배정_제안.csv')
    ap.add_argument('--min-n', type=int, default=5, help='검증에 쓸 최소 응답 수')
    args = ap.parse_args()

    words = json.load(open(args.words, encoding='utf-8'))
    lookup = build_freq_lookup()

    # 1) 빈도 조회
    rows = []
    for w in words:
        z, via = lookup(w['target'])
        rows.append({'w': w, 'zipf': z, 'via': via})

    missing = [r for r in rows if r['zipf'] == 0]
    print(f"단어 {len(rows)}개 · 빈도 조회 실패 {len(missing)}개 "
          f"({len(missing)/len(rows)*100:.1f}%)")
    if missing[:8]:
        print("  실패 예:", ', '.join(r['w']['target'] for r in missing[:8]))

    # 2) 실측 정답률 (있으면)
    acc = {}
    if args.stats and os.path.exists(args.stats):
        stats = json.load(open(args.stats, encoding='utf-8'))
        for target, d in (stats.items() if isinstance(stats, dict) else []):
            answers, total = d.get('answers', {}), d.get('total', 0)
            if total >= args.min_n:
                correct = answers.get(target, 0)
                acc[target] = correct / total
        print(f"실측 정답률: {len(acc)}개 단어 (n≥{args.min_n})")

    # 3) 경계 결정
    cuts = DEFAULT_CUTS
    pairs = [(r['zipf'], acc[r['w']['target']]) for r in rows
             if r['w']['target'] in acc and r['zipf'] > 0]
    if pairs:
        fitted = calibrate(pairs)
        if fitted:
            cuts = fitted
            print(f"경계 보정: zipf ≥ {cuts[0]} → Lv1 · ≥ {cuts[1]} → Lv2 · 그 미만 → Lv3  (실측 {len(pairs)}개로 적합)")
        else:
            print(f"경계 보정 실패(표본 부족) — 기본값 사용 {DEFAULT_CUTS}")
    else:
        print(f"실측 없음 — 기본 경계 사용 {DEFAULT_CUTS}")

    # 4) 배정
    for r in rows:
        # 빈도를 못 찾은 단어는 함부로 옮기지 않는다 (기존 레벨 유지)
        r['new'] = r['w'].get('level', 2) if r['zipf'] == 0 else assign(r['zipf'], cuts)

    # 5) 분포 변화
    old_d, new_d = Counter(w['w'].get('level') for w in rows), Counter(r['new'] for r in rows)
    print("\n분포 변화")
    print("  레벨 |  기존  →  제안")
    for l in (1, 2, 3):
        print(f"    {l}  | {old_d[l]:5d}  → {new_d[l]:5d}")
    changed = [r for r in rows if r['new'] != r['w'].get('level')]
    print(f"  변경 대상: {len(changed)}개 ({len(changed)/len(rows)*100:.0f}%)")

    # 6) 검증 — 새 레벨이 기존보다 실제 난이도를 잘 설명하는가
    if pairs:
        ev = [r for r in rows if r['w']['target'] in acc and r['zipf'] > 0]
        a = [acc[r['w']['target']] for r in ev]
        print("\n검증 (실측 정답률과의 순위상관 — 음수이고 절댓값이 클수록 좋음)")
        print(f"  기존 레벨 vs 정답률 : {spearman([r['w'].get('level') for r in ev], a):+.3f}")
        print(f"  제안 레벨 vs 정답률 : {spearman([r['new'] for r in ev], a):+.3f}")
        print(f"  zipf     vs 정답률 : {spearman([r['zipf'] for r in ev], a):+.3f}  (부호 반대가 정상)")
        for label, key in (('기존', lambda r: r['w'].get('level')), ('제안', lambda r: r['new'])):
            b = defaultdict(list)
            for r in ev:
                b[key(r)].append(acc[r['w']['target']])
            s = ' · '.join(f"Lv{l} {sum(b[l])/len(b[l])*100:4.1f}% (n={len(b[l])})"
                           for l in sorted(b) if b[l])
            print(f"  {label} 레벨별 평균 정답률: {s}")

    # 7) CSV
    with open(args.out, 'w', encoding='utf-8-sig', newline='') as f:
        wr = csv.writer(f)
        wr.writerow(['target', '뜻', '기존레벨', '제안레벨', 'zipf', '조회형', '변경'])
        for r in sorted(rows, key=lambda r: (-abs(r['new'] - (r['w'].get('level') or 0)), -r['zipf'])):
            w = r['w']
            wr.writerow([w['target'], (w.get('meaning') or '')[:60], w.get('level'),
                         r['new'], f"{r['zipf']:.2f}", r['via'],
                         'Y' if r['new'] != w.get('level') else ''])
    print(f"\n저장: {args.out}")
    print("반영 전에 변경 폭이 큰 것부터 눈으로 훑어보세요. 빈도 0인 단어는 기존 레벨을 유지했습니다.")


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
precheck_generated.py — 자동 생성 문항 CSV 사전검증

  add_words.js / check_words.js 앞단에 두는 필터.
  기존 두 검증기가 잡지 않는 것만 본다:
    · 목표어·유의어 노출        (P39 — 답이 새어 나감)
    · 고유명사 잔존             (자동 생성의 존재 이유)
    · 기사 문체·연도·금액 수치  (원문 회상 신호)
    · accepts 공백/비한글       (check_words 는 경고만)
    · 조사 불일치               (check_words --fix 가 유의어를 '조용히 삭제')
    · 길이 이상 · 빈칸 개수 · 태그 허용목록 · level 범위

사용:
  python3 docs/precheck_generated.py 생성물.csv
  python3 docs/precheck_generated.py 생성물.csv --pass 통과분.csv

종료 코드: 반려가 하나라도 있으면 1
"""
import csv, re, sys, unicodedata, collections

ALLOWED_TAGS = set("""기초 학술_논리 교육_학술 학술_윤리 철학_인문 학교_배움 수능
격식_비즈니스 비즈니스 경제_경영 경제 경제_금융 사회_경제 금융
사회 사회_문화 사회_일반 사회_제도 사회_직업 사회_행사 사회_관계 사회_정치
문화_예술 문화 문화_스포츠 법률 법률_제도 스포츠 스포츠_게임 미디어
사회_기본 관계_소통 감정_심리 심리 감정_기분""".split())

JOURNAL = [
    "로 알려졌다","라고 밝혔다","고 밝혔다","라고 전했다","고 전했다",
    "것으로 나타났다","라고 설명했다","고 설명했다","할 전망이다","할 방침이다",
    "에 나선다","회사 측은","업계에 따르면","관계자는","에 따르면","것으로 집계",
]
# 역사·일반은 허용, 현존 고유명사만 금지
PROPER = re.compile(
    r"[A-Za-z]{2,}"                                   # 라틴 문자
    r"|(19|20)\d{2}\s*년?"                            # 연도
    r"|\d[\d,\.]*\s*(억원|억 원|조원|만원|억달러|달러|엔|퍼센트|%)"   # 금액·비율
    r"|\d+\.\d+"                                      # 소수 통계
    r"|[가-힣]{2,4}(전자|그룹|자동차|은행|증권|화학|건설|백화점|항공|통신|"
    r"제철|중공업|생명|카드|텔레콤|물산|바이오|제약|엔터|게임즈|소프트|금융)"
)
SAFE_PARTICLES = "에 에서 도 만 까지 부터 처럼 보다 마다 의".split()

def jong(ch):
    o = ord(ch)
    return (o - 0xAC00) % 28 if 0xAC00 <= o <= 0xD7A3 else -1

def has_batchim(w):  return jong(w[-1]) > 0
def is_rieul(w):     return jong(w[-1]) == 8

def particle_fits(w, p):
    if not w: return True
    b = has_batchim(w)
    return {"이":b, "을":b, "은":b, "과":b,
            "가":not b, "를":not b, "는":not b, "와":not b,
            "로": (not b) or is_rieul(w),
            "으로": b and not is_rieul(w)}.get(p, True)

def trailing_particle(s):
    m = re.search(r"____(으로|이|가|을|를|은|는|와|과|로)(?=[\s,.!?~)\]]|$)", s)
    return m.group(1) if m else None

def is_verb(target, ending):
    if ending is not None and ending != "":
        return True
    if ending == "":
        return False
    return bool(re.search(r"다$", target)) and len(target) > 1

def _leak(body, word):
    """노출 검사.
       앞 글자가 한글이면 더 긴 합성어의 꼬리일 수 있어 '의심'(경고)으로 낮춘다.
       예: 목표어 '인과' vs 뜻풀이 '원인과 결과' — 오탐.
       뒤에 붙는 조사·어미는 한국어에서 정상이므로 판정에 쓰지 않는다."""
    hits = [m.start() for m in re.finditer(re.escape(word), body)]
    if not hits: return None
    han = lambda c: bool(c) and "가" <= c <= "힣"
    for i in hits:
        # 한국어는 뒤에 조사·어미가 붙는 것이 정상이므로 '뒤'는 판정에 쓰지 않는다.
        # 앞에 한글이 붙어 있으면 더 긴 합성어의 꼬리일 가능성이 크다 (원인과 ⊃ 인과).
        if not han(body[i-1] if i > 0 else ""):
            return "block"
    return "warn"

def check(row, i):
    e = []; warn = []
    t   = (row.get("target") or "").strip()
    sen = (row.get("sentence") or "").strip()
    mng = (row.get("meaning") or "").strip()
    lvl = (row.get("level") or "").strip()
    end = row.get("ending")
    acc = [a.strip() for a in (row.get("accepts") or "").split(",") if a.strip()]
    tags= [a.strip() for a in (row.get("tags") or "").split(",") if a.strip()]

    if not t:   e.append("target 없음")
    if not mng: e.append("meaning 없음")
    if not sen: e.append("sentence 없음")
    if not t or not sen: return e

    n = sen.count("____")
    if n != 1: e.append(f"빈칸이 {n}개 (정확히 1개여야 함)")

    body = sen.replace("____", "")
    for label, word, hay in ([("목표어", t, body)]
            + [("목표어 어간", re.sub(r"(하다|되다|다)$", "", t), body)]
            + [("유의어", a, body) for a in acc if a != t]
            + [("뜻풀이의 목표어", t, mng)]):
        if not word or len(word) < 2 or (label == "목표어 어간" and word == t): continue
        r = _leak(hay, word)
        if r == "block": e.append(f"{label} '{word}' 노출")
        elif r == "warn": warn.append(f"{label} '{word}' 노출 의심 — 더 긴 낱말의 일부. 눈으로 확인")

    for a in acc:
        if not re.fullmatch(r"[가-힣]+", a):
            e.append(f"accepts '{a}' — 공백/비한글 (check_words 위생 경고 대상)")

    m = [x.group(0) for x in PROPER.finditer(sen)]
    if m: e.append(f"고유명사·수치 의심: {m[:4]}")
    for j in JOURNAL:
        if j in sen: e.append(f"기사 문체 '{j}'")

    L = len(sen)
    if L < 22: e.append(f"예문이 짧음 ({L}자 · 권장 25~65)")
    if L > 75: e.append(f"예문이 김 ({L}자 · 권장 25~65)")
    if len(mng) > 45: e.append(f"뜻풀이가 김 ({len(mng)}자)")

    if lvl not in ("1","2","3"): e.append(f"level '{lvl}' (1~3)")
    for tg in tags:
        if tg not in ALLOWED_TAGS: e.append(f"허용되지 않은 태그 '{tg}'")
    if not tags: e.append("태그 없음 — 주제 학습에 안 나옴")

    if not is_verb(t, end):
        p = trailing_particle(sen)
        if p:
            if not particle_fits(t, p):
                e.append(f"빈칸 뒤 조사 '{p}' — 목표어 '{t}'와 안 맞음")
            bad = [a for a in acc if a != t and re.fullmatch(r"[가-힣]+", a) and not particle_fits(a, p)]
            if bad:
                e.append(f"빈칸 뒤 조사 '{p}' — 유의어 {bad}와 안 맞음. "
                         f"⚠️ check_words --fix 가 이 유의어를 삭제합니다. "
                         f"조사를 {SAFE_PARTICLES[:3]} 중 하나로 바꾸세요")
    return e, warn

def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__); sys.exit(2)
    path = args[0]
    out = args[args.index("--pass")+1] if "--pass" in args else None

    rows = list(csv.DictReader(open(path, encoding="utf-8-sig")))
    ok, ng, warns, reasons = [], [], [], collections.Counter()
    for i, r in enumerate(rows, 1):
        e, wn = check(r, i)
        if wn: warns.append((i, r, wn))
        if e:
            ng.append((i, r, e))
            for x in e: reasons[re.sub(r"'[^']*'", "'…'", x.split(" · ")[0])] += 1
        else:
            ok.append(r)

    for i, r, e in ng:
        print(f"\n❌ {i}행 [{r.get('target','?')}]  {r.get('sentence','')}")
        for x in e: print(f"     - {x}")
    if warns:
        print(f"\n{'-'*54}\n⚠️  눈으로 확인할 것 {len(warns)}건 (반려 아님)")
        for i, r, wn in warns:
            print(f"  {i}행 [{r.get('target','?')}]")
            for x in wn: print(f"     - {x}")

    print(f"\n{'='*54}\n통과 {len(ok)} / 전체 {len(rows)}  ·  반려 {len(ng)}  ·  확인 요망 {len(warns)}")
    if reasons:
        print("\n반려 사유 (많은 순 — 프롬프트를 고칠 곳):")
        for k, v in reasons.most_common():
            print(f"  {v:3d}  {k}")
    if out and ok:
        with open(out, "w", encoding="utf-8", newline="") as f:
            wcsv = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            wcsv.writeheader(); wcsv.writerows(ok)
        print(f"\n통과분 {len(ok)}건 → {out}")
    sys.exit(1 if ng else 0)

if __name__ == "__main__":
    main()

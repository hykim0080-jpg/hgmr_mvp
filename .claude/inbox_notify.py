#!/usr/bin/env python3
"""한글마루 편지함 감시 알림 — launchd WatchPaths가 파일 변경 시 실행한다.

두 편지함의 미처리(🔴·🟡) 항목 수를 세어, **직전과 달라졌을 때만** macOS 알림을 띄운다.
Claude를 실행하지 않는다. 파일을 고치지도 않는다. '켤 타이밍'만 알린다.

수동 확인:  python3 .claude/inbox_notify.py --test
"""

import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATE = os.path.join(ROOT, ".claude", ".inbox_notify_state.json")

BOXES = [
    ("_cowork_to_code.md", "Code가 읽을 요청"),
    ("_code_to_cowork.md", "Cowork가 읽을 요청"),
]


def pending_count(path):
    """미처리(🔴·🟡) ## 블록 수. 훅(cowork_inbox.py)과 같은 규칙을 쓴다."""
    try:
        with open(path, encoding="utf-8") as f:
            text = f.read()
    except OSError:
        return 0
    except UnicodeDecodeError:
        return 0
    text = re.split(r"^<!--\s*보관", text, flags=re.M)[0]        # 보관선 아래 무시
    text = re.sub(r"^```.*?^```", "", text, flags=re.M | re.S)   # 코드 펜스 안 예시 무시
    n = 0
    for b in re.split(r"^## ", text, flags=re.M)[1:]:
        head = b.split("\n", 1)[0]
        if "\U0001F534" in head or "\U0001F7E1" in head:  # 🔴 🟡
            n += 1
    return n


def notify(title, message):
    """osascript로 알림. 실패해도 조용히 넘어간다 (권한 미승인·비 macOS 등)."""
    def esc(s):
        return s.replace("\\", "\\\\").replace('"', '\\"')
    script = 'display notification "%s" with title "%s"' % (esc(message), esc(title))
    try:
        subprocess.run(
            ["osascript", "-e", script],
            check=False,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=10,
        )
    except Exception:
        pass


def main():
    test = "--test" in sys.argv
    counts = {name: pending_count(os.path.join(ROOT, name)) for name, _ in BOXES}
    total = sum(counts.values())

    parts = ["%s %d건" % (label, counts[name]) for name, label in BOXES if counts[name]]
    summary = " · ".join(parts) if parts else "미처리 없음"

    if test:
        print("저장소:", ROOT)
        for name, label in BOXES:
            print("  %-22s %s %d건" % (name, label, counts[name]))
        print("알림 문구:", summary)
        notify("한글마루 편지함 (테스트)", summary)
        return

    # 직전 상태와 같으면 조용히 넘어간다 — 저장할 때마다 알림이 반복되지 않도록
    try:
        with open(STATE, encoding="utf-8") as f:
            prev = json.load(f)
    except Exception:
        prev = None

    if prev == counts:
        return

    try:
        os.makedirs(os.path.dirname(STATE), exist_ok=True)
        with open(STATE, "w", encoding="utf-8") as f:
            json.dump(counts, f)
    except OSError:
        pass

    if total == 0:
        return  # 다 처리된 상태는 굳이 알리지 않는다

    notify("한글마루 편지함", summary)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("inbox_notify 건너뜀: %s" % e, file=sys.stderr)
    sys.exit(0)

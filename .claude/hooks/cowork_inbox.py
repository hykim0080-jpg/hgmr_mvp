#!/usr/bin/env python3
"""SessionStart 훅 — Cowork가 보낸 미처리 메시지를 세션 컨텍스트에 주입한다.

동작
  1. `_cowork_to_code.md` 를 읽는다 (없으면 조용히 통과)
  2. `<!-- 보관` 아래는 무시한다
  3. `## ` 로 시작하는 블록 중 제목에 🔴(요청) 또는 🟡(진행 중)이 있는 것만 고른다
  4. 하나도 없으면 아무것도 출력하지 않는다 — 대기 중인 요청이 없다는 뜻
  5. 있으면 stdout으로 hookSpecificOutput JSON을 내보내 컨텍스트에 주입한다

처리를 마치고 제목의 🔴/🟡를 ✅ 또는 💬로 바꾸면 다음 세션부터 자동으로 사라진다.
별도의 '읽음' 상태 파일이 필요 없는 이유다.

의존성: python3 표준 라이브러리만 사용 (jq 불필요 — macOS 기본 설치에 jq가 없음)
어떤 경우에도 exit 0 — 훅 실패가 세션 시작을 막지 않게 한다.
"""

import json
import os
import re
import sys

INBOX_NAME = "_cowork_to_code.md"
OUTBOX_NAME = "_code_to_cowork.md"
CHAR_LIMIT = 6000  # 주입 길이 상한 — 편지함이 길어져도 컨텍스트를 잠식하지 않도록


def project_root():
    env = os.environ.get("CLAUDE_PROJECT_DIR")
    if env and os.path.isdir(env):
        return env
    # 훅 파일 위치(.claude/hooks/)에서 두 단계 위가 저장소 루트
    return os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def strip_code_fences(text):
    """``` 펜스 블록을 제거한다 — 작성 템플릿 안의 예시 제목이 오탐되지 않도록."""
    return re.sub(r"^```.*?^```", "", text, flags=re.M | re.S)


def pending_blocks(text):
    """제목에 🔴 또는 🟡가 있는 ## 블록만 원문 그대로 반환."""
    # 보관 구분선은 '줄 맨 앞'에 있을 때만 인정한다.
    # 본문 중간에 인라인 코드로 `<!-- 보관 -->` 를 언급해도 잘리지 않도록.
    text = re.split(r"^<!--\s*보관", text, flags=re.M)[0]
    text = strip_code_fences(text)
    blocks = re.split(r"^## ", text, flags=re.M)[1:]
    out = []
    for b in blocks:
        head = b.split("\n", 1)[0]
        if "\U0001F534" in head or "\U0001F7E1" in head:  # 🔴 🟡
            out.append("## " + b.rstrip())
    return out


def main():
    root = project_root()
    path = os.path.join(root, INBOX_NAME)
    try:
        with open(path, encoding="utf-8") as f:
            text = f.read()
    except OSError:
        return  # 편지함이 아직 없음 — 조용히 통과

    blocks = pending_blocks(text)
    if not blocks:
        return  # 대기 중인 요청 없음 — 아무것도 주입하지 않는다

    body = "\n\n".join(blocks)
    note = ""
    if len(body) > CHAR_LIMIT:
        body = body[:CHAR_LIMIT].rstrip()
        note = "\n\n…(길어서 잘렸습니다. 전문은 %s 참조)" % INBOX_NAME

    context = (
        "📥 **Cowork에서 온 미처리 메시지 %d건** (`%s`)\n\n"
        "%s%s\n\n"
        "---\n"
        "처리했으면 `%s`에서 해당 항목의 🔴/🟡를 **✅로 바꿔 주세요.** "
        "그래야 다음 세션에 다시 뜨지 않습니다.\n"
        "회신은 `%s` 맨 위에 씁니다 (상대 파일은 읽기 전용)."
        % (len(blocks), INBOX_NAME, body, note, INBOX_NAME, OUTBOX_NAME)
    )

    print(json.dumps(
        {
            "hookSpecificOutput": {
                "hookEventName": "SessionStart",
                "additionalContext": context,
            }
        },
        ensure_ascii=False,
    ))


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # 훅이 세션 시작을 막지 않도록 어떤 예외도 삼킨다
        print("cowork_inbox 훅 건너뜀: %s" % e, file=sys.stderr)
    sys.exit(0)

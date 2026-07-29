# 한글마루 (hgmr)

문맥 속 빈칸채우기로 어휘력을 키우는 국어 학습 앱. 웹(Firebase Hosting) + Capacitor로 iOS·Android.
포지셔닝: **"나의 마지막 국어 공부"**

---

## 📬 소통 규약 — 세션 시작 시 반드시 확인

이 저장소는 **Claude Code(개발)** 와 **Claude Cowork(기획·마케팅·문서)** 두 쪽이 함께 작업합니다.
서로 다른 세션이라 컨텍스트가 공유되지 않으므로, 아래 두 파일이 유일한 소통 채널입니다.

| 파일 | 쓰는 쪽 | 읽는 쪽 |
|---|---|---|
| `_code_to_cowork.md` | **Claude Code (나)** | Cowork |
| `_cowork_to_code.md` | Cowork | **Claude Code (나)** |

**규칙**

- **각자 자기 파일에만 쓴다.** 상대 파일은 읽기 전용 — 동시 편집 충돌을 막기 위함
- 새 글은 **맨 위**에, `## 상태 YYYY-MM-DD · 제목` 형식
- 상태: 🔴 요청(대기) · 🟡 진행 중 · ✅ 완료 · 💬 공유(액션 불필요)
- **처리한 항목은 상태를 ✅로 바꾼다.** SessionStart 훅이 🔴·🟡 항목만 골라 주입하므로, ✅로 바꾸면 다음 세션부터 자동으로 안 뜬다
- 오래된 항목은 파일 맨 아래 `<!-- 보관 -->` 아래로 내린다 (그 아래는 훅이 무시)

> 세션 시작 시 `_cowork_to_code.md`의 미처리 항목은 **훅이 자동으로 주입**합니다(`.claude/hooks/cowork_inbox.py`).
> 주입된 게 없으면 대기 중인 요청이 없다는 뜻입니다. Cowork에 회신할 때는 `_code_to_cowork.md` 맨 위에 씁니다.

---

## 🎨 브랜드 규칙 — 사용자 노출 문구를 건드릴 때

기준 문서: **`브랜드_브리핑.md`** (용어 규칙은 2절). UI 문구·스토어 문구·안내 메시지를 쓰거나 고칠 때 반드시 따릅니다.

**'한글'과 '어휘'는 다른 개념입니다.** 한글 = 문자 체계, 어휘 = 이 앱이 가르치는 것.

| ❌ 금지 | ✅ 대신 |
|---|---|
| 한글 공부 / 한글 학습 | 어휘 공부 / 국어 공부 / 우리말 공부 |
| 한글 마스터 | 어휘 마스터 |
| 한글 실력 | 어휘력 / 문해력 |

- 브랜드명 **'한글마루'는 고유명사**이므로 그대로 사용
- **'한국어 공부'도 피할 것** — 모어 화자에게는 외국인 학습자(KFL) 표현으로 읽힘. **'국어 공부'**가 맞음
- 마스코트 **하랑이**(하프물범)의 말투는 반말·다정하고 담백. 유아용 과잉 애교 금지 (타깃에 성인 포함)

---

## 🗂 파일 소유권

**Claude Code(나)가 코드를 소유합니다.** Cowork는 아래 코드 파일을 건드리지 않기로 되어 있습니다.

| Cowork가 건드려도 되는 것 | 코드(나)만 건드리는 것 |
|---|---|
| `AppStore_메타데이터.md` | `index.html`, `www/index.html` |
| `브랜드_브리핑.md` | `words.json`, `www/words.json` |
| `docs/` 이하 문서 | `firebase.json`, `.firebaserc`, `firestore.rules` |
| `_cowork_to_code.md` | `ios/`, `android/`, `node_modules/` |

Cowork가 단어 데이터 수정이 필요하면 `_cowork_to_code.md`에 **제안만** 남깁니다. 반영은 내가 하고, `npm run check-words`를 통과시켜야 합니다.

---

## 🛠 자주 쓰는 명령

```bash
npm run build          # index/privacy/terms/words/service-worker → www/
firebase deploy --only hosting
npm run check-words    # 단어 데이터 품질 검사 (--fix 로 자동 수정)
npm run sync-words     # Firestore 검수 결과 → words.json
npm run fetch-reports  # 단어 신고함 내려받기
npm run admin          # 로컬 관리자 패널 (localhost:4000/admin.html)
```

## 📐 구조 메모

- **`index.html` 단일 파일 앱** (약 6,400줄). 전체가 하나의 `<script type="module">` 블록 — 함수는 모두 같은 스코프
- `www/` 는 **빌드 산출물**. 직접 고치지 말고 루트 파일을 고친 뒤 `npm run build`
- 화면·구역의 공식 명칭은 **`화면_명칭_가이드.md`** (DOM id와 1:1). 소통 시 이 명칭을 사용
- `admin.html` 은 로컬 전용 — `.gitignore`에 있고 배포 번들에 넣지 않음
- 사용자 행동 계측은 `track(name, params)` 사용. Firebase Analytics를 `isSupported()` + try/catch로 격리해 두었으므로 실패해도 학습 흐름은 안 막힘

## ⚠️ 현재 주의사항

- ✅ **번들 ID 통일 완료** (2026-07-30) — iOS·Android·Capacitor 모두 **`com.hgmr.app`**. Firebase iOS 앱도 이 번들 ID로 재등록했고 구글 로그인 검증 완료. 구 `com.hyk.hgmr` iOS 앱은 Firebase 콘솔에서 정리 예정
- **'❄️ 빙하 키보드'는 비활성** — `usesGlacierKeyboard()`가 `false` 하드코딩. 프로필 설정 시트의 선택 섹션은 **부모 div에 `display:none`이 걸려 이미 숨겨져 있음**(index.html 약 1882줄). 버튼 마크업만 보고 "노출 중"으로 오판하지 말 것. 재활성화하려면 그 `display:none` 제거 + 함수 원복(바로 윗줄 주석)
- **`node_modules`가 git에 추적 중** (2,092개). `.gitignore`에는 추가됨 — `git rm -r --cached node_modules` 필요
- **`terms.html`·`privacy.html`은 배포 여부를 내용으로 확인할 것** — `firebase.json`의 SPA 리라이트 때문에 서버에 없는 파일도 **HTTP 200에 앱 화면**을 반환함. 상태 코드만으로는 링크 깨짐이 안 잡힘
- 외부 링크는 모두 **`hgmr.co.kr`** 로. `hgmr-9109e.web.app`은 백업 도메인이며 스토어 제출에 쓰지 않음

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

**요청의 범위 — 사용자의 지시는 언제나 프로젝트 전체(Cowork + Code) 대상이다.**
"이건 제 담당 영역이 아닙니다"라며 되돌려 보내지 않는다. 다만 **처리 방식**은 소유권을 따른다 — 자기 소유가 아닌 영역은 **편집하지 않되**, 조사·진단까지 마친 뒤 상대 편지함에 🔴로 넘긴다. 손대지 않는 것은 *편집*이지 *관여*가 아니다.
코드 요청을 남길 때는 상대가 바로 착수할 수 있도록 **증상 · 재현 조건 · 원인 추정(파일:줄) · 기대 동작**을 함께 적는다.

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

## 📚 단어 데이터는 원격으로 갱신된다 (2026-08-27)

`words.json`은 앱에 번들되지만, **네이티브 앱은 실행할 때마다 `https://hgmr.co.kr/words.json`을 받아 저장**하고 다음 실행부터 그걸 쓴다. 문항을 고칠 때 심사를 기다리지 않아도 된다 — `firebase deploy` 하나로 끝난다.

- 순서: ① 번들 사본으로 즉시 시작 → ② 저장된 원격 사본이 검증을 통과하면 그걸 사용 → ③ 백그라운드로 새 사본을 받아 저장(**이번 세션에는 안 쓴다** — 학습 도중 문제 목록이 바뀌지 않게)
- **웹은 캐시를 쓰지 않는다.** `fetch('words.json')` 자체가 이미 최신(`no-cache` 헤더)이라, 캐시를 쓰면 오히려 옛것을 보게 된다
- 앱을 업데이트해 번들이 바뀌면(`wordsFingerprint` 불일치) 옛 캐시를 버린다
- ⚠️ **심사라는 안전망이 없는 경로다.** 잘못된 파일을 배포하면 즉시 모든 기기에 나간다. `validWordList()`(절대 하한 300개 · 번들의 90% 이상 · 필수 필드)를 통과한 것만 저장하고, 하나라도 어긋나면 조용히 번들을 유지한다. **배포 전 `npm run check-words` 필수**
- 회귀 테스트: `node tests/words_remote.mjs` — 웹 캐시 안 씀 / 정상 저장 / 잘린 파일이 기존 캐시를 안 덮음 / 깨진 캐시여도 앱이 뜸

## 🛠 자주 쓰는 명령

```bash
npm run build          # index/privacy/terms/words/service-worker → www/
firebase deploy --only hosting
npm run check-words    # 단어 데이터 품질 검사 (--fix 로 자동 수정)
npm run sync-words     # Firestore 검수 결과 → words.json
npm run fetch-reports  # 단어 신고함 내려받기
npm run admin          # 로컬 관리자 패널 (localhost:4000/admin.html)
```

**릴리스 빌드** (화면 없는 맥에서도 로그만으로 돌아가도록 스크립트화)

```bash
zsh build_release.sh   # Android AAB + iOS 아카이브·내보내기 → _build4.log
                       #   SKIP_ANDROID=1 / SKIP_ARCHIVE=1 로 부분 재실행
zsh resign_ios.sh      # 내보낸 IPA 재서명 (Apple 로그인 엔타이틀먼트 복원) → _resign4.log
```

**E2E 테스트** (puppeteer-core + 설치된 Chrome, 아이폰 UA로 모바일 경로를 태운다)

```bash
node tests/retry_stats.mjs                       # 재출제 문항 오답 통계
PROFILE=weak node tests/placement_progress.mjs   # 배치고사 진행 표시 (weak=수렴 경로)
node tests/clean_test_stats.js --apply           # ⚠️ 테스트가 남긴 더미 답안 정리 — 실행 후 필수
```

## 📐 구조 메모

- **`index.html` 단일 파일 앱** (약 6,900줄). 전체가 하나의 `<script type="module">` 블록 — 함수는 모두 같은 스코프
- `www/` 는 **빌드 산출물**. 직접 고치지 말고 루트 파일을 고친 뒤 `npm run build`
- 화면·구역의 공식 명칭은 **`화면_명칭_가이드.md`** (DOM id와 1:1). 소통 시 이 명칭을 사용
- **하랑이 산은 정의가 하나다** — `#mt-core`(본체·지느러미·눈모자·얼굴)·`#mt-sky-ladder`·`#mt-sea`와 `mtG`/`seaG` 그라데이션이 전역 스프라이트 `<defs>`에 있고, **홈 히어로와 「어휘 고도란?」 모달이 `<use>`로 같이 쓴다.** 좌표계는 정상 y=30 · 해발 0m y=200 · 바닥 y=224. 한쪽만 고쳐서 둘이 갈라지게 하지 말 것(2026-08-26 이전에 실제로 갈라져 있었다)
- **배치고사 전 홈은 &lsquo;바다&rsquo; 상태다** — 자리표시자를 따로 만들지 않는다. 같은 산 좌표계에서 크롭 창을 수면 아래(`viewBox 0 186 340 118`)로 내리고, 하랑이를 `#fr-lookup`(올려다보는 자세, 104px)으로 바꾼다. 고도선·그림자는 숨기고 헤더는 &lsquo;아직 재지 않았어요&rsquo; + &lsquo;측정 전&rsquo; 칩. `#mt-sea`의 바다 사각형이 y=340까지 내려오는 것은 이 때문이니 줄이지 말 것
- **측정 전/후는 서로의 흔적을 지워야 한다** — 배치고사를 방금 마치면 같은 렌더에서 산 상태로 넘어간다. `measured` 분기 첫머리에 바다 상태가 건드린 것(글자 크기·칭호 칩 색·고도선 표시·하랑이 크기)을 되돌리는 블록이 있다 — 지우면 배치고사 직후 홈이 반쯤 바다 상태로 남는다
- **홈 산은 확대가 아니라 크롭이다** — `#home-mtn-svg`의 viewBox `0 (고도y − 66) 340 118` 를 JS가 옮긴다(`preserveAspectRatio="slice"`). 산 크기는 고정이고 창만 움직이므로, **마루에 닿아야 정상 사다리와 구름이 보인다** — 이 보상 구조를 없애지 말 것
- **하랑이는 두 화면 모두 `mountainEdgeX(y)`로 산 왼쪽 실루엣 위에 앉는다** — 산 본체 path 마지막 3차 베지에를 이분법으로 역산. `window.mountainEdgeX`로 노출돼 있고 E2E가 쓴다
- **하랑이 스프라이트는 `<defs>` 안의 `<g id="fr-...">`** — 대기 `fr-idle-*`, 칭찬 `fr-clap-*`, 오답 `fr-wrong-*`, 레벨업 `fr-lv-*`, 그리고 **굴러 오르는 `fr-roll-a|b|c`**. 좌표계는 320×320이고 발끝(접지선)이 y≈300에 오도록 그린다 — 홈 산 마커가 `y = 능선y - 50`, 높이 52, viewBox `10 10 300 300`으로 붙이기 때문. 목도리는 반드시 `var(--scarf-color, #10B981)`을 쓸 것(사용자 설정 색을 따라야 한다)
- **굴러 오르는 하랑이는 접속마다 바뀐다** — `pickRollingHarang()`이 `localStorage.hgmrRollPose`에 직전 모습을 남기고 그것을 뺀 나머지에서 뽑는다. 한 세션 안에서는 `rollPoseThisSession`으로 고정. 함수 정의 직후 한 번, 대시보드 그릴 때 한 번 호출한다(로그인 화면에서도 마커가 이미 DOM에 있어서, 대시보드 호출만으로는 기본값 A안이 굳는다)
- `admin.html` 은 로컬 전용 — `.gitignore`에 있고 배포 번들에 넣지 않음
- 사용자 행동 계측은 `track(name, params)` 사용. Firebase Analytics를 `isSupported()` + try/catch로 격리해 두었으므로 실패해도 학습 흐름은 안 막힘
- **칭호는 두 갈래** — 자동(어휘 고도 등급 5단계, `ratingTier`) / 장착(7개, `buildTitleOptions`). 레벨로 칭호를 주던 `getLevelTitle()`은 호출부가 없어 삭제됨(2026-08-25)
- **업적 해제 조건은 `ACHIEVEMENTS` 배열 한 곳에만 둔다** — 예전엔 홈 배지 개수·업적 모달·학습 분석 세 곳에 복제돼 있어, 조건을 바꿀 때마다 값이 서로 어긋났다
- `www/shot.html` 은 **스토어 스크린샷 촬영 전용 페이지** — `make_shot.js`가 빌드 때 `index.html`에 전체화면 메타만 주입해 생성. 소스 파일은 따로 없다

## ⚠️ 현재 주의사항

- 🚧 **심사 중 배포 동결 (2026-08-27 iOS 빌드 9 제출)** — `words.json` 을 배포하지 말 것. 앱이 실행할 때마다 원격 단어를 받아 가므로, **심사자가 보는 내용과 제출한 빌드가 어긋날 수 있다.** 단어 수정은 쌓아 두었다가 심사 결과가 난 뒤 한 번에 내보낸다. `index.html` 변경(웹 배포)도 같은 이유로 미룰 것. **심사 결과가 나오면 이 항목을 지운다.**

- ✅ **번들 ID 통일 완료** (2026-07-30) — iOS·Android·Capacitor 모두 **`com.hgmr.app`**. Firebase iOS 앱도 이 번들 ID로 재등록했고 구글 로그인 검증 완료. 구 `com.hyk.hgmr` iOS 앱은 Firebase 콘솔에서 정리 예정
- **'❄️ 빙하 키보드'는 비활성** — `usesGlacierKeyboard()`가 `false` 하드코딩. 프로필 설정 시트의 선택 섹션은 **부모 div에 `display:none`이 걸려 이미 숨겨져 있음**(index.html 약 1882줄). 버튼 마크업만 보고 "노출 중"으로 오판하지 말 것. 재활성화하려면 그 `display:none` 제거 + 함수 원복(바로 윗줄 주석)
- ✅ **`node_modules` git 추적 해제 완료** (2026-08-25 확인 — `git ls-files node_modules` 0건)
- **`terms.html`·`privacy.html`은 배포 여부를 내용으로 확인할 것** — `firebase.json`의 SPA 리라이트 때문에 서버에 없는 파일도 **HTTP 200에 앱 화면**을 반환함. 상태 코드만으로는 링크 깨짐이 안 잡힘
- 외부 링크는 모두 **`hgmr.co.kr`** 로. `hgmr-9109e.web.app`은 백업 도메인이며 스토어 제출에 쓰지 않음
- **HTML·`words.json`은 캐시 재검증 강제** (2026-08-25) — `firebase.json`의 `headers`에 `no-cache`. 기본값 `max-age=3600` 탓에 배포 후 한 시간 동안 옛 화면이 서빙돼 "고쳤는데 왜 그대로냐"를 두 번 겪었다. 루트(`/`)는 SPA 리라이트로 서빙되어 `**/*.html` 패턴에 안 걸리므로 별도 항목이 있다 — 지우지 말 것
- **`initializeAuth()`를 쓴다면 `popupRedirectResolver`를 반드시 함께 넘길 것** (2026-08-26) — `getAuth()`와 달리 `initializeAuth()`는 팝업/리다이렉트 리졸버를 자동으로 넣어주지 않는다. 빠지면 웹에서 `signInWithPopup`이 **팝업조차 열지 않고 `auth/argument-error`로 즉시 실패**한다. 구글·애플 로그인이 이 이유로 5/27부터 3개월간 웹에서 죽어 있었다(네이티브는 `signInWithCredential`이라 무사). 지금은 `browserPopupRedirectResolver`를 넘긴다 — 지우지 말 것
- **`index.html`에 standalone(전체화면) 메타를 넣지 말 것** — iOS 홈 화면 앱에서는 `window.open`이 Safari로 빠져나가 `signInWithPopup` 기반 구글·애플 로그인이 **실패**한다. 촬영용 전체화면 페이지는 `/shot.html`로 분리돼 있다
- **어휘 고도는 내려갈 수 있다** (P17 개정, 2026-08-23) — 칭호와 최고 기록만 유지된다. *"한 번 오른 고도는 절대 내려가지 않아요"* 류의 문구를 다시 쓰지 말 것 (앱·스토어 문구에서 이미 한 번 걷어냈다)
- **문항을 고치면 그 표제어의 응답 통계도 지워야 한다** — `word_stats`는 표제어로만 묶여 있어서, 뜻풀이·예문을 바꿔도 옛 답안이 남는다. 그러면 「사람들은 이 문장을 어떻게 완성했을까요?」가 **지금 화면과 다른 문제**에 대한 답을 보여준다(실제로 '관건'에 옛 뜻 기준 답인 '잠금'·'보안'이 남아 있었다). `node reset_word_stats.js --since 30 --apply` — 항상 홈에 백업을 먼저 남긴다. 출시 직전에는 `--all`로 한 번 비우는 것을 권한다
- **정답률 진단은 `node word_accuracy.js`** — '모르겠어요'(정답 보기)와 장난 입력은 분모에서 빼고 포기율을 따로 센다. 이걸 안 빼면 포기가 오답으로 잡혀 문항이 실제보다 어려워 보인다
- **`--kb-height`는 키보드가 내려가는 도중 값에 오염될 수 있다** — 사파리는 키보드 전환 중 중간 높이로 `visualViewport.resize`를 여러 번 쏜다. 예전 코드는 `kb > 80`이기만 하면 그대로 반영해서, **닫히는 도중의 작은 값(예: 96px)이 마지막으로 남았다.** 통계 패널이 그 자리를 그대로 쓰기 때문에 패널이 짧게 떴다. 지금은 한 번 열린 동안의 **최대치만** 채택하고 완전히 닫히면 다시 잰다(`kbPeak`). 패널 높이는 `min(52vh, max(var(--kb-height), 440px))` — 키보드 자리보다 커도 된다(정답 공개 후라 위쪽은 비어 있다). 440px 은 탭·제목·표본 줄·표 머리·막대 5줄·다음 버튼이 다 들어가는 값이고, 52vh 는 작은 기기에서 문장·뜻풀이까지 덮지 않게 하는 상한이다. **네이티브(Capacitor)는 플러그인이 정확한 높이를 주므로 이 경로를 타지 않는다 — 웹 전용 문제다**

- **통계 패널이 내용 높이만큼만 뜬다면 `--kb-height`가 잘못 들어간 것이다.** `height: min(…, max(var(--kb-height), 440px))` 는 var 치환이 실패하면(`NaNpx` 등) **선언 전체가 무효가 되어 `height:auto`로 떨어진다.** CSS 폴백(`330px`)은 var 가 *비어 있을 때만* 쓰이지, *잘못된 값*은 못 막는다. 그래서 var 를 쓰지 않는 **`min-height: min(52vh, 440px)` 를 안전망으로 함께 둔다** — 다른 속성이라 같이 무효화되지 않는다.
- **`#inline-stats-container` 는 마크업에 인라인 `style` 이 있다** (`padding/border/border-radius/box-shadow/background`). 인라인은 스타일시트보다 항상 세다 — `.kb-slot` 에서 이 속성들을 바꾸려면 **`!important` 가 필요하다.** 이걸 빠뜨려서 시트 모양이어야 할 패널에 2px 테두리가 사방으로 남고 아래 모서리까지 둥글었던 적이 있다.
- **패널이 뜻풀이를 덮지 않게 하는 건 CSS 상한만으로 안 된다.** 뜻풀이가 길거나 사용자가 글씨를 키우면 52vh 로도 잘린다. 등장 직후 `meaning-text` 바닥과 패널이 앉을 자리를 재서 겹치면 그만큼 패널을 낮춘다(최소 340px). ⚠️ 이때 **`getBoundingClientRect().top` 을 쓰면 안 된다** — 등장 연출(`translateY`) 중이라 최종 위치가 아니다. `window.innerHeight - offsetHeight` 로 계산할 것. 넣은 인라인 높이는 패널을 접을 때 반드시 지운다.
- **배치고사 채점은 «첫 시도»만 1점이다.** 오답 시 재입력 기회를 2번 더 주는데(`PLACEMENT_RETRIES = 2`), 그 성공까지 1점으로 세면 실제 정답률이 모형의 `expectedP` 보다 훨씬 높아져 θ가 통째로 부풀려진다. `node sim_placement.js`(200시행): 재시도도 1점이면 **+145~190m 과대평가**, θ≥1450 인 사용자는 90~100%가 표시 상한 700m 에 붙는다. 첫 시도만 세면 편향 ±10m. **IRT/Elo 는 "한 번 물어봤을 때 맞히는가"를 모형으로 삼는다 — 채점 규칙이 모형과 어긋나면 추정이 아니라 상한이 나온다.** 회귀 테스트: `node tests/placement_retry.mjs` (절반은 한 번에, 절반은 틀린 뒤 정답 → 700m 에 붙으면 실패).
- **평균 정답률의 분자·분모는 반드시 «같은 자리»에서 함께 움직인다** (`showInlineStats` 안). 예전엔 분자를 채점부에서, 분모를 `showInlineStats` 에서 올려서 한쪽만 오르는 경로가 생겼다. `Math.min(분자, 분모)` 클램프가 이걸 **100% 로 가려 버려서** 오래 눈치채지 못했다 — 클램프는 마지막 안전망이지 해결이 아니다. 옛 계정은 분모 필드가 생기기 전 분자만 쌓여 있어(예: 344/27) 로드 시 **분자 > 분모면 둘 다 0으로 리베이스**한다. 두 필드는 `syncUserData()` 에도 항상 같이 쓴다. 회귀 테스트: `node tests/accuracy_pair.mjs`.

- 회귀 테스트: `node tests/stats_fit.mjs`(막대 5줄이 스크롤 없이 보이나) · `node tests/stats_cover.mjs`(문장·뜻풀이가 안 가리나, 긴 뜻풀이 강제 포함). 둘 다 운영 `word_stats` 를 건드리므로 실행 후 `node tests/clean_test_stats.js --apply`.
- **통계창은 두 탭이다** — 「사람들의 답」(응답 분포)과 「유의어 · 예문」. 뒤쪽은 응답 데이터와 무관하게 항상 채워진다. 유의어도 힌트도 없는 단어가 40%라, 그 경우엔 *"이 자리에는 ○○ 말고 대신 쓸 만한 말이 거의 없어요"* 를 보여준다 — 대체어가 없다는 것도 정보다. **처음 보이는 탭은 유의어·예문** 쪽이다: 내 답 하나로 「정답 100%」를 그리는 순간을 만들지 않기 위해서다
- **화면에 실제로 몇 줄이 보이는지 재려면 줄을 만들어서 재라** — 갓 만든 테스트 계정은 응답 분포가 1줄뿐이라 '보이는 줄 = 전체 줄'이 언제나 참이 된다. `tests/stats_fit.mjs`는 막대 행을 5줄로 복제한 뒤 스크롤 영역 안에 몇 개가 들어오는지 잰다
- **E2E에서 빈 배열의 `every()`는 항상 참이다** — 통계창 테스트가 배치고사 화면에서 돌아 표본을 하나도 못 모았는데 전 항목 ✅로 나온 적이 있다. **표본 수 자체를 먼저 단언할 것.** 참고로 **배치고사 화면에는 통계창이 없다** — 통계창을 보려면 배치고사를 끝내고 일반 세션에 들어가야 한다
- **E2E 테스트는 운영 Firestore에 쓴다** — `tests/*.mjs`가 제출한 답이 `word_stats`에 남는다. 일반 학습뿐 아니라 **배치고사도** `recordWordStat()`을 탄다. 돌린 뒤 반드시 `node tests/clean_test_stats.js --apply`
- **맥 릴리스 빌드의 두 함정** (둘 다 `build_release.sh`에 반영·주석 처리됨)
  - AGP는 Java 17+ 필요한데 시스템 기본이 Corretto 11 → `JAVA_HOME`을 Android Studio 번들 JBR로 지정
  - 같은 "Apple Distribution" 인증서가 **login 키체인에도** 있어, 검색 경로에 login이 남아 있으면 codesign이 그쪽 잠긴 키를 골라 **보이지 않는 암호 창에 영구히 멈춘다**. 서명 중에는 `security list-keychains -d user -s hgmrbuild.keychain`으로 한정하고, 끝나면 `trap`으로 반드시 복구할 것
- **아카이브는 `CODE_SIGNING_ALLOWED=NO`로 만들고 `-exportArchive`에서 서명한다** (SPM 리소스 번들이 프로비저닝 프로파일을 못 받는 문제 회피). 그 대가로 `App.entitlements`의 `com.apple.developer.applesignin`이 빠지므로 `resign_ios.sh`로 재서명해야 한다 — 빼먹으면 애플 로그인이 죽은 채로 스토어에 올라간다

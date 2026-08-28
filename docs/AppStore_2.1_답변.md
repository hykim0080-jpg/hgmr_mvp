# App Store 심사 2.1 「Information Needed」 대응 (2026-08-28)

> Apple은 **거절이 아니라 정보를 요청**했습니다. 새 앱 제출에 최근 일괄 적용되는 절차입니다.
> 아래 영문을 **App Store Connect → 해결 센터(Resolution Center)** 답장에 그대로 붙여 넣으면 됩니다.
> 빌드를 다시 올릴 필요는 없습니다.

---

## 0. 먼저 채워야 할 빈칸

| 자리 | 채울 것 |
|---|---|
| `[DEVICE / IOS]` | 실제로 테스트한 아이폰 모델과 iOS 버전 (예: `iPhone 14 Pro, iOS 18.5`) |
| `[SIMULATOR / IOS]` | Xcode 시뮬레이터로도 돌려 봤다면 그 기종·버전. 안 했으면 **그 줄을 통째로 지우세요** |
| `[VIDEO URL]` | 화면 녹화 영상 주소 — 녹화본을 주시면 `https://hgmr.co.kr/review/hgmr-demo.mp4` 로 올려 드립니다 |

---

## 1. 심사용 데모 계정 (생성 완료)

```
Email:    appreview@hgmr.co.kr
Password: HgmrReview2026!
```

- 이메일 인증까지 **이미 완료 처리**해 두었으므로 바로 로그인됩니다.
- App Store Connect → **앱 심사 정보 → 로그인 필요** 체크 → 위 값을 사용자 이름/암호 칸에 입력해 주세요.
  (지금은 「로그인 불필요」로 되어 있을 텐데, Apple이 계정 자격증명을 요구했으니 켜는 편이 안전합니다.)

**학습 이력을 미리 심어 두었습니다** — 48단어 학습 · 해발 **652m** · 연속 5일 · 지혜 조각 17.
고도는 세션(20문항)을 끝내야 정산되는 구조라, 빈 계정으로 녹화하면 배치고사 20문항 + 학습 20문항을
다 찍어야 홈에 숫자가 뜹니다. 이력을 심어 두면 **로그인 직후 홈에 고도가 보이므로** 녹화가 3분으로 끝납니다.
배치고사 안내창도 뜨지 않습니다(학습 이력이 있는 계정은 대상 제외).

- 녹화에서 이 계정으로 **탈퇴**를 시연한 뒤에는 알려 주세요. 같은 아이디·비밀번호로 다시 만들고
  이력까지 그대로 다시 심어 두겠습니다 (명령 두 줄이면 됩니다).

---

## 2. 화면 녹화 대본 (아이폰 실기기, 약 3분)

**준비** — 설정 › 제어 센터에 「화면 기록」 추가 · 방해금지 모드 켜기 · TestFlight **빌드 9** 설치 확인 ·
앱을 앱 스위처에서 완전히 밀어 종료(실행 장면이 찍혀야 함)

| # | 화면 | 할 일 | 왜 필요한가 |
|---|---|---|---|
| 1 | 홈 화면 | 녹화 시작 → **아이콘을 눌러 앱 실행**. 스플래시부터 | Apple 1번: "must begin with launching the app" |
| 2 | 로그인 | **회원가입** 탭 → 아무 새 이메일 + 비밀번호 → 가입 → "이메일 인증 후 로그인할 수 있어요" 안내까지 (20초) | 계정 **등록** 흐름 |
| 3 | 로그인 | **로그인** 탭 → `appreview@hgmr.co.kr` / `HgmrReview2026!` | 계정 **로그인** 흐름 |
| 4 | 홈 | **해발 652m·연속 5일·조각 17이 보이는 것**을 2~3초 머무르며 보여주기 | 핵심 기능 ① 진척·수준 표시 |
| 5 | 학습 | 학습 시작 → 문장 빈칸에 답 입력 → 정답/오답 → **통계·유의어·예문 패널** 확인 → 다음. **3~4문항 반복** | 핵심 기능 ② 문맥 빈칸 학습 |
| 6 | 학습 | 좌상단 **X**로 나가기 → 홈 복귀 | — |
| 7 | 프로필 | 프로필 › **계정 관리** › **회원 탈퇴** › 안내 읽고 › `탈퇴` 입력 › 탈퇴하기 → 로그인 화면 복귀 | 계정 **삭제** 흐름 (5.1.1(v)) |

**끝까지 안 해도 되는 것** — 20문항 세션을 완주할 필요 없습니다. 4번에서 이미 고도가 보이므로
5번은 학습 방식만 보여주면 충분합니다.

**찍지 않아도 되는 것** — 결제·구독 없음, 사용자 생성 콘텐츠 없음, 위치·카메라·연락처·ATT 권한 요청 없음.

**끝난 뒤** — 사진 앱 › 영상 › 공유 › **"파일에 저장" › iCloud Drive**. 제가 맥에서 꺼내 사이트에 올리겠습니다.

---

## 3. 해결 센터에 붙여 넣을 영문 답변

```text
Hello,

Thank you for the review. Please find the requested information below.

1) SCREEN RECORDING

A screen recording captured on a physical iPhone running the latest iOS is
available here:

  [VIDEO URL]

The recording begins with launching the app from the Home screen and shows,
in order: account registration (email), sign-in, the placement test, the core
vocabulary-learning loop, the progress screen, and the in-app account deletion
flow.

The app has no paid content, no subscriptions, no in-app purchases, and no
user-generated content. It does not request access to location, contacts,
camera, photos, microphone, or App Tracking Transparency, so no such prompts
appear in the recording.

2) DEVICES AND OPERATING SYSTEMS TESTED

  - [DEVICE / IOS]  (physical device, TestFlight build 9)
  - [SIMULATOR / IOS]  (Xcode Simulator)
  - Safari and Chrome on macOS (the app also ships as a web app at
    https://hgmr.co.kr)

3) APP FUNCTION AND TARGET AUDIENCE

Hangeulmaru ("한글마루") is a Korean vocabulary and reading-comprehension
trainer for native Korean speakers - adults and secondary-school students
alike.

Problem it solves: most Korean vocabulary apps are multiple-choice quizzes, so
the learner recognizes a word without being able to produce it. Hangeulmaru
instead presents a natural Korean sentence with one word removed and asks the
learner to type the missing word. Producing the word from context, rather than
picking it from a list, is what builds usable vocabulary and reading
comprehension.

How it works: 1,388 curated items, each with a context sentence, a definition
hint, and a set of accepted answers including synonyms. An IRT/Elo-based
placement test estimates the learner's level on first launch, expressed as an
"altitude" on a mountain. Each correct first-try answer raises that altitude
and earns in-app points ("wisdom shards") that have no monetary value and
cannot be purchased.

Value provided: a short daily session that measurably improves the vocabulary
an adult Korean speaker can actively use in writing and speech.

4) SETUP AND ACCESS INSTRUCTIONS

No setup, configuration, or sample files are required. Install and launch.

The app offers four ways in: Sign in with Apple, Google, email + password, and
an anonymous "browse without signing in" option that grants full access to
every feature.

A demo account is provided in the App Review Information section:

  Username: appreview@hgmr.co.kr
  Password: HgmrReview2026!

(The email address of this account is already verified, so it signs in
immediately.)

A brand-new account begins with a short adaptive placement test that estimates
the learner's level. The demo account above already has study history, so it
goes straight to the home screen, where the estimated level is shown as an
altitude on a mountain (currently 652 m). Tap the start button to begin a
session: type the word that fits the blank and press Enter or the confirm
button. After each answer the app shows what other learners answered, plus
synonyms and further examples.

Account deletion is at Profile > Account settings > Delete account, and
requires typing a confirmation word.

5) EXTERNAL SERVICES USED

  - Firebase Authentication (Google LLC) - sign-in, including Sign in with
    Apple and Google Sign-In
  - Cloud Firestore (Google LLC) - stores the learner's own progress
  - Firebase Analytics (Google LLC) - anonymous usage counts
  - Firebase Hosting (Google LLC) - serves the web build at https://hgmr.co.kr
  - Google Fonts - web fonts

There are no payment processors, no AI services, no advertising SDKs, and no
third-party data providers. All learning content ships inside the app bundle;
the app makes no third-party content requests at runtime.

6) REGIONAL DIFFERENCES

There are none. The app's features and content are identical in every region.
All content is in Korean and the primary market is South Korea, but nothing is
gated, disabled, or varied by region, and no region detection is performed.

7) REGULATED INDUSTRY / THIRD-PARTY MATERIAL

The app does not operate in a regulated industry. It is an educational
vocabulary trainer with no health, financial, gambling, or medical
functionality.

It contains no protected third-party material. Every context sentence and
every definition in the app was written for this app by the developer, under
an internal editorial rule that forbids reproducing dictionary entries or
published sentences verbatim. The app displays no third-party text, images,
audio, or trademarks.

Please let me know if anything further is needed.

Best regards,
Hyeongi Kim
```

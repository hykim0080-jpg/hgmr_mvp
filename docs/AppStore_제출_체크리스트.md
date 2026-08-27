# App Store 제출 체크리스트

> 작성: 2026-07-30 · **갱신: 2026-08-27** · 기준: [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) · [Upcoming requirements](https://www.developer.apple.com/news/upcoming-requirements/)
> 제출 문구는 `AppStore_메타데이터.md`, 진행 상태는 `docs/진행_현황.md`

---

## 0. 한눈에

| # | 항목 | 상태 | 누가 |
|---|---|---|---|
| 1 | Xcode 26 / iOS 26 SDK로 빌드 | ✅ 완료 — 빌드 5~8 업로드 통과 (구버전이면 업로드 단계에서 거부된다) | — |
| 2 | **Sign in with Apple 구현** | ✅ 완료 — `com.apple.developer.applesignin` 엔타이틀먼트 매 빌드 검증 중 | — |
| 3 | Apple Developer 계정 유효 | ✅ 완료 — 업로드가 되고 있으므로 유효 | — |
| 4 | 연령 등급 설문 재응답 | ⬜ **남음** | 현기님 |
| 5 | 스크린샷 | ✅ 촬영 완료 (5컷 × 6.9"/6.5") · ⬜ **업로드 남음** | 현기님 |
| 6 | 메타데이터 입력 (이름·부제·설명·키워드) | ⬜ **남음** | 현기님 |
| 7 | App Privacy 선언 | ⬜ **남음** (7절 표 그대로) | 현기님 |
| 8 | 수출 규정(암호화) 선언 | ⬜ **남음** — '표준 암호화' 선택 | 현기님 |
| 9 | 제출 시 **빌드 9** 선택 | ⬜ **남음** — 5~8 도 목록에 뜬다 | 현기님 |
| — | iPhone 전용으로 전환 | ✅ 완료 (빌드 9) — 아래 11절 | — |
| — | 연령 등급 결과 | ✅ **4+ 확인** (UGC 「있음」이 등급을 올리지 않았다) | — |
| — | EU 디지털 서비스법 | ✅ **「비거래자」로 결정** (2026-08-27) — 아래 12절 | — |
| — | 연령 등급 「사용자 생성 콘텐츠」 | ✅ **「있음」으로 결정** (2026-08-27) — 4-4절 | — |
| — | 회원 탈퇴 · 방침/약관 URL · 번들 ID(`com.hgmr.app`) | ✅ 완료 | — |

---

## 1. Xcode 26 / iOS 26 SDK

**2026년 4월 28일부터 의무**입니다. 이미 지난 기한이라 구버전 빌드는 업로드 단계에서 거부됩니다.

```bash
xcodebuild -version          # Xcode 26.x 이상이어야 함
xcrun --sdk iphoneos --show-sdk-version   # 26.x 이상
```

- 미달이면 App Store에서 Xcode 업데이트 (수 GB, 시간 확보 필요)
- 업데이트 후 `npx cap sync ios` 한 번 돌리고 클린 빌드
- 현재 프로젝트의 `IPHONEOS_DEPLOYMENT_TARGET = 15.0` 은 그대로 둬도 됩니다. **빌드 SDK 버전과 최소 지원 버전은 별개입니다**

---

## 2. Sign in with Apple — ✅ 구현 완료 (아래는 배경 기록)

> **2026-08-27 현재 구현되어 있습니다.** 빌드 스크립트(`build_release.sh`)가 IPA에서
> `com.apple.developer.applesignin` 엔타이틀먼트를 매번 검증하고, 없으면 `STATUS=NEEDS_RESIGN`
> 으로 멈춥니다 — 그때는 `zsh resign_ios.sh` 로 복원한 뒤 업로드합니다.
> 아래 절은 "왜 필요했는가"의 기록으로 남깁니다.

## 2-1. (기록) Sign in with Apple — 이것이 제출을 막는 진짜 요건이었다

### 왜 필요한가

가이드라인 4.8은, 서드파티·소셜 로그인으로 **주 계정을 설정·인증하는 앱**은 아래를 만족하는 **동등한 로그인 수단을 함께 제공**하도록 합니다.

> ① 이름과 이메일만 수집 ② 이메일 비공개 설정 가능 ③ 동의 없이 광고 목적으로 앱 내 활동 수집하지 않음

면제 조건은 **"앱이 오직 자체 계정 시스템만 사용하는 경우"**입니다. 한글마루는 이메일/비밀번호(자체) **더하기** 구글 로그인을 제공하므로 면제되지 않습니다. 이메일 로그인이 있으니 괜찮을 것 같지만, 규정 문구는 '오직(exclusively)'입니다.

Google Sign-In은 위 세 조건을 만족하지 못해 동등 수단이 될 수 없습니다. → **Sign in with Apple 필요.**

### 확인된 현재 상태

| 항목 | 상태 |
|---|---|
| `ios/App/App/*.entitlements` | ❌ 없음 |
| `capacitor.config.json` providers | `["google.com"]` — apple 없음 |
| `index.html` 내 Apple 로그인 | 0건 |
| `@capacitor-firebase/authentication` | **8.3.0 — Apple 공급자 지원함** |

플러그인이 이미 지원하므로 처음부터 만들 필요는 없습니다.

### 구현 범위 (Code 요청으로 이관됨)

1. Apple Developer → Identifiers에서 `com.hgmr.app`에 **Sign in with Apple** capability 활성화
2. Xcode → Signing & Capabilities → **Sign in with Apple** 추가 (`App.entitlements` 생성됨)
3. Firebase 콘솔 → Authentication → **Apple 공급자 사용 설정**
4. `capacitor.config.json` → `providers: ["google.com", "apple.com"]`
5. **웰컴 화면**에 Apple 로그인 버튼 추가 — Apple의 [버튼 디자인 규격](https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple) 준수 (검정/흰색, 모서리 반경, 문구 "Apple로 계속하기")
6. 네이티브는 플러그인 `signInWithApple()` → `idToken`·`rawNonce`를 JS SDK `OAuthProvider('apple.com')`에 전달. 웹은 `signInWithPopup`

### 구현 시 주의 — 실제로 자주 걸리는 것들

- **이메일 비공개(private relay) 계정 처리**: `@privaterelay.appleid.com` 주소가 옵니다. 정상 계정으로 취급해야 하며, 이메일로 사용자를 식별하는 로직이 있다면 uid 기준으로 바꿔야 합니다
- **이름은 최초 1회만 옵니다.** 두 번째 로그인부터 `displayName`이 비어 옵니다. 첫 로그인 때 Firestore에 저장해 두지 않으면 영영 못 받습니다
- **버튼 위치**: 다른 소셜 로그인 버튼과 **동등하게 눈에 띄는 위치**여야 합니다. 구글 아래 작게 넣으면 4.8 위반으로 볼 수 있습니다
- **회원 탈퇴 시 토큰 폐기**: 이미 구현된 탈퇴 로직에 Apple 토큰 revoke를 추가하는 편이 안전합니다

---

## 3. Apple Developer 계정

- **연 $99 멤버십이 유효한지** 확인. 만료되면 심사 중인 앱도 멈추고, 게시된 앱은 내려갑니다
- 프로젝트에 팀 ID `8R75GVTDJ4` 가 박혀 있으니 가입은 되어 있습니다. **갱신일만 보세요**
- App Store Connect → 앱 추가 → 번들 ID `com.hgmr.app` 선택 (2번 작업으로 Identifier가 갱신된 뒤에 하는 편이 깔끔합니다)

---

## 4. 연령 등급 설문 — 어디서, 무엇을 답하나

> 2026-08-02 갱신 — Apple 문서 재확인. **설문 구조가 바뀌었고 9월부터 새 질문이 필수가 됩니다.**

### 4-1. 위치

```
App Store Connect  (appstoreconnect.apple.com)
  └ 앱  →  한글마루 선택
      └ 왼쪽 사이드바 「일반(General)」  →  「앱 정보(App Information)」
          └ 「연령 등급(Age Rating)」 구역
              · 처음이면   [연령 등급 설정(Set Up Age Ratings)]
              · 이미 했으면 페이지 상단 [편집(Edit)]
```

- **필요 권한**: Account Holder · Admin · App Manager · Marketing 중 하나. 1인 계정이면 해당 없음
- ⚠️ **앱 레코드가 먼저 있어야 설문이 보입니다.** App Store Connect에 `com.hgmr.app` 앱을 아직 만들지 않았다면 **「앱 → +(추가)」로 레코드부터** 만드세요. 빌드 업로드 전에도 만들 수 있습니다
- 설문은 진행바가 있는 여러 단계 대화상자입니다. 마지막에 **계산된 등급**을 보여주고 저장합니다

### 4-2. 설문 구조 (개편판)

옛 12개 항목 나열식이 아니라 두 갈래입니다.

**① 앱 내 제어·기능 (In-App Controls and Capabilities)** — 있음/없음

| 항목 | 한글마루 | 근거 |
|---|---|---|
| 자녀 보호 기능 (Parental Controls) | 없음 | |
| 연령 확인 (Age Assurance) | 없음 | 생년월일·신분증 확인 없음 |
| 무제한 웹 접근 | **없음** | 외부 링크는 약관·개인정보처리방침뿐 |
| **사용자 생성 콘텐츠** | **⚠️ 4-4절 판단 필요** | 오답 통계 패널 |
| **소셜 미디어** | **없음** | 4-3절 |
| 메시징·채팅 | 없음 | 이용자 간 통신 수단 자체가 없음 |
| 광고 | **없음** | |

**② 콘텐츠 서술자** — 「앱에 다음이 있는 경우 선택합니다」 아래 **예 / 아니요** 또는 **없음 / 드묾 / 잦음**

| 항목 | 답 |
|---|---|
| 폭력 (만화·사실적) · 성적 콘텐츠 · 노출 | 없음 |
| 욕설 / 저속한 유머 | 없음 |
| 알코올 · 담배 · 약물 | 없음 |
| 공포 | 없음 |
| **확률형 활동** (모의 도박 · 경품 · 도박 · 랜덤박스) | 없음 |
| 의료 정보 | 없음 |
| **건강 또는 웰빙 주제** — *자기 관리 또는 추천 생활 습관을 제공하는 콘텐츠* | **아니요** (아래) |

인앱 구매도 **없음**입니다.

#### 「건강 또는 웰빙 주제」를 **아니요**로 답하는 근거

이 질문은 **앱이 건강·웰빙을 주제로 삼는가**를 묻습니다 — 피트니스·명상·식단·수면 추적·정신건강 앱을 겨냥한 항목입니다.

- 한글마루의 기능은 **어휘 퀴즈 · SRS 복습 · 어휘 고도 측정**뿐입니다. 건강 관련 **조언·추적·추천이 하나도 없습니다**
- ⚠️ **예문 중 생활 습관을 언급하는 문장이 몇 개 있습니다.** 확인해 두시면 좋습니다

  > 「습관」 — *일찍 자고 일찍 일어나는 ____을 들이면 건강에 좋다.*
  > 「예방」 — *감기 ____을 위해 외출 후에는 손을 씻는다.*
  > 「발산」 — *억눌린 슬픔과 분노를 건강한 방식으로 ____하는 방법을 배우는 것은…*

  그러나 이건 **「습관」·「예방」이라는 낱말을 가르치기 위한 문맥**이지, 사용자에게 생활을 권하는 콘텐츠가 아닙니다. 1,390개 중 서너 문항의 소재일 뿐이라 앱의 콘텐츠 성격을 규정하지 않습니다

- **「예」로 답하면 불필요한 서술자가 제품 페이지에 붙습니다.** 국어 학습 앱에 건강 라벨이 달릴 이유가 없습니다

→ 예상 등급 **4+** (`AppStore_메타데이터.md` 기재값과 일치)

### 4-3. ⏰ 새로 생긴 「소셜 미디어」 질문 — 9월부터 필수

2026년 7월 9일에 추가됐고, **2026년 9월부터 신규 앱·업데이트 제출 시 응답이 필수**입니다. 지금 답해 두는 편이 낫습니다.

Apple의 정의:

> *"소셜 피드나 유사한 발견 수단을 통해 사용자 생성 콘텐츠를 **재배포·확산하거나 상호작용**할 수 있는 기능"*

**한글마루는 「없음」입니다.**

- 피드 없음 · 팔로우 없음 · 좋아요/답글/공유 없음
- 오답 통계는 **개별 게시물이 아니라 집계 결과**이고, 상호작용 수단이 전혀 없습니다
- 「문장 담기」로 받은 문장은 `users/{uid}` 하위에만 저장하고 **다른 이용자에게 노출하지 않습니다**(P43)

> **⚠️ 여기서 「있음」으로 답하면 대가가 큽니다.** 제품 페이지에 **소셜 미디어 서술자**가 붙고, App Store Connect의 앱 카테고리와 무관하게 **「소셜 미디어 사용 시간 제한(Time Allowances)」 대상으로 분류**됩니다. 국어 학습 앱이 스크린타임에서 소셜 미디어로 묶이는 건 실질적인 손해입니다.
>
> 그렇다고 사실과 다르게 답하면 안 됩니다. **다행히 우리는 사실대로 「없음」입니다** — 다만 나중에 「내 문장」을 다른 이용자와 공유하는 기능을 넣으면 **이 답이 바뀝니다.** 그때 다시 답해야 합니다.

### 4-4. ⚠️ 「사용자 생성 콘텐츠」 — 유일하게 판단이 필요한 칸

Apple의 정의:

> *"앱 경험의 일부로 사용자가 만든 콘텐츠를 **광범위하게 배포**하는 것"*

**오답 통계 패널은 다른 이용자가 입력한 답을 상위 5개까지 화면에 띄웁니다.** 두 가지로 읽힙니다.

| 읽기 | 근거 | 위험 |
|---|---|---|
| **「없음」** | 게시물이 아니라 **빈도 집계**다. 30자 이하 낱말이고, 비속어 필터를 통과한 것만 뜬다 | 심사자가 남의 입력 문자열을 화면에서 보면 **사실과 다른 신고로 판단**할 수 있음 |
| **「있음」** | 문자 그대로 다른 이용자가 만든 문자열이 화면에 뜬다 | **가이드라인 1.2 요건**이 따라붙는다 — 필터링 · **신고 수단** · **차단 수단** · 연락처 |

**제 판단: 「있음」으로 답하는 쪽이 안전합니다.** 사실과 다르게 신고했다가 발각되는 비용이 등급이 오르는 비용보다 큽니다. 개편판에서 UGC는 **콘텐츠 서술자가 아니라 기능(capability)**이라 등급을 바로 밀어 올리지 않을 가능성도 있습니다.

**다만 「있음」이면 1.2 요건에 구멍이 하나 있습니다.**

| 1.2 요건 | 현재 |
|---|---|
| 불쾌한 콘텐츠 필터링 | ✅ 비속어 필터 반영 완료 |
| **신고 수단** | ❌ 🚩는 **단어 데이터 오류 신고**이지 남의 답 신고가 아님 |
| **차단 수단** | ❌ 없음 (계정 개념이 없어 차단할 대상도 없음) |
| 연락처 | ✅ 지원 이메일 |

→ **통계 항목 하나하나에 신고를 붙이는 게 가장 싼 보완**입니다. 기존 🚩 신고 흐름을 재사용하면 되고, 「차단」은 애초에 **작성자를 식별하지 않으므로 해당 없음**이라고 Review Notes에 적으면 됩니다.

> ### ✅ 결정: 「있음」 + Review Notes로 설명 (2026-08-27, 현기님)
>
> 위 ②안입니다. 사실대로 신고하고, 1.2의 「차단」은 **작성자를 저장하지도 표시하지도 않으므로 해당 없음**이라고
> Review Notes에 적습니다 (8절 문구에 해당 문단 포함돼 있음 — **빼지 말 것**).
>
> **뒤따르는 확인 두 가지**
> 1. **설문 결과 등급이 4+가 아닐 수 있습니다.** UGC는 개편판에서 콘텐츠 서술자가 아니라 기능(capability)이라
>    등급을 바로 밀어 올리지 않을 가능성이 크지만, 확실하지 않습니다. **설문 마지막에 계산된 등급을 확인하고,
>    4+가 아니면 `AppStore_메타데이터.md` 기본 정보표의 「연령 등급 4+」를 실제 값으로 고쳐야 합니다.**
> 2. **1.2의 「신고 수단」은 아직 통계 항목에 없습니다.** 현재 🚩는 단어 데이터 오류 신고입니다.
>    지적받으면 그때 통계 줄마다 신고를 붙입니다 — 기존 🚩 흐름을 재사용하면 되므로 하루면 됩니다.

---

## 6. 스크린샷

✅ **촬영 완료 (2026-08-27)** — `store_assets/screenshots/6.9`(1320×2868), `/6.5`(1242×2688) 각 5장.
업로드만 남았습니다. 필수는 6.9" 한 세트이고 나머지 크기는 Apple이 자동 축소합니다.

- 촬영은 **시뮬레이터 수동 캡처가 아니라 스크립트**입니다. 절차와 함정은 `AppStore_메타데이터.md` 「스크린샷」절 참고
- 캡션 5종도 같은 문서에 있습니다 (브랜드 용어 규칙 적용 완료)
- 「사람들의 답」 통계 컷은 **의도적으로 보류** — 출시 전이라 어떤 단어든 한 답이 100%로 뜹니다. 분포를 지어내지 않습니다
- ⚠️ **캡션에 앱에 없는 기능을 적으면 거부 사유**입니다. 문구를 바꾸실 때 확인하세요

---

## 7. App Privacy (개인정보 영양표)

Firebase Analytics를 붙였으므로 **이전에 신고한 것보다 항목이 늘었습니다.**

| 데이터 | 목적 | 사용자와 연결 | 추적 |
|---|---|---|---|
| 이메일 주소 | 앱 기능, 계정 관리 | 예 | 아니요 |
| 이름 | 앱 기능 | 예 | 아니요 |
| 사용자 ID | 앱 기능, 계정 관리 | 예 | 아니요 |
| 기타 사용자 콘텐츠 (닉네임·신고 내용) | 앱 기능 | 예 | 아니요 |
| **제품 상호작용** | **분석** | 예 | 아니요 |
| **기타 사용 데이터** | **분석** | 예 | 아니요 |
| **기기 ID** | **분석** | 예 | 아니요 |
| ~~진단 (크래시·성능)~~ | — | — | **신고하지 않음 — 아래** |

- ⚠️ **진단은 신고하지 않습니다.** Crashlytics·Performance SDK 가 **설치돼 있지 않습니다** — 붙어 있는 Firebase 는 웹 SDK `app · auth · firestore · analytics` 네 개뿐이고, 네이티브로 들어오는 건 `CapacitorFirebaseAuthentication` → `FirebaseAuth` 입니다. 크래시 리포트를 보내지 않으므로 신고하면 사실과 다릅니다. **나중에 Crashlytics 를 붙이면 이 줄을 되살릴 것**
- **'추적'은 전부 '아니요'** — 광고 식별자를 쓰지 않고 타사와 데이터를 결합하지 않습니다. 따라서 ATT 권한 요청도 불필요합니다
- 개인정보처리방침(`hgmr.co.kr/privacy.html`)에 이 항목들이 이미 반영돼 있습니다. **영양표와 방침이 어긋나면 거부 사유**이므로 둘을 대조하세요

---

## 8. 제출 직전 마지막 확인

빌드는 화면 없는 맥에서 스크립트로 돕니다 (Xcode GUI 안 씁니다):

```bash
# 1) 버전 올리기 — build_release.sh 의 BUILD, android/app/build.gradle 의 versionCode,
#    ios/App/App.xcodeproj/project.pbxproj 의 CURRENT_PROJECT_VERSION(2군데) 을 «전부» 같은 값으로
zsh build_release.sh                 # → _build<N>.log, dist/hgmr-1.0-<N>.aab / .ipa
zsh resign_ios.sh                    # STATUS=NEEDS_RESIGN 이 뜨면 (applesignin 복원)
xcrun altool --upload-app -f dist/hgmr-1.0-<N>.ipa -t ios \
  -u hykim0080@gmail.com -p @keychain:hgmr-upload
```

- [ ] `npm run build && firebase deploy --only hosting` — 웹과 앱 번들 동기화 (빌드 스크립트가 먼저 돌려 줍니다)
- [ ] 빌드 번호를 올렸는지 — 같은 번호는 재업로드 불가
- [ ] TestFlight에서 **실기기로 한 번 통과 플레이** (로그인 3종 · 배치고사 · 세션 완료 · 탈퇴)
- [ ] 심사 제출 시 Review Notes 입력 (아래)

### Review Notes (그대로 붙여넣기)

```
This app supports anonymous sign-in — no account is required for review.
Tap "로그인 없이 둘러보기" (Browse without login) on the welcome screen to access all features immediately.

Account deletion is available in-app: profile chip (top right) → scroll to bottom → 회원 탈퇴.

The app is a Korean vocabulary learning quiz. All content is educational and curated by the developer.

Regarding user-generated content: after answering a question, the app shows an aggregated
frequency list of the top 5 answers other users typed for that same question. These are
single words (max 30 characters), never free-form posts, and they pass a profanity filter
before display. There is no feed, no profile, no following, no likes, replies or sharing,
and no way for users to communicate with each other. Authorship is not stored or shown,
so there is no user to block. Users can report a problem with any question via the flag
icon at the top right of the quiz screen.
```

> ⚠️ 위 UGC 문단은 **4-4절에서 「있음」을 고르실 때** 넣으세요. 「없음」으로 답하면 문단을 빼야 앞뒤가 맞습니다.

### 심사 결과 대응

- 거부 사유는 **Resolution Center**에 옵니다. 대부분 문구 수정이나 설정 하나로 끝납니다
- **4.8(로그인) 거부가 나오면** Sign in with Apple 엔타이틀먼트가 빠진 빌드입니다 — 2절의 재서명 절차 참고
- 첫 심사는 보통 24~48시간, 길면 일주일

---

## 9. 이 문서가 다루지 않는 것

- Play 스토어 → `docs/PlayStore_등록문.md` (⚠️ 개인 개발자 계정이면 **테스터 12명 × 14일** 요건이 별도로 있습니다)
- 스토어 문구 원본 → `AppStore_메타데이터.md`
- 전체 진행 상황 → `docs/진행_현황.md`

---

## 10. 심사 중에 알아 둘 것 — 단어 데이터는 원격으로 바뀐다

`words.json` 은 앱에 번들되지만, 실행 시 `https://hgmr.co.kr/words.json` 을 받아 다음 실행부터 씁니다.
**문항 수정에 심사가 필요 없다**는 뜻이고, 동시에 **심사라는 안전망이 없는 경로**라는 뜻이기도 합니다.

- 앱 설명의 단어 수는 정확한 수 대신 **하한("1,380단어 이상")** 으로 적었습니다 — 설명은 바꾸려면 심사가 필요한데 데이터는 그렇지 않기 때문입니다
- 심사 기간에는 `words.json` 배포를 피하는 편이 안전합니다. 심사자가 보는 것과 저장소가 어긋날 이유를 만들지 않습니다
- 배포 전 `npm run check-words` 통과는 필수입니다

---

## 11. iPhone 전용 — 2026-08-27 전환 (빌드 9)

제출 화면이 **「13" iPad 디스플레이 스크린샷」**을 요구하며 막혔습니다. Capacitor 기본값이
`TARGETED_DEVICE_FAMILY = "1,2"`(iPhone + iPad)라 iPad 지원을 선언하고 있었기 때문입니다.

**iPhone 전용(`"1"`)으로 바꿔 빌드 9를 올렸습니다.** 근거:

- 앱 레이아웃이 `max-width: 480px` 로 묶여 있어 13인치 화면에서는 **가운데 좁은 기둥**입니다.
  스토어 컷으로 보기 나쁘고, iPad 최적화(2.4.1) 지적 여지도 생깁니다
- **잃는 게 거의 없습니다** — iPhone 전용 앱도 iPad 에서 그대로 내려받아 아이폰 크기 창으로 실행됩니다.
  지금 iPad 사용자가 보는 화면과 실질적으로 같습니다
- 진짜 iPad 레이아웃을 만들면 그때 `"1,2"` 로 되돌리고 iPad 스크린샷(2064×2752)을 추가합니다

⚠️ **기기 지원은 바이너리의 `UIDeviceFamily` 에서 옵니다.** App Store Connect 에 끄고 켜는 스위치가
없으므로, 되돌리려면 반드시 새 빌드가 필요합니다. 빌드 9 검증: `UIDeviceFamily => [1]`.

---

## 12. App Store 규정 및 허가 — 「앱 정보」 페이지 아래쪽

세 칸이 있고, **하나만 손대면 됩니다.**

### 앱 암호화 문서 — 올리지 않는다

면제 대상이 아닌 암호화를 쓰는 앱이 수출 허가 서류를 올리는 칸입니다. 우리는 HTTPS 표준 암호화만
쓰고 `ITSAppUsesNonExemptEncryption = false` 가 **실제 빌드에 들어가 있습니다** (빌드 9 IPA 검증 완료).
→ **업로드 버튼을 누르지 말 것.**

### 중국 본토 ICP 비안 번호 — 비워 둔다

중국 본토 배포에만 필요합니다. 비우면 중국 본토 스토어에서만 빠지고 나머지는 영향이 없습니다.

### EU 디지털 서비스법 — ✅ 「비거래자」 (2026-08-27, 현기님)

DSA는 앱 배포자가 **거래자(trader)** 인지 밝히도록 요구합니다. 세 상태의 결과가 다릅니다.

| 상태 | 결과 |
|---|---|
| 미입력 | **EU 스토어에서만 앱이 내려간다.** 다른 지역·심사에는 영향 없음 |
| **비거래자** ← 선택 | 연락처 제공 불필요 · EU 배포 유지 · 제품 페이지에 *"소비자 보호법에서 비롯된 권리가 적용되지 않습니다"* 공지 |
| 거래자 | 개인 개발자는 **주소·전화번호·이메일**을 입력해야 하고 **EU 제품 페이지에 공개된다.** 전화번호는 숨길 수 없다 |

**비거래자로 판단한 근거** — Apple이 드는 기준은 수익 창출(유료·인앱결제·광고), 소비자 대상 상업적
마케팅, VAT 등록, 직업·사업과의 연관성입니다. 한글마루는 **무료 · 광고 없음 · 인앱결제 없음 · VAT 미등록**입니다.

> ⚠️ **이 답이 바뀌는 시점** — 인앱결제나 광고를 넣는 순간, 또는 앱으로 수익을 내기 시작하면
> **거래자로 바꿔야 합니다.** 그때는 주소·전화번호가 EU 제품 페이지에 공개된다는 것도 함께 고려하세요.
> 앱별로 따로 설정할 수 있습니다.
>
> 이건 법적 자기판단입니다. 애매하면 법률 자문을 받으라는 게 Apple의 안내입니다.
> 근거 문서: <https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements/>

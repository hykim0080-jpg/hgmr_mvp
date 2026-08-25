# App Store 제출 체크리스트

> 작성: 2026-07-30 · 기준: [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) · [Upcoming requirements](https://www.developer.apple.com/news/upcoming-requirements/)
> 제출 문구는 `AppStore_메타데이터.md`, 진행 상태는 `docs/진행_현황.md`

---

## 0. 한눈에

| # | 항목 | 상태 | 누가 |
|---|---|---|---|
| 1 | Xcode 26 / iOS 26 SDK로 빌드 | ⬜ **확인 필요** | 현기님 |
| 2 | **Sign in with Apple 구현** | 🔴 **미구현 — 최대 리스크** | Code |
| 3 | Apple Developer 계정 유효 | ⬜ 확인 필요 | 현기님 |
| 4 | 연령 등급 설문 재응답 | ⬜ | 현기님 |
| 5 | 스크린샷 7종 | ⬜ (합성 툴 준비됨) | 현기님 |
| — | 회원 탈퇴 · 암호화 신고 · 방침/약관 URL · 번들 ID | ✅ 완료 | — |

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

## 2. Sign in with Apple — 이것이 제출을 막는 진짜 요건

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

> **현기님 결정이 필요합니다.** ① 「있음」 + 신고 버튼 추가(출시 지연 소폭) ② 「있음」 + Review Notes로 설명만 ③ 「없음」. **저는 ②를 권합니다** — 정직하고, 필터가 이미 있고, 지적받으면 그때 신고 버튼을 넣으면 됩니다.

---

## 6. 스크린샷

- 필수: **6.9인치 1320×2868** 한 세트 (Apple이 다른 크기로 자동 축소)
- 목록·캡션 7종은 `AppStore_메타데이터.md`에 준비됨
- 합성은 **`hgmr-screenshot-tool.html`** 사용 — 촬영본을 넣으면 캡션·배경을 입혀 규격대로 내보냅니다
- 촬영: 시뮬레이터 `Cmd+S`, 상태바 9:41
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
| 진단 (크래시·성능) | 분석 | 아니요 | 아니요 |

- **'추적'은 전부 '아니요'** — 광고 식별자를 쓰지 않고 타사와 데이터를 결합하지 않습니다. 따라서 ATT 권한 요청도 불필요합니다
- 개인정보처리방침(`hgmr.co.kr/privacy.html`)에 이 항목들이 이미 반영돼 있습니다. **영양표와 방침이 어긋나면 거부 사유**이므로 둘을 대조하세요

---

## 8. 제출 직전 마지막 확인

- [ ] `npm run build && firebase deploy --only hosting` — 웹과 앱 번들 동기화
- [ ] `npx cap sync ios`
- [ ] Xcode → Product → Archive → Distribute → App Store Connect
- [ ] 빌드 번호(`CURRENT_PROJECT_VERSION`)를 올렸는지 — 같은 번호는 재업로드 불가
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
- **4.8(로그인) 거부가 나오면** Sign in with Apple 미구현이 원인입니다. 2절 참고
- 첫 심사는 보통 24~48시간, 길면 일주일

---

## 9. 이 문서가 다루지 않는 것

- Play 스토어 → `docs/PlayStore_등록문.md` (⚠️ 개인 개발자 계정이면 **테스터 12명 × 14일** 요건이 별도로 있습니다)
- 스토어 문구 원본 → `AppStore_메타데이터.md`
- 전체 진행 상황 → `docs/진행_현황.md`
